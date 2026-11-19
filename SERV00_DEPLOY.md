# Rooz AppImage → existing serv00 HTTP upload API

The single GitHub Actions job builds and verifies **one x86_64 AppImage**, then sends it to your **existing serv00 `ci.php` endpoint**, using the two GitHub repository secrets that you already have. There is no SSH/SFTP upload, Arch package, GitHub Artifact upload, or GitHub Release asset.

## Repository secrets (Settings → Secrets and variables → Actions → Secrets)

| Name | Value |
|---|---|
| `SERV00_UPLOAD_URL` | Existing serv00 upload endpoint, e.g. `https://your-domain/ci.php` |
| `SERV00_UPLOAD_TOKEN` | Existing bearer token for that endpoint |

**No extra secrets or GitHub variables are needed.** Never share the token or include it in commits.

## Existing endpoint contract

The uploader calls HTTPS **POST** to `ci.php?api=upload`. It accepts `SERV00_UPLOAD_URL` as the domain/base, the `ci.php` URL, or `ci.php?api=upload` (and doesn't duplicate `api=upload`). The request uses:

- Header: `Authorization: Bearer <SERV00_UPLOAD_TOKEN>`
- Body: `multipart/form-data`; file part named **`file`**, containing the `.AppImage`
- Form fields: `repository`, `branch`, `commit`, `run_id`, `run_number`, `workflow`, `job`, `tag`, `sha256`

The server must reply with **HTTP 2xx and JSON confirming success**, such as `{"ok":true,"artifact":{"name":"Rooz_0.4.5_amd64.AppImage"}}` (or a recognized `success:true` / `status:"success"` response). HTTP 200 with an error page or `ok:false` fails the job. A SHA-256 is logged locally; **server-side checksum verification is the endpoint's responsibility**.

If the endpoint is implemented in PHP, make sure its `upload_max_filesize` and `post_max_size` are larger than the resulting AppImage and any reverse-proxy body-size limit permits the upload. The script does not create a new download page or override how your existing endpoint organizes uploaded files.

## Build and upload

1. Confirm that the two secrets shown above exist in your repository.
2. Push to `main`, or run **Actions → Rooz AppImage (x86_64) → Run workflow**.
3. After native tests and AppImage verification pass, the job calls `bash scripts/upload-serv00.sh <AppImage>`.
4. The workflow prints a confirmation on success, but **does not invent a download URL**; find the file in your existing serv00 uploader interface.

To test just the configuration locally without sending a file:

```bash
SERV00_UPLOAD_URL='https://your-domain/ci.php' SERV00_UPLOAD_TOKEN='your-token' \
  bash scripts/upload-serv00.sh --check
```

When running this test, avoid saving the token in shell history or sharing the command output. Prefer environment variables or GitHub Secrets.

## Troubleshooting

- **Missing secret**: check repository secrets' exact names. No SSH values are used.
- **HTTP 401/403**: the bearer token is missing, expired, or unauthorized at the endpoint.
- **HTTP 404**: `SERV00_UPLOAD_URL` is not the existing `ci.php` endpoint.
- **HTTP 413 / PHP size limit**: increase permitted upload/body size on the server if your plan allows it.
- **HTTP 200 but invalid JSON**: the endpoint returned an HTML page or a different contract; inspect the endpoint implementation rather than accepting the response as success.
- **Quota**: GitHub Actions minutes are still consumed; the file is not stored as a GitHub artifact or release.
