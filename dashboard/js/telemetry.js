/**
 * AgroBot Telemetry Parser & State Management
 * Handles parsing Arduino serial packets (V:1.0|S:...|GPS:...)
 * and updating UI gauges, sound alerts, and safety interlocks.
 */

// Safety State Enums matching Config.h
export const SafetyState = {
  DISARMED: 0,
  IDLE: 1,
  MOVING_FORWARD: 2,
  MOVING_REVERSE: 3,
  OBSTACLE_STOP: 4,
  COMMUNICATION_LOSS: 5,
  FAULT: 6,
  EMERGENCY_STOP: 7
};

export const StateNames = {
  [SafetyState.DISARMED]: 'DISARMED',
  [SafetyState.IDLE]: 'ARMED (IDLE)',
  [SafetyState.MOVING_FORWARD]: 'MOVING FORWARD',
  [SafetyState.MOVING_REVERSE]: 'MOVING REVERSE',
  [SafetyState.OBSTACLE_STOP]: 'OBSTACLE DETECTED - STOPPED',
  [SafetyState.COMMUNICATION_LOSS]: 'COMMUNICATION LOSS',
  [SafetyState.FAULT]: 'SYSTEM FAULT',
  [SafetyState.EMERGENCY_STOP]: 'EMERGENCY STOPPED'
};

export class TelemetryManager {
  constructor() {
    this.currentState = SafetyState.DISARMED;
    this.telemetry = {
      version: '1.0',
      state: SafetyState.DISARMED,
      stateName: 'DISARMED',
      latitude: 28.613939,
      longitude: 77.209021,
      fixAge: 0,
      obstacleDistance: 120.0,
      pumpOn: false,
      hasFault: false,
      speedPWM: 180,
      leftSpeedPWM: 0,
      rightSpeedPWM: 0,
      batteryLevel: 98,
      batteryVoltage: 12.6,
      tankLiters: 92.5,
      tankCapacity: 100.0,
      flowRateLpm: 0.0,
      lastHeartbeat: Date.now(),
      connected: false
    };

    this.listeners = new Set();
    this.audioCtx = null;
    this.lastBeepTime = 0;
  }

