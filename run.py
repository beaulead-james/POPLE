#!/usr/bin/env python3
"""
Simple run script for Replit deployment
"""
import http.server
import socketserver
import os

def main():
    port = int(os.environ.get('PORT', 5000))
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory='.', **kwargs)
    
    with socketserver.TCPServer(("0.0.0.0", port), Handler) as httpd:
        print(f"Server running on port {port}")
        httpd.serve_forever()

if __name__ == "__main__":
    main()