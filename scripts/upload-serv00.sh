#!/usr/bin/env bash
# Rooz's established serv00 ci.php uploader contract: Bearer-authenticated multipart POST.
# Required GitHub secrets: SERV00_UPLOAD_URL, SERV00_UPLOAD_TOKEN.
set -euo pipefail

if [[ -z "${SERV00_UPLOAD_URL:-}" || -z "${SERV00_UPLOAD_TOKEN:-}" ]]; then
  echo 'Missing SERV00_UPLOAD_URL or SERV00_UPLOAD_TOKEN GitHub repository secret.' >&2
  exit 2
fi

# Accept the existing secret as the host/base URL, ci.php, or ci.php?api=upload.
# Never interpolate the token into a command line, URL or log message.
upload_url="$(python3 - <<'PY'
import os, sys
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
raw = os.environ['SERV00_UPLOAD_URL'].strip()
p = urlsplit(raw)
allow_test = (os.getenv('ROOZ_TEST_ALLOW_HTTP') == '1' and
              p.scheme == 'http' and p.hostname in ('127.0.0.1', 'localhost'))
if not ((p.scheme == 'https') or allow_test) or not p.hostname or p.username or p.password or p.fragment:
    sys.exit('SERV00_UPLOAD_URL must be an HTTPS URL without embedded credentials or fragment')
path = p.path.rstrip('/')
if not path.endswith('.php'):
    path += '/ci.php'
query = [(key, value) for key, value in parse_qsl(p.query, keep_blank_values=True) if key != 'api']
query.append(('api','upload'))
print(urlunsplit((p.scheme, p.netloc, path, urlencode(query), '')))
PY
)"

if [[ "${1:-}" == '--check' ]]; then
  command -v curl >/dev/null || { echo 'curl not installed' >&2; exit 2; }
  echo 'serv00 URL/token HTTP upload configuration is valid.'
  exit 0
fi

if (($# != 1)) || [[ ! -s "$1" ]]; then
  echo 'Usage: scripts/upload-serv00.sh /path/to/Rooz_VERSION_amd64.AppImage' >&2
  exit 2
fi
file="$1"
if [[ "$(basename "$file")" != *.AppImage ]]; then
  echo 'Refusing to upload a non-AppImage file' >&2
  exit 2
fi
command -v curl >/dev/null || { echo 'curl not installed' >&2; exit 2; }

sha="$(sha256sum "$file" | cut -d' ' -f1)"
ref="${GITHUB_REF:-}"
tag=''
if [[ "$ref" == refs/tags/* ]]; then tag="${ref#refs/tags/}"; fi
branch="${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-${ref#refs/heads/}}}"
response="$(mktemp)"
trap 'rm -f "$response"' EXIT

echo "Uploading $(basename "$file") ($(stat -c%s "$file") bytes) to the configured serv00 API"
if ! status="$(curl --silent --show-error --fail-with-body \
    --retry 3 --retry-delay 3 --connect-timeout 30 --max-time 1800 \
    --output "$response" --write-out '%{http_code}' \
    --header "Authorization: Bearer ${SERV00_UPLOAD_TOKEN}" \
    --form "file=@${file};type=application/octet-stream" \
    --form-string "repository=${GITHUB_REPOSITORY:-}" \
    --form-string "branch=$branch" \
    --form-string "commit=${GITHUB_SHA:-}" \
    --form-string "run_id=${GITHUB_RUN_ID:-}" \
    --form-string "run_number=${GITHUB_RUN_NUMBER:-}" \
    --form-string "workflow=${GITHUB_WORKFLOW:-}" \
    --form-string "job=${GITHUB_JOB:-}" \
    --form-string "tag=$tag" \
    --form-string "sha256=$sha" \
    "$upload_url")"; then
  echo "serv00 HTTP upload failed (HTTP ${status:-unknown}). Check endpoint/PHP upload limit/authentication." >&2
  # Avoid printing untrusted server response which might echo authentication headers.
  exit 1
fi

# Reject HTML login/error pages even when the server mistakenly returns HTTP 200.
python3 - "$response" <<'PY'
import json, sys
from pathlib import Path
body = Path(sys.argv[1]).read_text(errors='replace').strip()
try:
    data = json.loads(body)
except json.JSONDecodeError:
    sys.exit('serv00 upload failed: endpoint did not return JSON (check upload URL).')
if not isinstance(data, dict):
    sys.exit('serv00 upload failed: invalid JSON response.')
if 'ok' in data:
    success = data['ok'] is True
elif 'success' in data:
    success = data['success'] is True
else:
    success = data.get('status') in ('ok', 'success')
if not success:
    sys.exit('serv00 upload failed: server did not confirm success.')
artifact = data.get('artifact') or {}
if isinstance(artifact, dict):
    print('serv00 upload confirmed: ' + str(artifact.get('name', 'AppImage')))
else:
    print('serv00 upload confirmed.')
PY
printf 'Local SHA-256: %s\n' "$sha"
