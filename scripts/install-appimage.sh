#!/usr/bin/env bash
# Rooz AppImage installer/updater: one stable executable and one XDG autostart entry.
# Usage: bash scripts/install-appimage.sh /path/to/Rooz_0.4.10_amd64.AppImage
set -euo pipefail
if [[ $# -ne 1 || ! -s "${1:-}" ]]; then
  echo 'Usage: install-appimage.sh /path/to/Rooz_*.AppImage' >&2
  exit 2
fi
src="$(realpath -e -- "$1")"
# Type 2 AppImage: ELF executable with AI\x02 marker at bytes 8-10.
if [[ "$(od -An -tx1 -j8 -N3 "$src" | xargs)" != '41 49 02' ]]; then
  echo "Not a type-2 AppImage: $src" >&2
  exit 2
fi
app="$HOME/.local/bin/rooz"
backupdir="$HOME/.local/share/rooz/appimage-backups"
if [[ "$src" != "$app" ]] && { pgrep -u "$(id -u)" -x rooz >/dev/null 2>&1 || pgrep -u "$(id -u)" -x Rooz >/dev/null 2>&1; }; then
  echo 'Rooz is still running. Tray → Quit completely, or run ~/.local/bin/rooz --quit, then retry.' >&2
  exit 3
fi
mkdir -p "$(dirname "$app")" "$HOME/.config/autostart" "$HOME/.local/share/applications" "$backupdir"
if [[ -e "$app" && "$src" != "$app" ]]; then
  stamp="$(date -u '+%Y%m%dT%H%M%SZ')"
  cp -p -- "$app" "$backupdir/rooz-$stamp.AppImage"
fi
if [[ "$src" != "$app" ]]; then
  temp="$(mktemp "$HOME/.local/bin/.rooz-update.XXXXXX")"
  trap 'rm -f -- "${temp:-}"' EXIT
  cp -- "$src" "$temp"
  chmod 755 "$temp"
  mv -f -- "$temp" "$app"
  trap - EXIT
fi
chmod 755 "$app"
# Exactly one actively enabled user autostart file. Mask the older name used by
# earlier Rooz installers (and by any matching system-wide desktop entry).
cat > "$HOME/.config/autostart/rooz.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Rooz
Name[fa]=روز
Comment=Rooz planner and voice assistant
Exec="$app"
Icon=ir.aasoft.rooz
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
EOF
legacy="$HOME/.config/autostart/ir.aasoft.rooz.desktop"
if [[ -f "$legacy" ]] && ! grep -q '^Hidden=true$' "$legacy"; then
  cp -p -- "$legacy" "$backupdir/legacy-autostart-$(date -u '+%Y%m%dT%H%M%SZ').desktop"
fi
cat > "$legacy" <<'EOF'
[Desktop Entry]
Type=Application
Name=Rooz (legacy entry disabled)
Hidden=true
EOF
cat > "$HOME/.local/share/applications/ir.aasoft.rooz.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Rooz
Name[fa]=روز
Comment=Local-first daily planner and routines
Exec="$app"
Icon=ir.aasoft.rooz
Terminal=false
Categories=Office;Utility;
StartupNotify=false
EOF
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
icon="$repo/src-tauri/icons/128x128.png"
if [[ -f "$icon" ]]; then
  mkdir -p "$HOME/.local/share/icons/hicolor/128x128/apps"
  cp -f "$icon" "$HOME/.local/share/icons/hicolor/128x128/apps/ir.aasoft.rooz.png"
fi
if [[ -f "$repo/scripts/install-kde-voice-launchers.sh" ]]; then
  bash "$repo/scripts/install-kde-voice-launchers.sh" "$app"
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" || true
fi
printf '\nUpdated executable: %s\n' "$app"
sha256sum "$app"
if [[ "${ROOZ_INSTALL_SKIP_VERSION_CHECK:-}" != 1 ]]; then
  printf 'Installed version: '
  "$app" --version || echo '(version check unavailable; confirm that your AppImage is v0.4.10 or newer)'
fi
printf '\nAutostart points to the same stable path. Log out and back in to test.\n'
echo 'Note: If you also installed the old Arch package, remove/disable its autostart entry.'
