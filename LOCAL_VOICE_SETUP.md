# Rooz v0.4.11 — Natural local voice (Arch/EndeavourOS)

### v0.4.10 voice recovery

- Piper playback has a bounded wait (11 seconds) and can be killed on Stop.
- Offline Vosk subprocess failures trigger a single safe restart with the
  existing audio before reporting an error.
- One microphone failure triggers a fresh capture instead of ending the voice
  session. Voice AI HTTP requests time out after 18 seconds.
- The fullscreen exit is explicit and the compact widget is restored after
  KDE finishes the transition.

### Changes in v0.4.9

- **Natural speaker:** Rooz no longer falls back to robotic eSpeak. It uses the same
  strategy as Pele English (prefer a high-quality local voice), implemented with
  Piper on Linux because Android's native TextToSpeech API does not run in AppImages.
- **Two separate offline components:** Vosk transcribes microphone audio; Piper
  synthesizes replies. Neither uses a remote speech API. Only recognized text is
  optionally sent to a configured AI provider for questions that are not local commands.
- **Stable voice panel:** live updates no longer recreate the entire assistant DOM.
- **Faster commands:** opening routines and listing tasks execute locally. Voice AI
  answers are limited to two short sentences to reduce token latency.

### Install natural voices (one-time)

```bash
bash scripts/setup-local-voice.sh english
bash scripts/setup-local-voice.sh speaker-english
# For Persian conversations:
bash scripts/setup-local-voice.sh persian
bash scripts/setup-local-voice.sh speaker-persian
bash scripts/setup-local-voice.sh --check
```

The speaker installer uses Piper CLI (AUR `piper-tts-bin`) and `alsa-utils`.
It downloads the official English Lessac high-quality (~114 MB) or Persian
Reza Ibrahim medium-quality (~64 MB) model into
`~/.local/share/rooz/voices`. The model stays offline after installation.
Piper output is streamed to the sound device without temporary audio files.
For a custom voice, set `ROOZ_PIPER_VOICE_EN` or `ROOZ_PIPER_VOICE_FA` to
the absolute ONNX path and ensure its matching `.onnx.json` is alongside it.
Voices vary in naturalness; performance depends on CPU and installed speakers.

### Update startup AppImage

```bash
bash scripts/install-appimage.sh ~/Downloads/Rooz_0.4.11_amd64.AppImage
```

The installer reuses `~/.local/bin/rooz` so an existing KDE autostart shortcut
pointing there continues to launch the upgraded app.

---

## Why v0.4.7 was slow and wrong

The previous implementation ran a fresh `whisper-cli` for every utterance, forced the tiny multilingual model to load each time, and asked Whisper to auto-detect the language (`-l auto`). Silence/noise can therefore be hallucinated as `[BLANK_AUDIO]` or speech in the wrong language. Text-only responses were intentional in that build.

## v0.4.8 recognition architecture (retained in 0.4.9)

- `parec` opens the **default PipeWire/PulseAudio source** at PCM16 16kHz. It stops after roughly 800ms of silence, and drops leading silence and very short noise bursts.
- The **persistent local Vosk** Python helper holds the selected language model in memory and decodes each utterance. It only emits JSON text and confidence; no microphone audio leaves the device.
- English model `vosk-model-small-en-us-0.15` (~40MB download), Persian model `vosk-model-small-fa-0.42` (~53MB) are installed separately and explicitly selected. Nothing auto-detects Turkish.
- UI confirms changes before executing them. Ordinary commands require no AI provider. For other requests, OpenRouter/Groq/NVIDIA receive only the recognized **text**, and optionally RAG data if enabled.
- **Spoken answers in v0.4.9:** Local Piper neural voice output (requires a one-time model download). No remote transcription or speech-generation API.

## Install on Arch

From the extracted Rooz source:

```bash
bash scripts/setup-local-voice.sh english
# Optional for Persian commands:
bash scripts/setup-local-voice.sh persian
# Or download both:
bash scripts/setup-local-voice.sh both
bash scripts/setup-local-voice.sh --check
```

Go to **Intelligence → Settings → Recognition language** and select English or فارسی. Toggle **Read answers aloud**. This is persistent and only affects voice mode.

The old Whisper GGML files are not deleted, but no longer needed. `python-vosk` and `libpulse` are from the Arch repositories. The official recognition models are downloaded once from `alphacephei.com/vosk/models` over HTTPS. The Piper speaker models are separate.

## Troubleshooting

```bash
pactl get-default-source
wpctl status
parec --device=@DEFAULT_SOURCE@ --raw --format=s16le --rate=16000 --channels=1 | head -c 32000 > /tmp/mic-test.pcm
printf '%s\n' 'The natural voice is working' | piper --model "$HOME/.local/share/rooz/voices/en_US-lessac-high.onnx" --output-raw | aplay -q -r 22050 -f S16_LE -c 1 -t raw -
~/.local/bin/rooz --version
```

If you don't want to send any text to providers, use only built-in commands or leave all API keys empty. The wake phrase is **help**, followed by e.g. **show routines** or **add task**. UI language and recognition language can be set separately.

No offline speech recognizer is perfect: small Vosk models prioritize speed over free-form dictation accuracy. Use English for English commands. Persian requires the Persian model and Persian recognition setting. Piper quality is much better than the earlier eSpeak fallback but differs from your phone's installed Android voice.

## Update startup AppImage

Stop Rooz completely, then run:

```bash
bash scripts/install-appimage.sh ~/Downloads/Rooz_0.4.11_amd64.AppImage
~/.local/bin/rooz --version
```

This replaces `~/.local/bin/rooz` and keeps the KDE autostart entry at the same path. One AppImage is built and uploaded to your existing serv00 HTTP endpoint; no Arch package or GitHub Release artifact is required.
