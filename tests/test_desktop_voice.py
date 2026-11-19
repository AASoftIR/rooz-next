#!/usr/bin/env python3
"""Checks for regressions in Tauri/AppImage voice and KDE placement wiring.

These checks do not replace compiling on Linux or testing a physical microphone.
"""
from pathlib import Path
import unittest, json, re

ROOT=Path(__file__).resolve().parents[1]
class DesktopVoiceTests(unittest.TestCase):
    def test_two_window_modes_only(self):
        rust=(ROOT/'src-tauri/src/lib.rs').read_text()
        view=(ROOT/'frontend/views.ts').read_text()
        config=json.loads((ROOT/'src-tauri/tauri.conf.json').read_text())
        self.assertNotIn('.center()',rust)
        self.assertNotIn('1134.0',rust)
        self.assertNotIn('data-action="toggle-expand"',view)
        self.assertIn('data-action="toggle-fullscreen"',view)
        self.assertFalse(config['app']['windows'][0]['visible'],'Show only after positioning')
        self.assertRegex(rust,r'set_fullscreen_mode\(&window,\s*true\)')
        self.assertRegex(rust,r'set_fullscreen_mode\(&window,\s*false\)')
        self.assertIn('rooz-window-mode',rust)
    def test_native_recognition_uses_default_mic_and_text_only_ipc(self):
        front=(ROOT/'frontend/assistant.ts').read_text()
        backend=(ROOT/'frontend/backend.ts').read_text()
        rust=(ROOT/'src-tauri/src/lib.rs').read_text()
        recorder=(ROOT/'src-tauri/src/voice_capture.rs').read_text()
        self.assertNotIn('getUserMedia',front)
        self.assertNotIn('AudioContext',front)
        self.assertNotIn('aiSpeak',front)
        self.assertIn('await backend.captureLocalSpeech()',front)
        self.assertIn('backend.cancelNativeVoice()',front)
        self.assertIn("invoke('capture_local_speech')",backend)
        self.assertIn('let wav=voice_capture::capture()?',rust)
        self.assertIn('ai::transcribe(&c,wav)',rust)
        self.assertIn('capture_local_speech,cancel_native_voice',rust)
        self.assertIn('host_command::command("parec")',recorder)
        self.assertIn('--device=@DEFAULT_SOURCE@',recorder)
        self.assertIn('END_SILENCE',recorder)
        self.assertIn('AtomicU64',recorder)
        self.assertIn('fn wav(',recorder)
        self.assertIn('let _=child.kill()',recorder)
    def test_kwin_anchor_is_only_for_rooz(self):
        rust=(ROOT/'src-tauri/src/lib.rs').read_text()
        js=(ROOT/'packaging/kwin/roozanchor/contents/code/main.js').read_text()
        metadata=json.loads((ROOT/'packaging/kwin/roozanchor/metadata.json').read_text())
        self.assertIn('--install-kde-anchor',rust)
        self.assertIn('install_kde_anchor()',rust)
        self.assertIn('workspace.clientArea(KWin.WorkArea',js)
        self.assertIn('win.fullScreen',js)
        self.assertIn('isRooz(win)',js)
        self.assertEqual(metadata['KPlugin']['Id'],'roozanchor')
        self.assertEqual(metadata['KPackageStructure'],'KWin/Script')
if __name__=='__main__':unittest.main(verbosity=2)
