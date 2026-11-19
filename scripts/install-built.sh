#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
BINARY="src-tauri/target/release/rooz"
if [[ ! -x "$BINARY" ]]; then
  echo "Rooz binary missing: $BINARY. Run cargo tauri build --no-bundle first." >&2
  exit 1
fi
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/icons/hicolor/128x128/apps" \
         "$HOME/.local/share/applications" "$HOME/.config/autostart"
install -m755 "$BINARY" "$HOME/.local/bin/rooz.new"
mv -f "$HOME/.local/bin/rooz.new" "$HOME/.local/bin/rooz"
install -m644 src-tauri/icons/128x128.png "$HOME/.local/share/icons/hicolor/128x128/apps/ir.aasoft.rooz.png"
# Remove the old C/GTK Rooz autostart so only one reminder process starts.
rm -f "$HOME/.config/autostart/ir.aasoft.Rooz.desktop"
cat > "$HOME/.local/share/applications/ir.aasoft.rooz.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Version=1.0
Name=Rooz
Name[fa]=روز
Comment=Local-first daily companion
Exec=$HOME/.local/bin/rooz
Icon=ir.aasoft.rooz
Terminal=false
Categories=Office;Utility;
StartupNotify=true
DESKTOP
cp "$HOME/.local/share/applications/ir.aasoft.rooz.desktop" "$HOME/.config/autostart/ir.aasoft.rooz.desktop"
command -v update-desktop-database >/dev/null && update-desktop-database "$HOME/.local/share/applications" || true
printf '\nRooz installed! Launch with:\n  %s/.local/bin/rooz\n\n' "$HOME"
echo 'Optional KDE shortcut: assign ~/.local/bin/rooz --toggle in System Settings → Keyboard → Shortcuts.'
echo 'Please stop any old Rooz C/GTK process before launching the new one to avoid duplicate notifications.'
