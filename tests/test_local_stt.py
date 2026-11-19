#!/usr/bin/env python3
"""Regression checks: voice samples must never reach a remote AI service."""
import json, subprocess, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class LocalSTTTests(unittest.TestCase):
 def test_remote_audio_endpoints_absent_and_local_speech_only(self):
  rust=(ROOT/'src-tauri/src/ai.rs').read_text()
  lib=(ROOT/'src-tauri/src/lib.rs').read_text()
  frontend=(ROOT/'frontend/assistant.ts').read_text()
  self.assertNotIn('/audio/transcriptions',rust)
  self.assertNotIn('multipart::',rust)
  self.assertNotIn('Part::bytes',rust)
  self.assertIn('async fn speak_local(',lib)
  self.assertIn('backend.speakLocal',frontend)
  self.assertNotIn('getUserMedia',frontend)
  self.assertIn('host_command::command("python3")',rust)
  self.assertIn('LOCAL_WORKER',rust)
  self.assertIn('ai::transcribe(&c,wav)',lib)
  self.assertIn('await backend.captureLocalSpeech()',frontend)
  self.assertIn('Voice samples NEVER',rust)
 def test_legacy_setting_cannot_reenable_remote_stt(self):
  rust=(ROOT/'src-tauri/src/ai.rs').read_text()
  lib=(ROOT/'src-tauri/src/lib.rs').read_text()
  self.assertNotIn('setting(db,"ai_stt"',rust)
  self.assertIn('Old ai_stt settings are kept for database compatibility',lib)
 def test_local_setup_script_is_noninteractive_in_check_mode(self):
  script=ROOT/'scripts/setup-local-voice.sh'
  result=subprocess.run(['bash','-n',str(script)],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
  result=subprocess.run(['bash',str(script),'--check'],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
  self.assertIn('python3',result.stdout)
 def test_only_appimage_and_existing_http_serv00_secrets(self):
  yaml=(ROOT/'.github/workflows/linux-appimage.yml').read_text()
  self.assertIn('SERV00_UPLOAD_URL',yaml)
  self.assertIn('SERV00_UPLOAD_TOKEN',yaml)
  self.assertIn('cargo tauri build --bundles appimage',yaml)
  self.assertNotIn('SERV00_SSH_PRIVATE_KEY',yaml)
  self.assertNotIn('.pkg.tar.zst',yaml)
if __name__=='__main__':unittest.main(verbosity=2)
