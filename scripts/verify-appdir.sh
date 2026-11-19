#!/usr/bin/env bash
# Validate an extracted Tauri/LinuxDeploy AppDir without relying on root-level
# desktop-entry symlinks or fragile find/grep pipelines.
set -euo pipefail

appdir="${1:?Usage: verify-appdir.sh /path/to/squashfs-root}"

fail() {
  echo "ERROR: AppDir verification failed: $*" >&2
  if [[ -d "$appdir" ]]; then
    echo "AppDir contents (first two levels):" >&2
    find "$appdir" -maxdepth 2 -printf '%y %P -> %l\n' | head -80 >&2 || true
  fi
  exit 1
}

[[ -d "$appdir" ]] || fail "extracted root directory is missing: $appdir"
[[ -x "$appdir/AppRun" ]] || fail "AppRun is missing or not executable"

# LinuxDeploy places real .desktop files here. The root-level .desktop entry
# is usually a symlink, so '-type f -maxdepth 3' incorrectly reports failure.
desktop_dir="$appdir/usr/share/applications"
[[ -d "$desktop_dir" ]] || fail "usr/share/applications directory is missing"
shopt -s nullglob
desktop_files=("$desktop_dir"/*.desktop)
[[ "${#desktop_files[@]}" -gt 0 ]] || fail "no desktop entry found under usr/share/applications"

found_entry=false
for entry in "${desktop_files[@]}"; do
  [[ -f "$entry" ]] || continue
  if grep -q '^\[Desktop Entry\]' "$entry" && grep -q '^Exec=' "$entry"; then
    found_entry=true
    echo "Desktop entry: ${entry#"$appdir"/}"
    break
  fi
done
[[ "$found_entry" == true ]] || fail "desktop entries lack required [Desktop Entry] or Exec metadata"

[[ -x "$appdir/usr/bin/rooz" ]] || fail "executable usr/bin/rooz is missing"

echo "AppDir verified: AppRun, desktop entry, and Rooz executable are present."
