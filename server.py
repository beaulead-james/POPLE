#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.error
import json
from urllib.parse import urlparse, parse_qs

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 관리자 페이지 요청을 처리
        if self.path.startswith('/admin'):
            try:
                admin_url = f'http://localhost:3000{self.path}'
                req = urllib.request.Request(admin_url)
                
                # 쿠키 전달
                if 'Cookie' in self.headers:
                    req.add_header('Cookie', self.headers['Cookie'])
                
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    content_type = response.headers.get('Content-Type', 'text/html')
                    
                    self.send_response(response.status)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    
                    # 쿠키 헤더 전달
                    if 'Set-Cookie' in response.headers:
                        self.send_header('Set-Cookie', response.headers['Set-Cookie'])
                    
                    self.end_headers()
                    self.wfile.write(data)
            except urllib.error.HTTPError as e:
                if e.code == 302 or e.code == 301:
                    # 리다이렉트 처리
                    location = e.headers.get('Location', '/admin/login')
                    self.send_response(e.code)
                    self.send_header('Location', location)
                    if 'Set-Cookie' in e.headers:
                        self.send_header('Set-Cookie', e.headers['Set-Cookie'])
                    self.end_headers()
                else:
                    self.send_response(500)
                    self.send_header('Content-Type', 'text/html')
                    self.end_headers()
                    error_html = f'''
                    <html>
                    <body>
                    <h1>Admin Server Error ({e.code})</h1>
                    <p>관리자 서버 연결 오류: {e.reason}</p>
                    <p><a href="/admin/login">로그인 페이지로 이동</a></p>
                    </body>
                    </html>
                    '''.encode()
                    self.wfile.write(error_html)
            except urllib.error.URLError as e:
                self.send_response(500)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                error_html = b'''
                <html>
                <body>
                <h1>Admin Server Error</h1>
                <p>Cannot connect to admin server. Please make sure the admin server is running.</p>
                <p><a href="/admin/login">Try Login</a></p>
                </body>
                </html>
                '''
                self.wfile.write(error_html)
            return
        
        # API 요청을 관리자 서버로 프록시
        if self.path.startswith('/api/'):
            try:
                admin_url = f'http://localhost:3000{self.path}'
                req = urllib.request.Request(admin_url)
                
                # 쿠키 전달
                if 'Cookie' in self.headers:
                    req.add_header('Cookie', self.headers['Cookie'])
                
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
            except urllib.error.URLError as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = json.dumps({'error': '관리자 서버에 연결할 수 없습니다'})
                self.wfile.write(error_response.encode())
            return
        
        # 정적 파일은 기본 핸들러로 처리
        super().do_GET()
    
    def do_POST(self):
        # POST 요청도 관리자 서버로 프록시
        if self.path.startswith('/admin') or self.path.startswith('/api/'):
            try:
                # 요청 본문 읽기
                content_length = int(self.headers['Content-Length']) if 'Content-Length' in self.headers else 0
                post_data = self.rfile.read(content_length) if content_length > 0 else b''
                
                # 관리자 서버로 요청 전달
                admin_url = f'http://localhost:3000{self.path}'
                req = urllib.request.Request(admin_url, data=post_data, method='POST')
                
                # 헤더 복사
                for header_name, header_value in self.headers.items():
                    if header_name.lower() not in ['host', 'content-length']:
                        req.add_header(header_name, header_value)
                
                with urllib.request.urlopen(req) as response:
                    # 리다이렉트 처리
                    if response.status in [301, 302, 303, 307, 308]:
                        location = response.headers.get('Location', '/')
                        self.send_response(response.status)
                        self.send_header('Location', location)
                        self.end_headers()
                    else:
                        data = response.read()
                        content_type = response.headers.get('Content-Type', 'text/html')
                        
                        self.send_response(response.status)
                        self.send_header('Content-Type', content_type)
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(data)
                        
            except urllib.error.URLError as e:
                self.send_response(500)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                error_html = b'<html><body><h1>Server Error</h1><p>Cannot process request</p></body></html>'
                self.wfile.write(error_html)
            return
        
        # 기본 POST 처리
        super().do_POST()

if __name__ == "__main__":
    PORT = 5000
    with socketserver.TCPServer(("0.0.0.0", PORT), ProxyHandler) as httpd:
        print(f"프록시 서버가 포트 {PORT}에서 실행 중입니다")
        print(f"메인 사이트: http://localhost:{PORT}")
        print(f"관리자 페이지: http://localhost:{PORT}/admin")
        httpd.serve_forever()