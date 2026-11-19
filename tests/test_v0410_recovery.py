"""v0.4.10 regression guards for fullscreen recovery and hands-free continuity."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]


class RecoveryTests(unittest.TestCase):
    def test_fullscreen_exit_never_uses_stale_kde_state(self):
        lib=(ROOT/'src-tauri/src/lib.rs').read_text()
        app=(ROOT/'frontend/app.ts').read_text()
        self.assertIn('static FULLSCREEN_TARGET:AtomicBool',lib)
        self.assertIn('let next = !FULLSCREEN_TARGET.load(',lib)
        self.assertNotIn('let next = !window.is_fullscreen()',lib)
        self.assertIn('window.set_fullscreen(false)',lib)
        self.assertIn('window.unmaximize()',lib)
        self.assertIn('state.expanded?\'compact\':\'expand\'',app)
        self.assertIn('place_bottom_right(&window)',lib)

    def test_speaker_timeout_and_force_stop(self):
        output=(ROOT/'src-tauri/src/voice_output.rs').read_text()
        front=(ROOT/'frontend/assistant.ts').read_text()
        self.assertIn('ACTIVE_SPEECH',output)
        self.assertIn('kill_child(synth)',output)
        self.assertIn('kill_child(player)',output)
        self.assertIn('finish_child(',output)
        self.assertIn('Promise.race([',front)
        self.assertIn('backend.stopLocalSpeech()',front)
        self.assertIn('11000',front)

    def test_second_microphone_turn_recovers(self):
        front=(ROOT/'frontend/assistant.ts').read_text()
        ai=(ROOT/'src-tauri/src/ai.rs').read_text()
        self.assertIn('captureErrors<2',front)
        self.assertIn('window.setTimeout(()=>{void beginCapture(id);},120)',front)
        self.assertIn('Offline voice worker unavailable',ai)
        self.assertIn('Local recognition failed after restart',ai)
        self.assertIn('if voice {13}else{45}',ai)


if __name__=='__main__':
    unittest.main(verbosity=2)
