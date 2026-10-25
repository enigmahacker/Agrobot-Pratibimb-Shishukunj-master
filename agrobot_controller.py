#!/usr/bin/env python3
"""
AgroBot Python Controller Logic
==============================================================================
Companion Python script to communicate with the Arduino Uno over USB Serial.
Provides:
1. Object-oriented AgroBot controller class (`AgroBot`)
2. Background thread parsing real-time telemetry from Arduino
3. Periodic heartbeat watchdog
4. Interactive keyboard mission console in terminal
==============================================================================
"""

import sys
import time
import glob
import threading
import serial

class AgroBot:
    """Python API for controlling the AgroBot rover over USB Serial."""

    def __init__(self, port=None, baudrate=9600, timeout=1.0):
        self.port = port or self.auto_detect_port()
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial_conn = None
        self.running = False
        self.telemetry = {
            "state": "DISARMED",
            "state_id": 0,
            "obstacle_cm": 150.0,
            "pump_active": False,
            "speed": 180,
            "last_seen": 0
        }
        self.lock = threading.Lock()
        self.rx_thread = None
        self.heartbeat_thread = None

    @staticmethod
    def auto_detect_port():
        """Automatically find the Arduino Uno USB port."""
        patterns = [
            '/dev/cu.usbmodem*',      # macOS
            '/dev/ttyUSB*',           # Linux USB-Serial
            '/dev/ttyACM*',           # Linux ACM
            'COM*'                    # Windows
        ]
        for pattern in patterns:
            ports = glob.glob(pattern)
            if ports:
                return ports[0]
        return None

    def connect(self):
        """Open the serial connection and launch background threads."""
        if not self.port:
            raise ConnectionError("No Arduino USB port found! Please plug in your Arduino Uno.")

        print(f"🔌 Connecting to AgroBot on {self.port} at {self.baudrate} baud...")
        self.serial_conn = serial.Serial(self.port, self.baudrate, timeout=self.timeout)
        time.sleep(2.0)  # Allow Arduino bootloader to initialize

        self.running = True

        # Start RX listener thread
        self.rx_thread = threading.Thread(target=self._read_loop, daemon=True)
        self.rx_thread.start()

        # Start Heartbeat watchdog thread (pings every 2s)
        self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()

        print("✅ Connected to Arduino Uno successfully!")
        return True

    def disconnect(self):
        """Safely disarm, stop motors, and close the serial port."""
        if self.running:
            try:
                self.emergency_stop()
                self.disarm()
            except Exception:
                pass
            self.running = False

        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            print("🔒 Serial connection closed.")

    def send_command(self, cmd: str):
        """Send a string command with newline to the Arduino."""
        if not self.serial_conn or not self.serial_conn.is_open:
            raise ConnectionError("Serial port is not open.")

        cmd_clean = cmd.strip() + "\n"
        with self.lock:
            self.serial_conn.write(cmd_clean.encode('utf-8'))
            self.serial_conn.flush()

    # =========================================================================
    # Rover Control Commands
    # =========================================================================
    def arm(self):
        """Arm system (transitions to IDLE, ready to drive)."""
        self.send_command("ARM")

    def disarm(self):
        """Disarm system (cuts motors and pump)."""
        self.send_command("DISARM")

    def forward(self):
        """Drive forward."""
        self.send_command("FORWARD")

    def reverse(self):
        """Drive in reverse."""
        self.send_command("REVERSE")

    def turn_left(self):
        """Pivot / turn left."""
        self.send_command("LEFT")

    def turn_right(self):
        """Pivot / turn right."""
        self.send_command("RIGHT")

    def stop(self):
        """Halt rover movement."""
        self.send_command("STOP")

    def emergency_stop(self):
        """Trigger immediate emergency shutdown."""
        self.send_command("EMERGENCY_STOP")

    def pump_on(self):
        """Activate the 12V pesticide spray pump relay."""
        self.send_command("PUMP_ON")

    def pump_off(self):
        """Turn off pesticide spray pump."""
        self.send_command("PUMP_OFF")

    def set_speed(self, pwm: int):
        """Set motor speed (80 - 255)."""
        speed = max(0, min(255, pwm))
        self.send_command(f"SPEED:{speed}")

    # =========================================================================
    # Background Workers
    # =========================================================================
    def _read_loop(self):
        """Background thread to read and parse Arduino telemetry."""
        while self.running:
            try:
                if self.serial_conn and self.serial_conn.in_waiting:
                    line = self.serial_conn.readline().decode('utf-8', errors='replace').strip()
                    if line:
                        self._parse_line(line)
                else:
                    time.sleep(0.02)
            except Exception as e:
                if self.running:
                    print(f"\n[RX Error]: {e}")
                break

    def _heartbeat_loop(self):
        """Keeps Arduino watchdog alive by pinging every 2.0s."""
        while self.running:
            try:
                time.sleep(2.0)
                if self.running:
                    self.send_command("HEARTBEAT")
            except Exception:
                break

    def _parse_line(self, line: str):
        """Parse incoming telemetry and responses from Arduino."""
        # Telemetry packet: TELEMETRY V:1.0|S:<state>|O:<dist>|P:<pump>|SPD:<spd>
        if line.startswith("TELEMETRY "):
            payload = line[10:]
            tokens = payload.split('|')
            state_map = {0: "DISARMED", 1: "ARMED (IDLE)", 2: "FORWARD", 3: "REVERSE", 4: "OBSTACLE STOP", 7: "E-STOP"}
            
            for token in tokens:
                if ':' in token:
                    k, v = token.split(':', 1)
                    if k == 'S':
                        s_id = int(v)
                        self.telemetry["state_id"] = s_id
                        self.telemetry["state"] = state_map.get(s_id, f"STATE_{s_id}")
                    elif k == 'O':
                        self.telemetry["obstacle_cm"] = float(v)
                    elif k == 'P':
                        self.telemetry["pump_active"] = (v == '1')
                    elif k == 'SPD':
                        self.telemetry["speed"] = int(v)
                    elif k == 'GPS':
                        self.telemetry["gps"] = v
                    elif k == 'FIX':
                        self.telemetry["gps_fix"] = (v == '1')
            self.telemetry["last_seen"] = time.time()
        else:
            # Command responses: OK ..., ERROR ..., etc.
            # Suppress routine heartbeat ACKs and redundant loopback messages
            if line.startswith("OK HEARTBEAT_ACK") or line.startswith("INVALID_CMD: INVALID_CMD"):
                return
            print(f"\n[Arduino]: {line}")


