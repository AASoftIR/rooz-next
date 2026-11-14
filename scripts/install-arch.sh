#!/usr/bin/env bash
# Build and install Rooz from source on Arch / EndeavourOS / Manjaro.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v pacman >/dev/null 2>&1; then
  echo 'This installer is for Arch-based distributions. See README.md for alternatives.' >&2
  exit 1
fi

sudo pacman -Syu --needed \
  base-devel rust cargo pkgconf webkit2gtk-4.1 gtk3 \
  curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool

if ! command -v cargo-tauri >/dev/null 2>&1 && ! cargo tauri --version >/dev/null 2>&1; then
  cargo install tauri-cli --version '^2.0.0' --locked
fi

# Keep UI dependency-free. Use TypeScript compiler if available for development,
# but committed web/*.js files are already compiled for offline source builds.
cargo tauri build --no-bundle
./scripts/install-built.sh
