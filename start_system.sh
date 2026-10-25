#!/bin/bash
# ==============================================================================
# AgroBot Full Platform Launcher
# ==============================================================================
# Starts:
# 1. FastAPI AI & WebSocket Gateway (port 8000)
# 2. AgroBot Web Dashboard & Mobile Controller (port 8080)
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Detect Local IP for Phone Access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

echo "======================================================="
echo "        🌱 AGROBOT FULL PLATFORM LAUNCHER 🌱"
echo "======================================================="
echo ""
echo "🚀 Starting FastAPI Backend & WebSocket Gateway on port 8000..."
./.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --log-level warning &
BACKEND_PID=$!

echo "🚀 Starting AgroBot Web Dashboard & Mobile Server on port 8080..."
./.venv/bin/python -m http.server 8080 --directory dashboard > /dev/null 2>&1 &
DASHBOARD_PID=$!

sleep 1.5

echo ""
echo "✅ AgroBot Platform is now LIVE!"
echo "-------------------------------------------------------"
echo "🖥️  Desktop Web Dashboard:  http://localhost:8080/"
echo "📱 Mobile Web Controller:   http://${LOCAL_IP}:8080/mobile.html"
echo "📖 API Documentation:      http://localhost:8000/docs"
echo "🤖 Android Native App Code:  $DIR/android"
echo "-------------------------------------------------------"
echo "👉 On your phone (connected to same Wi-Fi):"
echo "   Open Chrome and go to: http://${LOCAL_IP}:8080/mobile.html"
echo "   Select 'HC-05 Bluetooth' or 'Wi-Fi Gateway' to drive!"
echo "-------------------------------------------------------"
echo "Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $DASHBOARD_PID 2>/dev/null; echo 'Platform servers stopped.'; exit 0" SIGINT SIGTERM

wait