# =============================================================================
# Interactive Terminal Drive Console
# =============================================================================
def run_interactive_console():
    bot = AgroBot()
    try:
        bot.connect()
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return

    print("\n" + "=" * 55)
    print("      🌱 AGROBOT INTERACTIVE PYTHON CONSOLE 🌱")
    print("=" * 55)
    print("  Controls:")
    print("    [1]     : ARM Rover          [0]     : DISARM Rover")
    print("    [W / ↑] : Forward            [S / ↓] : Reverse")
    print("    [A / ←] : Turn Left          [D / →] : Turn Right")
    print("    [Space] : STOP               [E]     : EMERGENCY STOP")
    print("    [C]     : CLEAR / RESET Fault (Obstacle/E-Stop)")
    print("    [P]     : Toggle Spray Pump")
    print("    [+] / [-]: Increase / Decrease Speed")
    print("    [Q]     : Quit & Disarm")
    print("=" * 55 + "\n")

    try:
        while True:
            # Print status summary
            t = bot.telemetry
            gps_info = f" | GPS: {t.get('gps', 'NO_FIX')}" if t.get('gps_fix') else ""
            sys.stdout.write(
                f"\r[HUD] State: {t['state']:<14} | Obstacle: {t['obstacle_cm']:>5.1f} cm | "
                f"Pump: {'ON ' if t['pump_active'] else 'OFF'} | Speed: {t['speed']} PWM{gps_info} >> "
            )
            sys.stdout.flush()

            cmd = input().strip().lower()
            if not cmd:
                continue

            # Support both letters and terminal ANSI arrow keys
            if cmd in ('w', '\x1b[a', '^[a'):
                bot.forward()
            elif cmd in ('s', '\x1b[b', '^[b'):
                bot.reverse()
            elif cmd in ('a', '\x1b[d', '^[d'):
                bot.turn_left()
            elif cmd in ('d', '\x1b[c', '^[c'):
                bot.turn_right()
            elif cmd in (' ', 'x', 'stop'):
                bot.stop()
            elif cmd in ('c', 'clear', 'reset'):
                bot.send_command("CLEAR")
            elif cmd in ('p', 'pump'):
                if bot.telemetry["pump_active"]:
                    bot.pump_off()
                else:
                    bot.pump_on()
            elif cmd in ('e', 'estop'):
                bot.emergency_stop()
            elif cmd in ('1', 'arm'):
                bot.arm()
            elif cmd in ('0', 'disarm'):
                bot.disarm()
            elif cmd == '+':
                bot.set_speed(bot.telemetry["speed"] + 25)
            elif cmd == '-':
                bot.set_speed(bot.telemetry["speed"] - 25)
            elif cmd in ('q', 'quit', 'exit'):
                print("\nExiting AgroBot controller...")
                break
            else:
                # Custom raw command pass-through
                bot.send_command(cmd)

    except KeyboardInterrupt:
        print("\nShutdown requested via Ctrl+C...")
    finally:
        bot.disconnect()


if __name__ == "__main__":
    run_interactive_console()
