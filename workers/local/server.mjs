import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
const PORT = 4877;
const LIMIT = 80 * 1024 * 1024;
const ALLOWED = new Set(['http://localhost:5173','http://127.0.0.1:5173',
  'http://localhost:4173','http://127.0.0.1:4173']);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const token=process.env.LAMB_LOCAL_TOKEN || randomBytes(24).toString('hex');
const home=process.env.LYRICSYNC_HOME;
const python=process.env.LYRICSYNC_PYTHON;
function reply(res,status,body,origin){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','Access-Control-Allow-Origin':origin||'null',
    'Vary':'Origin','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body));
}
async function runPython(file) {
  if(!home||!python) throw new Error('Configure LYRICSYNC_HOME and LYRICSYNC_PYTHON before transcription');
  const args=['-m','lyricsync.cli','transcribe',file,'--model','tiny'];
  const child=spawn(python,args,{cwd:home,env:{...process.env,PYTHONPATH:path.join(home,'src')},
    windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='';
  child.stderr.on('data',d=>{output=(output+String(d)).slice(-2500);});
  const timeout=setTimeout(()=>child.kill(),10*60*1000);
  const code=await new Promise((resolve,reject)=>{
    child.once('error',reject);child.once('close',resolve);
  }).finally(()=>clearTimeout(timeout));
  if(code!==0) throw new Error('LyricSync transcription failed: '+output.slice(-400));
  const sidecar=file.replace(/\.[^.]+$/,'.lyricsync.json');
  return JSON.parse(await readFile(sidecar,'utf8'));
}
export function makeWorker({transcribe=runPython,authToken=token}={}) {
  return http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    if(!origin||!ALLOWED.has(origin)) return reply(res,403,{error:'Origin denied'},origin);
    if(req.method==='OPTIONS'){
      res.writeHead(204,{'Access-Control-Allow-Origin':origin,'Vary':'Origin',
        'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':'Authorization, Content-Type, X-Lamb-Filename',
        'Access-Control-Max-Age':'300'});return res.end();
    }
    if(req.headers.authorization!==`Bearer ${authToken}`) return reply(res,401,{error:'Authorization denied'},origin);
    if(req.method==='GET'&&req.url==='/v1/capabilities') return reply(res,200,
      {protocolVersion:1,localOnly:true,sessionRequired:true,
        capabilities:['audio.transcribe','asset.inspect']},origin);
    if(req.method!=='POST'||req.url!=='/v1/transcribe') return reply(res,404,{error:'Unknown operation'},origin);
    const name=String(req.headers['x-lamb-filename']||'');
    if(!/^[a-zA-Z0-9][a-zA-Z0-9 _.-]{0,130}\.(wav|mp3|flac|m4a)$/i.test(name))
      return reply(res,400,{error:'Unsupported audio filename'},origin);
    const declared=Number(req.headers['content-length']);
    if(!Number.isSafeInteger(declared)||declared<1||declared>LIMIT)
      return reply(res,413,{error:'Audio exceeds upload limit'},origin);
    const folder=await mkdtemp(path.join(tmpdir(),'lamb-lyrics-'));
    const file=path.join(folder,name);
    try {
      let received=0;
      req.on('data',chunk=>{received+=chunk.length;if(received>LIMIT)req.destroy();});
      await pipeline(req,createWriteStream(file,{flags:'wx'}));
      if(received!==declared) throw new Error('Incomplete audio upload');
      const result=await transcribe(file);
      if(!result||!Array.isArray(result.segments)) throw new Error('Invalid transcript');
      return reply(res,200,{version:1,segments:result.segments},origin);
    }catch(e){if(!res.destroyed) reply(res,500,{error:e instanceof Error?e.message:'Transcription failed'},origin);}
    finally {await rm(folder,{recursive:true,force:true});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  makeWorker().listen(PORT,'127.0.0.1',()=>{
    console.log(`Lamb Lyrics local worker: http://127.0.0.1:${PORT}`);
    console.log(`Session token (enter into Studio): ${token}`);
  });
}
