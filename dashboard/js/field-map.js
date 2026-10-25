/**
 * AgroBot 2D Agricultural Field Canvas & Radar Simulator
 * High-FPS interactive field simulation:
 * - AgroBot chassis, wheels, heading vector, and HC-SR04 ultrasonic sonar cone
 * - Dynamic obstacle placement (drag & drop boulders, crates)
 * - Ultrasonic raycasting to calculate real distance to obstacles
 * - Spray droplet particle simulation leaving spray swath trails
 * - Soil grid and crop rows rendering
 */

export class FieldRadar {
  constructor(canvasElement, connectionManager, telemetryManager) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.conn = connectionManager;
    this.tm = telemetryManager;

    // Canvas sizing
    this.width = 0;
    this.height = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Obstacles in the field
    this.obstacles = [
      { id: 1, x: 500, y: 220, radius: 24, label: 'Rock 1', color: '#64748b' },
      { id: 2, x: 220, y: 120, radius: 20, label: 'Crate', color: '#78716c' },
      { id: 3, x: 620, y: 320, radius: 28, label: 'Boulder', color: '#475569' }
    ];

    // Dragging state
    this.draggedObstacle = null;
    this.isDragging = false;
    this.selectedTool = 'select'; // 'select' | 'add-obstacle' | 'add-waypoint'

    // Waypoints
    this.waypoints = [
      { x: 650, y: 220, label: 'WP 1' }
    ];

    // Spray particles & swath
    this.sprayParticles = [];
    this.spraySwath = []; // Array of {x, y, radius}

    // Animation frame
    this.wheelAnim = 0;
    this.sonarPulse = 0;

