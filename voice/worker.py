"""Rooz local Vosk STT worker. Persistent process, one model load per language.

Protocol: worker emits JSON {ready: true}; caller sends `LEN\n` + PCM16/16kHz
little-endian mono bytes, worker responds with JSON {text, confidence} per turn.
No network, audio files, or speech API calls. stdout MUST contain JSON only.
"""
import json
import re
import sys

BAD = re.compile(r"\[(?:blank[_ ]audio|music|noise|silence|applause)\]|<\|[^>]+\|>", re.I)


def clean(text):
    text = BAD.sub("", str(text or ""))
    text = " ".join(text.split()).strip()
    if text.casefold() in {"", "blank audio", "music", "noise", "silence"}:
        return ""
    return text


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def read_exact(reader, size):
    out = bytearray()
    while len(out) < size:
        part = reader.read(size - len(out))
        if not part:
            raise EOFError("Incomplete audio frame")
        out.extend(part)
    return bytes(out)


def transcribe(model, pcm, recognizer_class):
    recognizer = recognizer_class(model, 16000)
    recognizer.SetWords(True)
    results = []
    for offset in range(0, len(pcm), 4000):
        if recognizer.AcceptWaveform(pcm[offset:offset + 4000]):
            results.append(json.loads(recognizer.Result()))
    results.append(json.loads(recognizer.FinalResult()))
    texts = []
    confidences = []
    for result in results:
        words = result.get('result') or []
        if words:
            confidences.extend(w.get('conf', 1.0) for w in words)
        txt = clean(result.get('text', ''))
        if txt:
            texts.append(txt)
    avg = sum(confidences) / len(confidences) if confidences else 0.0
    text = clean(' '.join(texts))
    # A low-confidence hallucination must not execute a command or wake the agent.
    if not confidences or avg < 0.46:
        text = ''
    return {'text': text, 'confidence': round(avg, 3)}


def run():
    try:
        from vosk import Model, KaldiRecognizer, SetLogLevel
        SetLogLevel(-1)
        model = Model(sys.argv[1])
    except Exception as exc:
        emit({'error': 'Cannot load Vosk model: ' + str(exc)})
        return 2
    emit({'ready': True})
    reader = sys.stdin.buffer
    while True:
        line = reader.readline()
        if not line:
            break
        try:
            size = int(line.strip())
            if size < 0 or size > 16_000 * 2 * 30:
                raise ValueError('Invalid PCM frame size')
            pcm = read_exact(reader, size)
            emit(transcribe(model, pcm, KaldiRecognizer))
        except Exception as exc:
            emit({'error': str(exc)[:350]})
    return 0


if __name__ == '__main__':
    sys.exit(run())
