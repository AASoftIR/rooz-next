# Rooz 0.4.11 — Windows, Composed Routines & Data Portability

- Disable always-on-top, let Rooz and AI panel drag; keep bottom-right placement on show.
- Today's readable checklists, four-level nested items, composable routine links,
  clipboard paste, keyboard-aware scroll and smoother task completion updates.
- SQLite full backup plus JSON/CSV/Markdown/ICS exports and safe merge import.
- Optional offline reminder chime, explicit voice language, shorter local STT
  silence windows and confirmation before reading routine checklist details.
- AppImage-only CI and previous serv00 uploader retained.

# Rooz 0.4.8 — Fast Offline Voice

- Replaced one-process-per-utterance Whisper with a persistent Vosk worker using the default system microphone.
- Explicit English/Persian speech model selection. Removed the previous automatic language guessing that misclassified English as Turkish.
- Silence trimming, faster endpointing, acoustic noise rejection, text confidence filtering; no literal `[BLANK_AUDIO]` responses.
- Optional fully local spoken replies using Speech Dispatcher/eSpeak. No cloud STT, no AI voice models or streamed audio.
- Preserved all task, routine, Shamsi calendar, AI chat, and existing SQLite data.
- AppImage-only CI and serv00 token/URL HTTP upload remain unchanged.
- Native compilation, PipeWire mic, model accuracy, speech output, and KDE window behavior still require testing on Arch.

---

# 0.4.7 — Flexible routine checklists, local-only voice and interaction performance

- Add reusable routine checklist templates with per-item optional instructions, required/optional status, weekday filters, drag-to-reorder, and one-click dated completion.
- Add additive SQLite routine_items and routine_item_completions tables; preserve v0.4.5 records, soft-delete removed items to preserve dated history.
- Keep all microphone capture and Whisper.cpp speech recognition inside native Rust; only recognized text reaches optional AI chat. No Groq audio endpoint or TTS.
- Optimize typing/search and weekly planning by updating local sections and caching recurrence rules.
- Fix fullscreen-to-compact return with follow-up positioning requests, and update KWin anchor activation hooks. KDE Wayland positioning still requires active KWin rule/script.
- Preserve AppImage-only CI and existing serv00 HTTPS Bearer upload secrets.
- Native Rust build, default microphone and KDE Wayland behavior require real Linux verification.

## 0.4.6 — Native offline STT, text-only AI voice and stable autostart

- Removed Groq audio transcription endpoint and TTS voice replies from the assistant.
- Captures default system microphone and runs local whisper.cpp entirely within Rust; the WebView receives transcript text only.
- Added model auto-discovery and a one-command Arch setup script.
- Preserved older SQLite settings without allowing them to re-enable remote STT.
- Kept AppImage-only GitHub Actions with the original serv00 HTTP URL/token uploader.
- See `LOCAL_VOICE_SETUP.md` for installation, startup update, and limitations.

## 0.4.3 — KDE corner anchoring and native audio fallback
- Removed centered intermediate desktop mode; compact and fullscreen only.
- Corrected GTK/WebKit microphone request and added native `parec` fallback.
- Added scoped KDE KWin 6 bottom-right anchor and installer command.
- Added audio and positioning regression checks.
- Kept AppImage-only CI and existing SQLite schema.

## v0.4.0 — Advanced schedules, Jalali calendar, optional AI studio

- Add flexible routines: configurable weekends, weekday masks, odd/even Persian and Gregorian day numbers, month filters and explicit inclusions/exceptions.
- Add seven-day schedule board and live occurrence preview, preserving previous templates/history.
- Add Persian calendar grid/navigation and validated Jalali date inputs without rewriting ISO storage dates.
- Add opt-in OpenRouter/Groq/NVIDIA AI, cost-aware model discovery, V2Ray proxy, local FTS5 context search and future-deletion archival.
- Add independent hands-free voice workflow with “help” wake word, automatic silence detection, task and routine creation confirmations, Groq/local Whisper and speech-dispatcher.
- Add richer tray menu, `--voice` and `--fullscreen` launch paths, KDE panel/voice desktop launchers; preserve Linux tray click and Wayland positioning limitations.
- Fix native settings key allowlist and horizontal overflow/AI overlay shift; strengthen browser/SQLite integration tests and CI.

## 0.3.2 — Rust routine test fixture correction

- Fixed the `routines::tests::independent_history_and_cascade` CI failure by supplying a non-empty `category` and `enabled: true` in the Rust sample fixture.
- Added Rust and offline regression checks so fixture validity is explicitly tested.
- Preserved input validation, routine schedules, SQLite schema, existing database contents, UI, and AppImage/Arch packaging workflows.
- The SQL compatibility fix from 0.3.1 remains included.

## 0.3.1 — SQLite compatibility and CI fix

- Replaced `unixepoch()` with `CAST(strftime('%s','now') AS INTEGER)` in all database defaults and Rust SQL queries.
- Fixed routine migration tests under older SQLite libraries, including Ubuntu 22.04 Python SQLite.
- Added compatibility tests that deliberately disable `unixepoch()` and verify timestamps, history, alerts, and foreign-key behavior.
- No destructive database migration; retains existing v0.2.1/v0.3.0 data.

