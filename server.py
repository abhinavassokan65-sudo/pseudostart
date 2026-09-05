#!/usr/bin/env python3
"""
Deadly Noodles & Final Minutes - Local Web Server
Run this script to launch the app locally:
    python3 server.py [port]
Default port is 8080.
"""

import http.server
import socketserver
import os
import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

import json
import urllib.parse

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/upload-video':
            query = urllib.parse.parse_qs(parsed.query)
            target = query.get('target', ['custom_video.mp4'])[0]
            filename = os.path.basename(target)
            if not filename.endswith(('.mp4', '.webm', '.mov', '.ogg')):
                filename += '.mp4'
            
            videos_dir = os.path.join(DIRECTORY, 'videos')
            os.makedirs(videos_dir, exist_ok=True)
            filepath = os.path.join(videos_dir, filename)

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                body = self.rfile.read(content_length)
                with open(filepath, 'wb') as f:
                    f.write(body)
                
                resp = json.dumps({'success': True, 'filename': filename, 'path': f'videos/{filename}', 'bytes': len(body)}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(resp)))
                self.end_headers()
                self.wfile.write(resp)
                print(f"📁 [Permanent Upload] Saved video to disk: videos/{filename} ({len(body)} bytes)")
                return
            else:
                self.send_error(400, "Empty upload body")
                return

        self.send_error(404, "Endpoint not found")

def find_free_port(start_port=8000):
    for p in range(start_port, start_port + 50):
        try:
            s = socketserver.TCPServer(("", p), Handler)
            s.server_close()
            return p
        except OSError:
            continue
    return start_port

def run():
    socketserver.TCPServer.allow_reuse_address = True
    requested_port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    port = find_free_port(requested_port)
    with socketserver.TCPServer(("", port), Handler) as httpd:
        url = f"http://127.0.0.1:{port}/index.html"
        print("=" * 65)
        print("🐍 Deadly Noodles & Final Minutes: Server Running!")
        print(f"👉 Local URL: {url}")
        print("Press Ctrl+C to terminate the server.")
        print("=" * 65)
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer shutting down. Stay away from venomous noodles!")

if __name__ == '__main__':
    run()
