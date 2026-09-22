# HANDOFF_BACK — M2 Local Transcription and Lyric Review

Base: squash-merged M1 at b9afbcac0f499de4a7356acfd5419ac31167be0d.

The existing SPA now offers an optional **Local lyric timing** panel and LRC/SRT
exports. The localhost worker receives an explicitly selected audio file after
session-token authorization and delegates to an existing Python 3.11 LyricSync
installation. It returns a transcript for reviewable, monotonic line-matching
suggestions. Original artist-provided lyric text, unmatched lines and existing
word-level timing are not overwritten automatically. The existing player,
timeline, project persistence and browser rendering remain unchanged.

Worker requires explicit terminal startup and configured LYRICSYNC_HOME and
LYRICSYNC_PYTHON; it is never started as a side effect of the SPA.
No media was shipped to a cloud AI provider, but LyricSync may download model
weights on first use. No production deployment or existing client secrets.

Validation: npm run check, node --check workers/local/server.mjs,
and local installed LyricSync Python CLI help. The alignment quality of a real
song and on-device model execution remain manual QA; worker route tests use an
injected deterministic mock and do not run a paid/large model.
See docs/M2_LOCAL_WORKER.md for startup and operational limits.
