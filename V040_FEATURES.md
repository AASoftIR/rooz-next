# Rooz 0.4 · Advanced routines, Shamsi calendar, AI and hands-free voice

> **Native build status:** TypeScript/browser tests and SQLite schema tests run offline. Rust/GTK/WebKitGTK native builds and Wayland/microphone behavior must be verified by the GitHub Actions runner and on KDE; do not infer that a passing frontend test guarantees a working AppImage.

## Advanced schedule planner

In **Routines → New**, define an optional *checklist/description*, and choose base repeat: Anytime, Daily, Weekly (specific weekdays), Every N days, or Monthly (specific day, with end-of-month clamping). Advanced rules can further constrain **odd/even month-day numbers**, **workdays or weekends** (configurable `0=Mon ... 6=Sun`, defaults to **Friday=4**), month numbers, selected days of the month, explicit occurrence dates and exceptions. The same editing screen previews up to eight future occurrences; a seven-day overview shows scheduled routines. Time-based routine notifications continue in the native background process even when hidden.

**Shamsi:** Calendar → toggle to **شمسی / Jalali**. Month grid, numbers and month navigation are Persian-calendar-aware. When Jalali mode is on, task and routine forms expose a Persian date entry field (e.g. `1405/08/24`), with validation. SQLite **continues to store ISO Gregorian dates** to preserve existing v0.2.1–v0.3.2 data. The advanced schedule's *calendar basis* controls whether odd/even, months, and month-days refer to Gregorian or Persian date components. Explicit add/skip dates are ISO `YYYY-MM-DD`. Date conversion uses `Intl.DateTimeFormat` in the UI and a Rust conversion for native reminders; check your system's locale and timezone.

**Example:** A "visit family on even Persian days" schedule uses Daily repeat + Jalali calendar basis + Even date parity. A weekend routine uses Daily repeat + Weekend preset and weekend weekday `4` (Friday), or enter `4,5` for Friday/Saturday.

## AI studio (opt-in)

Open via the header sparkle icon, or `rooz --ai`. Settings → choose OpenRouter, Groq or NVIDIA NIM, supply an API key, then select Model policy: **verified free / cheapest published / largest advertised context**. Discover lists models from the provider (models lacking advertised price cannot be safely treated as $0). OpenRouter provides a dynamic `openrouter/free` router. Availability and rates depend on your own account; only OpenRouter models explicitly marked `:free` or published with zero pricing count as guaranteed zero model-token price. The verified-free policy rejects non-verified free models for Groq/NVIDIA rather than silently charging. If your Groq account provides free-tier inference but the models API does not disclose price, switch to another policy after checking your account's limits.

V2Ray proxy defaults to `socks5h://127.0.0.1:10808`; HTTP alternatives such as `http://127.0.0.1:10809` can be configured. AI requests use an HTTPS-only allowlist and `curl`; install `curl` if needed. Credentials are stored in `~/.config/rooz/api-keys.json` with Unix permissions `0600` or read from `ROOZ_OPENROUTER_API_KEY`, `ROOZ_GROQ_API_KEY`, `ROOZ_NVIDIA_API_KEY`. Do not share your database/keys. Settings save to SQLite, but **API keys do not**.

**Local data retrieval:** Enable "Use my local context" explicitly in AI Settings. An SQLite FTS5 lexical index searches tasks, notes, routines, and **records deleted after this update**. The model receives only matching excerpts and only when RAG is enabled. Previously hard-deleted data cannot be recovered. This is keyword-FTS retrieval, not semantic embeddings; results depend on term matching and should be treated as untrusted reference data. Local search and archive work without any AI provider.

## Voice companion

Voice tab or `rooz --voice` opens the companion, which listens for the wake word **"help"**. No push-and-hold: microphone energy-based voice activity detection ends recording after about **1.25 seconds of silence** (with timeout), transcribes only with local `whisper-cli`, and displays the recognized words and replies as text. No transcription audio is sent to Groq or other providers; system-default PipeWire/PulseAudio microphone capture runs in native Rust. Setup instructions: `LOCAL_VOICE_SETUP.md`. Voice processing is local, while optional chat responses may still call a text-only AI API. Silence-end detection is heuristic and may need tuning.

Voice state machine:

- "help" starts voice chat; you can ask schedule questions or request navigation.
- "add time" / "add task" → assistant asks for task → keep speaking → **"finish"** → assistant repeats title → **"OK"** adds, **"wrong"** asks again, **"stop"** aborts.
- "add routine" → describe schedule such as "Clean desk every Friday" → "finish" → confirm. Parsers handle daily, weekly English day names, weekend, and monthly keywords; complex schedules still work best in the visual rule editor.
- "delete task" / "complete task" → say exact task title → confirm before change. Ambiguous matches are rejected.
- "show routines", "show calendar", "show today", "show notes", "what is due today" handle common local actions; unrelated/unclear questions are handled as chat and may require clarification.

**KDE global shortcut:** After installing the AppImage at `~/.local/bin/rooz`, run `./scripts/install-kde-voice-launchers.sh "$HOME/.local/bin/rooz"`, then configure System Settings → Keyboard → Shortcuts → Custom Shortcuts or Commands → `~/.local/bin/rooz --voice` and choose e.g. `Meta+Shift+V`. Alternatively pin the generated "Rooz · Toggle dashboard" launcher to the panel, for one-click access.

## Window + tray

`rooz --toggle` shows/hides the window. `rooz --fullscreen` expands to fullscreen, or press F11 in the app. On **X11**, Rooz positions itself bottom-right above the panel; its window is compact by default. On **KDE Wayland**, applications cannot dictate arbitrary screen positions; use **KWin Window Rules** to set a bottom-right location for the Rooz window. Tauri v2 on Linux has a StatusNotifier tray limitation: there is **no reliably distinct left-click vs. right-click tray event**. The menu therefore includes navigation, AI/voice, fullscreen and quit, and the panel launcher handles guaranteed single-click show/hide. Tray click behavior is **not** claimed to be natively fixed on all Plasma setups.

## Backups, upgrades and tests

`~/.local/share/rooz/rooz.db` is upgraded **additively**; existing tasks, notes, check-in history are retained. Before upgrading, quit Rooz completely (tray → Quit) and back up the SQLite database **including WAL/SHM** or use SQLite backup API; simplest after quitting: `cp ~/.local/share/rooz/rooz.db ~/.local/share/rooz/rooz.db.backup-$(date +%F)`.

```bash
npm run build:web
python3 tests/bundle_for_test.py
python3 tests/smoke.py
python3 tests/test_routines_ui.py
python3 tests/test_v040_ui.py
python3 tests/test_routines_db.py
python3 tests/test_ai_storage.py
python3 tests/test_packaging.py
```

Browser tests require Python Playwright and a local Chromium executable. Native AppImage builds use the GitHub Actions workflow; **the Rust build must pass on GitHub before using the release**.
