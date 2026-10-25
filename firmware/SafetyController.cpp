#include "SafetyController.h"
#include <Arduino.h>

// Constructor implementation
SafetyController::SafetyController() {
    current_state = DISARMED;
    previous_state = DISARMED;
    state_change_time = millis();
    last_fault_check = 0;
    emergency_stop_requested = false;
    communication_lost = false;

    // Initialize pointers to null
    motor_controller = nullptr;
    obstacle_detector = nullptr;
    pump_controller = nullptr;
}

// Initialize safety controller with references to other controllers
void SafetyController::begin(MotorController* motor_ctrl, ObstacleDetector* obstacle_ctrl, PumpController* pump_ctrl) {
    motor_controller = motor_ctrl;
    obstacle_detector = obstacle_ctrl;
    pump_controller = pump_ctrl;

    // Initialize all controllers
    if (motor_controller) {
        motor_controller->begin();
    }

    if (obstacle_detector) {
        obstacle_detector->begin();
    }

    if (pump_controller) {
        pump_controller->begin();
    }

    // Set initial state to IDLE
    transitionToState(IDLE);
}

// Update safety controller state
void SafetyController::update() {
    // Check for faults periodically
    unsigned long now = millis();
    if (now - last_fault_check > 1000) {  // Check every second
        checkFaults();
        last_fault_check = now;
    }

    // Update all subsystems
    if (obstacle_detector) {
        obstacle_detector->updateDistance();
    }

    if (pump_controller) {
        pump_controller->update();
    }

    // Handle state transitions based on system conditions
    updateSystemStatus();

    // Update state change time if state has changed
    static SafetyState last_state = DISARMED;
    if (current_state != last_state) {
        state_change_time = millis();
        last_state = current_state;
    }
}

// Update system status and make safety decisions
void SafetyController::updateSystemStatus() {
    // Check for communication loss
    if (communication_lost) {
        if (current_state != COMMUNICATION_LOSS) {
            transitionToState(COMMUNICATION_LOSS);
        }
        return;
    }

    // Check for emergency stop
    if (emergency_stop_requested) {
        if (current_state != FAULT) {
            transitionToState(FAULT);
        }
        return;
    }

    // Handle obstacle detection
    if (obstacle_detector && obstacle_detector->isObstacleDetected()) {
        if (current_state == MOVING_FORWARD || current_state == MOVING_REVERSE) {
            // Stop motors and enter obstacle stop state
            if (motor_controller) {
                motor_controller->stopMotors();
            }

            if (pump_controller) {
                pump_controller->turnOff();  // Turn off pump when obstacle detected
            }

            transitionToState(OBSTACLE_STOP);
        }
        return;
    }

    // Handle normal movement state transitions
    switch (current_state) {
        case DISARMED:
            // Stay in disarmed until armed
            break;

        case IDLE:
            // Wait for commands to move
            break;

        case MOVING_FORWARD:
        case MOVING_REVERSE:
            // If we're moving and obstacle is detected, stop
            if (obstacle_detector && obstacle_detector->isObstacleDetected()) {
                if (motor_controller) {
                    motor_controller->stopMotors();
                }

                if (pump_controller) {
                    pump_controller->turnOff();  // Turn off pump when obstacle detected
                }

                transitionToState(OBSTACLE_STOP);
            }
            break;

        case OBSTACLE_STOP:
            // Stay in obstacle stop until manually cleared
            break;

        case COMMUNICATION_LOSS:
            // Handle communication loss state
            break;

        case FAULT:
            // In fault state, system is disabled until manually reset
            break;
    }
}

// Get current safety state
SafetyState SafetyController::getCurrentState() const {
    return current_state;
}

// Get previous safety state
SafetyState SafetyController::getPreviousState() const {
    return previous_state;
}

// Get time when state last changed
unsigned long SafetyController::getStateChangeTime() const {
    return state_change_time;
}

// Trigger emergency stop
void SafetyController::triggerEmergencyStop() {
    emergency_stop_requested = true;

    // Stop all motors immediately
    if (motor_controller) {
        motor_controller->stopMotors();
    }

    // Turn off pump immediately
    if (pump_controller) {
        pump_controller->turnOff();
    }

    // Enter fault state
    transitionToState(FAULT);
}

// Clear emergency stop
void SafetyController::clearEmergencyStop() {
    emergency_stop_requested = false;
}

// Check if emergency stop is active
bool SafetyController::isEmergencyStopActive() const {
    return emergency_stop_requested;
}

// Handle communication loss
void SafetyController::handleCommunicationLoss() {
    communication_lost = true;

    // Stop motors and turn off pump
    if (motor_controller) {
        motor_controller->stopMotors();
    }

    if (pump_controller) {
        pump_controller->turnOff();
    }

    transitionToState(COMMUNICATION_LOSS);
}

