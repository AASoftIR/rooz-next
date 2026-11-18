## v0.4.11 — Reusable nested routines, window freedom and backups

Rooz now shows accessible routine checklists on Today, supports sub-items and
reuse of complete routine templates in other routines, multi-line clipboard
paste, and scrolls to new items automatically. The compact panel no longer
stays over fullscreen apps; drag the Rooz or AI title bar to move it. The
weekly preview uses the main page scroll instead of a tiny nested scroller.

Settings can export a **complete SQLite backup** including archived/deleted
data, or portable JSON, CSV, Markdown and 90-day ICS. JSON and task CSV imports
merge into existing data without deletion. SQLite files require manual restore.
Voice uses a shorter local Vosk capture timeout, instant EN/FA selection and
confirmation before reading routine checklist details. Optional three-note
offline reminder chimes are available. AppImage-only CI and serv00 remain.

Install the new AppImage and preserve startup using:

```bash
bash scripts/install-appimage.sh ~/Downloads/Rooz_0.4.11_amd64.AppImage
```

## v0.4.10 — Fullscreen recovery and persistent voice sessions

This hotfix uses explicit fullscreen/compact actions and retries compact
positioning after KDE completes its asynchronous fullscreen transition.
Speech playback can no longer block the next microphone turn indefinitely:
Piper is stopped after a bounded timeout, the Vosk worker is restarted once
after a subprocess failure, and voice AI requests have an 18-second network
timeout. Previous user data, routines and the AppImage-only workflow are retained.

### Install

```bash
bash scripts/install-appimage.sh ~/Downloads/Rooz_0.4.10_amd64.AppImage
```

The installer keeps KDE autostart pointing to `~/.local/bin/rooz`. Existing
English/Persian Vosk and Piper models are reused.

## v0.4.9 — Stable voice UI, fast Vosk recognition and natural offline speech

Rooz now keeps the AI panel mounted throughout microphone capture and voice replies.
For speech output, it uses local Piper neural voices instead of the robotic Linux
Speech Dispatcher/eSpeak fallback. Install the optional English/Persian speaker
with `bash scripts/setup-local-voice.sh speaker-english` (or `speaker-persian`);
recognition still uses the Vosk models installed by `english` or `persian`.
The native voice does **not** upload speech or text. AI chat may send recognized
text to your configured provider, with optional RAG when enabled.

See [LOCAL_VOICE_SETUP.md](LOCAL_VOICE_SETUP.md) and [VOICE_V048_CHANGELOG.md](VOICE_V048_CHANGELOG.md).

Use `bash scripts/setup-local-voice.sh english` (or `persian`/`both`) on Arch.
The local recognizer stays loaded between utterances, uses explicit English or Persian,
rejects blank/noise results, and optionally speaks replies with the system's offline voice.
No microphone audio reaches OpenRouter/Groq/NVIDIA. AppImage-only CI with existing serv00
`SERV00_UPLOAD_URL` + `SERV00_UPLOAD_TOKEN` remains unchanged.

## serv00 deployment (AppImage only)

GitHub Actions builds one AppImage and uploads it to your existing serv00 `ci.php?api=upload` HTTP endpoint using the two existing repository secrets `SERV00_UPLOAD_URL` and `SERV00_UPLOAD_TOKEN`. No SSH keys, Arch package, or GitHub-hosted binary artifact is required. See [SERV00_DEPLOY.md](SERV00_DEPLOY.md).
## v0.4.7 — Offline voice + checklist routine plans + responsive UI (previous release)

The installed binary is now consistently `~/.local/bin/rooz` (rather than the old `~/.local/opt/rooz/Rooz.AppImage` path). `scripts/install-appimage.sh` performs an atomic replacement, backs up the previous binary, installs one XDG autostart entry, and disables the legacy autostart entry to prevent duplicate launches. Run `~/.local/bin/rooz --quit` before updating.

The new binary supports `rooz --version` and `rooz --audio-check` without starting the graphical application. The AI panel shows `v0.4.7` so an older running copy is obvious. On native Linux, microphone capture uses `parec --device=@DEFAULT_SOURCE@` and local `whisper-cli`; no Groq audio transcription or WebKit microphone capture is used. Only transcription text can be sent to the configured AI chat provider.

**New routine planner:** multiple independently checkable items per reusable routine; optional instructions, required/optional items, weekday-specific item schedules and drag-to-reorder. Per-date check-in history is preserved. Routine/notes search now updates only its own grid, navigation preserves the shell/AI component, recurrence results are cached, and fullscreen exit requests repositioning to the bottom-right (KDE Wayland still needs KWin rules).

