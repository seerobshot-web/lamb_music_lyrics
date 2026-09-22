# Lamb Lyrics M0 — Foundation

## Canonical repository
The existing root-level React/Vite application on GitHub is authoritative. The independent
`lamb-lyrics-github-copilot-scaffold` is a reference, not a drop-in replacement.
Maintain the npm lockfile. Existing `App.tsx`, editor, legacy types and renderer remain intact.

## Project format
`packages/contracts/index.ts` defines strict Zod schema version 1. All times are integer
milliseconds; existing `types.ts` uses seconds. `legacy.ts` explicitly converts units
and preserves original lyric text. Legacy visual blob URLs cannot be portable and require
asset relinking, rather than silently serializing broken object URLs.
Unknown schema versions are rejected, not automatically converted.
A future persisted project must preserve schemaVersion and use asset IDs and relative references.

## Worker boundary
`packages/worker-protocol/index.ts` defines versioned request/response shapes and allowed
operations. This milestone does **not** launch a worker, manage files, or render video.
Future localhost worker must require an unpredictable per-session secret, exact origin
allowlist, loopback-only binding, explicit workspace selection, scoped opaque asset handles,
real file-signature inspection, per-operation authorization, bounds and resource limits,
cancellation and safe logs. A hostname check alone does not prevent cross-site requests.
Never accept arbitrary paths or executable scripts from clients or AI responses.

## Existing AI integration
The previous Vite config embedded GEMINI_API_KEY in browser JavaScript. M0 removes that
injection. Existing Gemini calls now require an explicitly supplied per-user key and throw
when none is provided; **do not** place a deployment or organization secret in the SPA.
Before restoring shared AI functionality in a later milestone, implement an authenticated
server-side provider adapter, or an explicitly disclosed user-key mode.

## Verification
Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`,
`npm run build`, or `npm run check`. M0 tests exercise schema versions, timestamp
conversions, malformed timing, portable paths, worker allowlists, and authorization
contract helpers. They do not constitute a full running-worker penetration test.

## Deferred
Media processing, local listener, Python integration, storage implementation, Remotion,
AI visual generation, deployment, and full editor migration are M1+.