// Clear communication loss
void SafetyController::clearCommunicationLoss() {
    communication_lost = false;
}

// Transition to a new safety state
void SafetyController::transitionToState(SafetyState new_state) {
    // Store previous state
    previous_state = current_state;

    // Update current state
    current_state = new_state;

    // Handle specific state transitions
    handleStateChange(previous_state, new_state);
}

// Handle state change actions
void SafetyController::handleStateChange(SafetyState old_state, SafetyState new_state) {
    // Log state change (in a real implementation, this might be sent over serial)

    switch (new_state) {
        case DISARMED:
            // Disable all systems when disarmed
            if (motor_controller) {
                motor_controller->stopMotors();
            }

            if (pump_controller) {
                pump_controller->turnOff();
            }
            break;

        case IDLE:
            // Stop motors and keep pump off in idle state
            if (motor_controller) {
                motor_controller->stopMotors();
            }
            break;

        case MOVING_FORWARD:
        case MOVING_REVERSE:
            // Movement is allowed, system should be ready to move
            break;

        case OBSTACLE_STOP:
            // Stop motors and keep pump off when obstacle detected
            if (motor_controller) {
                motor_controller->stopMotors();
            }
            break;

        case COMMUNICATION_LOSS:
            // Stop all systems on communication loss
            if (motor_controller) {
                motor_controller->stopMotors();
            }

            if (pump_controller) {
                pump_controller->turnOff();
            }
            break;

        case FAULT:
            // Full system shutdown in fault state
            if (motor_controller) {
                motor_controller->stopMotors();
            }

            if (pump_controller) {
                pump_controller->turnOff();
            }
            break;
    }
}

// Check if state transition is valid
bool SafetyController::canTransitionToState(SafetyState new_state) const {
    // Define valid transitions based on current state

    switch (current_state) {
        case DISARMED:
            return (new_state == IDLE || new_state == FAULT);

        case IDLE:
            return (new_state == MOVING_FORWARD || new_state == MOVING_REVERSE ||
                   new_state == OBSTACLE_STOP || new_state == FAULT);

        case MOVING_FORWARD:
        case MOVING_REVERSE:
            return (new_state == OBSTACLE_STOP || new_state == COMMUNICATION_LOSS ||
                   new_state == FAULT || new_state == IDLE);

        case OBSTACLE_STOP:
            return (new_state == IDLE || new_state == FAULT || new_state == MOVING_FORWARD ||
                   new_state == MOVING_REVERSE);

        case COMMUNICATION_LOSS:
            return (new_state == FAULT || new_state == IDLE);

        case FAULT:
            return (new_state == DISARMED);  // Only way to recover from fault state

        default:
            return false;
    }
}

// Check if system is currently safe
bool SafetyController::isSystemSafe() const {
    // System is safe if not in fault or communication loss states
    return (current_state != FAULT && current_state != COMMUNICATION_LOSS);
}

// Check if movement commands are allowed
bool SafetyController::isMovementAllowed() const {
    // Movement is allowed when system is armed and not in a fault state
    return (current_state == IDLE || current_state == MOVING_FORWARD ||
            current_state == MOVING_REVERSE || current_state == OBSTACLE_STOP);
}

// Check if pump operation is allowed
bool SafetyController::isPumpOperationAllowed() const {
    // Pump operation is allowed when not in fault or communication loss states,
    // and system is armed (not disarmed)
    return (current_state != DISARMED && current_state != FAULT &&
            current_state != COMMUNICATION_LOSS);
}

// Check if all systems are healthy
bool SafetyController::areAllSystemsHealthy() const {
    // In a full implementation, this would check for hardware faults
    // For now, we just return true if not in fault state
    return (current_state != FAULT);
}

// Check for system faults
void SafetyController::checkFaults() {
    // This function would perform checks for hardware faults or other issues

    // Example: Check if any of the controllers have reported faults
    bool has_motor_fault = false;
    bool has_obstacle_fault = false;
    bool has_pump_fault = false;

    // Placeholder - in a real system, these would check actual fault conditions
    if (motor_controller) {
        has_motor_fault = motor_controller->isFaulted();
    }

    if (pump_controller) {
        has_pump_fault = pump_controller->isPumpFaulted();
    }

    // If any faults are detected, enter fault state
    if (has_motor_fault || has_obstacle_fault || has_pump_fault) {
        triggerEmergencyStop();
    }
}

// Check if system has any active faults
bool SafetyController::hasFault() const {
    return (current_state == FAULT);
}