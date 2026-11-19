"""Fast voice worker protocol regression tests; simulated Vosk (no microphone needed)."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

MOCK_VOSK='''
import json
class Model:
 def __init__(self, model_path):
  self.path=model_path
class KaldiRecognizer:
 def __init__(self, model, rate):
  assert rate==16000
  self.data=b''
 def SetWords(self, b): pass
 def AcceptWaveform(self, data):
  self.data+=data
  return False
 def FinalResult(self):
  if b"silent" in self.data:
   return json.dumps({"text":"[BLANK_AUDIO]", "result":[]})
  if b"unclear" in self.data:
   return json.dumps({"text":"show routines", "result":[{"word":"show", "conf":0.2}]})
  return json.dumps({"text":"show routines", "result":[{"word":"show", "conf":0.95},{"word":"routines", "conf":0.93}]})
def SetLogLevel(_): pass
'''

class FastVoiceTests(unittest.TestCase):
 def test_vosk_model_is_loaded_once_across_turns(self):
  with tempfile.TemporaryDirectory() as temporary:
   model=Path(temporary)
   (model/'vosk.py').write_text(MOCK_VOSK)
   env={**os.environ,'PYTHONPATH':temporary}
   proc=subprocess.Popen([sys.executable,'-u',str(ROOT/'voice/worker.py'),temporary],
         stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
   try:
    self.assertTrue(json.loads(proc.stdout.readline())['ready'])
    for pcm,expected in [(b'voice', 'show routines'),(b'silent',''),(b'unclear',''),(b'voice','show routines')]:
     proc.stdin.write(f'{len(pcm)}\n'.encode()+pcm)
     proc.stdin.flush()
     data=json.loads(proc.stdout.readline())
     self.assertEqual(data['text'],expected)
    self.assertIsNone(proc.poll(), 'Worker must remain alive between utterances')
   finally:
    proc.stdin.close()
    proc.wait(timeout=5)
    proc.stdout.close()
    proc.stderr.close()
 def test_source_no_remote_speech_or_language_guessing(self):
  rust=(ROOT/'src-tauri/src/ai.rs').read_text()
  self.assertNotIn('/audio/transcriptions',rust)
  self.assertNotIn('"-l","auto"',rust)
  self.assertIn('vosk-model-small-en-us-0.15',rust)
  self.assertIn('vosk-model-small-fa-0.42',rust)
  self.assertIn('ai_stt_language',rust)
  self.assertIn('pub(crate) fn warm(',rust)
  self.assertIn('warm_local_voice', (ROOT/'src-tauri/src/lib.rs').read_text())
  self.assertIn('ai_local_voice_reply',(ROOT/'frontend/assistant.ts').read_text())
 def test_installer_and_bundle(self):
  sh=ROOT/'scripts/setup-local-voice.sh'
  result=subprocess.run(['bash','-n',str(sh)],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
  output=subprocess.run(['bash',str(sh),'--check'],capture_output=True,text=True)
  self.assertEqual(output.returncode,0,output.stderr)
  self.assertIn('python3',output.stdout)
  self.assertIn('include_str!("../../voice/worker.py")',(ROOT/'src-tauri/src/ai.rs').read_text())

if __name__=='__main__':unittest.main(verbosity=2)
