import { z } from 'zod';

const ms = z.number().int().nonnegative().finite();
const id = z.string().min(1).max(128);
export const lyricWordSchema = z.object({
  text: z.string(), startMs: ms, endMs: ms, confidence: z.number().min(0).max(1).optional()
}).strict().refine(w => w.endMs >= w.startMs, 'Word end precedes start');
export const lyricLineSchema = z.object({
  id, text: z.string(), startMs: ms, endMs: ms, approved: z.boolean(),
  words: z.array(lyricWordSchema).optional()
}).strict().superRefine((line, ctx) => {
  if (line.endMs < line.startMs) ctx.addIssue({ code: 'custom', message: 'Line end precedes start' });
  let previous = line.startMs;
  for (const word of line.words ?? []) {
    if (word.startMs < previous || word.endMs > line.endMs) {
      ctx.addIssue({ code: 'custom', message: 'Word outside line or out of order' });
    }
    previous = word.endMs;
  }
});
export const assetSchema = z.object({
  id, kind: z.enum(['audio', 'image', 'video', 'logo', 'font', 'other']),
  name: z.string().min(1).max(255), mimeType: z.string().min(1).max(128),
  sizeBytes: ms, reference: z.string().min(1).max(2048),
  source: z.enum(['imported', 'generated', 'licensed']),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  rightsNote: z.string().max(2048).optional()
}).strict().refine(a => !/^(?:[a-z][a-z0-9+.-]*:|[\\/]|[a-z]:[\\/])/i.test(a.reference) &&
  !a.reference.split(/[\\/]/).includes('..'), 'Asset reference must be portable and relative');
export const sceneSchema = z.object({
  id, startMs: ms, endMs: ms, assetIds: z.array(id),
  styleId: id.optional(), templateId: id.optional(), prompt: z.string().max(10000).optional()
}).strict().refine(s => s.endMs > s.startMs, 'Scene requires positive duration');
export const projectSchema = z.object({
  schemaVersion: z.literal(1), id, name: z.string().min(1).max(255),
  artist: z.string().max(255).optional(), audioAssetId: id.optional(),
  assets: z.array(assetSchema), lyrics: z.array(lyricLineSchema),
  scenes: z.array(sceneSchema), aspectRatios: z.array(z.enum(['16:9', '9:16', '1:1'])).min(1),
  styleId: id.optional(), revision: ms
}).strict().superRefine((project, ctx) => {
  const assetIds = new Set<string>();
  for (const asset of project.assets) {
    if (assetIds.has(asset.id)) ctx.addIssue({ code: 'custom', message: 'Duplicate asset ID' });
    assetIds.add(asset.id);
  }
  if (project.audioAssetId && !assetIds.has(project.audioAssetId)) ctx.addIssue({ code: 'custom', message: 'Unknown audio asset' });
  const lyricIds = new Set<string>();
  for (const line of project.lyrics) {
    if (lyricIds.has(line.id)) ctx.addIssue({ code: 'custom', message: 'Duplicate lyric ID' });
    lyricIds.add(line.id);
  }
  const sceneIds = new Set<string>();
  for (const scene of project.scenes) {
    if (sceneIds.has(scene.id)) ctx.addIssue({ code: 'custom', message: 'Duplicate scene ID' });
    sceneIds.add(scene.id);
    for (const ref of scene.assetIds) if (!assetIds.has(ref)) ctx.addIssue({ code: 'custom', message: 'Unknown scene asset' });
  }
});
export type LambProject = z.infer<typeof projectSchema>;
export function parseProject(input: unknown): LambProject {
  if (!input || typeof input !== 'object' || !('schemaVersion' in input)) throw new Error('Missing project schemaVersion');
  if ((input as {schemaVersion?: unknown}).schemaVersion !== 1) throw new Error('Unsupported project schema version');
  return projectSchema.parse(input);
}

