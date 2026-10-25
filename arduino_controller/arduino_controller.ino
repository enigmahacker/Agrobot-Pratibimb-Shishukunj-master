/**
 * AgroBot Simple Controller Firmware (Revised Pin Configuration)
 * ==============================================================================
 * A clean, self-contained Arduino sketch connecting directly to the Python control logic.
 *
 * REVISED PIN CONNECTIONS (Arduino Uno):
 * - Motor Driver 1:
 *     * Brown RPWM -> GPIO 3 (Hardware PWM)
 *     * Red LPWM   -> GPIO 2
 * - Motor Driver 2:
 *     * White RPWM -> GPIO 4
 *     * Black LPWM -> GPIO 5 (Hardware PWM)
 * - Relay (12V Spray Pump):
 *     * GPIO 6
 * - HC-05 Bluetooth Module:
 *     * TXD -> GPIO 10 (Arduino RX)
 *     * RXD -> GPIO 9  (Arduino TX)
 * - Ultrasonic Sensor (HC-SR04):
 *     * TRIG -> GPIO 12
 *     * ECHO -> GPIO 11
 * - GPS Module:
 *     * Arduino default TX / RX pins (Pins 1 and 0)
 * ==============================================================================
 */

#include <SoftwareSerial.h>

// Motor Driver 1 (Right Wheels)
const int PIN_M1_RPWM = 3;  // Brown wire (PWM)
const int PIN_M1_LPWM = 2;  // Red wire

// Motor Driver 2 (Left Wheels)
const int PIN_M2_RPWM = 4;  // White wire
const int PIN_M2_LPWM = 5;  // Black wire (PWM)

// Relay for 12V Pesticide Spray Pump
const int PIN_RELAY_PUMP = 6;

// HC-SR04 Ultrasonic Distance Sensor
const int PIN_TRIG = 12;
const int PIN_ECHO = 11;

// Status LED (Built-in)
const int PIN_LED = 13;

// HC-05 Bluetooth Serial (RX=10 connected to HC-05 TXD, TX=9 to HC-05 RXD)
SoftwareSerial btSerial(10, 9);

// System & Safety States
enum RoverState {
  STATE_DISARMED = 0,
  STATE_IDLE = 1,
  STATE_MOVING_FORWARD = 2,
  STATE_MOVING_REVERSE = 3,
  STATE_OBSTACLE_STOP = 4,
  STATE_EMERGENCY_STOP = 7
};

RoverState currentState = STATE_DISARMED;
int currentSpeed = 180;             // Motor PWM speed (0-255)
bool pumpActive = false;
float obstacleDistanceCm = 150.0;
String gpsLocation = "0.000000,0.000000";
bool gpsFix = false;
unsigned long lastHeartbeatTime = 0;
unsigned long lastTelemetryTime = 0;
const unsigned long COMMS_TIMEOUT_MS = 5000; // Watchdog timeout (5s)

// Serial buffers
String usbBuffer = "";
String btBuffer = "";

// Forward declarations
void stopMotors();
void turnOffPump();
void turnOnPump();
void driveForward();
void driveReverse();
void turnLeft();
void turnRight();
float measureDistance();
void sendTelemetry();
void sendToAll(String msg);
void processCommand(String cmd);
void parseGpsNmea(String nmea);

void setup() {
  // 1. Initialize USB Serial for Python / PC / Web communication (9600 baud)
  Serial.begin(9600);

  // 2. Initialize HC-05 Bluetooth Serial (Pins 10 RX, 9 TX at 9600 baud)
  btSerial.begin(9600);

  // 3. Configure Motor Pins
  pinMode(PIN_M1_RPWM, OUTPUT);
  pinMode(PIN_M1_LPWM, OUTPUT);
  pinMode(PIN_M2_RPWM, OUTPUT);
  pinMode(PIN_M2_LPWM, OUTPUT);
  stopMotors();

  // 4. Configure Pump Relay (Relays are active LOW)
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, HIGH); // Default OFF

  // 5. Configure Ultrasonic Sensor
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  // 6. Configure Status LED
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  lastHeartbeatTime = millis();
  lastTelemetryTime = millis();

  sendToAll("OK AGROBOT_ONLINE");
}

