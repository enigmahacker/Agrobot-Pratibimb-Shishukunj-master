/**
 * AgroBot Connectivity Manager
 * Supports:
 * 1. Web Serial API (Direct USB connection to Arduino Uno at 9600 baud)
 * 2. Web Bluetooth API (Direct connection to HC-05 module)
 * 3. FastAPI WebSocket / REST bridge
 * 4. High-Fidelity Digital Twin Hardware Simulator (runs in browser)
 */

import { SafetyState } from './telemetry.js';

export class ConnectionManager {
  constructor(telemetryManager, onLogCallback) {
    this.tm = telemetryManager;
    this.log = onLogCallback || console.log;
    this.mode = 'simulator'; // 'simulator' | 'serial' | 'bluetooth' | 'websocket'
    this.connected = false;

    // Serial state
    this.serialPort = null;
    this.serialReader = null;
    this.serialWriter = null;

    // Bluetooth state
    this.btDevice = null;
    this.btServer = null;
    this.btTxChar = null;

    // WebSocket state
    this.socket = null;

    // Simulator state
    this.simRover = {
      x: 350,
      y: 220,
      heading: 0, // degrees: 0 = East, 90 = South, 180 = West, 270 = North
      speed: 0,
      turnRate: 0,
      tankLiters: 92.5,
      batteryLevel: 98.4,
      obstacleDistance: 120.0,
      pumpActive: false,
      lastCommandTime: Date.now()
    };
    this.simInterval = null;
    this.simTelemetryInterval = null;

    // Start with simulator by default so user has instant working interactive dashboard
    this.startSimulator();
  }

  setMode(newMode) {
    if (this.mode === newMode) return;
    this.disconnect();
    this.mode = newMode;
  }

  async connect() {
    if (this.mode === 'simulator') {
      this.startSimulator();
      return true;
    } else if (this.mode === 'serial') {
      return await this.connectSerial();
    } else if (this.mode === 'bluetooth') {
      return await this.connectBluetooth();
    } else if (this.mode === 'websocket') {
      return await this.connectWebSocket();
    }
  }

  disconnect() {
    this.stopSimulator();
    this.disconnectSerial();
    this.disconnectBluetooth();
    this.disconnectWebSocket();
    this.connected = false;
    this.tm.telemetry.connected = false;
    this.tm.notify();
    this.log('Disconnected', 'sys');
  }

