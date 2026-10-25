#include "ObstacleDetector.h"
#include <Arduino.h>

// Constructor implementation
ObstacleDetector::ObstacleDetector() {
    trig_pin = ULTRASONIC_TRIG;
    echo_pin = ULTRASONIC_ECHO;
    current_distance_cm = 0.0f;
    distance_valid = false;
    sensor_faulted = false;
    last_measurement_time = 0;
}

// Initialize obstacle detector
void ObstacleDetector::begin() {
    // Set pins as input/output
    pinMode(trig_pin, OUTPUT);
    pinMode(echo_pin, INPUT);

    // Initialize with invalid distance
    current_distance_cm = 0.0f;
    distance_valid = false;
    sensor_faulted = false;
    last_measurement_time = 0;
}

// Update distance measurement
void ObstacleDetector::updateDistance() {
    // Read new distance value
    float distance = readDistance();

    // Validate the reading
    if (validateDistance(distance)) {
        current_distance_cm = distance;
        distance_valid = true;
        sensor_faulted = false;
    } else {
        // If reading is invalid, keep previous valid reading or set to max distance
        if (!distance_valid) {
            current_distance_cm = 200.0f; // Assume maximum distance if no valid reading
        }
        distance_valid = false;
    }

    last_measurement_time = millis();
}

// Get the current distance measurement
float ObstacleDetector::getDistance() const {
    return current_distance_cm;
}

// Check if distance measurement is valid
bool ObstacleDetector::isDistanceValid() const {
    return distance_valid;
}

// Check if obstacle is detected based on threshold
bool ObstacleDetector::isObstacleDetected() const {
    // Only detect obstacles if we have a valid distance reading and it's below threshold
    if (distance_valid && current_distance_cm < OBSTACLE_THRESHOLD_CM) {
        return true;
    }
    return false;
}

// Check if sensor is faulted
bool ObstacleDetector::isSensorFaulted() const {
    return sensor_faulted;
}

// Set obstacle detection threshold
void ObstacleDetector::setThreshold(float threshold_cm) {
    // Note: OBSTACLE_THRESHOLD_CM is defined in Config.h
    // This function exists for flexibility but threshold is fixed
}

// Get current threshold
float ObstacleDetector::getThreshold() const {
    return OBSTACLE_THRESHOLD_CM;
}

// Get time of last measurement
unsigned long ObstacleDetector::getLastMeasurementTime() const {
    return last_measurement_time;
}

// Reset sensor state
void ObstacleDetector::resetSensor() {
    distance_valid = false;
    sensor_faulted = false;
    current_distance_cm = 0.0f;
    last_measurement_time = 0;
}

// Read distance from ultrasonic sensor
float ObstacleDetector::readDistance() {
    // Send trigger pulse
    digitalWrite(trig_pin, LOW);
    delayMicroseconds(2);
    digitalWrite(trig_pin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trig_pin, LOW);

    // Read echo time
    long duration = pulseIn(echo_pin, HIGH, 30000);  // Timeout after 30ms (max ~5m)

    // Convert to distance in cm
    float distance = duration * 0.0343 / 2.0;  // Speed of sound: 343 m/s, divide by 2 for round trip

    return distance;
}

// Validate sensor reading
bool ObstacleDetector::validateDistance(float distance) {
    // Check if distance is within valid range
    if (distance > 0 && distance < 200) {  // Valid range: 0-200 cm
        return true;
    }

    // Check for timeout condition (no echo received)
    if (distance == 0) {
        sensor_faulted = true;
        return false;
    }

    // If distance is invalid, mark as faulted but don't return false yet
    // This allows us to still use the last valid reading
    return false;
}