# Changelog

## 0.2.1 — Linux packaging and releases

- Replace AppImage-only CI with source validation, Tauri AppImage, native Arch, and tagged GitHub Release jobs.
- Build AppImage on Ubuntu 22.04 to maintain a reasonable glibc baseline.
- Compile an independent Arch-native binary against Arch WebKitGTK libraries.
- Package via a checksummed generated PKGBUILD (`.pkg.tar.zst`) with desktop launcher, icon, and XDG autostart.
- Add AppImage per-user installer and static packaging tests.
- Publish `SHA256SUMS.txt` with tagged releases.
- The original Rust/TypeScript app features and SQLite database location are unchanged.

**Validation status:** TypeScript and offline packaging tests pass. Native Tauri builds must be verified by a green GitHub Actions run.

## 0.3.0 — Rhythm Studio / dedicated routines
- New sixth workspace **Routines** with an animated but low-overhead dashboard, compact and expanded layouts, multilingual RTL/LTR interface, text search, filters, and command-palette entries.
- Persistent templates: anytime errands, daily, selected weekdays, every N days, and monthly date (31st gracefully resolves to the last date in shorter months).
- Fast dated check-ins, idempotent completion records, undo, per-routine history, persistent check-in totals, and pause/resume.
- Optional scheduled desktop reminders, including pre-midnight alerts for early next-day events. Routine alerts are deduplicated in SQLite independently of daily tasks.
- Additive SQLite schema migration in `src-tauri/src/routines_schema.sql`; old tasks, notes, settings, task completion history and legacy recurrence rules stay intact.
- TypeScript schedule utilities, browser regression tests, SQLite migration tests, and CI checks updated. Tagged releases continue publishing AppImage and native Arch packages.

## v0.4.4 — AppImage voice networking and KDE anchor repair

- Removed external `curl` execution from all OpenRouter/Groq/NVIDIA requests. A native Rust `reqwest` client with rustls now handles JSON chat, model discovery, Groq WAV uploads and the optional V2Ray SOCKS5/HTTP proxy. This avoids host `libcurl` loading an incompatible `libnghttp2` from the AppImage.
- Added an AppImage-safe host process launcher that strips AppDir-owned library and plugin paths before launching `parec`, `whisper-cli`, `spd-say`, desktop helpers and KDE configuration tools.
- Upgraded the KWin anchor to a `kpackagetool6`-registered KDE Plasma 6 script; old v0.4.3 direct-copy installations are upgraded or repaired. Reconfiguration unloads old script code and activates the new version when KWin supports live reload.
- Fixed the KWin anchor to use the window-specific work area and enforce one 438×704 compact mode outside fullscreen. Handles first show, re-show and fullscreen transitions; does not alter other applications.
- Added KWin script geometry simulation and AppImage HTTP/runtime regression checks to the AppImage-only GitHub Actions workflow.
- No database migration or changes to existing tasks, routines, notes or AI API keys.

Native AppImage compilation, microphone/audio-server behavior and actual KWin placement still require testing on an Arch/KDE session. The source-level and offline tests do not constitute a successful native build.
# Rooz 0.4.9 — Natural Local Voice & Stable Voice Sessions

- Adopted Pele English's preference for high-quality native speech, adapted to
  Linux with the local Piper engine (English Lessac high, Persian Reza Ibrahim).
- Removed robotic Speech Dispatcher/eSpeak for assistant responses and reminders.
  Piper streams directly to ALSA; no WAV files or audio API requests.
- Voice UI stays mounted during listening, recognition and playback; only live
  status/transcript regions update. Text inputs are no longer destroyed during
  ordinary chat response updates.
- Added speech cancellation for Stop/Close and per-language voice detection.
- Shorter, more precise voice AI replies; direct local routing and routine
  listing for common commands, without remote AI latency.
- A slightly longer endpointing pause reduces cut-off speech. Existing Vosk
  speech recognition remains on-device, with its model kept in memory.
- One-time natural voice installer for EndeavourOS/Arch, optional EN/FA models,
  and voice installation diagnostics. AppImage-only serv00 CI remains unchanged.
- Regression tests for neural voice, private processing, panel stability, and
  backward-compatible routines.

# Rooz 0.4.10 — Window and Voice Session Recovery

- Fixed KDE fullscreen toggle getting stuck due to delayed fullscreen-state updates.
- Explicit compact/fullscreen transitions; reapply geometry after transition.
- Voice reply playback cannot hold the microphone indefinitely; stopped on timeout.
- Piper child processes are cancellable even if synthesis has not emitted audio.
- Voice capture retries after one transient failure, and Vosk worker restarts
  once if the subprocess dies between utterances.
- Voice AI response time limit reduced to 18s; other chat retains its longer timeout.
- Kept the existing AppImage-only CI, serv00 deployment, and database compatibility.

