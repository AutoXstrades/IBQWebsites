import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
mkdirSync('.ibq-logs',{recursive:true});
const env={...process.env,DATABASE_URL:"file:../.ibq-logs/security-test-"+randomUUID()+".db",AUTH_SECRET:"isolated-test-secret-not-for-production",PAYMENTS_MODE:"off",NODE_ENV:"test"};
writeFileSync(env.DATABASE_URL.replace('file:../',''),new Uint8Array());
for(const args of [["node_modules/prisma/build/index.js","generate","--schema","prisma/schema.prisma"],["node_modules/prisma/build/index.js","migrate","deploy","--schema","prisma/schema.prisma"],["--import","tsx","--test","tests/security.test.ts"]]){
  if(args[1]==='generate'&&process.argv.includes('--skip-generate'))continue;
  const r=spawnSync(process.execPath,args,{env,stdio:"inherit",windowsHide:true});if(r.status!==0)process.exit(r.status||1);
}
