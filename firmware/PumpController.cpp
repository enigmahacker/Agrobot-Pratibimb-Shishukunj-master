#include "PumpController.h"
#include <Arduino.h>

// Constructor implementation
PumpController::PumpController() {
    relay_pin = RELAY_IN;
    pump_on = false;
    pump_start_time = 0;
    pump_duration = 0;
    safety_interlock_active = true;  // Start with interlock enabled
    timeout_enabled = true;
    last_activity_time = 0;
}

// Initialize pump controller
void PumpController::begin() {
    // Set relay pin as output
    pinMode(relay_pin, OUTPUT);

    // Initialize relay to OFF state (assuming active-low relay)
    digitalWrite(relay_pin, HIGH);  // Relay is active-low, so HIGH = OFF

    // Reset states
    pump_on = false;
    pump_start_time = 0;
    pump_duration = 0;
    last_activity_time = millis();
}

// Turn pump on
void PumpController::turnOn() {
    if (canTurnOn()) {
        pump_on = true;
        pump_start_time = millis();
        pump_duration = 0;
        updateRelay();
        last_activity_time = millis();
    }
}

// Turn pump off
void PumpController::turnOff() {
    pump_on = false;
    pump_start_time = 0;
    updateRelay();
    last_activity_time = millis();
}

// Toggle pump state
void PumpController::toggle() {
    if (pump_on) {
        turnOff();
    } else {
        turnOn();
    }
}

// Set safety interlock state
void PumpController::setSafetyInterlock(bool enabled) {
    safety_interlock_active = enabled;

    // If interlock is disabled and pump is on, turn it off
    if (!enabled && pump_on) {
        turnOff();
    }
}

// Check if pump is currently on
bool PumpController::isOn() const {
    return pump_on;
}

// Check if safety interlock is active
bool PumpController::isSafetyInterlocked() const {
    return safety_interlock_active;
}

// Update pump controller state (for timeout checking)
void PumpController::update() {
    // If pump is on and timeout is enabled, check for timeout
    if (pump_on && timeout_enabled) {
        unsigned long current_time = millis();
        unsigned long elapsed = current_time - pump_start_time;

        // Check if pump has been running too long
        if (elapsed > PUMP_TIMEOUT_MS) {
            turnOff();  // Automatically turn off on timeout
        }
    }

    last_activity_time = millis();
}

// Check if pump timeout is active
bool PumpController::isTimeoutActive() const {
    return timeout_enabled;
}

// Get duration pump has been running (in milliseconds)
unsigned long PumpController::getDuration() const {
    if (pump_on) {
        return millis() - pump_start_time;
    }
    return pump_duration;
}

// Reset pump duration tracking
void PumpController::resetDuration() {
    pump_duration = 0;
}

// Check if pump can be turned on (safety validation)
bool PumpController::canTurnOn() const {
    // Cannot turn on if:
    // 1. Safety interlock is disabled
    // 2. Pump is already on
    // 3. System is in a fault state

    if (!safety_interlock_active) {
        return false;
    }

    if (pump_on) {
        return false;
    }

    // Additional safety checks can be added here
    return true;
}

// Validate pump state
bool PumpController::validatePumpState() const {
    // This function would perform additional validation checks
    // For now, it just returns current state validity
    return !pump_on || (pump_on && safety_interlock_active);
}

// Check if pump has a fault condition
bool PumpController::isPumpFaulted() const {
    // Placeholder for fault detection logic
    // In a real implementation, this would check for hardware faults
    return false;
}

// Get time of last pump activity
unsigned long PumpController::getLastActivityTime() const {
    return last_activity_time;
}

// Update relay state based on pump status
void PumpController::updateRelay() {
    if (pump_on) {
        // Turn pump ON (assuming active-low relay)
        digitalWrite(relay_pin, LOW);
    } else {
        // Turn pump OFF (assuming active-low relay)
        digitalWrite(relay_pin, HIGH);
    }
}