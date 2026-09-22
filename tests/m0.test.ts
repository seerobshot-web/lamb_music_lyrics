import { describe, expect, it } from 'vitest';
import { parseProject } from '../packages/contracts/index';
import { importLegacyProject, exportLegacyLyrics } from '../packages/contracts/legacy';
import { assertSession, assertWorkerOrigin, validateMediaDescriptor, validateRelativeAssetPath } from '../packages/security/index';
import { workerRequestSchema, workerResponseSchema } from '../packages/worker-protocol/index';

const base = {schemaVersion: 1, id: 'p1', name: 'Demo', revision: 0, assets: [],
  lyrics: [], scenes: [], aspectRatios: ['16:9']};
describe('M0 canonical format', () => {
  it('validates v1 and rejects unknown future versions', () => {
    expect(parseProject(base).id).toBe('p1');
    expect(() => parseProject({...base,schemaVersion: 2})).toThrow();
  });
  it('rejects reversed timing and unknown asset references', () => {
    const line = {id:'l1',text:'Original words',startMs:1000,endMs:900,approved:true};
    expect(() => parseProject({...base,lyrics:[line]})).toThrow();
    expect(() => parseProject({...base,scenes:[{id:'s1',startMs:0,endMs:1000,assetIds:['missing']}]})).toThrow();
  });
  it('preserves verified lyrics and converts seconds to milliseconds without mutating source', () => {
    const legacy = {id:'p1',name:'Demo',lyrics:[{time:1.25,endTime:2.5,text:'My exact lyric!',
      words:[{text:'My',startTime:1.25,endTime:1.5}]}]};
    const project = importLegacyProject(legacy);
    expect(project.lyrics[0].startMs).toBe(1250);
    expect(exportLegacyLyrics(project)[0].text).toBe('My exact lyric!');
    expect(legacy.lyrics[0].time).toBe(1.25);
  });
  it('requires relinking session-only visual slides', () => {
    expect(() => importLegacyProject({id:'p1',name:'demo',lyrics:[],slides:[{
      id:'s1',type:'image',url:'blob:session',startTime:0,endTime:1,name:'image'
    }]})).toThrow(/relink/);
  });
});
describe('M0 security and worker contracts', () => {
  it('rejects traversal, absolute, blob and URL references', () => {
    for (const path of ['../secret','C:\\private\\x','/etc/passwd','blob:abc','https://x/y','a//b']) {
      expect(() => validateRelativeAssetPath(path)).toThrow();
    }
    expect(validateRelativeAssetPath('assets/track.wav')).toBe('assets/track.wav');
  });
  it('requires origin and session authorization', () => {
    expect(() => assertWorkerOrigin('https://evil.test',['http://localhost:5173'])).toThrow();
    expect(() => assertSession('wrong','expected')).toThrow();
    expect(() => assertWorkerOrigin('http://localhost:5173',['http://localhost:5173'])).not.toThrow();
  });
  it('validates allowlisted MIME and worker operations', () => {
    expect(() => validateMediaDescriptor({kind:'audio',name:'song.exe',mimeType:'application/x-msdownload',sizeBytes:2})).toThrow();
    expect(() => workerRequestSchema.parse({protocolVersion:1,requestId:'r1',operation:'shell.exec',command:'echo hi'})).toThrow();
    expect(workerRequestSchema.parse({protocolVersion:1,requestId:'r1',operation:'job.status',jobId:'j1'}).operation).toBe('job.status');
    expect(workerResponseSchema.parse({protocolVersion:1,requestId:'r1',status:'error',
      error:{code:'UNAUTHORIZED',message:'Denied'}}).status).toBe('error');
  });
});

