#!/usr/bin/env python3
"""Offline AppImage-only pipeline tests (no Rust/GUI/network required)."""
import json
import subprocess
import tempfile
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class PackagingTests(unittest.TestCase):
    def test_version_consistency(self):
        npm = json.loads((ROOT / "package.json").read_text())["version"]
        tauri = json.loads((ROOT / "src-tauri/tauri.conf.json").read_text())["version"]
        cargo_text = (ROOT / "src-tauri/Cargo.toml").read_text()
        cargo = re.search(r'(?m)^version\s*=\s*"([^"]+)"', cargo_text)
        self.assertIsNotNone(cargo)
        self.assertEqual(npm, tauri)
        self.assertEqual(npm, cargo.group(1))
        self.assertRegex(npm, r"^\d+\.\d+\.\d+$")

    def test_ai_secret_file_permissions_compile_import(self):
        rust = (ROOT / "src-tauri/src/ai.rs").read_text()
        self.assertIn("OpenOptionsExt", rust)
        self.assertIn("PermissionsExt", rust)
        self.assertIn("opts.mode(0o600)", rust)
        self.assertIn("file.set_permissions", rust)

    def test_appimage_only_workflow(self):
        workflow = (ROOT / ".github/workflows/linux-appimage.yml").read_text()
        for expected in ("ubuntu-22.04", "cargo tauri build --bundles appimage",
                         "cargo test --manifest-path src-tauri/Cargo.toml",
                         "rooz-appimage-x86_64", "retention-days: 30", "SHA256SUMS.txt",
                         "startsWith(github.ref, 'refs/tags/v')", "contents: write"):
            self.assertIn(expected, workflow, expected)
        for forbidden in ("archlinux:base-devel", ".pkg.tar.zst", "makepkg", "pacman -Qip",
                          "rooz-arch-x86_64", "./scripts/package-arch.sh", "cargo tauri build --no-bundle"):
            self.assertNotIn(forbidden, workflow, forbidden)
        self.assertNotIn("continue-on-error: true", workflow)
        self.assertIn('bash scripts/verify-appimage.sh', workflow)
        self.assertNotIn('find squashfs-root -maxdepth 3 -type f', workflow)
        verifier = (ROOT / 'scripts/verify-appimage.sh').read_text()
        self.assertIn('--appimage-extract', verifier)
        self.assertIn('41 49 02', verifier)
        self.assertIn('scripts/verify-appdir.sh', verifier.replace('$script_dir/', 'scripts/'))
        config = json.loads((ROOT / 'src-tauri/tauri.conf.json').read_text())
        self.assertEqual(config['bundle']['targets'], ['appimage'])

    def test_desktop_launch_and_autostart(self):
        desktop = (ROOT / "packaging/arch/ir.aasoft.rooz.desktop").read_text()
        self.assertIn("Type=Application", desktop)
        self.assertIn("Exec=rooz", desktop)
        self.assertIn("Terminal=false", desktop)
        installer = (ROOT / "scripts/install-appimage.sh").read_text()
        self.assertIn(".config/autostart", installer)
        self.assertIn("install-kde-voice-launchers.sh", installer)

    def _make_test_appdir(self, root):
        root = Path(root)
        (root / 'usr/bin').mkdir(parents=True)
        (root / 'usr/share/applications').mkdir(parents=True)
        for filename in ('AppRun', 'usr/bin/rooz'):
            path = root / filename
            path.write_text('#!/bin/sh\nexit 0\n')
            path.chmod(0o755)
        (root / 'usr/share/applications/ir.aasoft.rooz.desktop').write_text(
            '[Desktop Entry]\nType=Application\nName=Rooz\nExec=rooz\n'
        )
        # The AppImage root-level desktop entry is a symlink; previous CI
        # incorrectly used find -type f -maxdepth 3, missing this layout.
        (root / 'ir.aasoft.rooz.desktop').symlink_to(
            'usr/share/applications/ir.aasoft.rooz.desktop'
        )
        return root

    def test_appdir_verifier_accepts_tauri_desktop_symlink(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self._make_test_appdir(temp)
            result = subprocess.run(
                ['bash', str(ROOT / 'scripts/verify-appdir.sh'), str(root)],
                text=True, capture_output=True
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('AppDir verified', result.stdout)

    def test_appdir_verifier_rejects_missing_real_desktop_entry(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self._make_test_appdir(temp)
            (root / 'usr/share/applications/ir.aasoft.rooz.desktop').unlink()
            result = subprocess.run(
                ['bash', str(ROOT / 'scripts/verify-appdir.sh'), str(root)],
                text=True, capture_output=True
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('no desktop entry', result.stderr)

    def test_appdir_verifier_rejects_missing_native_binary(self):
        with tempfile.TemporaryDirectory() as temp:
            root = self._make_test_appdir(temp)
            (root / 'usr/bin/rooz').unlink()
            result = subprocess.run(
                ['bash', str(ROOT / 'scripts/verify-appdir.sh'), str(root)],
                text=True, capture_output=True
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('usr/bin/rooz', result.stderr)

if __name__ == "__main__":
    unittest.main(verbosity=2)
