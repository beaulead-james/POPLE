#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.error
import sys
import signal

class FixedProxyHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # 로깅을 줄여서 출력을 깔끔하게 유지
        pass
    
    def do_GET(self):
        if self.path.startswith('/admin'):
            self.handle_admin_request()
        elif self.path.startswith('/api/events'):
            self.handle_admin_request()
        else:
            # 메인 사이트 파일 서빙
            super().do_GET()
    
    def do_POST(self):
        if self.path.startswith('/admin'):
            self.handle_admin_request()
        else:
            self.send_error(405, "Method not allowed")
    
    def handle_admin_request(self):
        try:
            # 요청 데이터 읽기
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else None
            
            # 관리자 서버 URL
            admin_url = f'http://localhost:3000{self.path}'
            if self.path == '/admin' and '?' not in self.path:
                admin_url += '?'  # 쿼리 스트링 보존
            
            # 요청 생성
            req = urllib.request.Request(admin_url, data=post_data)
            req.get_method = lambda: self.command
            
            # 모든 헤더 복사 (더 포괄적으로)
            skip_headers = ['host', 'connection', 'content-length', 'transfer-encoding']
            for header_name, header_value in self.headers.items():
                if header_name.lower() not in skip_headers:
                    req.add_header(header_name, header_value)
            
            # Host 헤더를 관리자 서버용으로 설정
            req.add_header('Host', 'localhost:3000')
            
            # 요청 실행
            with urllib.request.urlopen(req, timeout=10) as response:
                # 응답 상태 설정
                self.send_response(response.status)
                
                # 모든 응답 헤더 복사
                for header_name, header_value in response.headers.items():
                    if header_name.lower() not in ['content-length', 'transfer-encoding', 'connection']:
                        # Location 헤더 수정 (리다이렉트 시)
                        if header_name.lower() == 'location' and header_value.startswith('http://localhost:3000'):
                            header_value = header_value.replace('http://localhost:3000', '')
                        self.send_header(header_name, header_value)
                
                self.end_headers()
                
                # 응답 데이터 전송
                response_data = response.read()
                self.wfile.write(response_data)
                
        except urllib.error.HTTPError as e:
            # HTTP 에러 처리 (리다이렉트 포함)
            self.send_response(e.code)
            
            # 리다이렉트나 세션 관련 헤더 복사
            for header_name, header_value in e.headers.items():
                if header_name.lower() in ['location', 'set-cookie']:
                    self.send_header(header_name, header_value)
            
            self.end_headers()
            
            # 에러 본문이 있으면 전송
            try:
                error_data = e.read()
                self.wfile.write(error_data)
            except:
                pass
                
        except Exception as e:
            print(f"프록시 에러: {e}")
            self.send_error(500, "Internal server error")

def signal_handler(sig, frame):
    print("\n프록시 서버를 종료합니다...")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    PORT = 5001
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), FixedProxyHandler) as httpd:
            httpd.allow_reuse_address = True
            print(f"프록시 서버가 포트 {PORT}에서 실행 중입니다")
            print(f"메인 사이트: http://localhost:{PORT}")
            print(f"관리자 페이지: http://localhost:{PORT}/admin")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"포트 {PORT}이 이미 사용 중입니다. 다른 프로세스를 종료하고 다시 시도하세요.")
            sys.exit(1)
        else:
            raise