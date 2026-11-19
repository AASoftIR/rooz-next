## v0.4.12 — Scheduling insights, faster AI and missed-task recovery

- Added a seven-day workload preview and an explicit, atomic **Bring into today**
  operation for overdue one-off tasks. Recurring tasks are not rescheduled.
- Reusable child routines now update the completion state of every enclosing
  routine when their checklists change; completing/undoing a whole template
  also updates its enclosing checklist links.
- Added a schedule-aware streak, last-30-days completion rate and four-week
  routine history heatmap.
- Common personal planner questions are answered entirely from local task and
  routine data. These answers need no provider key and do not send private data.
- Text-model catalogues are reused for 15 minutes; the first discovery is
  bounded to 10 seconds and changes to API credentials invalidate the cache.
  The assistant panel now opens before slow local voice availability checks.
- Tests cover scheduling, persistence, composition and browser preview logic.
  CI builds **only** an AppImage and uses the existing serv00 HTTP uploader.

**Verification boundary:** source/TypeScript/SQLite/Node tests can run outside
GitHub Actions, but a genuine Tauri Rust compile, Linux desktop UI, offline
microphone capture, provider response time and finished AppImage must be
verified on the target platform.

## v0.4.6 — local speech without voice APIs

Rooz uses the native system-default microphone and offline `whisper-cli` model. AI chat requests contain only text. Read `LOCAL_VOICE_SETUP.md` and use `scripts/setup-local-voice.sh` once on Arch. GitHub CI stays AppImage-only and sends verified builds to the existing serv00 HTTP token uploader. The native build still needs confirmation in GitHub Actions.

## Direct serv00 AppImage delivery (CI-only update)

Build remains AppImage-only. Deployment uses the existing serv00 HTTP upload API (`ci.php?api=upload`), authenticated with repository secrets `SERV00_UPLOAD_URL` and `SERV00_UPLOAD_TOKEN`. No SSH/SFTP job, GitHub artifact, or Arch package is generated. The application version remains 0.4.5 because no app code or database schema changed.

# v0.4.2 — Fix false-negative AppImage verification

- Tauri AppImage itself was built; CI then failed in a faulty check of `.desktop` files.
- Fixed verification of LinuxDeploy's real desktop-entry location and symlink layout.
- Verifies type-2 AppImage header, extraction, `AppRun`, desktop file, and `usr/bin/rooz` with diagnostics.
- Added regression tests for valid and invalid AppDir layouts.
- GitHub Actions remains **AppImage-only**, Ubuntu 22.04 x86_64.
- No application database migration or frontend changes.

**Verification boundary:** the real GitHub Actions AppImage verification must be run to confirm the new script on an actual generated AppImage.

## Previous: v0.4.1 — AppImage-only CI / Rust E0599 fix

- Fixed `OpenOptions::mode(0o600)` compilation by importing `std::os::unix::fs::OpenOptionsExt` alongside `PermissionsExt`.
- Removed two unused imports in `ai.rs`; API-key config stays `0600`.
- Removed the native Arch package build and release dependency. GitHub Actions now builds, tests, verifies, uploads and optionally publishes **one AppImage**.
- Dropped Arch `PKGBUILD` and `scripts/package-arch.sh`; native desktop entry and optional local source scripts remain.
- Updated regression tests to verify AppImage-only output, version consistency and the Rust permissions import.

**Verification boundary:** Rust/Tauri itself needs GitHub Actions to compile; local offline tests and TypeScript checks do not prove the AppImage is built successfully.
