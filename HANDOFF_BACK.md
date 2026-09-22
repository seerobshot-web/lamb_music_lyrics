# HANDOFF_BACK — M1 Local Project Intake and Persistence

## Baseline and scope
M0 PR #1 was squash merged into main at c67ffe4925e226c0fac0e31111983fabd37ddd41.
This branch is M1 only. Existing player/editor/rendering paths are retained. No audio
transcription, new rendering engines, provider integration, deployment, or M2 work.

## Implementation
- Save Project / Open Project actions are integrated in the existing player controls. Opening a stored project prompts before replacing an active unsaved session.
- Browser IndexedDB holds a single explicit user-saved session including original audio bytes,
  lyric text/timing, captured blob/data media, legacy visual slide settings, render configuration,
  metadata and lyric offset. No external upload occurs.
- M0 project schema validates a portable asset/scene/lyric manifest. Blob/object URLs
  are generated only when reopening, never stored as persistent asset references.
- Missing or externally hosted visual media causes an explicit save error rather than
  silently creating a broken archive.
- Restore replaces the active session and its playlist item without changing existing renderers.
- Save is explicit, not autosave. Replacing an existing stored session is intentional and
  only follows successful validation and media capture.

## Limits and next steps
- Storage is confined to this browser and origin, not an exportable archive or cloud backup.
  Browser storage clearing, quota limits, and private browsing can remove projects.
- One saved active session per browser; full project library, portable archive import/export,
  and persistent song collections require a separate approved follow-up.
- Custom font blobs, arbitrary remote assets, playlist collections, and every legacy
  background configuration are not universally portable; do not advertise a full
  no-loss migration until further UI/browser test coverage confirms it.
- Existing HTML media- and IDB-dependent flows require manual browser playback/restore QA.
- Retain the current app's browser renderer and styling; no deployment/merge/M2.

## Validation
Local npm run check passed: typecheck, M0/M1-scoped lint, 12 unit tests (including an IndexedDB save/reopen test), and the Vite production build. Existing large-bundle, Browserslist and Rollup/Zod annotation warnings remain. See draft PR for remote CI and outstanding browser QA.

