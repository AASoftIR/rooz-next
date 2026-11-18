"""Behavioral tests for the single-path, per-user AppImage updater."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INSTALL=ROOT/'scripts/install-appimage.sh'


def fake_appimage(path: Path, marker: int):
    buf=bytearray(160)
    buf[0:4]=b'\x7fELF'
    buf[8:11]=b'AI\x02'
    buf[50]=marker
    path.write_bytes(buf)
    path.chmod(0o755)


class InstallTests(unittest.TestCase):
    def run_install(self, root, src):
        env=dict(os.environ, HOME=str(root), ROOZ_INSTALL_SKIP_VERSION_CHECK='1')
        return subprocess.run(['bash',str(INSTALL),str(src)],env=env,capture_output=True,text=True)

    def test_installs_stable_path_and_single_autostart(self):
        with tempfile.TemporaryDirectory() as tmp:
            home=Path(tmp)/'home';home.mkdir()
            source=Path(tmp)/'Rooz.AppImage';fake_appimage(source,20)
            result=self.run_install(home,source)
            self.assertEqual(result.returncode,0,result.stderr)
            dest=home/'.local/bin/rooz'
            self.assertEqual(dest.read_bytes(),source.read_bytes())
            enabled=(home/'.config/autostart/rooz.desktop').read_text()
            self.assertIn(f'Exec="{dest}"',enabled)
            legacy=(home/'.config/autostart/ir.aasoft.rooz.desktop').read_text()
            self.assertIn('Hidden=true',legacy)
            shortcuts=(home/'.local/share/applications/ir.aasoft.rooz.voice.desktop').read_text()
            self.assertIn(f'Exec="{dest}" --voice',shortcuts)

    def test_update_replaces_file_and_saves_old_binary(self):
        with tempfile.TemporaryDirectory() as tmp:
            home=Path(tmp)/'home';home.mkdir()
            old=Path(tmp)/'old.AppImage';new=Path(tmp)/'new.AppImage'
            fake_appimage(old,5);fake_appimage(new,40)
            self.assertEqual(self.run_install(home,old).returncode,0)
            self.assertEqual(self.run_install(home,new).returncode,0)
            self.assertEqual((home/'.local/bin/rooz').read_bytes(),new.read_bytes())
            backups=list((home/'.local/share/rooz/appimage-backups').glob('rooz-*.AppImage'))
            self.assertEqual(len(backups),1)
            self.assertEqual(backups[0].read_bytes(),old.read_bytes())

    def test_rejects_invalid_binary(self):
        with tempfile.TemporaryDirectory() as tmp:
            home=Path(tmp)/'home';home.mkdir()
            source=Path(tmp)/'fake.AppImage';source.write_text('not a binary')
            result=self.run_install(home,source)
            self.assertNotEqual(result.returncode,0)
            self.assertFalse((home/'.local/bin/rooz').exists())

    def test_voice_backend_uses_default_mic_and_distinct_error(self):
        rust=(ROOT/'src-tauri/src/voice_capture.rs').read_text()
        ui=(ROOT/'frontend/assistant.ts').read_text()
        core=(ROOT/'src-tauri/src/lib.rs').read_text()
        self.assertIn('--device=@DEFAULT_SOURCE@',rust)
        self.assertIn('await backend.captureLocalSpeech()',ui)
        self.assertIn('Local microphone or speech recognition failed',ui)
        self.assertNotIn('Groq Whisper Turbo',ui)
        self.assertIn('arg == "--version"',core)
        self.assertIn('arg == "--audio-check"',core)

if __name__=='__main__':unittest.main(verbosity=2)
