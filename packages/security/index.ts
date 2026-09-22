import { z } from 'zod';

export const approvedKindSchema = z.enum(['audio', 'image', 'video', 'lyrics']);
const signatures: Record<z.infer<typeof approvedKindSchema>, ReadonlyArray<string>> = {
  audio: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mp4'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  lyrics: ['text/plain', 'application/x-subrip', 'text/vtt']
};
export function validateMediaDescriptor(input: unknown): void {
  const descriptor = z.object({
    kind: approvedKindSchema, name: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(128), sizeBytes: z.number().int().nonnegative().max(2_147_483_648)
  }).strict().parse(input);
  if (!signatures[descriptor.kind].includes(descriptor.mimeType)) throw new Error('Unsupported media type');
  // Descriptor verification alone does not authenticate file bytes; worker must sniff the actual content.
}
export function validateRelativeAssetPath(path: string): string {
  if (!path || path.length > 2048 || [...path].some(character => character.charCodeAt(0) < 32) || /^(?:[a-z][a-z0-9+.-]*:|[\\/]|[a-z]:[\\/])/i.test(path)) {
    throw new Error('Untrusted asset path');
  }
  const parts = path.split(/[\\/]/);
  if (parts.some(part => !part || part === '.' || part === '..')) throw new Error('Untrusted asset path');
  return parts.join('/');
}
export function assertWorkerOrigin(origin: string | undefined, approvedOrigins: readonly string[]): void {
  if (!origin || !approvedOrigins.includes(origin)) throw new Error('Worker origin denied');
}
export function assertSession(token: string | undefined, expectedToken: string): void {
  if (!token || !expectedToken || token !== expectedToken) throw new Error('Worker authorization denied');
}


