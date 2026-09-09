import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import dotenv from 'dotenv';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

const base=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(await fs.readFile(path.join(base,'backup-config.json'),'utf8'));
const env=dotenv.parse(await fs.readFile(config.envFile));
const ca=await fs.readFile(config.caFile,'utf8');
const keyResult=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(base,'backup-key.ps1'),'-Path',config.keyFile],{encoding:'utf8',windowsHide:true});
if(keyResult.status!==0)throw new Error('Backup key unavailable for this Windows account');
const key=Buffer.from(keyResult.stdout.trim(),'base64');if(key.length!==32)throw new Error('Invalid backup key');
const tables=['User','Ticket','Deliverable','PrototypeImage','ReferenceUpload','Payment','UpdateRequest','AuditEvent','StripeEvent'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const maxBytes=256*1024*1024;
async function verify(filename){
  const bytes=await fs.readFile(filename);if(bytes.length>maxBytes||bytes.subarray(0,6).toString()!=='IBQBK1')throw new Error('Invalid backup');
  const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(6,18));decipher.setAuthTag(bytes.subarray(18,34));
  const compressed=Buffer.concat([decipher.update(bytes.subarray(34)),decipher.final()]);
  const backup=JSON.parse(gunzipSync(compressed,{maxOutputLength:maxBytes}).toString());
  if(backup.format!==1)throw new Error('Unsupported backup version');
  const restored=new PGlite();
  try{
    for(const migration of backup.schema)await restored.exec(migration.sql);
    for(const table of tables){
      const exists=await restored.query('SELECT to_regclass($1) AS relation',['public."'+table+'"']);
      if(!exists.rows[0].relation){if((backup.tables[table]||[]).length)throw new Error('Missing restore table');continue;}
      for(const row of backup.tables[table]||[]){const cols=Object.keys(row);if(cols.some(c=>!/^[A-Za-z][A-Za-z0-9]*$/.test(c)))throw new Error('Invalid backup columns');await restored.query('INSERT INTO "'+table+'" ('+cols.map(c=>'"'+c+'"').join(',')+') VALUES ('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(row));}
      const count=await restored.query('SELECT count(*)::int AS count FROM "'+table+'"');if(count.rows[0].count!==(backup.tables[table]||[]).length)throw new Error('Restore count mismatch');
    }
    for(const object of backup.objects){const data=Buffer.from(object.data,'base64');if(hash(data)!==object.sha256||data.length!==object.size)throw new Error('Restored object checksum mismatch');}
    return {tables:tables.length,rows:Object.values(backup.tables).reduce((s,rows)=>s+rows.length,0),objects:backup.objects.length};
  }finally{await restored.close();}
}
const dbUrl=new URL(env.DIRECT_URL||env.DATABASE_URL);dbUrl.searchParams.delete('sslmode');dbUrl.searchParams.delete('sslaccept');dbUrl.searchParams.delete('sslcert');
const db=new pg.Client({connectionString:dbUrl.toString(),ssl:{ca,rejectUnauthorized:true},connectionTimeoutMillis:15000,statement_timeout:30000});
try{
  if(process.argv[2]==='--verify'){
    const filename=path.resolve(process.argv[3]);if(!filename.startsWith(path.resolve(config.outputDirectory)+path.sep))throw new Error('Backup outside configured directory');
    console.log(JSON.stringify({verified:await verify(filename)}));
  }else{
    await db.connect();await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const backup={format:1,createdAt:new Date().toISOString(),schema:[],tables:{},objects:[]};
    const applied=(await db.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name')).rows.map(r=>r.migration_name);
    for(const name of applied){if(!/^[a-zA-Z0-9_-]+$/.test(name))throw new Error('Invalid migration name');backup.schema.push({name,sql:await fs.readFile(path.join(config.migrationsDirectory,name,'migration.sql'),'utf8')});}
    for(const table of tables){const exists=await db.query('SELECT to_regclass($1) AS relation',['public."'+table+'"']);backup.tables[table]=exists.rows[0].relation?(await db.query('SELECT * FROM "'+table+'"')).rows:[];}
    await db.query('COMMIT');
    let total=0;const urls=new Set([...backup.tables.ReferenceUpload,...backup.tables.Deliverable].map(x=>x.url));
    for(const url of urls){const prefix='supabase://'+env.SUPABASE_STORAGE_BUCKET+'/';if(!url.startsWith(prefix))throw new Error('Unsupported file storage in backup');const objectKey=url.slice(prefix.length);const response=await fetch(env.SUPABASE_URL+'/storage/v1/object/authenticated/'+env.SUPABASE_STORAGE_BUCKET+'/'+objectKey.split('/').map(encodeURIComponent).join('/'),{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY}});if(!response.ok)throw new Error('File backup failed');const data=Buffer.from(await response.arrayBuffer());total+=data.length;if(total>maxBytes/2)throw new Error('Backup exceeds configured memory limit; expand backup architecture');backup.objects.push({key:objectKey,size:data.length,sha256:hash(data),data:data.toString('base64')});}
    const plaintext=Buffer.from(JSON.stringify(backup));if(plaintext.length>maxBytes)throw new Error('Backup too large');
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const compressed=gzipSync(plaintext);const encrypted=Buffer.concat([cipher.update(compressed),cipher.final()]);
    await fs.mkdir(config.outputDirectory,{recursive:true});const filename=path.join(config.outputDirectory,'ibq-'+new Date().toISOString().replaceAll(':','-')+'.ibqbackup');
    await fs.writeFile(filename,Buffer.concat([Buffer.from('IBQBK1'),iv,cipher.getAuthTag(),encrypted]),{flag:'wx'});
    const verified=await verify(filename);
    await fs.writeFile(path.join(base,'backup-status.json'),JSON.stringify({ok:true,completedAt:new Date().toISOString(),filename,verified},null,2));
    console.log(JSON.stringify({ok:true,filename,verified}));
  }
}catch{await fs.writeFile(path.join(base,'backup-status.json'),JSON.stringify({ok:false,failedAt:new Date().toISOString(),error:'Backup or restore verification failed; review locally.'}));console.error('IBQ backup failed. No customer data or credentials were logged.');process.exitCode=1;}
finally{key.fill(0);await db.end();}
