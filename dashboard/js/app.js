/**
 * AgroBot Mission Control Dashboard
 * Main Orchestrator & UI Binding
 */

import { TelemetryManager, SafetyState } from './telemetry.js';
import { ConnectionManager } from './connection.js';
import { ControlsManager } from './controls.js';
import { FieldRadar } from './field-map.js';
import { AgronomyAssistant } from './agronomy-ai.js';

// Global state
let tm, conn, controls, radar, agronomy;

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

function initDashboard() {
  // 1. Initialize Log handler
  const logContainer = document.getElementById('consoleLog');
  const addLog = (text, type = 'sys') => {
    if (!logContainer) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    entry.textContent = `[${timeStr}] ${text}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Prune excessive log nodes
    if (logContainer.childNodes.length > 200) {
      logContainer.removeChild(logContainer.firstChild);
    }
  };

  // 2. Initialize Telemetry & Connection
  tm = new TelemetryManager();
  conn = new ConnectionManager(tm, addLog);
  controls = new ControlsManager(conn, tm);
  agronomy = new AgronomyAssistant('http://localhost:8000');

  // 3. Initialize 2D Canvas Radar
  const canvas = document.getElementById('fieldRadarCanvas');
  if (canvas) {
    radar = new FieldRadar(canvas, conn, tm);
  }

  // 4. Bind UI Controls
  bindHeaderControls(conn, tm);
  bindTacticalButtons(controls, conn, tm);
  bindTelemetryUI(tm);
  bindSimulatorTools(conn, radar);
  bindAgronomyAssistant(agronomy);
  bindConsoleInputs(conn);

  // Setup periodic weather updates
  initWeatherDisplay(agronomy);

  showToast('AgroBot Mission Control Loaded', 'success');
}

// ----------------------------------------------------------------------------
// Top Header Bindings
// ----------------------------------------------------------------------------
function bindHeaderControls(conn, tm) {
  const connSelect = document.getElementById('connectionModeSelect');
  const btnConnect = document.getElementById('btnConnect');
  const btnEstopHeader = document.getElementById('btnEstopHeader');

  if (connSelect) {
    connSelect.addEventListener('change', (e) => {
      conn.setMode(e.target.value);
      if (btnConnect) {
        btnConnect.classList.remove('connected');
        btnConnect.textContent = e.target.value === 'simulator' ? 'Sim Active' : 'Connect';
      }
    });
  }

  if (btnConnect) {
    btnConnect.addEventListener('click', async () => {
      if (conn.connected && conn.mode !== 'simulator') {
        conn.disconnect();
        btnConnect.classList.remove('connected');
        btnConnect.textContent = 'Connect';
      } else {
        const ok = await conn.connect();
        if (ok) {
          btnConnect.classList.add('connected');
          btnConnect.textContent = 'Disconnect';
        }
      }
    });
  }

  if (btnEstopHeader) {
    btnEstopHeader.addEventListener('click', () => {
      conn.sendCommand('EMERGENCY_STOP');
      showToast('EMERGENCY STOP TRIGGERED', 'danger');
    });
  }
}

// ----------------------------------------------------------------------------
// Tactical Drive & Station Buttons
// ----------------------------------------------------------------------------
function bindTacticalButtons(controls, conn, tm) {
  const btnArm = document.getElementById('btnArm');
  const btnDisarm = document.getElementById('btnDisarm');
  const btnPump = document.getElementById('btnPump');
  const estopGiantBtn = document.getElementById('estopGiantBtn');
  const speedSlider = document.getElementById('speedSlider');
  const speedValBadge = document.getElementById('speedValBadge');

  if (btnArm) {
    btnArm.addEventListener('click', () => {
      controls.arm();
      showToast('Arm command sent', 'success');
    });
  }

  if (btnDisarm) {
    btnDisarm.addEventListener('click', () => {
      controls.disarm();
      showToast('Rover Disarmed', 'warning');
    });
  }

  if (btnPump) {
    btnPump.addEventListener('click', () => {
      controls.togglePump();
    });
  }

  if (estopGiantBtn) {
    estopGiantBtn.addEventListener('click', () => {
      controls.emergencyStop();
      showToast('CRITICAL: EMERGENCY STOP ACTIVE', 'danger');
    });
  }

  // D-Pad buttons
  const bindDpadBtn = (id, onDown, onUp) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('mousedown', (e) => { e.preventDefault(); onDown(); });
    el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
    if (onUp) {
      el.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
      el.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
    }
  };

  bindDpadBtn('btnDpadForward', () => controls.forward());
  bindDpadBtn('btnDpadReverse', () => controls.reverse());
  bindDpadBtn('btnDpadLeft', () => controls.turnLeft(), () => conn.setTurnRate(0));
  bindDpadBtn('btnDpadRight', () => controls.turnRight(), () => conn.setTurnRate(0));
  bindDpadBtn('btnDpadStop', () => controls.stop());

  // Speed slider
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      controls.setSpeed(val);
      if (speedValBadge) speedValBadge.textContent = `${val} PWM`;
    });
  }
}

// ----------------------------------------------------------------------------
// Telemetry UI Updates
// ----------------------------------------------------------------------------
function bindTelemetryUI(tm) {
  const stateBanner = document.getElementById('stateBanner');
  const stateValue = document.getElementById('stateValue');
  const sonarNumber = document.getElementById('sonarNumber');
  const sonarStatus = document.getElementById('sonarStatus');
  const sonarArcFill = document.getElementById('sonarArcFill');

  const batteryBar = document.getElementById('batteryBar');
  const batteryPct = document.getElementById('batteryPct');
  const batteryVolt = document.getElementById('batteryVolt');

  const tankBar = document.getElementById('tankBar');
  const tankLiters = document.getElementById('tankLiters');
  const tankFlow = document.getElementById('tankFlow');

  const motorLeftPwm = document.getElementById('motorLeftPwm');
  const motorRightPwm = document.getElementById('motorRightPwm');

  const gpsLat = document.getElementById('gpsLat');
  const gpsLon = document.getElementById('gpsLon');
  const gpsAge = document.getElementById('gpsAge');

  const btnPump = document.getElementById('btnPump');
  const heartbeatPill = document.getElementById('heartbeatPill');
  const heartbeatPing = document.getElementById('heartbeatPing');

  // Sonar arc circumference
  const arcLength = 157; // π * 50

  tm.subscribe((t) => {
    // 1. Update State Banner
    if (stateBanner && stateValue) {
      stateValue.textContent = t.stateName;
      stateBanner.className = 'state-banner';

      if (t.state === SafetyState.DISARMED) stateBanner.classList.add('disarmed');
      else if (t.state === SafetyState.IDLE) stateBanner.classList.add('idle');
      else if (t.state === SafetyState.MOVING_FORWARD || t.state === SafetyState.MOVING_REVERSE) stateBanner.classList.add('moving');
      else if (t.state === SafetyState.OBSTACLE_STOP) stateBanner.classList.add('obstacle');
      else if (t.state === SafetyState.EMERGENCY_STOP || t.state === SafetyState.FAULT) stateBanner.classList.add('danger');
    }

    // 2. Ultrasonic Sonar Display
    if (sonarNumber && sonarStatus) {
      sonarNumber.textContent = t.obstacleDistance.toFixed(1);

      if (t.obstacleDistance < 30.0) {
        sonarStatus.textContent = 'OBSTACLE IN DANGER ZONE (<30cm)';
        sonarStatus.className = 'distance-status danger';
        sonarNumber.style.color = 'var(--danger-glow)';
      } else if (t.obstacleDistance < 60.0) {
        sonarStatus.textContent = 'Object Approaching (<60cm)';
        sonarStatus.className = 'distance-status';
        sonarStatus.style.color = 'var(--warning-glow)';
        sonarNumber.style.color = 'var(--warning-glow)';
      } else {
        sonarStatus.textContent = 'Path Clear (Sensor Active)';
        sonarStatus.className = 'distance-status';
        sonarStatus.style.color = 'var(--success)';
        sonarNumber.style.color = 'var(--secondary-glow)';
      }

      if (sonarArcFill) {
        // Range 0 to 200 cm
        const ratio = Math.min(1, Math.max(0, t.obstacleDistance / 200));
        const offset = arcLength * (1 - ratio);
        sonarArcFill.style.strokeDashoffset = offset;
        sonarArcFill.style.stroke = t.obstacleDistance < 30 ? 'var(--danger)' : 'url(#arc-gradient)';
      }
    }

    // 3. Battery Display
    if (batteryBar && batteryPct) {
      batteryPct.textContent = `${t.batteryLevel}%`;
      batteryBar.style.width = `${t.batteryLevel}%`;
      if (batteryVolt) batteryVolt.textContent = `${t.batteryVoltage.toFixed(1)}V`;

      if (t.batteryLevel < 20) {
        batteryBar.style.background = 'var(--danger)';
      } else {
        batteryBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      }
    }

    // 4. Chemical Spray Tank Display
    if (tankBar && tankLiters) {
      tankLiters.textContent = `${t.tankLiters.toFixed(1)} L`;
      const tankPct = Math.round((t.tankLiters / t.tankCapacity) * 100);
      tankBar.style.width = `${tankPct}%`;
      if (tankFlow) tankFlow.textContent = `${t.flowRateLpm.toFixed(1)} L/min`;
    }

    // 5. Pump Button Toggle State
    if (btnPump) {
      if (t.pumpOn) {
        btnPump.classList.add('active');
        btnPump.innerHTML = '<span class="pulse-dot"></span> PUMP RUNNING (D6)';
      } else {
        btnPump.classList.remove('active');
        btnPump.innerHTML = 'SPRAY PUMP (D6)';
      }
    }

    // 6. Motors Display
    if (motorLeftPwm && motorRightPwm) {
      motorLeftPwm.textContent = `${t.leftSpeedPWM}`;
      motorRightPwm.textContent = `${t.rightSpeedPWM}`;
    }

    // 7. GPS Display
    if (gpsLat && gpsLon) {
      gpsLat.textContent = t.latitude.toFixed(6);
      gpsLon.textContent = t.longitude.toFixed(6);
      if (gpsAge) gpsAge.textContent = `${t.fixAge}s`;
    }

    // 8. Heartbeat & Latency
    if (heartbeatPill && heartbeatPing) {
      const now = Date.now();
      const elapsed = now - t.lastHeartbeat;
      heartbeatPing.textContent = `${Math.min(999, elapsed)}ms`;
      if (elapsed > 4000) {
        heartbeatPill.classList.add('danger');
      } else {
        heartbeatPill.classList.remove('danger');
      }
    }
  });
}

// ----------------------------------------------------------------------------
// Simulator Canvas Controls & Obstacle Slider
// ----------------------------------------------------------------------------
function bindSimulatorTools(conn, radar) {
  const simDistanceSlider = document.getElementById('simDistanceSlider');
  const btnAddObstacle = document.getElementById('btnAddObstacle');
  const btnAddWaypoint = document.getElementById('btnAddWaypoint');
  const btnClearSwath = document.getElementById('btnClearSwath');

  if (simDistanceSlider) {
    simDistanceSlider.addEventListener('input', (e) => {
      conn.setSimObstacleDistance(e.target.value);
    });
  }

  if (btnAddObstacle && radar) {
    btnAddObstacle.addEventListener('click', () => {
      radar.setTool('add-obstacle');
      showToast('Click anywhere on field to drop obstacle', 'warning');
    });
  }

  if (btnAddWaypoint && radar) {
    btnAddWaypoint.addEventListener('click', () => {
      radar.setTool('add-waypoint');
      showToast('Click field to set target waypoint', 'success');
    });
  }

  if (btnClearSwath && radar) {
    btnClearSwath.addEventListener('click', () => {
      radar.clearSwath();
      showToast('Field spray trail cleared', 'sys');
    });
  }
}

// ----------------------------------------------------------------------------
// AI Agronomy Form & Calculations
// ----------------------------------------------------------------------------
function bindAgronomyAssistant(agronomy) {
  const form = document.getElementById('agronomyForm');
  const resultsCard = document.getElementById('aiResultsCard');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const crop = document.getElementById('cropSelect').value;
    const pest = document.getElementById('pestSelect').value;
    const productId = document.getElementById('pesticideSelect').value;
    const area = parseFloat(document.getElementById('areaInput').value) || 1.0;
    const tankCap = parseFloat(document.getElementById('tankCapacityInput').value) || 100.0;

    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Calculating AI Dose...';
    }

    try {
      const result = await agronomy.calculateApplication({
        crop,
        pest,
        productId,
        areaHectares: area,
        tankCapacityLiters: tankCap
      });

      if (resultsCard) {
        document.getElementById('resProductAmount').textContent = `${result.total_product_amount} ${result.units}`;
        document.getElementById('resSolutionVolume').textContent = `${result.total_solution_volume} L`;
        document.getElementById('resTanksCount').textContent = `${result.number_of_tanks} tank(s)`;
        document.getElementById('resProductPerTank').textContent = `${result.product_per_tank} ${result.units}/tank`;
        document.getElementById('resDriftRisk').textContent = result.drift_risk || 'Low';

        resultsCard.classList.add('visible');
      }

      showToast('AI Pesticide Dose Calculated Successfully', 'success');
    } catch (err) {
      showToast(`Calculation error: ${err.message}`, 'danger');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Calculate AI Dose & Validate
        `;
      }
    }
  });
}

