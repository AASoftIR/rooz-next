#!/usr/bin/env bash
# XDG launchers for KDE shortcuts, taskbar pins and a one-click show/hide action.
set -euo pipefail
rooz_binary="${1:-$HOME/.local/bin/rooz}"
if [[ ! -x "$rooz_binary" ]]; then
  echo "Rooz launcher not executable: $rooz_binary" >&2
  echo 'Usage: scripts/install-kde-voice-launchers.sh /absolute/path/to/rooz' >&2
  exit 2
fi
rooz_binary="$(realpath "$rooz_binary")"
launcher_dir="$HOME/.local/share/applications"
mkdir -p "$launcher_dir"
cat > "$launcher_dir/ir.aasoft.rooz.toggle.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Rooz · Toggle dashboard
Name[fa]=روز · باز و بسته کردن پنجره
Comment=Show or hide your planner in one click
Exec="$rooz_binary" --toggle
Icon=ir.aasoft.rooz
Terminal=false
Categories=Office;Utility;
StartupNotify=false
EOF
cat > "$launcher_dir/ir.aasoft.rooz.voice.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Rooz · Voice AI
Name[fa]=روز · دستیار صوتی
Comment=Open hands-free Rooz assistant and listen for help
Exec="$rooz_binary" --voice
Icon=ir.aasoft.rooz
Terminal=false
Categories=Office;Utility;
StartupNotify=false
EOF
if command -v update-desktop-database >/dev/null; then update-desktop-database "$launcher_dir" || true; fi
printf 'Launchers installed at %s\nAssign a KDE shortcut to: %s --voice\nPin the toggle launcher to the panel for one-click access.\n' "$launcher_dir" "$rooz_binary"