void loop() {
  unsigned long now = millis();

  // 1. Read commands from USB (PC / Web / GPS)
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (usbBuffer.length() > 0) {
        if (usbBuffer.startsWith("$")) {
          // Incoming GPS NMEA sentence on default Hardware Serial RX (Pin 0)
          parseGpsNmea(usbBuffer);
        } else {
          processCommand(usbBuffer);
        }
        usbBuffer = "";
      }
    } else {
      if (usbBuffer.length() < 96) {
        usbBuffer += c;
      }
    }
  }

  // 2. Read commands from HC-05 Bluetooth (Pins 10 & 9)
  while (btSerial.available() > 0) {
    char c = (char)btSerial.read();
    if (c == '\n' || c == '\r') {
      if (btBuffer.length() > 0) {
        processCommand(btBuffer);
        btBuffer = "";
      }
    } else {
      if (btBuffer.length() < 64) {
        btBuffer += c;
      }
    }
  }

  // 3. Autonomous Ultrasonic Obstacle Check every 100ms
  static unsigned long lastDistanceCheck = 0;
  if (now - lastDistanceCheck > 100) {
    obstacleDistanceCm = measureDistance();
    lastDistanceCheck = now;

    // Safety Interlock: auto-halt if obstacle is < 30 cm while moving forward
    if (currentState == STATE_MOVING_FORWARD && obstacleDistanceCm < 30.0) {
      stopMotors();
      turnOffPump();
      currentState = STATE_OBSTACLE_STOP;
      digitalWrite(PIN_LED, HIGH);
      sendToAll("ERROR OBSTACLE_DETECTED_STOP");
    }
  }

  // 4. Safety Watchdog Timeout (Config.h COMMUNICATION_TIMEOUT_MS = 5000ms)
  if (currentState != STATE_DISARMED && currentState != STATE_EMERGENCY_STOP) {
    if (now - lastHeartbeatTime > COMMS_TIMEOUT_MS) {
      stopMotors();
      turnOffPump();
      currentState = STATE_IDLE;
      sendToAll("WARN COMMS_TIMEOUT_IDLE");
      lastHeartbeatTime = now;
    }
  }

  // 5. Broadcast Telemetry to USB & Bluetooth every 1000ms
  if (now - lastTelemetryTime > 1000) {
    sendTelemetry();
    lastTelemetryTime = now;
  }
}