Build target remains **AppImage only**, and serv00 upload still uses the two previous URL/token secrets. Existing SQLite data and provider keys are unchanged.

---

# Rooz Next v0.4.2 — Advanced routines, Shamsi and AI

**New:** Complete scheduling rule editor (weekdays, weekends, odd/even Persian dates, monthly and exceptions), seven-day planner, Persian calendar, optional OpenRouter/Groq/NVIDIA AI, local FTS retrieval with future-deletion archive, V2Ray proxy, hands-free voice and KDE voice launcher. **[Read the v0.4 feature and setup guide](V040_FEATURES.md).**

**Native Tauri build and KDE/Wayland/microphone integration have not been verified locally.** Use GitHub Actions to compile and test.

---

# Rooz v0.3.2 — your daily space ✦

**A real native Linux desktop application rewritten with Tauri 2, Rust, SQLite, and an unusually lightweight TypeScript UI.** No Electron. No external font, animation, or UI-library dependencies. No account or background network connection. The interface uses transparent, multi-layer glass panels, reflective edge lighting, interactive 3D tilt, animated transitions, and a compact corner widget/expanded workspace layout.

> **Important build status:** Frontend TypeScript compiles cleanly, browser-interaction tests pass, and screenshots are included. The native Rust/Tauri binary has **not** been compiled here because this build container does not have `cargo`/`rustc` installed. This is a **source release**, not a verified ready-to-run AppImage. Build it on Arch or use the included GitHub Actions workflow.

![Rooz compact screenshot](preview/compact.png)

## GitHub Actions: AppImage only + serv00 upload

The CI workflow **`.github/workflows/linux-appimage.yml` now builds only one Linux x86_64 AppImage** on Ubuntu 22.04. There is **no Arch package, no PKGBUILD, and no `.pkg.tar.zst` artifact or release gate**. Source may still be compiled locally on Arch, but CI never builds an Arch package.

The root cause of the v0.4.0 failed builds was Rust error `E0599` in `src-tauri/src/ai.rs`, where `OpenOptions::mode(0o600)` lacked the Unix `OpenOptionsExt` trait import. v0.4.1 fixes the import and preserves the restrictive permissions for AI API keys. Existing data remains unchanged.

**Build using GitHub:** Push the source to `main` or `master`, or use Actions → **Rooz AppImage (x86_64)** → Run workflow. After a successful run, download the AppImage directly from your configured **serv00** website. GitHub Actions no longer retains the AppImage in Artifacts or GitHub Releases; see [SERV00_DEPLOY.md](SERV00_DEPLOY.md).

**Install the downloaded AppImage:**

```bash
chmod +x ./Rooz*.AppImage
./Rooz*.AppImage
# Optionally, register startup and KDE launcher from this source directory:
./scripts/install-appimage.sh ./Rooz*.AppImage
```

If you instead keep the AppImage at `~/.local/bin/rooz`, you can simply replace that file with the new AppImage (after quitting the existing process). Your existing `~/.config/autostart/rooz.desktop` may already point to it. Do not register duplicate autostart entries.

## Install on Arch / EndeavourOS

Run in this extracted folder:

```bash
# Optional but recommended: stop the older GTK Rooz before switching versions.
./scripts/install-arch.sh
~/.local/bin/rooz
```

The installer updates Arch dependencies, installs the Rust Tauri 2 CLI if necessary, builds a native binary, registers the launcher, and enables session autostart. Nothing in `~/.local/share/rooz/` is removed.

Manual build / development:

```bash
sudo pacman -Syu --needed rust cargo base-devel pkgconf webkit2gtk-4.1 gtk3 \
  curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool
cargo install tauri-cli --version '^2.0.0' --locked
cargo tauri dev                    # native debug window
cargo tauri build --no-bundle      # direct local binary
./scripts/install-built.sh        # install compiled binary + autostart
# Or: cargo tauri build --bundles appimage
```

The checked-in `web/*.js` is built from `frontend/*.ts`. To change TypeScript, use `tsc --noEmit` to verify and `tsc` to regenerate output (TypeScript can be installed separately). **Tauri needs no frontend npm packages.**

## Functionality