  // Subscribe to telemetry state updates
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      cb(this.telemetry);
    }
  }

  // Initialize Web Audio API for synthetic audio cues
  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, vol = 0.1) {
    try {
      this.initAudio();
      if (!this.audioCtx || this.audioCtx.state !== 'running') return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  playWarningBeep() {
    const now = Date.now();
    if (now - this.lastBeepTime > 600) {
      this.playTone(880, 'triangle', 0.2, 0.2);
      this.lastBeepTime = now;
    }
  }

  playEstopAlarm() {
    this.playTone(440, 'sawtooth', 0.35, 0.3);
    setTimeout(() => this.playTone(330, 'sawtooth', 0.35, 0.3), 150);
  }

  playArmChime() {
    this.playTone(523.25, 'sine', 0.12, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.18, 0.18), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.25, 0.22), 200); // G5
  }

  /**
   * Parse raw incoming ASCII string from serial/bluetooth/websocket
   * Examples:
   * "TELEMETRY V:1.0|S:1|GPS:28.6139,77.2090|G:5|O:145.2|P:0|F:0"
   * "OK System armed"
   * "OK Moving forward"
   */
  parsePacket(line) {
    if (!line || typeof line !== 'string') return;
    const trimmed = line.trim();

    // Check if it's a telemetry packet
    if (trimmed.startsWith('TELEMETRY ') || trimmed.startsWith('V:')) {
      const dataStr = trimmed.startsWith('TELEMETRY ') ? trimmed.slice(10) : trimmed;
      this.parseTelemetryString(dataStr);
    } else if (trimmed.startsWith('OK ')) {
      const msg = trimmed.slice(3).toLowerCase();
      if (msg.includes('armed')) {
        this.updateState(SafetyState.IDLE);
        this.playArmChime();
      } else if (msg.includes('disarmed')) {
        this.updateState(SafetyState.DISARMED);
        this.playTone(392, 'sine', 0.2, 0.1);
      } else if (msg.includes('forward')) {
        this.updateState(SafetyState.MOVING_FORWARD);
      } else if (msg.includes('reverse')) {
        this.updateState(SafetyState.MOVING_REVERSE);
      } else if (msg.includes('stopped')) {
        this.updateState(SafetyState.IDLE);
      } else if (msg.includes('emergency')) {
        this.updateState(SafetyState.EMERGENCY_STOP);
        this.playEstopAlarm();
      } else if (msg.includes('pump_on') || msg.includes('pump on')) {
        this.telemetry.pumpOn = true;
        this.telemetry.flowRateLpm = 2.4;
        this.notify();
      } else if (msg.includes('pump_off') || msg.includes('pump off') || msg.includes('pump turned off')) {
        this.telemetry.pumpOn = false;
        this.telemetry.flowRateLpm = 0.0;
        this.notify();
      } else if (msg.includes('cleared') || msg.includes('idle')) {
        this.updateState(SafetyState.IDLE);
      }
    } else if (trimmed.startsWith('ERROR ')) {
      const errMsg = trimmed.slice(6).toLowerCase();
      if (errMsg.includes('obstacle')) {
        this.updateState(SafetyState.OBSTACLE_STOP);
        this.playWarningBeep();
      }
    }
  }

  // Parse key-value chunks: V:1.0|S:1|GPS:28.61,77.20|G:0|O:45.0|P:0|SPD:180
  parseTelemetryString(raw) {
    const tokens = raw.split('|');
    for (const token of tokens) {
      const colonIdx = token.indexOf(':');
      if (colonIdx === -1) continue;
      const key = token.substring(0, colonIdx);
      const val = token.substring(colonIdx + 1);

      switch (key) {
        case 'V':
          this.telemetry.version = val;
          break;
        case 'S': {
          const st = parseInt(val, 10);
          if (!isNaN(st)) this.updateState(st);
          break;
        }
        case 'SPD': {
          const spd = parseInt(val, 10);
          if (!isNaN(spd)) this.telemetry.speedPWM = spd;
          break;
        }
        case 'GPS': {
          const parts = val.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lon = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lon)) {
              this.telemetry.latitude = lat;
              this.telemetry.longitude = lon;
            }
          }
          break;
        }
        case 'G': {
          const gAge = parseInt(val, 10);
          if (!isNaN(gAge)) this.telemetry.fixAge = gAge;
          break;
        }
        case 'FIX': {
          this.telemetry.gpsFix = (val === '1');
          break;
        }
        case 'O': {
          const dist = parseFloat(val);
          if (!isNaN(dist)) {
            this.telemetry.obstacleDistance = Math.max(0, dist);
            if (dist < 30.0 && (this.currentState === SafetyState.MOVING_FORWARD || this.currentState === SafetyState.MOVING_REVERSE)) {
              this.playWarningBeep();
            }
          }
          break;
        }
        case 'P': {
          this.telemetry.pumpOn = val === '1';
          this.telemetry.flowRateLpm = this.telemetry.pumpOn ? 2.4 : 0.0;
          break;
        }
        case 'F': {
          this.telemetry.hasFault = val === '1';
          if (this.telemetry.hasFault) this.updateState(SafetyState.FAULT);
          break;
        }
      }
    }

    this.telemetry.lastHeartbeat = Date.now();
    this.notify();
  }

  updateState(newState) {
    this.currentState = newState;
    this.telemetry.state = newState;
    this.telemetry.stateName = StateNames[newState] || 'UNKNOWN';

    // Update motor speed expectations based on state
    if (newState === SafetyState.MOVING_FORWARD) {
      this.telemetry.leftSpeedPWM = this.telemetry.speedPWM;
      this.telemetry.rightSpeedPWM = this.telemetry.speedPWM;
    } else if (newState === SafetyState.MOVING_REVERSE) {
      this.telemetry.leftSpeedPWM = -this.telemetry.speedPWM;
      this.telemetry.rightSpeedPWM = -this.telemetry.speedPWM;
    } else {
      this.telemetry.leftSpeedPWM = 0;
      this.telemetry.rightSpeedPWM = 0;
    }

    if (newState === SafetyState.DISARMED || newState === SafetyState.EMERGENCY_STOP || newState === SafetyState.OBSTACLE_STOP) {
      this.telemetry.pumpOn = false;
      this.telemetry.flowRateLpm = 0.0;
    }

    this.notify();
  }

  setSpeed(pwm) {
    this.telemetry.speedPWM = Math.max(80, Math.min(255, pwm));
    if (this.currentState === SafetyState.MOVING_FORWARD) {
      this.telemetry.leftSpeedPWM = this.telemetry.speedPWM;
      this.telemetry.rightSpeedPWM = this.telemetry.speedPWM;
    } else if (this.currentState === SafetyState.MOVING_REVERSE) {
      this.telemetry.leftSpeedPWM = -this.telemetry.speedPWM;
      this.telemetry.rightSpeedPWM = -this.telemetry.speedPWM;
    }
    this.notify();
  }
}
