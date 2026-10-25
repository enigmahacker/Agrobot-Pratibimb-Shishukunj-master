#include "Config.h"
#include "MotorController.h"
#include "ObstacleDetector.h"
#include "BluetoothProtocol.h"
#include "GPSController.h"
#include "PumpController.h"
#include "SafetyController.h"
#include "Telemetry.h"

// System components
MotorController motor_controller;
ObstacleDetector obstacle_detector;
BluetoothProtocol bluetooth_protocol;
GPSController gps_controller;
PumpController pump_controller;
SafetyController safety_controller;
Telemetry telemetry;

// System state tracking
unsigned long last_update_time = 0;
unsigned long last_telemetry_time = 0;
unsigned long last_obstacle_check = 0;

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(9600);

  // Initialize all system components
  motor_controller.begin();
  obstacle_detector.begin();
  bluetooth_protocol.begin();
  gps_controller.begin();
  pump_controller.begin();
  safety_controller.begin(&motor_controller, &obstacle_detector, &pump_controller);
  telemetry.begin(&motor_controller, &obstacle_detector, &gps_controller, &pump_controller, &safety_controller);

  // Print startup message
  Serial.println("AgroBot System Initialized");
  Serial.println("========================");

  // Report initial system state
  safety_controller.update();
  telemetry.update();
  Serial.print("Initial State: ");
  Serial.println(safety_controller.getCurrentState());
}

void loop() {
  unsigned long current_time = millis();

  // Update all subsystems
  updateSystem();

  // Handle Bluetooth communication
  handleBluetoothCommands();

  // Update telemetry periodically
  if (current_time - last_telemetry_time > 1000) {  // Send telemetry every second
    sendTelemetry();
    last_telemetry_time = current_time;
  }

  // Check for obstacle detection periodically
  if (current_time - last_obstacle_check > 50) {  // Check every 50ms
    checkObstacles();
    last_obstacle_check = current_time;
  }

  // Update safety controller state
  safety_controller.update();
}

void updateSystem() {
  // Update all components
  gps_controller.update();
  obstacle_detector.updateDistance();
  pump_controller.update();
  telemetry.update();

  // Check communication timeout
  if (bluetooth_protocol.isCommunicationTimeout()) {
    safety_controller.handleCommunicationLoss();
  }
}

void handleBluetoothCommands() {
  // Check for new commands
  if (bluetooth_protocol.hasCommand()) {
    CommandType command = bluetooth_protocol.getCommand();

    // Process the command based on current system state
    switch (command) {
      case CMD_ARM:
        handleArmCommand();
        break;

      case CMD_DISARM:
        handleDisarmCommand();
        break;

      case CMD_FORWARD:
        handleForwardCommand();
        break;

      case CMD_REVERSE:
        handleReverseCommand();
        break;

      case CMD_STOP:
        handleStopCommand();
        break;

      case CMD_EMERGENCY_STOP:
        handleEmergencyStopCommand();
        break;

      case CMD_PUMP_OFF:
        handlePumpOffCommand();
        break;

      case CMD_STATUS:
        handleStatusCommand();
        break;

      case CMD_HEARTBEAT:
        handleHeartbeatCommand();
        break;

      default:
        // Unknown command
        bluetooth_protocol.sendResponse(RESP_INVALID_COMMAND, "Unknown command");
        break;
    }

    // Reset command after processing
    bluetooth_protocol.resetCommand();
  }
}

void handleArmCommand() {
  if (safety_controller.getCurrentState() == DISARMED) {
    safety_controller.transitionToState(IDLE);
    bluetooth_protocol.sendResponse(RESP_SUCCESS, "System armed");
  } else {
    bluetooth_protocol.sendResponse(RESP_ERROR, "System already armed or in fault state");
  }
}

void handleDisarmCommand() {
  if (safety_controller.getCurrentState() != DISARMED) {
    safety_controller.transitionToState(DISARMED);
    motor_controller.stopMotors();
    pump_controller.turnOff();
    bluetooth_protocol.sendResponse(RESP_SUCCESS, "System disarmed");
  } else {
    bluetooth_protocol.sendResponse(RESP_ERROR, "System already disarmed");
  }
}

void handleForwardCommand() {
  if (safety_controller.isMovementAllowed()) {
    motor_controller.moveForward();
    safety_controller.transitionToState(MOVING_FORWARD);
    bluetooth_protocol.sendResponse(RESP_SUCCESS, "Moving forward");
  } else {
    bluetooth_protocol.sendResponse(RESP_ERROR, "Movement not allowed in current state");
  }
}

void handleReverseCommand() {
  if (safety_controller.isMovementAllowed()) {
    motor_controller.moveReverse();
    safety_controller.transitionToState(MOVING_REVERSE);
    bluetooth_protocol.sendResponse(RESP_SUCCESS, "Moving reverse");
  } else {
    bluetooth_protocol.sendResponse(RESP_ERROR, "Movement not allowed in current state");
  }
}

void handleStopCommand() {
  if (safety_controller.getCurrentState() == MOVING_FORWARD ||
      safety_controller.getCurrentState() == MOVING_REVERSE) {
    motor_controller.stopMotors();
    safety_controller.transitionToState(IDLE);
    bluetooth_protocol.sendResponse(RESP_SUCCESS, "Stopped");
  } else {
    bluetooth_protocol.sendResponse(RESP_ERROR, "No movement to stop");
  }
}

void handleEmergencyStopCommand() {
  safety_controller.triggerEmergencyStop();
  bluetooth_protocol.sendResponse(RESP_SUCCESS, "Emergency stop activated");
}

void handlePumpOffCommand() {
  pump_controller.turnOff();
  bluetooth_protocol.sendResponse(RESP_SUCCESS, "Pump turned off");
}

void handleStatusCommand() {
  // Send current system status
  char status_msg[128];
  SafetyState state = safety_controller.getCurrentState();

  snprintf(status_msg, sizeof(status_msg),
           "State:%d|GPS:%s|Obstacle:%s|Pump:%s",
           state,
           telemetry.isGPSValid() ? "OK" : "INVALID",
           telemetry.isObstacleDetected() ? "DETECTED" : "CLEAR",
           telemetry.isPumpOn() ? "ON" : "OFF");

  bluetooth_protocol.sendResponse(RESP_SUCCESS, status_msg);
}

void handleHeartbeatCommand() {
  // Respond to heartbeat
  bluetooth_protocol.sendResponse(RESP_SUCCESS, "Heartbeat received");
}

void checkObstacles() {
  // Check if obstacle is detected and take appropriate action
  if (obstacle_detector.isObstacleDetected()) {
    if (safety_controller.getCurrentState() == MOVING_FORWARD ||
        safety_controller.getCurrentState() == MOVING_REVERSE) {
      motor_controller.stopMotors();
      pump_controller.turnOff();
      safety_controller.transitionToState(OBSTACLE_STOP);
      bluetooth_protocol.sendResponse(RESP_ERROR, "Obstacle detected - stopped");
    }
  }
}

void sendTelemetry() {
  // Generate and send telemetry data
  const char* telemetry_data = telemetry.generateTelemetry();
  bluetooth_protocol.sendTelemetry(telemetry_data);
}