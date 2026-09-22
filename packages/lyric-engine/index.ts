import { z } from 'zod';
import type { LyricLine } from '../../types';
const seconds = z.number().finite().nonnegative();
export const transcriptSchema = z.object({
  version: z.literal(1),
  segments: z.array(z.object({start: seconds,end: seconds,text: z.string(),
    words: z.array(z.object({text:z.string(),start:seconds,end:seconds})).optional()}))
}).passthrough();
export type TimingProposal = {text:string; original:LyricLine; suggestedStart:number;
  suggestedEnd:number; confidence:number; matched:boolean};
const tokens = (s:string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(' ').filter(Boolean);
export function proposeTiming(verified:readonly LyricLine[], raw:unknown):TimingProposal[] {
  const transcript=transcriptSchema.parse(raw);
  let next=0;
  return verified.map(original=>{
    const words=tokens(original.text);
    if(original.words?.length) return {text:original.text,original,suggestedStart:original.time,
      suggestedEnd:original.endTime??original.time,confidence:0,matched:false};
    let bestIndex=-1, bestScore=0;
    for(let i=next;i<transcript.segments.length;i++){
      const seg=transcript.segments[i]; if(seg.end<seg.start) continue;
      const candidate=new Set(tokens(seg.text));
      const score=words.length?words.filter(w=>candidate.has(w)).length/words.length:0;
      if(score>bestScore){bestScore=score;bestIndex=i;}
      if(score>=0.99) break;
    }
    if(bestIndex<0||bestScore<0.6) return {text:original.text,original,
      suggestedStart:original.time,suggestedEnd:original.endTime??original.time,
      confidence:bestScore,matched:false};
    const selected=transcript.segments[bestIndex];next=bestIndex+1;
    return {text:original.text,original,suggestedStart:selected.start,
      suggestedEnd:selected.end,confidence:bestScore,matched:true};
  });
}
export function acceptTiming(proposals:readonly TimingProposal[]):LyricLine[] {
  return proposals.map(p=>p.matched?{...p.original,time:p.suggestedStart,
    endTime:p.suggestedEnd,words:undefined}:p.original);
}
const lrcStamp=(sec:number)=>{const ms=Math.round(sec*1000);
 return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms%1000/10)).padStart(2,'0')}`;};
const srtStamp=(sec:number)=>{const ms=Math.round(sec*1000);
 return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
export const exportLrc=(lines:readonly LyricLine[])=>lines.map(l=>`[${lrcStamp(l.time)}]${l.text}`).join('\n')+'\n';
export const exportSrt=(lines:readonly LyricLine[])=>lines.map((l,i)=>`${i+1}\n${srtStamp(l.time)} --> ${srtStamp(Math.max(l.time+0.01,l.endTime??lines[i+1]?.time??l.time+2))}\n${l.text}\n`).join('\n');