- **Today and Tomorrow:** tasks, completion tracking, priorities, categories, notes, times, reminders, repeat daily/weekly, drag/drop reorder, quick capture with `@14:30`, `tomorrow`, `#work`, `!`/`!!` keywords.
- **Routines:** reusable undated errands, configurable daily/weekly/interval/monthly schedules, independent completion history, pause/resume, optional timed reminders.
- **Calendar:** interactive month grid and day-specific scheduling; Gregorian date engine with Persian-localized date labels, not a native Jalali grid.
- **Notes:** categorized searchable cards, HTML rich-text editor with selection bubble, bold/italic/underline/highlight/heading/lists/links, Markdown-source toggle, Markdown export and local autosave.
- **Link cards:** safe clickable URL/hostname previews in notes. **Not** remote OpenGraph previews: no automatic network access.
- **Focus:** 15/25/45/60 minute timer, pause/resume/reset, completion chime; elapsed time is based on the actual clock (no `setInterval` drift).
- **Command center:** Ctrl+K fuzzy-style substring search over actions, tasks, routines and notes, keyboard navigation.
- **Native reminder loop:** Rust thread checks scheduled tasks and routines every 20 seconds, persists reminder fingerprints in SQLite, sends system notifications, and optionally speaks with installed local Piper voice; continues when the window is hidden. 5-minute snooze is available on previously alerted timed tasks from the task details dialog.
- **Desktop integration:** single-instance CLI, tray icon, launch-at-login desktop file, `--toggle`, `--background`, `--hide` and `--quit` support.
- **RTL/LTR:** Persian/English setting controls writing direction, controls, labels and date localization. Some microcopy remains in English.

## UX shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+1` … `Ctrl+6` | Today, Tomorrow, Routines, Calendar, Notes, Focus |
| `Ctrl+K` | Search/command palette (link tool while editing a note) |
| `/` | Jump to quick capture / note search |
| `N` | New task or note (outside inputs) |
| `Ctrl+S` | Save the open note |
| `Esc` | Dismiss, back, or hide |

Rooz at login: `$HOME/.config/autostart/ir.aasoft.rooz.desktop`. Window close hides the app so background reminders keep running. To fully quit: system tray → **Quit completely**.

## KDE Plasma window placement

**X11:** the native Rust code requests bottom-right placement (a margin above the Plasma panel). **Wayland:** standard Tauri window placement is restricted by Wayland's security model; exact anchoring is *not guaranteed*. On KDE Plasma Wayland, use **System Settings → Window Management → Window Rules** to match the Rooz window and configure initial size/position. The compact dimensions are 438×704; use the KWin property detector to select the app identity. The app's `--toggle` can be bound to a KDE custom shortcut; match `rooz` or `ir.aasoft.rooz` depending on detected window class.

## Data migration and privacy

Uses the **same existing database** as Rooz v0.1: `~/.local/share/rooz/rooz.db`. On first run, one non-destructive `body_format` column is added to `notes`; old note bodies remain in Markdown format and render in the new editor. Tasks and notes are not deleted or reset. **Stop the old GTK app before launching the new one**, and make a backup if the data is important:

```bash
sqlite3 ~/.local/share/rooz/rooz.db ".backup '$HOME/rooz-backup.db'"
```

The preview in a normal browser intentionally starts with illustrative sample data saved in that browser's localStorage. That demo is **separate** from the native SQLite database; native first launch does not import the demo.

## Performance model

One native WebKitGTK WebView, no Node process, no React render cycle, and no graphics engine. CSS glass, native opacity/transforms and GPU-composited transitions; 3D tilt only reacts to pointer movement. JS only updates when data changes or the focus timer ticks. The Rust reminder thread is independent of WebView scheduling. Actual FPS, memory consumption and native window performance still require testing on an Arch KDE machine.

## Tests

```bash
# TypeScript checks + JS emission: tsc  (if installed)
tsc --noEmit
tsc
# Headless Chromium UI integration test requires Python playwright and /usr/bin/chromium
python3 tests/bundle_for_test.py
python3 tests/smoke.py
# Native checks on a configured Arch build host:
cd src-tauri && cargo test
```

The headless test uses inline local CSS/JS because the development environment blocked Chromium from navigating localhost. This is a test harness only; Tauri loads the real ES modules from `web/`.

## Directory map

