#!/usr/bin/env bash
set -euo pipefail
rm -f "$HOME/.local/bin/rooz" \
  "$HOME/.local/share/applications/ir.aasoft.rooz.desktop" \
  "$HOME/.config/autostart/ir.aasoft.rooz.desktop" \
  "$HOME/.local/share/icons/hicolor/128x128/apps/ir.aasoft.rooz.png"
echo 'Rooz program files removed. Personal data was NOT deleted:'
echo "  $HOME/.local/share/rooz/rooz.db"
