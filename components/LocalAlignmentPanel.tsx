import React, {useState} from 'react';
import type {LyricLine} from '../types';
import {acceptTiming, exportLrc, exportSrt, proposeTiming, type TimingProposal} from '../packages/lyric-engine';
type Props={audio:File|null; lyrics:LyricLine[]; onApprove:(lines:LyricLine[])=>void};
export default function LocalAlignmentPanel({audio,lyrics,onApprove}:Props){
 const [token,setToken]=useState('');
 const [draft,setDraft]=useState<TimingProposal[]|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [format,setFormat]=useState<'lrc'|'srt'>('lrc');
 async function suggest(){
   if(!audio||!lyrics.length||!token.trim()) {setMessage('Load your song and verified lyrics, then enter the local worker token.');return;}
   setBusy(true);setDraft(null);setMessage('');
   try{
     const response=await fetch('http://127.0.0.1:4877/v1/transcribe',{
       method:'POST',headers:{Authorization:'Bearer '+token.trim(),'Content-Type':'application/octet-stream','X-Lamb-Filename':audio.name},body:audio
     });
     const result=await response.json();
     if(!response.ok) throw new Error(result.error||'Local transcription failed');
     const proposals=proposeTiming(lyrics,result);
     setDraft(proposals);
     setMessage(`${proposals.filter(p=>p.matched).length} of ${lyrics.length} lines have suggested timing. Review before applying.`);
   }catch(error){setMessage(error instanceof Error?error.message:'Local worker unavailable');}
   finally{setBusy(false);}
 }
 function download(){
   const text=format==='lrc'?exportLrc(lyrics):exportSrt(lyrics);
   const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
   const anchor=document.createElement('a');anchor.href=url;anchor.download='approved-lyrics.'+format;anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 return <section className="rounded-xl border border-purple-500/30 bg-zinc-900/80 p-3 space-y-2 text-xs text-zinc-200" aria-label="Local lyric alignment">
   <strong className="text-purple-300">Local lyric timing (M2)</strong>
   <p className="text-zinc-400">Original lyric text stays unchanged. Transcription suggests times only; nothing is sent to cloud services by the studio.</p>
   <label className="block">Local worker session token
     <input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}
       placeholder="Token shown in worker terminal" className="mt-1 w-full rounded bg-zinc-800 p-2 text-white" />
   </label>
   <button type="button" disabled={busy||!audio||!lyrics.length} onClick={suggest}
     className="rounded bg-purple-700 px-3 py-2 disabled:opacity-40">{busy?'Analyzing locally…':'Suggest lyric timings'}</button>
   {message&&<p role="status" className="text-zinc-300">{message}</p>}
   {draft&&<div className="space-y-1 max-h-32 overflow-y-auto">
     {draft.map((p,i)=><p key={i} className={p.matched?'text-green-300':'text-amber-300'}>
       {p.matched?'Suggested':'Unmatched'}: {p.text} {p.matched?`(${p.suggestedStart.toFixed(2)}s)`:''}</p>)}
     <button type="button" onClick={()=>{onApprove(acceptTiming(draft));setDraft(null);setMessage('Suggested timings applied. Review and save your project.');}}
       className="rounded bg-green-700 px-3 py-2">Apply suggested times</button>
   </div>}
   <div className="flex items-center gap-2">
     <select value={format} onChange={e=>setFormat(e.target.value as 'lrc'|'srt')} className="rounded bg-zinc-800 p-1">
       <option value="lrc">LRC</option><option value="srt">SRT</option>
     </select>
     <button type="button" disabled={!lyrics.length} onClick={download} className="rounded bg-zinc-700 px-3 py-1 disabled:opacity-40">Export lyrics</button>
   </div>
 </section>;
}