- `src-tauri/src/lib.rs`: Rust/SQLite persistence, schema migration, native reminders, tray, window management.
- `src-tauri/capabilities/default.json`: restrictive Tauri capability.
- `frontend/{backend,views,editor,app}.ts`: dependency-free TypeScript source.
- `web/{app,views,editor,backend}.js` + `style.css`: compiled UI, complete visual theme.
- `scripts/install-arch.sh`: Arch build/installation/autostart.
- `.github/workflows/linux-appimage.yml`: AppImage-only build, tests and direct serv00 upload.
- `packaging/arch/ir.aasoft.rooz.desktop`: shared KDE launcher source (not an Arch package).
- `scripts/install-appimage.sh`: optional per-user AppImage installation/autostart.
- `tests`: browser integration tests; `preview`: UI screenshots.

### Known limitations

Native compilation was not performed here. Certain WebKitGTK versions may differ from Chromium in contenteditable toolbar/transparent-window behavior. Reminder delivery and Persian TTS depend on the local desktop notification and Speech Dispatcher services; no guarantee of natural Persian speech. GNOME Wayland has further placement restrictions. Clipboard operations, drag/drop to external apps, CalDAV/Google Calendar sync, true Jalali grid, full WYSIWYG tables/media and natural-language AI scheduling are **not** included in this source release.

MIT License. Design informed by the glasswork/ThreeUI/Motionin/60fps design references, but original implementation rather than copied code.

## New in v0.3 — Routines (Rhythm Studio)

Select the **Routines** icon in the dock (or press `Ctrl+3`; the other shortcuts are `Ctrl+1` Today, `Ctrl+2` Tomorrow, `Ctrl+4` Calendar, `Ctrl+5` Notes, `Ctrl+6` Focus).

Click **New** to add a reusable routine. Routines are **not** ordinary tasks and never clutter the dated task list. Choose one of these repeat schedules:

| Kind | Example | Behavior |
| --- | --- | --- |
| Anytime | Pick up prescriptions, do errands | An undated reusable checklist, available for check-in every day after the start date |
| Daily | Take a walk | Due every day |
| Selected weekdays | Monday, Thursday | Each selected weekday; Monday=first weekday |
| Every N days | Clean desk every 3 days | Anchored to Start date, not to the most recent check-in |
| Monthly | Pay a bill on the 31st | Uses the last day in months without the chosen date |

**Check-in:** On a scheduled day (or any day for an Anytime errand), click **Mark complete**. The routine template stays in place while a dated completion is added. Click **Completed today** to undo, or open **History** to inspect and undo older entries. One check-in per routine/date avoids duplicate credits. **Pause** a routine using the Active toggle in its editor; its history remains intact.

**Reminder:** Enter a time for scheduled routines; offline Piper voice is optional and controlled by Preferences. The Rust background loop checks every 20 seconds and deduplicates notifications in `routine_alerts`. Anytime errands do not have automatic time reminders, even if a time was entered. Routine schedules use local Gregorian ISO dates internally; Persian text and RTL are supported, but the native schedule picker is Gregorian.

**Upgrade safety:** v0.3 writes only three new tables: `routines`, `routine_completions`, and `routine_alerts`. They are created on startup through an additive migration in the **same** database as v0.2.1 (`~/.local/share/rooz/rooz.db`). Existing tasks, task check-ins, notes and settings are not moved or deleted. Make a backup of the database before installing the update if it contains important data. Uninstalling v0.3 does not automatically remove its routine tables.

**Frontend preview/demo:** The browser fallback contains four illustrative routines stored in browser localStorage; these are not inserted into your native SQLite database. Native installation starts with your real data.

### Verification

```bash
npm run typecheck && npm run build:web
python3 tests/test_packaging.py
python3 tests/test_routines_db.py
python3 tests/bundle_for_test.py
python3 tests/smoke.py
python3 tests/test_routines_ui.py
# On a machine with Rust/Tauri dependencies:
cargo test --manifest-path src-tauri/Cargo.toml
```

The last two browser suites use Chromium and Python Playwright; the Arch/AppImage CI does not require Playwright. Native CI runs the Rust tests on both Ubuntu and Arch.

### v0.4.2 — AppImage verification fix

An earlier GitHub Actions build succeeded but its verifier incorrectly failed: Tauri/LinuxDeploy puts desktop entries in `usr/share/applications/`, while the root-level `.desktop` file is a symlink. The old check (`find -maxdepth 3 -type f`) missed both. CI now uses `scripts/verify-appimage.sh`, which verifies the type-2 AppImage signature, extracts it without FUSE, and checks its real `AppRun`, desktop entry and native executable. This does not change application data.


## v0.4.3 — KDE corner window and native voice fallback

Rooz has **two window modes only**: compact 438×704 corner panel (default) and
real fullscreen (F11 or the header control). The old centered 1134×760
"expanded" window was removed. The panel animates from the lower-right edge.

