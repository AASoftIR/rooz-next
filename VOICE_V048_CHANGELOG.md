# Rooz 0.4.8 — Fast Offline Voice

- Replaced one-process-per-utterance Whisper with a persistent Vosk worker using the default system microphone.
- Explicit English/Persian speech model selection. Removed the previous automatic language guessing that misclassified English as Turkish.
- Silence trimming, faster endpointing, acoustic noise rejection, text confidence filtering; no literal `[BLANK_AUDIO]` responses.
- Optional fully local spoken replies using Speech Dispatcher/eSpeak. No cloud STT, no AI voice models or streamed audio.
- Preserved all task, routine, Shamsi calendar, AI chat, and existing SQLite data.
- AppImage-only CI and serv00 token/URL HTTP upload remain unchanged.
- Native compilation, PipeWire mic, model accuracy, speech output, and KDE window behavior still require testing on Arch.
