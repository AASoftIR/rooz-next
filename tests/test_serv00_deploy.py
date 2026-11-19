#!/usr/bin/env python3
"""Integration tests for the established serv00 ci.php HTTP uploader."""
import http.server
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/upload-serv00.sh'


class UploadHandler(http.server.BaseHTTPRequestHandler):
    requests = []
    response_code = 200
    response_body = {'ok': True, 'artifact': {'name': 'Rooz_0.4.5_amd64.AppImage'}}

    def do_POST(self):
        size = int(self.headers['Content-Length'])
        payload = self.rfile.read(size)
        self.__class__.requests.append((self.path, dict(self.headers), payload))
        self.send_response(self.response_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(self.response_body).encode())

    def log_message(self, *_):
        pass


class Serv00DeployTests(unittest.TestCase):
    def setUp(self):
        UploadHandler.requests = []
        UploadHandler.response_code = 200
        UploadHandler.response_body = {'ok': True, 'artifact': {'name': 'Rooz_0.4.5_amd64.AppImage'}}
        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), UploadHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.dir = tempfile.TemporaryDirectory()
        self.image = Path(self.dir.name) / 'Rooz_0.4.5_amd64.AppImage'
        self.image.write_bytes(b'fake appimage contents for HTTP integration test')
        self.env = dict(os.environ,
                        SERV00_UPLOAD_URL=f'http://127.0.0.1:{self.server.server_port}/ci.php',
                        SERV00_UPLOAD_TOKEN='fake-secret-do-not-print',
                        ROOZ_TEST_ALLOW_HTTP='1',
                        GITHUB_REPOSITORY='AASoftIR/rooz-next',
                        GITHUB_REF='refs/tags/v0.4.5',
                        GITHUB_REF_NAME='v0.4.5',
                        GITHUB_SHA='abc123', GITHUB_RUN_ID='1234',
                        GITHUB_WORKFLOW='Rooz AppImage')

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.dir.cleanup()

    def run_uploader(self, *args, env=None):
        return subprocess.run(['bash', str(SCRIPT), *map(str, args)],
                              env=env or self.env, text=True, capture_output=True, timeout=15)

    def test_two_existing_secrets_are_only_required_settings(self):
        p = self.run_uploader('--check')
        self.assertEqual(p.returncode, 0, p.stderr)
        for secret in ('SERV00_UPLOAD_URL', 'SERV00_UPLOAD_TOKEN'):
            env = dict(self.env)
            del env[secret]
            p = self.run_uploader('--check', env=env)
            self.assertNotEqual(p.returncode, 0)
            self.assertIn(secret, p.stderr)
        self.assertNotIn(self.env['SERV00_UPLOAD_TOKEN'], p.stdout + p.stderr)

    def test_authenticated_multipart_upload_metadata(self):
        p = self.run_uploader(self.image)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual(len(UploadHandler.requests), 1)
        path, headers, payload = UploadHandler.requests[0]
        self.assertEqual(path, '/ci.php?api=upload')
        self.assertEqual(headers['Authorization'], 'Bearer fake-secret-do-not-print')
        self.assertIn('multipart/form-data', headers['Content-Type'])
        for marker in (b'name="file"', b'fake appimage contents', b'name="repository"',
                       b'AASoftIR/rooz-next', b'name="branch"', b'name="commit"',
                       b'name="run_id"', b'name="workflow"', b'name="tag"', b'v0.4.5'):
            self.assertIn(marker, payload, marker)
        self.assertNotIn('fake-secret-do-not-print', p.stdout + p.stderr)
        self.assertIn('Local SHA-256:', p.stdout)

    def test_base_and_existing_api_urls_normalize_without_double_api(self):
        for suffix in ('/', '/ci.php', '/ci.php?api=upload'):
            with self.subTest(suffix=suffix):
                self.env['SERV00_UPLOAD_URL'] = f'http://127.0.0.1:{self.server.server_port}{suffix}'
                p = self.run_uploader(self.image)
                self.assertEqual(p.returncode, 0, p.stderr)
                self.assertEqual(UploadHandler.requests[-1][0], '/ci.php?api=upload')

    def test_server_rejection_fails_ci_even_on_http_200(self):
        UploadHandler.response_body = {'ok': False, 'message': 'rejected'}
        p = self.run_uploader(self.image)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn('did not confirm success', p.stderr)
        self.assertNotIn('fake-secret-do-not-print', p.stderr)

    def test_refuses_http_without_local_mock_flag(self):
        env = dict(self.env)
        env.pop('ROOZ_TEST_ALLOW_HTTP')
        p = self.run_uploader('--check', env=env)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn('HTTPS', p.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
