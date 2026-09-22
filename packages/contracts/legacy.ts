import type { LyricLine, LyricWord, VisualSlide } from '../../types';
import { parseProject, type LambProject } from './index';

const toMilliseconds = (seconds: number): number => {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid legacy timestamp');
  return Math.round(seconds * 1000);
};
export function importLegacyProject(input: {
  id: string; name: string; lyrics: LyricLine[]; slides?: VisualSlide[];
  audio?: {id: string; name: string; mimeType: string; sizeBytes: number; reference: string};
}): LambProject {
  const lines = input.lyrics.map((line, i) => ({
    id: `line-${i}`, text: line.text, startMs: toMilliseconds(line.time),
    endMs: toMilliseconds(line.endTime ?? input.lyrics[i + 1]?.time ?? line.time),
    approved: true,
    words: line.words?.map((w: LyricWord) => ({
      text: w.text, startMs: toMilliseconds(w.startTime), endMs: toMilliseconds(w.endTime)
    }))
  }));
  const asset = input.audio;
  const assets = asset ? [{...asset, kind: 'audio' as const, source: 'imported' as const}] : [];
  // Browser blob URLs are session-specific: callers must explicitly supply portable asset references.
  if (input.slides?.length) throw new Error('Legacy visual slides require asset relinking before portable import');
  return parseProject({
    schemaVersion: 1, id: input.id, name: input.name, revision: 0, aspectRatios: ['16:9'],
    assets, audioAssetId: asset?.id, lyrics: lines, scenes: []
  });
}
export function exportLegacyLyrics(project: LambProject): LyricLine[] {
  return project.lyrics.map(line => ({
    time: line.startMs / 1000, endTime: line.endMs / 1000, text: line.text,
    words: line.words?.map(w => ({text: w.text, startTime: w.startMs / 1000, endTime: w.endMs / 1000}))
  }));
}