    this.setupEvents();
    this.startLoop();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
    window.addEventListener('mouseup', () => this.onPointerUp());

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.onPointerDown(touch);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.onPointerMove(touch);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => this.onPointerUp());
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onPointerDown(e) {
    const pos = this.getCanvasCoords(e);

    if (this.selectedTool === 'add-obstacle') {
      this.obstacles.push({
        id: Date.now(),
        x: pos.x,
        y: pos.y,
        radius: 22,
        label: `Obs ${this.obstacles.length + 1}`,
        color: '#64748b'
      });
      this.selectedTool = 'select';
      this.updateSonarDistance();
      return;
    }

    if (this.selectedTool === 'add-waypoint') {
      this.waypoints = [{ x: pos.x, y: pos.y, label: `WP ${this.waypoints.length + 1}` }];
      this.selectedTool = 'select';
      return;
    }

    // Check hit test on obstacles
    for (const obs of this.obstacles) {
      const dist = Math.hypot(pos.x - obs.x, pos.y - obs.y);
      if (dist <= obs.radius + 8) {
        this.draggedObstacle = obs;
        this.isDragging = true;
        break;
      }
    }
  }

  onPointerMove(e) {
    if (this.isDragging && this.draggedObstacle) {
      const pos = this.getCanvasCoords(e);
      this.draggedObstacle.x = Math.max(30, Math.min(this.width - 30, pos.x));
      this.draggedObstacle.y = Math.max(30, Math.min(this.height - 30, pos.y));
      this.updateSonarDistance();
    }
  }

  onPointerUp() {
    this.isDragging = false;
    this.draggedObstacle = null;
  }

  // Calculate ultrasonic distance using raycasting from front sensor
  updateSonarDistance() {
    const r = this.conn.simRover;
    const rad = (r.heading * Math.PI) / 180;

    // Sensor origin is 28px ahead of rover center
    const sensorX = r.x + Math.cos(rad) * 28;
    const sensorY = r.y + Math.sin(rad) * 28;

    let closestDistanceCm = 200.0; // Max range

    // Cone half-angle is 20 degrees
    const coneAngle = (20 * Math.PI) / 180;

    for (const obs of this.obstacles) {
      const dx = obs.x - sensorX;
      const dy = obs.y - sensorY;
      const distPx = Math.hypot(dx, dy);

      // Angle to obstacle
      const angleToObs = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angleToObs - rad);
      while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);

      if (angleDiff <= coneAngle) {
        // In cone!
        const edgeDistPx = Math.max(0, distPx - obs.radius);
        // Scale: 1 pixel = 1 cm
        const distCm = edgeDistPx;
        if (distCm < closestDistanceCm) {
          closestDistanceCm = distCm;
        }
      }
    }

    // Update connection manager
    this.conn.setSimObstacleDistance(closestDistanceCm);
  }

  startLoop() {
    const render = () => {
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Field Soil & Crop Rows
    this.drawFieldGrid(ctx);

    // 2. Draw Spray Swath / Chemical coverage
    this.drawSpraySwath(ctx);

    // 3. Draw Waypoint Line
    this.drawWaypoints(ctx);

    // 4. Draw Obstacles
    this.drawObstacles(ctx);

    // 5. Draw AgroBot & Sonar Cone
    this.drawAgroBot(ctx);

    // 6. Draw Spray Particles
    this.drawSprayParticles(ctx);

    // Update sonar distance dynamically as rover moves
    this.updateSonarDistance();
  }

  drawFieldGrid(ctx) {
    // Subtle soil background
    ctx.fillStyle = '#060a0f';
    ctx.fillRect(0, 0, this.width, this.height);

    // Crop row lines (representing planting furrows)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 30; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();

      // Dotted plant seedlings along row
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      for (let x = 20; x < this.width; x += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Grid coordinates
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    for (let x = 0; x < this.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
  }

  drawSpraySwath(ctx) {
    const r = this.conn.simRover;
    if (this.tm.telemetry.pumpOn) {
      // Add swath point
      this.spraySwath.push({ x: r.x, y: r.y, alpha: 0.25 });
      if (this.spraySwath.length > 500) this.spraySwath.shift();
    }

    if (this.spraySwath.length > 0) {
      ctx.save();
      for (let i = 0; i < this.spraySwath.length; i++) {
        const pt = this.spraySwath[i];
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawWaypoints(ctx) {
    const r = this.conn.simRover;
    for (const wp of this.waypoints) {
      // Dashed navigation line from rover to waypoint
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(wp.x, wp.y);
      ctx.stroke();
      ctx.restore();

      // Waypoint flag / circle
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(wp.label, wp.x, wp.y - 14);
    }
  }

  drawObstacles(ctx) {
    for (const obs of this.obstacles) {
      ctx.save();
      // Outer shadow & danger glow if near
      const isDragged = this.draggedObstacle === obs;
      ctx.shadowColor = isDragged ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = isDragged ? 15 : 8;

      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isDragged ? '#ef4444' : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = isDragged ? 2.5 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(obs.label, obs.x, obs.y + 4);
      ctx.restore();
    }
  }

  drawAgroBot(ctx) {
    const r = this.conn.simRover;
    const rad = (r.heading * Math.PI) / 180;
    const isMoving = this.tm.currentState === 2 || this.tm.currentState === 3;

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(rad);

    // 1. Ultrasonic Sonar Cone (HC-SR04)
    this.sonarPulse = (this.sonarPulse + 0.05) % 1;
    const coneDist = Math.min(180, Math.max(30, r.obstacleDistance));
    const coneAngle = (20 * Math.PI) / 180;

    // Draw sonar beam
    const isDanger = r.obstacleDistance < 30.0;
    const beamColor = isDanger ? 'rgba(239, 68, 68, ' : 'rgba(6, 182, 212, ';

    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.arc(28, 0, coneDist, -coneAngle, coneAngle);
    ctx.closePath();
    ctx.fillStyle = beamColor + (isDanger ? '0.22)' : '0.08)');
    ctx.fill();
    ctx.strokeStyle = beamColor + (isDanger ? '0.65)' : '0.28)');
    ctx.lineWidth = 1;
    ctx.stroke();

    // Sonar radiating wave ring
    const waveRadius = 28 + (coneDist - 28) * this.sonarPulse;
    ctx.beginPath();
    ctx.arc(28, 0, waveRadius, -coneAngle, coneAngle);
    ctx.strokeStyle = beamColor + (0.5 * (1 - this.sonarPulse)) + ')';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Rover Wheels (L298N Differential Drive)
    const wheelLength = 22;
    const wheelWidth = 8;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;

    // Left wheels
    ctx.fillRect(-16, -26, wheelLength, wheelWidth);
    ctx.strokeRect(-16, -26, wheelLength, wheelWidth);
    // Right wheels
    ctx.fillRect(-16, 18, wheelLength, wheelWidth);
    ctx.strokeRect(-16, 18, wheelLength, wheelWidth);

    // 3. Rover Main Chassis
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isDanger ? '#ef4444' : (this.tm.currentState === 1 ? '#10b981' : '#06b6d4');
    ctx.lineWidth = 2;

    // Rounded rectangle chassis
    ctx.beginPath();
    ctx.roundRect(-24, -20, 48, 40, [6, 12, 12, 6]);
    ctx.fill();
    ctx.stroke();

    // Chemical Tank on Rover back
    ctx.fillStyle = 'rgba(2, 132, 199, 0.4)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-20, -14, 18, 28, 4);
    ctx.fill();
    ctx.stroke();

    // Arduino Uno badge in center
    ctx.fillStyle = '#059669';
    ctx.fillRect(2, -10, 14, 20);

    // HC-SR04 sensor "eyes" at front bumper
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(25, -6, 3.5, 0, Math.PI * 2);
    ctx.arc(25, 6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Spray Boom at rear
    if (this.tm.telemetry.pumpOn) {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-24, -24);
      ctx.lineTo(-24, 24);
      ctx.stroke();

      // Nozzle dots
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(-24, -20, 2, 0, Math.PI * 2);
      ctx.arc(-24, 0, 2, 0, Math.PI * 2);
      ctx.arc(-24, 20, 2, 0, Math.PI * 2);
      ctx.fill();

      // Emit spray particles
      this.emitSprayParticles(r.x, r.y, rad);
    }

    ctx.restore();
  }

  emitSprayParticles(rx, ry, headingRad) {
    // 3 nozzles behind rover
    const offsets = [-20, 0, 20];
    for (const off of offsets) {
      const px = rx - Math.cos(headingRad) * 24 - Math.sin(headingRad) * off;
      const py = ry - Math.sin(headingRad) * 24 + Math.cos(headingRad) * off;

      this.sprayParticles.push({
        x: px + (Math.random() - 0.5) * 6,
        y: py + (Math.random() - 0.5) * 6,
        vx: -Math.cos(headingRad) * (1 + Math.random()) + (Math.random() - 0.5),
        vy: -Math.sin(headingRad) * (1 + Math.random()) + (Math.random() - 0.5),
        life: 1.0,
        decay: 0.04 + Math.random() * 0.03
      });
    }
  }

  drawSprayParticles(ctx) {
    for (let i = this.sprayParticles.length - 1; i >= 0; i--) {
      const p = this.sprayParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.sprayParticles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = `rgba(56, 189, 248, ${p.life * 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + (1 - p.life) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  setTool(tool) {
    this.selectedTool = tool;
  }

  clearSwath() {
    this.spraySwath = [];
  }
}
