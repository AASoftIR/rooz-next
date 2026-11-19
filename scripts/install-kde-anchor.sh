#!/usr/bin/env bash
# Install, enable and reload the Rooz-only KWin 6 corner anchor.
set -euo pipefail
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../packaging/kwin/roozanchor" && pwd)"
command -v kwriteconfig6 >/dev/null || { echo 'KDE Plasma 6 kwriteconfig6 required.' >&2; exit 2; }
command -v kpackagetool6 >/dev/null || { echo 'KDE Plasma 6 kpackagetool6 required.' >&2; exit 2; }
dest="${XDG_DATA_HOME:-$HOME/.local/share}/kwin/scripts/roozanchor"
# Old releases copied a raw directory, which could leave KPackage unaware of
# the script. Upgrading via kpackagetool6 refreshes KPackage's registration.
if [[ -d "$dest" ]]; then
  if ! kpackagetool6 -t KWin/Script -u "$source_dir"; then
    rm -rf "$dest"    # only Rooz's own script directory
    kpackagetool6 -t KWin/Script -i "$source_dir"
  fi
else
  kpackagetool6 -t KWin/Script -i "$source_dir"
fi
kwriteconfig6 --file kwinrc --group Plugins --key roozanchorEnabled true
# Reload the script through KWin; if the session bus is unavailable, it will
# activate on the next login. Never restart/replace the KWin compositor.
for qdbus_cmd in qdbus6 qdbus-qt6 qdbus; do
  if command -v "$qdbus_cmd" >/dev/null 2>&1; then
    "$qdbus_cmd" org.kde.KWin /Scripting org.kde.kwin.Scripting.unloadScript roozanchor >/dev/null 2>&1 || true
    if "$qdbus_cmd" org.kde.KWin /KWin reconfigure >/dev/null 2>&1; then
      echo 'Rooz anchor installed and KWin configuration refreshed.'
      exit 0
    fi
  fi
done
echo 'Rooz anchor installed. Log out and back in, or enable it in System Settings → Window Management → KWin Scripts.'
