import {describe,it,expect} from 'vitest';
import {proposeTiming,acceptTiming,exportLrc,exportSrt} from '../packages/lyric-engine';
const verified=[{time:0,text:'Exact ORIGINAL lyric!'},{time:2,text:'Unmatched verified text'}];
const transcript={version:1,segments:[{start:1.25,end:2.5,text:'Exact original lyric'}]};
describe('M2 reviewable lyric timing',()=>{
 it('preserves source text and leaves unmatched text untouched',()=>{
  const suggestions=proposeTiming(verified,transcript);
  expect(suggestions[0].matched).toBe(true);
  expect(suggestions[1].matched).toBe(false);
  const reviewed=acceptTiming(suggestions);
  expect(reviewed[0].text).toBe('Exact ORIGINAL lyric!');
  expect(reviewed[0].time).toBe(1.25);
  expect(reviewed[1]).toEqual(verified[1]);
 });
 it('exports verified LRC and SRT',()=>{
  const timed=acceptTiming(proposeTiming(verified,transcript));
  expect(exportLrc(timed)).toContain('[00:01.25]Exact ORIGINAL lyric!');
  expect(exportSrt(timed)).toContain('00:00:01,250 --> 00:00:02,500');
 });
 it('rejects invalid transcript structures',()=>{
  expect(()=>proposeTiming(verified,{version:1,segments:[{start:-1,end:2,text:'x'}]})).toThrow();
 });
});
