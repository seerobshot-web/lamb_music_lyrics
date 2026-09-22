import { z } from 'zod';

const id = z.string().min(1).max(128);
export const capabilitySchema = z.enum(['asset.inspect', 'project.validate', 'job.status', 'job.cancel']);
export const workerRequestSchema = z.discriminatedUnion('operation', [
  z.object({protocolVersion: z.literal(1), requestId: id, operation: z.literal('asset.inspect'),
    assetHandle: id}).strict(),
  z.object({protocolVersion: z.literal(1), requestId: id, operation: z.literal('project.validate'),
    projectId: id}).strict(),
  z.object({protocolVersion: z.literal(1), requestId: id, operation: z.literal('job.status'),
    jobId: id}).strict(),
  z.object({protocolVersion: z.literal(1), requestId: id, operation: z.literal('job.cancel'),
    jobId: id}).strict()
]);
export const workerResponseSchema = z.discriminatedUnion('status', [
  z.object({protocolVersion: z.literal(1), requestId: id, status: z.literal('ok'),
    result: z.unknown()}).strict(),
  z.object({protocolVersion: z.literal(1), requestId: id, status: z.literal('error'),
    error: z.object({code: z.enum(['UNAUTHORIZED','INVALID_INPUT','NOT_FOUND','UNSUPPORTED','INTERNAL']),
      message: z.string().max(1000)}).strict()}).strict()
]);
export const jobStatusSchema = z.object({
  jobId: id, status: z.enum(['queued','running','completed','failed','cancelled']),
  progress: z.number().min(0).max(1), error: z.string().max(1000).optional()
}).strict();
export const workerCapabilitiesSchema = z.object({
  protocolVersion: z.literal(1), capabilities: z.array(capabilitySchema),
  sessionRequired: z.literal(true), localOnly: z.literal(true)
}).strict();
// Protocol declarations only. M0 does not start a listener, execute jobs, or grant filesystem access.

