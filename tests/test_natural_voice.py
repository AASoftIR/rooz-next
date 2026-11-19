"""Regression checks for the local natural-speaker pipeline and stable voice UI."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NaturalVoiceTests(unittest.TestCase):
    def test_no_remote_speech_and_no_legacy_robot_fallback(self):
        native = (ROOT / 'src-tauri/src/voice_output.rs').read_text()
        self.assertIn('--output-raw', native)
        self.assertIn('aplay', native)
        self.assertIn('SPEECH_SESSION', native)
        self.assertIn('en_US-lessac-high', native)
        self.assertIn('fa_IR-reza_ibrahim-medium', native)
        self.assertNotIn('spd-say', native)
        self.assertNotIn('espeak-ng', native)
        self.assertNotIn('http://', native)
        self.assertNotIn('https://', native)
        lib = (ROOT / 'src-tauri/src/lib.rs').read_text()
        self.assertIn('voice_output::speak', lib)
        self.assertIn('fn stop_local_speech()', lib)
        self.assertIn('stop_local_speech,', lib)

    def test_voice_panel_is_patched_in_place(self):
        source = (ROOT / 'frontend/assistant.ts').read_text()
        self.assertIn('existing.dataset.mode===mode', source)
        self.assertIn('mic?.classList.toggle', source)
        self.assertIn('backend.stopLocalSpeech()', source)
        self.assertIn('backend.aiChat(text,true)', source)
        self.assertIn('speechWarned', source)

    def test_natural_speaker_installer(self):
        installer = ROOT / 'scripts/setup-local-voice.sh'
        check = subprocess.run(['bash','-n',str(installer)],capture_output=True,text=True)
        self.assertEqual(check.returncode,0,check.stderr)
        code = installer.read_text()
        self.assertIn('speaker-english',code)
        self.assertIn('speaker-persian',code)
        self.assertIn('huggingface.co/rhasspy/piper-voices',code)
        self.assertIn('expected_hash',code)


if __name__ == '__main__':
    unittest.main(verbosity=2)
