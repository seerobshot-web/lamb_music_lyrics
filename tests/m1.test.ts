import { describe, expect, it } from 'vitest';
import { createManifest } from '../packages/project-engine';
import { parseProject } from '../packages/contracts';

const audio = new File(['audio bytes'], 'original.wav', { type: 'audio/wav' });
const lyrics = [{ time: 1.25, endTime: 2.5, text: 'Keep every original word.' }];
describe('M1 local project manifest', () => {
  it('creates a portable manifest with millisecond lyric timing', () => {
    const manifest = createManifest(audio, lyrics, {}, []);
    expect(manifest.audioAssetId).toBe('audio-original');
    expect(manifest.assets[0].reference).toBe('assets/audio-original');
    expect(manifest.lyrics[0].startMs).toBe(1250);
    expect(manifest.lyrics[0].text).toBe(lyrics[0].text);
    expect(parseProject(manifest)).toEqual(manifest);
  });
  it('relates saved visual slides to portable media IDs', () => {
    const media = { 'slide-0': new Blob(['image'], { type: 'image/png' }) };
    const slides = [{ id: 'scene-01', type: 'image' as const, url: 'slide-0',
      name: 'still', startTime: 0.5, endTime: 2 }];
    const manifest = createManifest(audio, lyrics, media, slides);
    expect(manifest.scenes[0].assetIds).toEqual(['slide-0']);
    expect(manifest.scenes[0].startMs).toBe(500);
    expect(manifest.assets[1].reference).toBe('assets/slide-0');
  });
  it('rejects an asset reference that has not been captured', () => {
    const slides = [{ id: 'scene-01', type: 'image' as const, url: 'blob:unresolved',
      name: 'still', startTime: 0.5, endTime: 2 }];
    expect(() => createManifest(audio, lyrics, {}, slides)).toThrow();
  });
  it('rejects invalid lyric timing instead of changing approved text', () => {
    expect(() => createManifest(audio, [{time: 2, endTime: 1, text:'Do not rewrite'}], {}, [])).toThrow();
  });
});

