"""Regression guards for the exact Groq transcription and KWin startup bugs."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class RuntimeTests(unittest.TestCase):
    def test_no_curl_subprocess_in_ai(self):
        src=(ROOT/'src-tauri/src/ai.rs').read_text()
        self.assertNotIn('Command::new("curl")',src)
        self.assertNotIn('curl(db,',src)
        self.assertIn('Client::builder()',src)
        self.assertIn('reqwest::Proxy::all',src)
        self.assertIn('api_request(db,"groq","/audio/transcriptions",None,Some(&wav))',src)
        self.assertIn('multipart(Form::new()',src)
        self.assertIn('bearer_auth(key)',src)
    def test_child_process_does_not_inherit_appimage_library_shadowing(self):
        src=(ROOT/'src-tauri/src/host_command.rs').read_text()
        self.assertIn('LD_LIBRARY_PATH',src)
        self.assertIn('APPDIR',src)
        self.assertIn('is_appimage_path',src)
        for filename in ['voice_capture.rs','ai.rs','lib.rs']:
            self.assertIn('host_command::command', (ROOT/'src-tauri/src'/filename).read_text())
    def test_kwin_registration_and_upgrade(self):
        src=(ROOT/'src-tauri/src/lib.rs').read_text()
        self.assertIn('kpackagetool6',src)
        self.assertIn('unloadScript',src)
        self.assertIn('include_str!("../../packaging/kwin/roozanchor/contents/code/main.js")',src)
        self.assertIn('"--install-kde-anchor"',src)
        shell=(ROOT/'scripts/install-kde-anchor.sh').read_text()
        self.assertIn('kpackagetool6',shell)
        self.assertIn('reconfigure',shell)
if __name__=='__main__':unittest.main(verbosity=2)
