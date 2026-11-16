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
