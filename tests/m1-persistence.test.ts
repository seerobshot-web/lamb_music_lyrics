import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadSession, saveSession } from '../packages/project-engine';
import type { RenderConfig } from '../types';

describe('M1 IndexedDB session persistence', () => {
  it('stores original audio bytes and restores exact lyric text and timing', async () => {
    const audio = new File([new Uint8Array([82, 73, 70, 70])], 'original.wav', { type: 'audio/wav' });
    const metadata = { title: 'Original', artist: 'Creator', coverUrl: null };
    const lyrics = [{ time: 1.25, endTime: 2.5, text: 'Approved lyric stays intact!' }];
    await saveSession({ audio, metadata, lyrics, slides: [],
      config: { backgroundColor: '#000000' } as RenderConfig, lyricOffset: 0.2, aspectRatio: '9:16' });
    const reopened = await loadSession();
    expect(reopened?.project.lyrics[0].startMs).toBe(1250);
    expect(reopened?.lyrics).toEqual(lyrics);
    expect(reopened?.metadata).toEqual(metadata);
    expect(reopened?.audio.size).toBe(audio.size);
    expect(reopened?.lyricOffset).toBe(0.2);
    expect(reopened?.project.aspectRatios).toEqual(['9:16']);
  });
});

