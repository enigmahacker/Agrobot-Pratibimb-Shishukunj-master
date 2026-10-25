#ifndef SAFETY_CONTROLLER_H
#define SAFETY_CONTROLLER_H

#include "Config.h"
#include "MotorController.h"
#include "ObstacleDetector.h"
#include "PumpController.h"
#include <Arduino.h>

class SafetyController {
private:
    // System state tracking
    SafetyState current_state;
    SafetyState previous_state;

    // Controllers
    MotorController* motor_controller;
    ObstacleDetector* obstacle_detector;
    PumpController* pump_controller;

    // State change tracking
    unsigned long state_change_time;
    unsigned long last_fault_check;

    // Safety flags
    bool emergency_stop_requested;
    bool communication_lost;

public:
    // Constructor
    SafetyController();

    // Initialization
    void begin(MotorController* motor_ctrl, ObstacleDetector* obstacle_ctrl, PumpController* pump_ctrl);

    // State management
    void update();
    SafetyState getCurrentState() const;
    SafetyState getPreviousState() const;
    unsigned long getStateChangeTime() const;

    // Safety actions
    void triggerEmergencyStop();
    void clearEmergencyStop();
    bool isEmergencyStopActive() const;
    void handleCommunicationLoss();
    void clearCommunicationLoss();

    // State transitions
    void transitionToState(SafetyState new_state);
    bool canTransitionToState(SafetyState new_state) const;

    // System status checks
    bool isSystemSafe() const;
    bool isMovementAllowed() const;
    bool isPumpOperationAllowed() const;
    bool areAllSystemsHealthy() const;

    // Fault handling
    void checkFaults();
    bool hasFault() const;

private:
    // Internal helper functions
    void handleStateChange(SafetyState old_state, SafetyState new_state);
    void updateSystemStatus();
};

#endif // SAFETY_CONTROLLER_H