#!/bin/bash
# Simple start script for deployment
python -m http.server ${PORT:-5000} --bind 0.0.0.0