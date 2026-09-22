import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {existsSync} from 'node:fs';
import {vi} from 'vitest';
import {makeWorker} from '../workers/local/server.mjs';
import type {AddressInfo} from 'node:net';
const token='m2-test-token';
let server:ReturnType<typeof makeWorker>;
let address:string;
let uploadedPath='';
beforeAll(async()=>{
  server=makeWorker({authToken:token,transcribe:async(file:string)=>{
    uploadedPath=file;
    expect(existsSync(file)).toBe(true);
    return {version:1,segments:[{start:1,end:2,text:'original lyric'}]};
  }});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  address=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));});
const headers={Origin:'http://localhost:5173',Authorization:'Bearer '+token};
describe('M2 local worker security',()=>{
 it('denies foreign origins before executing any operation',async()=>{
  const res=await fetch(address+'/v1/capabilities',{headers:{...headers,Origin:'https://untrusted.test'}});
  expect(res.status).toBe(403);
 });
 it('denies requests without session authentication',async()=>{
  const res=await fetch(address+'/v1/capabilities',{headers:{Origin:headers.Origin}});
  expect(res.status).toBe(401);
 });
 it('does not allow arbitrary operations or file paths',async()=>{
  const res=await fetch(address+'/v1/transcribe',{method:'POST',
   headers:{...headers,'X-Lamb-Filename':'../secret.wav'},body:new Uint8Array([1])});
  expect(res.status).toBe(400);
 });
 it('accepts local audio, returns transcript and cleans up temporary media',async()=>{
  const data=new Uint8Array([82,73,70,70,0,0,0,0,87,65,86,69,0,0,0,0]);
  const res=await fetch(address+'/v1/transcribe',{method:'POST',
   headers:{...headers,'X-Lamb-Filename':'song.wav','Content-Type':'application/octet-stream'},body:data});
  expect(res.status).toBe(200);
  expect((await res.json()).segments[0].text).toBe('original lyric');
  await vi.waitFor(()=>expect(existsSync(uploadedPath)).toBe(false));
 });
});
