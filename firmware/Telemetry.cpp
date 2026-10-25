#include "Telemetry.h"
#include <Arduino.h>
#include <stdio.h>

// Constructor implementation
Telemetry::Telemetry() {
    motor_controller = nullptr;
    obstacle_detector = nullptr;
    gps_controller = nullptr;
    pump_controller = nullptr;
    safety_controller = nullptr;

    last_telemetry_time = 0;
}

// Initialize telemetry system
void Telemetry::begin(MotorController* motor_ctrl, ObstacleDetector* obstacle_ctrl,
                      GPSController* gps_ctrl, PumpController* pump_ctrl,
                      SafetyController* safety_ctrl) {
    motor_controller = motor_ctrl;
    obstacle_detector = obstacle_ctrl;
    gps_controller = gps_ctrl;
    pump_controller = pump_ctrl;
    safety_controller = safety_ctrl;

    // Initialize time
    last_telemetry_time = millis();
}

// Update telemetry data
void Telemetry::update() {
    // Generate telemetry string
    formatTelemetry();

    // Update timestamp
    last_telemetry_time = millis();
}

// Generate telemetry string
const char* Telemetry::generateTelemetry() {
    formatTelemetry();
    return telemetry_buffer;
}

// Send telemetry over serial
void Telemetry::sendTelemetry() {
    formatTelemetry();

    // In a real implementation, this would send the telemetry data
    // For now, we just print to serial (this is for debugging)
    Serial.print("TELEMETRY ");
    Serial.println(telemetry_buffer);
}

// Format telemetry data into a string
void Telemetry::formatTelemetry() {
    // Clear buffer first
    memset(telemetry_buffer, 0, MAX_TELEMETRY_LENGTH);

    // Build telemetry string with all relevant information
    if (safety_controller) {
        SafetyState state = safety_controller->getCurrentState();

        // Format basic system status
        snprintf(telemetry_buffer, MAX_TELEMETRY_LENGTH,
                 "V:%s|S:%d|GPS:%.6f,%.6f|G:%lu|O:%.1f|P:%d|F:%d",
                 PROTOCOL_VERSION,
                 state,
                 gps_controller ? gps_controller->getLatitude() : 0.0f,
                 gps_controller ? gps_controller->getLongitude() : 0.0f,
                 gps_controller ? gps_controller->getAgeOfFix() : 0,
                 obstacle_detector ? obstacle_detector->getDistance() : 0.0f,
                 pump_controller ? (pump_controller->isOn() ? 1 : 0) : 0,
                 safety_controller->hasFault() ? 1 : 0
        );
    }
}

// Get latitude from GPS
float Telemetry::getLatitude() const {
    if (gps_controller) {
        return gps_controller->getLatitude();
    }
    return 0.0f;
}

// Get longitude from GPS
float Telemetry::getLongitude() const {
    if (gps_controller) {
        return gps_controller->getLongitude();
    }
    return 0.0f;
}

// Check if GPS fix is valid
bool Telemetry::isGPSValid() const {
    if (gps_controller) {
        return gps_controller->isFixValid();
    }
    return false;
}

// Get GPS age in milliseconds
unsigned long Telemetry::getGPSAge() const {
    if (gps_controller) {
        return gps_controller->getAgeOfFix();
    }
    return GPS_TIMEOUT_MS;
}

// Get obstacle distance
float Telemetry::getObstacleDistance() const {
    if (obstacle_detector) {
        return obstacle_detector->getDistance();
    }
    return 0.0f;
}

// Check if obstacle is detected
bool Telemetry::isObstacleDetected() const {
    if (obstacle_detector) {
        return obstacle_detector->isObstacleDetected();
    }
    return false;
}

// Check if pump is on
bool Telemetry::isPumpOn() const {
    if (pump_controller) {
        return pump_controller->isOn();
    }
    return false;
}

// Get current safety state
SafetyState Telemetry::getCurrentState() const {
    if (safety_controller) {
        return safety_controller->getCurrentState();
    }
    return DISARMED;
}

// Check if system is safe
bool Telemetry::isSystemSafe() const {
    if (safety_controller) {
        return safety_controller->isSystemSafe();
    }
    return false;
}

// Set last update time
void Telemetry::setLastUpdateTime(unsigned long time) {
    last_telemetry_time = time;
}

// Get last update time
unsigned long Telemetry::getLastUpdateTime() const {
    return last_telemetry_time;
}