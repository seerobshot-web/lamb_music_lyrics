# M2 — Local LyricSync worker and timing review

## Start the local transcription worker (Windows PowerShell)
The studio remains a static React app. This worker is a separate, opt-in local process.
It binds only to 127.0.0.1:4877 and allows only the listed local dev/preview origins.
Do not expose port 4877 to the internet or copy its session token into recordings/logs.

```powershell
$env:LYRICSYNC_HOME = 'C:\Users\Robbie\GitHub\lyricsync'
$env:LYRICSYNC_PYTHON = 'C:\Users\Robbie\GitHub\lyricsync\.venv\Scripts\python.exe'
npm run worker:local
```

In a second terminal use `npm run dev` and open the local URL. Import your original
WAV/MP3/FLAC/M4A and the lyric sheet (.lrc/.srt/.vtt/.ttml), copy the per-session
worker token into the Local lyric timing panel, then click **Suggest lyric timings**.
Review the suggestions before clicking **Apply suggested times**; export LRC/SRT
or explicitly Save Project to persist your approved changes.

The worker uses the installed `lyricsync` Python package (not arbitrary commands).
It runs model `tiny` on the CPU-capable Python environment. Model weights may
download on first use; the worker is NOT an offline guarantee until cached.
Song bytes remain on the workstation, but the model weight download needs network
access on first use. No provider credentials or custom song uploads are sent to
external AI APIs by this local worker.

The transcription is a **timing suggestion** for verified lyrics; it is not a
forced aligner. The word-overlap heuristic can miss repeated choruses, ad-libs,
multi-line segments and quiet vocals. Unmatched lines and existing word-timed
lyrics remain untouched. Lyrics must be reviewed manually. Native FFmpeg and the
existing Python 3.11 LyricSync environment are required to execute transcription.

## Security boundary
Requests require exact allowed local origin plus the worker's session token.
The server accepts only allowed audio extensions and size-limited raw uploads,
never arbitrary paths or shell commands. It cleans temporary audio and JSON
sidecar files. No local worker starts automatically when the SPA opens.
For production deployment, implement origin and private-network access controls
for the chosen hosting origin; current allowed origins are local dev/preview only.

## Scope / tests
Tests cover the proposal contract, original-text preservation, export formats,
CORS/authentication/path rejection, temporary-file cleanup and legacy M0/M1 tests.
No original song was used for automated transcription. A real-song timing review
and browser interaction remain a separate manual acceptance check.
