import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
let failed=false;
for(const file of files){
  if(/(^|\/)\.env(?!\.example)(\.|$)|\.(db|sqlite|p12|pfx|key)$/.test(file)){console.error('Disallowed sensitive file: '+file);failed=true;}
  if(!/\.(ts|tsx|mjs|js|json|md|html|yml|yaml|env|txt)$/.test(file))continue;
  const text=fs.readFileSync(path.join(root,file),'utf8');
  if(/GOCSPX-[A-Za-z0-9_-]{20,}|\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}|\bgh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsb_secret_[A-Za-z0-9_-]{20,}/.test(text)){console.error('Possible credential in '+file+' (value withheld)');failed=true;}
}
if(failed)process.exitCode=1;else console.log('Tracked-file credential checks passed.');