// ----------------------------------------------------------------------------
// Weather Display & Microclimate Assessment
// ----------------------------------------------------------------------------
function initWeatherDisplay(agronomy) {
  const tempEl = document.getElementById('weatherTemp');
  const windEl = document.getElementById('weatherWind');
  const humEl = document.getElementById('weatherHum');
  const safetyPill = document.getElementById('weatherSafetyPill');

  const weather = {
    temp: 24.5,
    windSpeed: 2.8,
    humidity: 58,
    isRaining: false
  };

  const updateUI = () => {
    if (tempEl) tempEl.textContent = `${weather.temp.toFixed(1)}°C`;
    if (windEl) windEl.textContent = `${weather.windSpeed.toFixed(1)} m/s`;
    if (humEl) humEl.textContent = `${weather.humidity}%`;

    const safety = agronomy.validateWeatherSafety(weather);
    if (safetyPill) {
      safetyPill.className = `spray-safety-pill ${safety.status.toLowerCase()}`;
      safetyPill.textContent = `Spray Condition: ${safety.status} (${safety.errors.length ? safety.errors[0] : 'Safe wind & temp'})`;
    }
  };

  updateUI();

  // Subtle fluctuation every 10 seconds to feel live
  setInterval(() => {
    weather.temp += (Math.random() - 0.5) * 0.3;
    weather.windSpeed = Math.max(0.5, weather.windSpeed + (Math.random() - 0.5) * 0.4);
    weather.humidity = Math.min(95, Math.max(30, weather.humidity + Math.round((Math.random() - 0.5) * 2)));
    updateUI();
  }, 10000);
}

// ----------------------------------------------------------------------------
// Terminal / Serial Console Input
// ----------------------------------------------------------------------------
function bindConsoleInputs(conn) {
  const input = document.getElementById('consoleCmdInput');
  const btnSend = document.getElementById('btnConsoleSend');

  const handleSend = () => {
    if (!input) return;
    const val = input.value.trim();
    if (val) {
      conn.sendCommand(val);
      input.value = '';
    }
  };

  if (btnSend) btnSend.addEventListener('click', handleSend);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }
}

// ----------------------------------------------------------------------------
// Toast Notifications
// ----------------------------------------------------------------------------
export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px) scale(0.95)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}