// ==============================================================================
// Command Parser
// ==============================================================================
void processCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  // Guard: Drop empty input, echoed status/responses, and NMEA GPS sentences
  if (cmd.length() == 0 ||
      cmd.startsWith("OK") ||
      cmd.startsWith("INVALID") ||
      cmd.startsWith("TELEMETRY") ||
      cmd.startsWith("ERROR") ||
      cmd.startsWith("WARN") ||
      cmd.startsWith("$")) {
    return;
  }

  lastHeartbeatTime = millis();

  // Arm & Disarm
  if (cmd == "ARM" || cmd == "1") {
    currentState = STATE_IDLE;
    digitalWrite(PIN_LED, HIGH);
    sendToAll("OK SYSTEM_ARMED");
  }
  else if (cmd == "DISARM" || cmd == "0") {
    stopMotors();
    turnOffPump();
    currentState = STATE_DISARMED;
    digitalWrite(PIN_LED, LOW);
    sendToAll("OK SYSTEM_DISARMED");
  }
  // Drive Commands (Forward, Reverse, Left, Right, Stop)
  else if (cmd == "FORWARD" || cmd == "F" || cmd == "W") {
    if (currentState == STATE_DISARMED || currentState == STATE_EMERGENCY_STOP) {
      sendToAll("ERROR SYSTEM_NOT_ARMED");
    } else if (obstacleDistanceCm < 30.0) {
      sendToAll("ERROR OBSTACLE_AHEAD");
    } else {
      driveForward();
      currentState = STATE_MOVING_FORWARD;
      sendToAll("OK MOVING_FORWARD");
    }
  }
  else if (cmd == "REVERSE" || cmd == "B" || cmd == "REV" || cmd == "S_REV") {
    if (currentState == STATE_DISARMED || currentState == STATE_EMERGENCY_STOP) {
      sendToAll("ERROR SYSTEM_NOT_ARMED");
    } else {
      driveReverse();
      currentState = STATE_MOVING_REVERSE;
      sendToAll("OK MOVING_REVERSE");
    }
  }
  else if (cmd == "LEFT" || cmd == "L" || cmd == "A") {
    if (currentState != STATE_DISARMED && currentState != STATE_EMERGENCY_STOP) {
      turnLeft();
      sendToAll("OK TURNING_LEFT");
    }
  }
  else if (cmd == "RIGHT" || cmd == "R" || cmd == "D") {
    if (currentState != STATE_DISARMED && currentState != STATE_EMERGENCY_STOP) {
      turnRight();
      sendToAll("OK TURNING_RIGHT");
    }
  }
  else if (cmd == "STOP" || cmd == "S" || cmd == "HALT" || cmd == "X" || cmd == " ") {
    stopMotors();
    if (currentState != STATE_DISARMED && currentState != STATE_EMERGENCY_STOP) {
      currentState = STATE_IDLE;
    }
    sendToAll("OK STOPPED");
  }
  // Pesticide Spray Pump Control
  else if (cmd == "PUMP_ON" || cmd == "PUMP ON" || cmd == "PUMP1" || cmd == "P") {
    if (currentState == STATE_DISARMED || currentState == STATE_EMERGENCY_STOP || currentState == STATE_OBSTACLE_STOP) {
      sendToAll("ERROR CANNOT_SPRAY_IN_CURRENT_STATE");
    } else {
      turnOnPump();
      sendToAll("OK PUMP_ON");
    }
  }
  else if (cmd == "PUMP_OFF" || cmd == "PUMP OFF" || cmd == "PUMP0") {
    turnOffPump();
    sendToAll("OK PUMP_OFF");
  }
  // Emergency Stop & Reset
  else if (cmd == "EMERGENCY_STOP" || cmd == "ESTOP" || cmd == "E") {
    stopMotors();
    turnOffPump();
    currentState = STATE_EMERGENCY_STOP;
    digitalWrite(PIN_LED, HIGH);
    sendToAll("OK EMERGENCY_STOP_ACTIVE");
  }
  else if (cmd == "CLEAR" || cmd == "RESET") {
    stopMotors();
    turnOffPump();
    currentState = STATE_IDLE;
    digitalWrite(PIN_LED, HIGH);
    sendToAll("OK STATE_CLEARED_IDLE");
  }
  // System Heartbeat & Telemetry
  else if (cmd == "HEARTBEAT" || cmd == "H") {
    sendToAll("OK HEARTBEAT_ACK");
  }
  else if (cmd == "STATUS") {
    sendTelemetry();
  }
  else if (cmd.startsWith("SPEED:") || cmd.startsWith("SPEED ")) {
    int spd = cmd.startsWith("SPEED:") ? cmd.substring(6).toInt() : cmd.substring(5).toInt();
    if (spd >= 0 && spd <= 255) {
      currentSpeed = spd;
      sendToAll("OK SPEED_SET_" + String(currentSpeed));
    }
  }
  else {
    if (cmd.length() > 0 && !cmd.startsWith("$")) {
      Serial.print("INVALID_CMD: ");
      Serial.println(cmd);
    }
  }
}

// ==============================================================================
// Motor Driver Output Helpers
// ==============================================================================

void driveForward() {
  // Motor 1 (Brown RPWM pin 3, Red LPWM pin 2)
  digitalWrite(PIN_M1_LPWM, LOW);
  analogWrite(PIN_M1_RPWM, currentSpeed);

  // Motor 2 (White RPWM pin 4, Black LPWM pin 5)
  digitalWrite(PIN_M2_RPWM, LOW);
  analogWrite(PIN_M2_LPWM, currentSpeed);
}

void driveReverse() {
  // Motor 1 Reverse
  analogWrite(PIN_M1_RPWM, 0);
  digitalWrite(PIN_M1_LPWM, HIGH);

  // Motor 2 Reverse
  analogWrite(PIN_M2_LPWM, 0);
  digitalWrite(PIN_M2_RPWM, HIGH);
}

