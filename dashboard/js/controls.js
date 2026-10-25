/**
 * AgroBot Tactical Controls & Safety Interlocks
 * Handles keyboard input, D-pad events, throttle modulation,
 * emergency stop handling, and periodic heartbeat pinging.
 */

export class ControlsManager {
  constructor(connectionManager, telemetryManager) {
    this.conn = connectionManager;
    this.tm = telemetryManager;

    this.activeKeys = new Set();
    this.heartbeatTimer = null;

    this.setupKeyboardListeners();
    this.startHeartbeatLoop();
  }

  // Periodic heartbeat every 2.5s (Config.h timeout is 5.0s)
  startHeartbeatLoop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.conn.connected && this.tm.currentState !== 0) {
        this.conn.sendCommand('HEARTBEAT');
      }
    }, 2500);
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in input or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      const key = e.key.toUpperCase();
      if (this.activeKeys.has(key)) return; // Debounce repeat
      this.activeKeys.add(key);

      switch (key) {
        case 'W':
        case 'ARROWUP':
          e.preventDefault();
          this.forward();
          break;
        case 'S':
        case 'ARROWDOWN':
          e.preventDefault();
          this.reverse();
          break;
        case 'A':
        case 'ARROWLEFT':
          e.preventDefault();
          this.turnLeft();
          break;
        case 'D':
        case 'ARROWRIGHT':
          e.preventDefault();
          this.turnRight();
          break;
        case ' ': // Spacebar
        case 'X':
          e.preventDefault();
          this.stop();
          break;
        case 'E':
        case 'ESCAPE':
          e.preventDefault();
          this.emergencyStop();
          break;
        case 'P':
          e.preventDefault();
          this.togglePump();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toUpperCase();
      this.activeKeys.delete(key);

      if (['A', 'ARROWLEFT', 'D', 'ARROWRIGHT'].includes(key)) {
        this.conn.setTurnRate(0);
      }
    });
  }

  arm() {
    this.conn.sendCommand('ARM');
  }

  disarm() {
    this.conn.sendCommand('DISARM');
  }

  forward() {
    this.conn.sendCommand('FORWARD');
  }

  reverse() {
    this.conn.sendCommand('REVERSE');
  }

  turnLeft() {
    this.conn.sendCommand('LEFT');
    this.conn.setTurnRate(-4);
  }

  turnRight() {
    this.conn.sendCommand('RIGHT');
    this.conn.setTurnRate(4);
  }

  stop() {
    this.conn.sendCommand('STOP');
    this.conn.setTurnRate(0);
  }

  emergencyStop() {
    this.conn.sendCommand('EMERGENCY_STOP');
    this.conn.setTurnRate(0);
  }

  resetFault() {
    this.conn.sendCommand('CLEAR');
    this.conn.setTurnRate(0);
  }

  togglePump() {
    if (this.tm.telemetry.pumpOn) {
      this.conn.sendCommand('PUMP_OFF');
    } else {
      this.conn.sendCommand('PUMP_ON');
    }
  }

  setSpeed(pwmVal) {
    this.tm.setSpeed(pwmVal);
    this.conn.sendCommand(`SPEED:${pwmVal}`);
  }
}
