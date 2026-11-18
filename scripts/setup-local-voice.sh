#!/usr/bin/env bash
# Rooz fast local Vosk listening + optional Piper human-like offline replies.
set -euo pipefail
speaker=""
case "${1:-english}" in
  english) models=(vosk-model-small-en-us-0.15);;
  persian) models=(vosk-model-small-fa-0.42);;
  both) models=(vosk-model-small-en-us-0.15 vosk-model-small-fa-0.42);;
  speaker-english) speaker=english;models=();;
  speaker-persian) speaker=persian;models=();;
  speaker-both) speaker=both;models=();;
  --check)
    for tool in python3 parec pactl piper piper-tts aplay; do command -v "$tool" || true; done
    python3 -c 'import vosk; print("Vosk Python module: installed")' || true
    find "${XDG_DATA_HOME:-$HOME/.local/share}/rooz/models" -maxdepth 2 -path '*/am/final.mdl' -print 2>/dev/null || true
    find "${XDG_DATA_HOME:-$HOME/.local/share}/rooz/voices" -maxdepth 1 -name '*.onnx' -print 2>/dev/null || true
    exit 0;;
  *) echo 'Usage: bash scripts/setup-local-voice.sh [english|persian|both|speaker-english|speaker-persian|speaker-both|--check]' >&2; exit 2;;
esac
if ! command -v pacman >/dev/null; then echo 'This installer requires Arch/EndeavourOS.' >&2; exit 2; fi
if [[ -n "$speaker" ]]; then
  sudo pacman -S --needed alsa-utils
  if ! command -v piper >/dev/null && ! command -v piper-tts >/dev/null; then
    if command -v paru >/dev/null; then
      paru -S --needed piper-tts-bin
    elif command -v yay >/dev/null; then
      yay -S --needed piper-tts-bin
    else
      echo 'Install the Piper CLI first (e.g. with paru -S piper-tts-bin or yay -S piper-tts-bin), then rerun this script.' >&2
      exit 2
    fi
  fi
  SPEAKER_CHOICE="$speaker" python3 - <<'PY'
from pathlib import Path
from urllib.request import urlopen, Request
import hashlib, json, os, tempfile, shutil

entries = {
  'english': ('en/en_US/lessac/high', 'en_US-lessac-high',
              '4cabf7c3a638017137f34a1516522032d4fe3f38228a843cc9b764ddcbcd9e09'),
  'persian': ('fa/fa_IR/reza_ibrahim/medium', 'fa_IR-reza_ibrahim-medium', ''),
}
root = Path(os.environ.get('XDG_DATA_HOME', str(Path.home()/'.local/share')))/'rooz/voices'
root.mkdir(parents=True, exist_ok=True)
choice=os.environ['SPEAKER_CHOICE']
for name in (entries if choice=='both' else [choice]):
    remote, stem, expected_hash = entries[name]
    model = root/(stem+'.onnx')
    config = root/(stem+'.onnx.json')
    if model.is_file() and config.is_file():
        print('Already installed:',model)
        continue
    with tempfile.TemporaryDirectory(prefix='.rooz-voice-',dir=root) as tmp:
        tmp=Path(tmp)
        for extension in ('.onnx','.onnx.json'):
            target=tmp/(stem+extension)
            url=f'https://huggingface.co/rhasspy/piper-voices/resolve/main/{remote}/{stem}{extension}'
            print('Downloading:',stem+extension,flush=True)
            with urlopen(Request(url,headers={'User-Agent':'Rooz/0.4.9'}),timeout=180) as response, target.open('wb') as out:
                if response.status != 200:
                    raise RuntimeError(f'Download failed ({response.status})')
                shutil.copyfileobj(response,out)
        if (tmp/(stem+'.onnx')).stat().st_size < 30_000_000:
            raise RuntimeError('Piper model download is truncated')
        if expected_hash:
            digest=hashlib.sha256((tmp/(stem+'.onnx')).read_bytes()).hexdigest()
            if digest != expected_hash:
                raise RuntimeError('Piper model SHA256 verification failed')
        with (tmp/(stem+'.onnx.json')).open() as stream:
            settings=json.load(stream)
        if not 8000 <= int(settings['audio']['sample_rate']) <= 48000:
            raise RuntimeError('Unsupported Piper sample rate')
        (tmp/(stem+'.onnx')).replace(model)
        (tmp/(stem+'.onnx.json')).replace(config)
    print('Ready:',model)
PY
  echo 'Natural offline speaker installed. Restart Rooz, and enable spoken replies in AI Settings.'
  exit 0
fi
sudo pacman -S --needed python-vosk libpulse
model_dir="${XDG_DATA_HOME:-$HOME/.local/share}/rooz/models"
mkdir -p "$model_dir"
for model in "${models[@]}"; do
  MODEL_NAME="$model" MODEL_DIR="$model_dir" python3 - <<'PY'
from pathlib import Path
from urllib.request import urlopen, Request
import os, tempfile, zipfile, shutil
name = os.environ['MODEL_NAME']
folder = Path(os.environ['MODEL_DIR'])
target = folder / name
if (target/'am'/'final.mdl').is_file():
    print('Already installed:', target)
else:
    url = 'https://alphacephei.com/vosk/models/' + name + '.zip'
    print('Downloading local voice model:', url, flush=True)
    with tempfile.TemporaryDirectory(prefix='.rooz-stt-', dir=folder) as tmp:
        temp = Path(tmp)
        archive = temp/'model.zip'
        with urlopen(Request(url, headers={'User-Agent':'Rooz/0.4.8'}), timeout=120) as response, archive.open('wb') as out:
            shutil.copyfileobj(response,out)
        with zipfile.ZipFile(archive) as z:
            for item in z.infolist():
                parts=Path(item.filename).parts
                if not parts or parts[0] != name or '..' in parts or item.is_dir() and not item.filename.endswith('/'):
                    raise RuntimeError('Unexpected model archive entry: ' + item.filename)
                if item.file_size > 400*1024*1024:
                    raise RuntimeError('Unexpectedly large model entry')
            z.extractall(temp)
        source = temp/name
        if not (source/'am'/'final.mdl').is_file():
            raise RuntimeError('Incomplete Vosk model; final.mdl missing')
        source.rename(target)
    print('Installed:',target)
PY
done
echo 'Rooz local recognition ready. Select English or Persian under AI Settings.'
echo 'For natural offline speech, run: bash scripts/setup-local-voice.sh speaker-english (or speaker-persian).'
echo 'No audio is uploaded; AI chat providers receive only recognized text.'
