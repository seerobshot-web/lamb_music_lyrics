# HANDOFF_BACK — M0 Portable Foundation

## Scope and source
Branch: `m0/portable-foundation-20260921`; base: `main` at `c3ad5da6184e7e39d3554dc6429838b304e1af33`.
Existing GitHub root React/Vite application is canonical; the separate local pnpm scaffold was **not** copied or used to replace the UI.

## Implemented
- Strict, versioned Zod project contracts for lyrics, word timing, portable assets, scenes and project metadata.
- Non-destructive legacy lyric import/export adapters converting seconds to integer milliseconds, with explicit rejection of session-only blob-backed visual slides until media relinking.
- File descriptor allowlisting, relative path validation, origin/session authorization helpers; real file signatures and runtime isolation are deferred.
- Versioned worker operation, capability, job state and error schemas. **No worker listener or execution exists in M0.**
- Removed Vite build-time shared Gemini API key injection. Existing AI actions without an explicitly user-supplied credential now fail with an explicit error; a secure server-backed AI adapter remains a later milestone.
- Added npm scripts, scoped ESLint, Vitest contracts/security tests and GitHub Actions checks.
- Existing `App.tsx`, `types.ts`, editor components, and video-rendering implementations were not rewritten.

## Validation
Baseline `npm ci --ignore-scripts`, `npx tsc --noEmit`, and `npm run build`: passed.
After M0: `npm run check` — typecheck, scoped M0 lint, 7 unit tests, and production build passed locally.
Caveat: ESLint covers **new M0 packages/tests only**. Legacy source linting and browser visual QA remain separate work.
The original build and updated build warn about a large JavaScript chunk and outdated Browserslist data.
GitHub Actions status: check the draft pull request after push; local success is not a claim of passing CI.

## Open M0/implementation caveats
- No persisted project store or automated UI migration was introduced. The schema/adapter is a foundation only.
- No real worker exists; origin/session contract helpers are not substitutes for a tested HTTP server boundary.
- Actual media magic-byte checks, symlink containment, quotas, and per-operation permission enforcement require the future worker.
- Existing browser Gemini workflows must use a user-provided key or wait for an authenticated server adapter; do not reintroduce a deployment-wide secret into Vite.
- Current npm lockfile was regenerated to add Zod, ESLint, TypeScript ESLint, and Vitest; verify lockfile integrity in CI.
- No media processing, AI visuals, Remotion integration, deployment, merge or M1 work was performed.

## Next
Review the draft M0 PR, inspect CI status, resolve any failures, and approve merge separately. Do not begin M1 automatically.