- **Plasma X11:** the application positions its window at the monitor's
  bottom-right above the panel.
- **Plasma 6 Wayland:** KWin, not Tauri, owns positioning. Rooz installs a
  KWin script scoped to Rooz only on the first KDE Wayland launch. To install
  or re-enable manually, run `~/.local/bin/rooz --install-kde-anchor` once.
  For the existing AppImage (before rebuilding), run `bash scripts/install-kde-anchor.sh` from the updated source.
  If it isn't applied immediately, log out and back in; check **System Settings
  → Window Management → KWin Scripts → Rooz · Bottom-right anchor**.
  On small screens the panel is clamped inside KWin's work area.
- The app is initially hidden until the native setup positions and shows it;
  it has one launcher mode and one fullscreen mode, not a centered desktop view.

### Microphone on Arch + PipeWire

`getUserMedia` on WebKitGTK can return `OverconstrainedError: Invalid
constraint`, even with a working microphone. Rooz now requests `{audio:true}`
and falls back to native `parec` when WebKit rejects audio capture. Native
capture monitors speech energy and stops after roughly 1.45s of silence;
no push-to-talk button is required. PCM is held in memory and converted to a
16kHz mono WAV for the existing transcription backend. Install the sound
compatibility tools on Arch if missing:

```bash
sudo pacman -S --needed libpulse
command -v parec
wpctl status
```

`parec` uses your default PulseAudio/PipeWire input. Make sure a mic is selected
with `wpctl status` or KDE Audio settings. If audio capture succeeds but
transcription fails, install the local `whisper-cli` model with `bash scripts/setup-local-voice.sh`; Groq speech transcription is disabled.
The native path has not been hardware-tested in this build environment.

The AppImage-only GitHub Actions workflow remains unchanged except for added
regression tests. All existing SQLite data is preserved.

### v0.4.4 — Voice STT and KDE corner placement

This update fixes the `groq request failed: curl: symbol lookup error: ... libcurl.so.4 ... nghttp2_option_set_no_rfc9113_leading_and_trailing_ws_validation` crash seen with the Ubuntu-built AppImage on current Arch Linux. All AI API calls now use Rust HTTP/rustls (no system `curl` subprocess). Native audio utilities such as `parec` are launched without AppImage-owned library paths. Provider keys and your V2Ray proxy settings remain unchanged.

The **only two display modes** remain corner widget (438×704 logical pixels) and true fullscreen (F11). On KDE Wayland, KWin must position the window; application calls alone cannot reliably enforce it. Version 0.4.4 registers the Rooz-only KWin script using `kpackagetool6` rather than merely copying files. On KDE X11, Rooz also requests bottom-right placement directly.

After building/installing v0.4.4, quit the old Rooz completely, start the new AppImage, and run this repair command **once** from your desktop session to refresh any old KWin script:

```bash
~/.local/bin/rooz --install-kde-anchor
```

If it reports missing KDE tools, on Arch install `kpackage` and `libpulse` as needed: `sudo pacman -S --needed kpackage libpulse`. Verify that the `Rooz · Bottom-right anchor` script is enabled under **System Settings → Window Management → KWin Scripts**. If the new position does not apply immediately, log out and back in; you don't need to reboot. The source alternative is `bash scripts/install-kde-anchor.sh`.

If your specific KWin configuration still ignores scripted positioning, create a KWin Window Rule for the Rooz window (detect Window Class/Application, set Position to Apply Initially) rather than relying on Tauri's Wayland window positioning. This fallback may require re-setting the coordinates if your monitor or panel geometry changes.

Verification: 26 Python regression checks, KWin JavaScript simulated geometry test, TypeScript compilation, and browser frontend smoke/routines/AI UI tests passed in the source environment. The native Rust/AppImage build and actual KWin/microphone integration are **not** tested here; verify them through the included **AppImage-only** GitHub Actions workflow and a real KDE session.

### Rooz 0.4.6 offline voice

Speech recognition is **local-only** (PipeWire/PulseAudio `parec` → `whisper-cli` → text). No online voice/STT/TTS providers are called. Run `bash scripts/setup-local-voice.sh` once on Arch and read [`LOCAL_VOICE_SETUP.md`](LOCAL_VOICE_SETUP.md). The GitHub Actions workflow remains AppImage-only and uploads via `SERV00_UPLOAD_URL` / `SERV00_UPLOAD_TOKEN`.