  // --------------------------------------------------------------------------
  // Send Command Dispatcher
  // --------------------------------------------------------------------------
  async sendCommand(commandStr) {
    const cmd = commandStr.trim().toUpperCase();
    this.log(`> CMD: ${cmd}`, 'tx');

    if (this.mode === 'simulator') {
      this.simProcessCommand(cmd);
      return;
    }

    if (this.mode === 'serial' && this.serialWriter) {
      try {
        const encoder = new TextEncoder();
        await this.serialWriter.write(encoder.encode(cmd + '\n'));
      } catch (e) {
        this.log(`Serial Write Error: ${e.message}`, 'err');
      }
    } else if (this.mode === 'websocket' && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ command: cmd }));
    } else {
      this.log('Not connected to device', 'warn');
    }
  }

  // --------------------------------------------------------------------------
  // 1. Web Serial API (Arduino Uno USB @ 9600 baud)
  // --------------------------------------------------------------------------
  async connectSerial() {
    if (!('serial' in navigator)) {
      this.log('Web Serial API not supported in this browser. Use Chrome, Edge, or Opera.', 'err');
      alert('Web Serial is only supported in Chromium-based browsers (Chrome, Edge, Opera).');
      return false;
    }

    try {
      this.log('Requesting serial port (Arduino Uno @ 9600 baud)...', 'sys');
      this.serialPort = await navigator.serial.requestPort();
      await this.serialPort.open({ baudRate: 9600 });

      this.connected = true;
      this.tm.telemetry.connected = true;
      this.tm.notify();
      this.log('Serial Port opened successfully @ 9600 baud', 'rx');

      // Setup writer
      this.serialWriter = this.serialPort.writable.getWriter();

      // Read loop
      this.readSerialLoop();
      return true;
    } catch (e) {
      this.log(`Serial connection cancelled or failed: ${e.message}`, 'err');
      this.connected = false;
      return false;
    }
  }

  async readSerialLoop() {
    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.serialPort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      let buffer = '';

      while (this.connected) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete chunk
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              this.log(`< ${trimmed}`, 'rx');
              this.tm.parsePacket(trimmed);
            }
          }
        }
      }
    } catch (e) {
      if (this.connected) {
        this.log(`Serial stream read error: ${e.message}`, 'err');
        this.disconnect();
      }
    }
  }

  disconnectSerial() {
    if (this.serialWriter) {
      try { this.serialWriter.releaseLock(); } catch(e){}
      this.serialWriter = null;
    }
    if (this.serialPort) {
      try { this.serialPort.close(); } catch(e){}
      this.serialPort = null;
    }
  }

  // --------------------------------------------------------------------------
  // 2. Web Bluetooth API (HC-05 BLE)
  // --------------------------------------------------------------------------
  async connectBluetooth() {
    if (!('bluetooth' in navigator)) {
      this.log('Web Bluetooth API not supported in this browser.', 'err');
      return false;
    }
    try {
      this.log('Scanning for HC-05 / AgroBot Bluetooth...', 'sys');
      this.btDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb', 'generic_access']
      });

      this.btServer = await this.btDevice.gatt.connect();
      this.connected = true;
      this.tm.telemetry.connected = true;
      this.tm.notify();
      this.log(`Bluetooth connected to: ${this.btDevice.name || 'AgroBot HC-05'}`, 'rx');
      return true;
    } catch (e) {
      this.log(`Bluetooth connection failed: ${e.message}`, 'err');
      return false;
    }
  }

  disconnectBluetooth() {
    if (this.btDevice && this.btDevice.gatt.connected) {
      this.btDevice.gatt.disconnect();
    }
    this.btDevice = null;
  }

  // --------------------------------------------------------------------------
  // 3. FastAPI WebSocket Bridge
  // --------------------------------------------------------------------------
  async connectWebSocket(url = 'ws://localhost:8000/v1/rover/ws') {
    try {
      this.log(`Connecting WebSocket to ${url}...`, 'sys');
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.connected = true;
        this.tm.telemetry.connected = true;
        this.tm.notify();
        this.log('WebSocket connected to AgroBot Backend Gateway', 'rx');
      };

      this.socket.onmessage = (event) => {
        const text = event.data;
        this.log(`< ${text}`, 'rx');
        this.tm.parsePacket(text);
      };

      this.socket.onerror = (err) => {
        this.log(`WebSocket error: ${err.message || 'connection failed'}`, 'err');
      };

      this.socket.onclose = () => {
        this.connected = false;
        this.tm.telemetry.connected = false;
        this.tm.notify();
        this.log('WebSocket closed', 'warn');
      };
      return true;
    } catch (e) {
      this.log(`WebSocket connection failed: ${e.message}`, 'err');
      return false;
    }
  }

  disconnectWebSocket() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // --------------------------------------------------------------------------
  // 4. Built-in High Fidelity Digital Twin Hardware Simulator
  // --------------------------------------------------------------------------
  startSimulator() {
    this.stopSimulator();
    this.connected = true;
    this.tm.telemetry.connected = true;
    this.simRover.lastCommandTime = Date.now();
    this.log('AgroBot Digital Twin Simulator activated (Arduino Uno + HC-05 simulation)', 'sys');

    // 20Hz Simulation physics tick
    this.simInterval = setInterval(() => {
      this.simTick();
    }, 50);

    // 1Hz Telemetry packet dispatch (matches AgroBot.ino loop())
    this.simTelemetryInterval = setInterval(() => {
      this.simEmitTelemetry();
    }, 1000);

    this.tm.notify();
  }

  stopSimulator() {
    if (this.simInterval) clearInterval(this.simInterval);
    if (this.simTelemetryInterval) clearInterval(this.simTelemetryInterval);
    this.simInterval = null;
    this.simTelemetryInterval = null;
  }

  simTick() {
    const st = this.tm.currentState;
    const now = Date.now();

    // Check communication timeout (5000ms from Config.h COMMUNICATION_TIMEOUT_MS)
    if (st !== SafetyState.DISARMED && st !== SafetyState.COMMUNICATION_LOSS && st !== SafetyState.EMERGENCY_STOP) {
      if (now - this.simRover.lastCommandTime > 5000) {
        this.tm.updateState(SafetyState.COMMUNICATION_LOSS);
        this.log('SAFETY INTERLOCK: Communication timeout (>5000ms) - Rover entered safe state', 'warn');
      }
    }

    // Rover kinematics
    if (st === SafetyState.MOVING_FORWARD) {
      const rad = (this.simRover.heading * Math.PI) / 180;
      this.simRover.x += Math.cos(rad) * 1.8;
      this.simRover.y += Math.sin(rad) * 1.8;
      // Slight GPS coordinate drift
      this.tm.telemetry.latitude += 0.000003;
      this.tm.telemetry.longitude += 0.000004;

      // Obstacle detection check (line 228 checkObstacles() in AgroBot.ino)
      if (this.simRover.obstacleDistance <= 30.0) {
        this.tm.updateState(SafetyState.OBSTACLE_STOP);
        this.log('OBSTACLE INTERLOCK: Proximity < 30cm! Automatic Emergency Halt triggered!', 'err');
      }
    } else if (st === SafetyState.MOVING_REVERSE) {
      const rad = (this.simRover.heading * Math.PI) / 180;
      this.simRover.x -= Math.cos(rad) * 1.4;
      this.simRover.y -= Math.sin(rad) * 1.4;
      this.tm.telemetry.latitude -= 0.000002;
      this.tm.telemetry.longitude -= 0.000003;
    }

    // Steering turn rate
    if (this.simRover.turnRate !== 0 && (st === SafetyState.MOVING_FORWARD || st === SafetyState.MOVING_REVERSE || st === SafetyState.IDLE)) {
      this.simRover.heading = (this.simRover.heading + this.simRover.turnRate + 360) % 360;
    }

    // Chemical spray fluid consumption if pump is active
    if (this.tm.telemetry.pumpOn && this.simRover.tankLiters > 0) {
      // 2.4 L/min = 0.002 L per 50ms tick
      this.simRover.tankLiters = Math.max(0, this.simRover.tankLiters - 0.002);
      this.tm.telemetry.tankLiters = parseFloat(this.simRover.tankLiters.toFixed(2));
      if (this.simRover.tankLiters <= 0) {
        this.tm.telemetry.pumpOn = false;
        this.log('PUMP AUTO-SHUTDOWN: Chemical tank empty!', 'warn');
      }
    }

    // Battery slow discharge
    this.simRover.batteryLevel = Math.max(10, this.simRover.batteryLevel - 0.0001);
    this.tm.telemetry.batteryLevel = Math.round(this.simRover.batteryLevel);
  }

  simEmitTelemetry() {
    const st = this.tm.currentState;
    const lat = this.tm.telemetry.latitude.toFixed(6);
    const lon = this.tm.telemetry.longitude.toFixed(6);
    const dist = this.simRover.obstacleDistance.toFixed(1);
    const pump = this.tm.telemetry.pumpOn ? 1 : 0;
    const fault = this.tm.telemetry.hasFault ? 1 : 0;

    // Build the exact Arduino packet: V:%s|S:%d|GPS:%.6f,%.6f|G:%lu|O:%.1f|P:%d|F:%d
    const packet = `TELEMETRY V:1.0|S:${st}|GPS:${lat},${lon}|G:0|O:${dist}|P:${pump}|F:${fault}`;
    this.tm.parsePacket(packet);
  }

  simProcessCommand(cmd) {
    this.simRover.lastCommandTime = Date.now();

    switch (cmd) {
      case 'ARM':
        if (this.tm.currentState === SafetyState.DISARMED) {
          this.tm.parsePacket('OK System armed');
          this.log('< OK System armed', 'rx');
        } else {
          this.log('< ERROR System already armed or in fault state', 'warn');
        }
        break;

      case 'DISARM':
        if (this.tm.currentState !== SafetyState.DISARMED) {
          this.tm.parsePacket('OK System disarmed');
          this.log('< OK System disarmed', 'rx');
        } else {
          this.log('< ERROR System already disarmed', 'warn');
        }
        break;

      case 'FORWARD':
        if (this.tm.currentState === SafetyState.IDLE || this.tm.currentState === SafetyState.MOVING_REVERSE) {
          if (this.simRover.obstacleDistance > 30.0) {
            this.tm.parsePacket('OK Moving forward');
            this.log('< OK Moving forward', 'rx');
          } else {
            this.log('< ERROR Obstacle detected ahead (<30cm) - Forward movement blocked', 'err');
          }
        } else {
          this.log('< ERROR Movement not allowed in current state (Arm rover first)', 'warn');
        }
        break;

      case 'REVERSE':
        if (this.tm.currentState === SafetyState.IDLE || this.tm.currentState === SafetyState.MOVING_FORWARD) {
          this.tm.parsePacket('OK Moving reverse');
          this.log('< OK Moving reverse', 'rx');
        } else {
          this.log('< ERROR Movement not allowed in current state (Arm rover first)', 'warn');
        }
        break;

      case 'STOP':
        if (this.tm.currentState === SafetyState.MOVING_FORWARD || this.tm.currentState === SafetyState.MOVING_REVERSE) {
          this.tm.parsePacket('OK Stopped');
          this.log('< OK Stopped', 'rx');
        } else {
          this.log('< ERROR No movement to stop', 'warn');
        }
        break;

      case 'EMERGENCY_STOP':
        this.tm.parsePacket('OK Emergency stop activated');
        this.log('< OK Emergency stop activated - ALL MOTORS & PUMP CUT', 'err');
        break;

      case 'PUMP_ON':
        if (this.tm.currentState !== SafetyState.DISARMED && this.tm.currentState !== SafetyState.EMERGENCY_STOP && this.tm.currentState !== SafetyState.FAULT) {
          this.tm.telemetry.pumpOn = true;
          this.tm.telemetry.flowRateLpm = 2.4;
          this.tm.notify();
          this.log('< OK Relay D6 Closed: Pump activated', 'rx');
        } else {
          this.log('< ERROR Pump safety interlock: cannot run when disarmed/faulted', 'warn');
        }
        break;

      case 'PUMP_OFF':
        this.tm.parsePacket('OK Pump turned off');
        this.log('< OK Relay D6 Opened: Pump turned off', 'rx');
        break;

      case 'HEARTBEAT':
        this.log('< OK Heartbeat received', 'rx');
        break;

      case 'STATUS': {
        const msg = `State:${this.tm.currentState}|GPS:OK|Obstacle:${this.simRover.obstacleDistance < 30 ? 'DETECTED' : 'CLEAR'}|Pump:${this.tm.telemetry.pumpOn ? 'ON' : 'OFF'}`;
        this.log(`< OK ${msg}`, 'rx');
        break;
      }

      default:
        this.log('< INVALID_CMD Unknown command', 'warn');
        break;
    }
  }

  // Adjust simulator distance slider
  setSimObstacleDistance(distanceCm) {
    this.simRover.obstacleDistance = parseFloat(distanceCm);
    this.tm.telemetry.obstacleDistance = parseFloat(distanceCm);
    this.tm.notify();
  }

  // Simulator steering commands
  setTurnRate(rate) {
    this.simRover.turnRate = rate;
  }
}
