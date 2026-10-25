import asyncio
import glob
import json
import logging
import threading
import time
from datetime import datetime
from typing import Dict, List, Optional, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

class RoverCommandRequest(BaseModel):
    command: str

class RoverBridge:
    """Manages the bidirectional bridge between Serial (USB / Bluetooth) and WebSocket clients."""
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.serial_conn = None
        self.serial_port = None
        self.running = False
        self.rx_thread = None
        self.lock = threading.Lock()
        self.latest_telemetry: Dict = {
            "version": "1.0",
            "state_id": 0,
            "state": "DISARMED",
            "obstacle_cm": 150.0,
            "pump_active": False,
            "speed": 180,
            "gps": "28.613939,77.209021",
            "gps_fix": False,
            "last_updated": time.time(),
            "hardware_connected": False
        }
        self.loop = None

    def auto_detect_serial(self) -> Optional[str]:
        patterns = [
            '/dev/cu.usbmodem*',
            '/dev/cu.HC-05*',
            '/dev/cu.AgroBot*',
            '/dev/ttyUSB*',
            '/dev/ttyACM*',
            'COM*'
        ]
        for p in patterns:
            ports = glob.glob(p)
            if ports:
                return ports[0]
        return None

    def start_serial_bridge(self):
        if self.running:
            return
        self.serial_port = self.auto_detect_serial()
        if not self.serial_port:
            logger.info("No physical Arduino USB/Bluetooth port found. Running in software bridge mode.")
            return

        try:
            import serial
            self.serial_conn = serial.Serial(self.serial_port, 9600, timeout=1.0)
            self.running = True
            self.latest_telemetry["hardware_connected"] = True
            self.rx_thread = threading.Thread(target=self._serial_read_loop, daemon=True)
            self.rx_thread.start()
            logger.info(f"Connected to Arduino on {self.serial_port} @ 9600 baud")
        except Exception as e:
            logger.warning(f"Could not open serial port {self.serial_port}: {e}")

    def _serial_read_loop(self):
        while self.running and self.serial_conn and self.serial_conn.is_open:
            try:
                line = self.serial_conn.readline().decode('utf-8', errors='replace').strip()
                if line:
                    self._parse_line(line)
                    # Broadcast to WebSockets
                    if self.loop:
                        asyncio.run_coroutine_threadsafe(self.broadcast(line), self.loop)
            except Exception as e:
                logger.error(f"Serial read error: {e}")
                break

    def _parse_line(self, line: str):
        if line.startswith("TELEMETRY "):
            payload = line[10:]
            tokens = payload.split('|')
            state_map = {0: "DISARMED", 1: "ARMED (IDLE)", 2: "MOVING FORWARD", 3: "MOVING REVERSE", 4: "OBSTACLE STOP", 7: "E-STOP"}
            for t in tokens:
                if ':' in t:
                    k, v = t.split(':', 1)
                    if k == 'S':
                        s_id = int(v)
                        self.latest_telemetry["state_id"] = s_id
                        self.latest_telemetry["state"] = state_map.get(s_id, f"STATE_{s_id}")
                    elif k == 'O':
                        self.latest_telemetry["obstacle_cm"] = float(v)
                    elif k == 'P':
                        self.latest_telemetry["pump_active"] = (v == '1')
                    elif k == 'SPD':
                        self.latest_telemetry["speed"] = int(v)
                    elif k == 'GPS':
                        self.latest_telemetry["gps"] = v
                    elif k == 'FIX':
                        self.latest_telemetry["gps_fix"] = (v == '1')
            self.latest_telemetry["last_updated"] = time.time()

    def send_command(self, cmd: str) -> bool:
        cmd_clean = cmd.strip() + "\n"
        if self.serial_conn and self.serial_conn.is_open:
            with self.lock:
                self.serial_conn.write(cmd_clean.encode('utf-8'))
                self.serial_conn.flush()
            return True
        else:
            # Emulate response for software simulator
            cmd_upper = cmd.strip().upper()
            if cmd_upper in ("ARM", "1"):
                self.latest_telemetry["state_id"] = 1
                self.latest_telemetry["state"] = "ARMED (IDLE)"
            elif cmd_upper in ("DISARM", "0"):
                self.latest_telemetry["state_id"] = 0
                self.latest_telemetry["state"] = "DISARMED"
                self.latest_telemetry["pump_active"] = False
            elif cmd_upper in ("FORWARD", "F", "W"):
                if self.latest_telemetry["state_id"] != 0:
                    self.latest_telemetry["state_id"] = 2
                    self.latest_telemetry["state"] = "MOVING FORWARD"
            elif cmd_upper in ("REVERSE", "B", "S"):
                if self.latest_telemetry["state_id"] != 0:
                    self.latest_telemetry["state_id"] = 3
                    self.latest_telemetry["state"] = "MOVING REVERSE"
            elif cmd_upper in ("STOP", "S", "HALT"):
                if self.latest_telemetry["state_id"] != 0:
                    self.latest_telemetry["state_id"] = 1
                    self.latest_telemetry["state"] = "ARMED (IDLE)"
            elif cmd_upper in ("PUMP_ON", "P"):
                if self.latest_telemetry["state_id"] != 0:
                    self.latest_telemetry["pump_active"] = True
            elif cmd_upper in ("PUMP_OFF",):
                self.latest_telemetry["pump_active"] = False
            elif cmd_upper in ("EMERGENCY_STOP", "ESTOP", "E"):
                self.latest_telemetry["state_id"] = 7
                self.latest_telemetry["state"] = "E-STOP"
                self.latest_telemetry["pump_active"] = False
            elif cmd_upper in ("CLEAR", "RESET"):
                self.latest_telemetry["state_id"] = 1
                self.latest_telemetry["state"] = "ARMED (IDLE)"

            self.latest_telemetry["last_updated"] = time.time()
            return True

    async def register(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Send initial telemetry snapshot
        telem_msg = f"TELEMETRY V:1.0|S:{self.latest_telemetry['state_id']}|O:{self.latest_telemetry['obstacle_cm']}|P:{1 if self.latest_telemetry['pump_active'] else 0}|SPD:{self.latest_telemetry['speed']}|GPS:{self.latest_telemetry['gps']}|FIX:{1 if self.latest_telemetry['gps_fix'] else 0}"
        await websocket.send_text(telem_msg)

    def unregister(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: str):
        dead_connections = set()
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception:
                dead_connections.add(conn)
        for dead in dead_connections:
            self.active_connections.discard(dead)

# Global bridge instance
rover_bridge = RoverBridge()

@router.on_event("startup")
async def startup_bridge():
    rover_bridge.loop = asyncio.get_event_loop()
    rover_bridge.start_serial_bridge()

@router.websocket("/ws")
async def websocket_rover_endpoint(websocket: WebSocket):
    """Real-time bidirectional WebSocket connection for Web Dashboard and Mobile App"""
    await rover_bridge.register(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                # Support both raw string ("FORWARD") and JSON ({"command": "FORWARD"})
                if data.startswith("{"):
                    parsed = json.loads(data)
                    cmd = parsed.get("command", "")
                else:
                    cmd = data
                if cmd:
                    rover_bridge.send_command(cmd)
                    # Echo ack back to client
                    await websocket.send_text(f"OK CMD_DISPATCHED_{cmd.strip().upper()}")
            except Exception as e:
                logger.error(f"Error handling WS message: {e}")
    except WebSocketDisconnect:
        rover_bridge.unregister(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        rover_bridge.unregister(websocket)

@router.post("/command", response_model=dict)
async def send_rover_command(req: RoverCommandRequest):
    """Send an operational command to the rover via REST API"""
    success = rover_bridge.send_command(req.command)
    return {
        "status": "success" if success else "failed",
        "command": req.command.strip().upper(),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/telemetry", response_model=dict)
async def get_rover_telemetry():
    """Get latest rover telemetry snapshot"""
    return {
        "telemetry": rover_bridge.latest_telemetry,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/profile", response_model=dict)
async def get_rover_profile():
    """Get rover profile information"""
    return {
        "rover_id": "AGROBOT-001",
        "model": "AgroBot AI Rover v1.0",
        "status": "active",
        "last_updated": datetime.utcnow().isoformat(),
        "capabilities": [
            "obstacle_detection",
            "gps_positioning",
            "pump_control",
            "ai_assisted_calculations",
            "websocket_telemetry",
            "bluetooth_hc05"
        ]
    }

@router.get("/status", response_model=dict)
async def get_rover_status():
    """Get current rover status"""
    return {
        "status": rover_bridge.latest_telemetry["state"],
        "hardware_connected": rover_bridge.latest_telemetry["hardware_connected"],
        "last_updated": datetime.utcnow().isoformat(),
        "safety_enabled": True
    }