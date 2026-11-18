#!/usr/bin/env bash
# Verify a built type-2 AppImage and its extracted AppDir in headless CI.
set -euo pipefail

appimage="${1:?Usage: verify-appimage.sh /path/to/Rooz.AppImage}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$appimage" && -s "$appimage" ]] || { echo "ERROR: AppImage is missing or empty: $appimage" >&2; exit 1; }
appimage="$(realpath "$appimage")"

echo "Checking AppImage: $appimage"
file "$appimage"

# AppImage type 2 is an ELF executable with 'AI\x02' at byte offsets 8..10.
magic="$(od -An -tx1 -j8 -N3 "$appimage" | xargs)"
[[ "$magic" == '41 49 02' ]] || { echo "ERROR: not a type-2 AppImage (magic: $magic)" >&2; exit 1; }
chmod +x "$appimage"

extract_dir="$(mktemp -d)"
trap 'rm -rf "$extract_dir"' EXIT
if ! (cd "$extract_dir" && "$appimage" --appimage-extract >extract.log 2>&1); then
  echo 'ERROR: AppImage extraction failed; output follows:' >&2
  cat "$extract_dir/extract.log" >&2
  exit 1
fi

bash "$script_dir/verify-appdir.sh" "$extract_dir/squashfs-root"
sha256sum "$appimage"
echo "AppImage verified successfully."
