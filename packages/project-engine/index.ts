import type { AudioMetadata, LyricLine, RenderConfig, VisualSlide } from '../../types';
import { importLegacyProject } from '../contracts/legacy';
import { parseProject, type LambProject } from '../contracts/index';
import { validateRelativeAssetPath } from '../security/index';

export interface EditorSession {
  project: LambProject;
  audio: File;
  metadata: AudioMetadata;
  lyrics: LyricLine[];
  slides: VisualSlide[];
  config: RenderConfig;
  media: Record<string, Blob>;
  lyricOffset: number;
}
export interface OpenedSession extends Omit<EditorSession, 'media'> {
  revokeUrls: string[];
}
const DATABASE = 'lamb-lyrics-projects';
const STORE = 'sessions';
const KEY = 'active';
const MAX_MEDIA_BYTES = 1024 * 1024 * 1024;

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'));
  });
}
export function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Cannot open project storage'));
  });
}
async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE, mode);
    const value = await request(operation(transaction.objectStore(STORE)));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Project storage transaction failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Project storage transaction aborted'));
    });
    return value;
  } finally { db.close(); }
}
const portableRef = (id: string) => validateRelativeAssetPath('assets/' + id);
const mime = (blob: Blob, name: string) => blob.type || (name.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream');

export function createManifest(audio: File, lyrics: LyricLine[], media: Record<string, Blob>, slides: VisualSlide[], aspectRatio: LambProject['aspectRatios'][number] = '16:9'): LambProject {
  const base = importLegacyProject({
    id: 'local-project', name: audio.name.replace(/\.[^.]+$/, '') || audio.name,
    lyrics, audio: { id: 'audio-original', name: audio.name, mimeType: mime(audio, audio.name),
      sizeBytes: audio.size, reference: portableRef('audio-original') }
  });
  const assets: LambProject['assets'] = [...base.assets];
  for (const [id, blob] of Object.entries(media)) assets.push({
    id, kind: id === 'cover' ? 'image' : blob.type.startsWith('audio/') ? 'audio' : blob.type.startsWith('video/') ? 'video' : 'image',
    name: id, mimeType: blob.type || 'application/octet-stream', sizeBytes: blob.size,
    reference: portableRef(id), source: 'imported'
  });
  const scenes = slides.filter(s => s.type !== 'audio').map(slide => ({
    id: slide.id, startMs: Math.round(slide.startTime * 1000),
    endMs: Math.round(slide.endTime * 1000),
    assetIds: [slide.url]
  }));
  return parseProject({ ...base, assets, scenes, aspectRatios: [aspectRatio] });
}
async function captureAsset(url: string, id: string, media: Record<string, Blob>): Promise<string> {
  if (!url.startsWith('blob:') && !url.startsWith('data:')) {
    throw new Error('Cannot save remote media. Import it as a local file first.');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Cannot read media asset ' + id);
  const blob = await response.blob();
  if (!blob.size) throw new Error('Empty media asset ' + id);
  media[id] = blob;
  return id;
}
export async function saveSession(data: {
  audio: File; metadata: AudioMetadata; lyrics: LyricLine[];
  slides: VisualSlide[]; config: RenderConfig; lyricOffset: number; aspectRatio: LambProject['aspectRatios'][number];
}): Promise<LambProject> {
  if (data.audio.size > MAX_MEDIA_BYTES) throw new Error('Audio exceeds local project size limit');
  const media: Record<string, Blob> = {};
  const slides = await Promise.all(data.slides.map(async (slide, index) => ({
    ...slide, url: await captureAsset(slide.url, 'slide-' + index, media)
  })));
  const metadata = { ...data.metadata };
  if (metadata.coverUrl) metadata.coverUrl = await captureAsset(metadata.coverUrl, 'cover', media);
  const config = { ...data.config };
  for (const field of ['backgroundImage', 'backgroundVideo', 'channelInfoImage'] as const) {
    const url = config[field];
    if (url) (config as Record<string, unknown>)[field] = await captureAsset(url, 'config-' + field, media);
  }
  const bytes = data.audio.size + Object.values(media).reduce((sum, blob) => sum + blob.size, 0);
  if (bytes > MAX_MEDIA_BYTES) throw new Error('Project exceeds 1 GiB local storage cap');
  const project = createManifest(data.audio, data.lyrics, media, slides, data.aspectRatio);
  await withStore('readwrite', store => store.put({ project, audio: data.audio, metadata,
    lyrics: data.lyrics, slides, config, media, lyricOffset: data.lyricOffset }, KEY));
  return project;
}
export async function loadSession(): Promise<OpenedSession | null> {
  const saved = await withStore<EditorSession | undefined>('readonly', store => store.get(KEY));
  if (!saved) return null;
  const project = parseProject(saved.project);
  if (!(saved.audio instanceof Blob)) throw new Error('Saved audio is missing');
  const revokeUrls: string[] = [];
  const resolve = (ref: string): string => {
    const blob = saved.media[ref];
    if (!blob) throw new Error('Missing project asset: ' + ref);
    const url = URL.createObjectURL(blob); revokeUrls.push(url); return url;
  };
  try {
    const slides = saved.slides.map(slide => ({ ...slide, url: resolve(slide.url) }));
    const metadata = { ...saved.metadata, coverUrl: saved.metadata.coverUrl ? resolve(saved.metadata.coverUrl) : null };
    const config = { ...saved.config };
    for (const field of ['backgroundImage', 'backgroundVideo', 'channelInfoImage'] as const) {
      const ref = config[field]; if (ref) (config as Record<string, unknown>)[field] = resolve(ref);
    }
    return { project, audio: saved.audio, metadata, lyrics: saved.lyrics, slides, config,
      lyricOffset: saved.lyricOffset, revokeUrls };
  } catch (error) { revokeUrls.forEach(url => URL.revokeObjectURL(url)); throw error; }
}