void turnLeft() {
  // Pivot: Left motor reverse, Right motor forward
  analogWrite(PIN_M2_LPWM, 0);
  digitalWrite(PIN_M2_RPWM, HIGH);

  digitalWrite(PIN_M1_LPWM, LOW);
  analogWrite(PIN_M1_RPWM, currentSpeed);
}

void turnRight() {
  // Pivot: Right motor reverse, Left motor forward
  analogWrite(PIN_M1_RPWM, 0);
  digitalWrite(PIN_M1_LPWM, HIGH);

  digitalWrite(PIN_M2_RPWM, LOW);
  analogWrite(PIN_M2_LPWM, currentSpeed);
}

void stopMotors() {
  analogWrite(PIN_M1_RPWM, 0);
  digitalWrite(PIN_M1_LPWM, LOW);

  analogWrite(PIN_M2_LPWM, 0);
  digitalWrite(PIN_M2_RPWM, LOW);
}

// ==============================================================================
// Actuators & Sensors
// ==============================================================================

void turnOnPump() {
  pumpActive = true;
  digitalWrite(PIN_RELAY_PUMP, LOW); // Active LOW relay
}

void turnOffPump() {
  pumpActive = false;
  digitalWrite(PIN_RELAY_PUMP, HIGH); // Inactive relay
}

float measureDistance() {
  // HC-SR04: Trig on GPIO 12, Echo on GPIO 11
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duration = pulseIn(PIN_ECHO, HIGH, 25000); // 25ms timeout (~4m)
  // Glitch and noise rejection:
  // Short pulses (<100us / <1.7cm) or timeouts (>24000us) mean open field or disconnected sensor
  if (duration <= 100 || duration >= 24000) {
    return 200.0;
  }

  float dist = (duration * 0.0343) / 2.0;
  if (dist < 2.0 || dist > 400.0) {
    return 200.0;
  }
  return dist;
}

void parseGpsNmea(String nmea) {
  // Simple non-blocking parser for $GPRMC / $GNRMC
  if (nmea.startsWith("$GPRMC") || nmea.startsWith("$GNRMC")) {
    // Format: $GPRMC,hhmmss.ss,A,llll.ll,a,yyyyy.yy,a,x.x,x.x,ddmmyy,,,a*hh
    int statusIdx = nmea.indexOf(',', 7);
    if (statusIdx > 0 && nmea.charAt(statusIdx + 1) == 'A') {
      gpsFix = true;
      // Extract rough lat/lon fields
      int latIdx = nmea.indexOf(',', statusIdx + 2);
      int latHemIdx = nmea.indexOf(',', latIdx + 1);
      int lonIdx = nmea.indexOf(',', latHemIdx + 2);
      int lonHemIdx = nmea.indexOf(',', lonIdx + 1);
      if (latIdx > 0 && lonIdx > 0) {
        String latStr = nmea.substring(latIdx + 1, latHemIdx);
        String lonStr = nmea.substring(lonIdx + 1, lonHemIdx);
        if (latStr.length() > 0 && lonStr.length() > 0) {
          gpsLocation = latStr + "," + lonStr;
        }
      }
    } else {
      gpsFix = false;
    }
  }
}

void sendTelemetry() {
  // Format: TELEMETRY V:1.0|S:<state>|O:<dist_cm>|P:<pump>|SPD:<speed>|GPS:<loc>|FIX:<0/1>
  String telem = "TELEMETRY V:1.0|S:" + String((int)currentState) +
                 "|O:" + String(obstacleDistanceCm, 1) +
                 "|P:" + String(pumpActive ? 1 : 0) +
                 "|SPD:" + String(currentSpeed) +
                 "|GPS:" + gpsLocation +
                 "|FIX:" + String(gpsFix ? 1 : 0);
  sendToAll(telem);
}

void sendToAll(String msg) {
  Serial.println(msg);    // Send over USB to Python / Web
  btSerial.println(msg);  // Send over HC-05 Bluetooth
}
