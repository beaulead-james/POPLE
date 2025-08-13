#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re

class SimpleProxyHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # 로깅 비활성화
    
    def do_GET(self):
        if self.path.startswith('/admin'):
            # 관리자 페이지는 직접 제공
            self.serve_admin_page()
        elif self.path.startswith('/api/'):
            # API 요청은 관리자 서버로 프록시
            self.proxy_to_admin()
        else:
            # 일반 파일 서빙
            super().do_GET()
    
    def do_POST(self):
        if self.path.startswith('/admin') or self.path.startswith('/api/'):
            self.proxy_to_admin()
        else:
            self.send_error(405, "Method not allowed")
    
    def serve_admin_page(self):
        """관리자 페이지를 직접 제공"""
        try:
            with open('admin.html', 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', len(content.encode('utf-8')))
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
            
        except FileNotFoundError:
            self.send_error(404, "Admin page not found")
    
    def proxy_to_admin(self):
        """API 요청을 관리자 서버로 프록시"""
        try:
            # 요청 데이터 읽기
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else None
            
            # 관리자 서버 URL
            admin_url = f'http://localhost:3000{self.path}'
            
            # 요청 생성
            req = urllib.request.Request(admin_url, data=post_data)
            req.get_method = lambda: self.command
            
            # 헤더 복사
            for header_name, header_value in self.headers.items():
                if header_name.lower() not in ['host', 'connection']:
                    req.add_header(header_name, header_value)
            
            # 요청 실행
            with urllib.request.urlopen(req, timeout=10) as response:
                self.send_response(response.status)
                
                # 응답 헤더 복사
                for header_name, header_value in response.headers.items():
                    if header_name.lower() not in ['content-length', 'transfer-encoding', 'connection']:
                        self.send_header(header_name, header_value)
                
                self.end_headers()
                
                # 응답 데이터 전송
                response_data = response.read()
                self.wfile.write(response_data)
                
        except Exception as e:
            print(f"Proxy error: {e}")
            self.send_error(500, "Proxy error")

if __name__ == "__main__":
    import signal
    import sys
    
    def signal_handler(sig, frame):
        print("\nShutting down proxy server...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    PORT = 5000
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), SimpleProxyHandler) as httpd:
            httpd.allow_reuse_address = True
            print(f"Simple proxy server running on port {PORT}")
            print(f"Admin page: http://localhost:{PORT}/admin")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:
            print(f"Port {PORT} already in use")
            sys.exit(1)
        else:
            raise