#!/bin/bash
# ==============================================================================
# AgroBot Firmware Upload Script for macOS Terminal
# ==============================================================================

set -e

# Path to arduino-cli bundled inside Arduino IDE 2.x
ARDUINO_CLI="/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli"

if [ ! -f "$ARDUINO_CLI" ]; then
    if command -v arduino-cli >/dev/null 2>&1; then
        ARDUINO_CLI="arduino-cli"
    else
        echo "❌ arduino-cli not found! Please install Arduino IDE or run: brew install arduino-cli"
        exit 1
    fi
fi

# Detect Arduino Uno USB Serial Port
PORT=$(ls /dev/cu.usbmodem* 2>/dev/null | head -n 1)

if [ -z "$PORT" ]; then
    echo "❌ No Arduino Uno USB port detected (expected /dev/cu.usbmodem*)."
    echo "   Please plug in your Arduino Uno with a USB cable and try again."
    exit 1
fi

# Check if the port is busy (e.g. Chrome Web Serial, Serial Monitor, screen)
BUSY_PROC=$(lsof "$PORT" 2>/dev/null | tail -n +2 | awk '{print $1 " (PID: " $2 ")"}')
if [ -n "$BUSY_PROC" ]; then
    echo "⚠️  The serial port $PORT is currently in use by:"
    echo "   👉 $BUSY_PROC"
    echo ""
    echo "   If this is Google Chrome / Web Dashboard:"
    echo "   1. Click 'Disconnect' in the dashboard at http://localhost:8080/ (or close the tab)"
    echo "   2. Re-run ./upload.sh"
    echo "   3. Once uploaded, click 'Connect' in the dashboard again!"
    echo ""
    echo "   Attempting to upload may fail with 'Resource busy' until it is disconnected."
fi

SKETCH_DIR="${1:-arduino_controller}"

echo "🔌 Detected Arduino Uno on port: $PORT"
echo "🔨 Compiling and uploading sketch: $SKETCH_DIR ..."

"$ARDUINO_CLI" compile --upload -p "$PORT" --fqbn arduino:avr:uno "$SKETCH_DIR"

echo ""
echo "✅ AgroBot firmware ($SKETCH_DIR) successfully uploaded to Arduino Uno!"
