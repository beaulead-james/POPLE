#!/usr/bin/env python3
"""
Simple HTTP server for production deployment on Replit
"""
import http.server
import socketserver
import os

class ProductionHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        super().end_headers()

def main():
    port = int(os.environ.get('PORT', 5000))
    
    with socketserver.TCPServer(("0.0.0.0", port), ProductionHandler) as httpd:
        print(f"Production server running on http://0.0.0.0:{port}/")
        httpd.serve_forever()

if __name__ == "__main__":
    main()