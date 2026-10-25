#ifndef PUMP_CONTROLLER_H
#define PUMP_CONTROLLER_H

#include "Config.h"
#include <Arduino.h>

class PumpController {
private:
    // Relay pin configuration
    int relay_pin;

    // Pump state tracking
    bool pump_on;
    unsigned long pump_start_time;
    unsigned long pump_duration;

    // Safety and timeout tracking
    bool safety_interlock_active;
    bool timeout_enabled;
    unsigned long last_activity_time;

public:
    // Constructor
    PumpController();

    // Initialization
    void begin();

    // Pump control functions
    void turnOn();
    void turnOff();
    void toggle();
    void setSafetyInterlock(bool enabled);
    bool isOn() const;
    bool isSafetyInterlocked() const;

    // Timeout and monitoring
    void update();
    bool isTimeoutActive() const;
    unsigned long getDuration() const;
    void resetDuration();

    // Safety checks
    bool canTurnOn() const;
    bool validatePumpState() const;

    // Status reporting
    bool isPumpFaulted() const;
    unsigned long getLastActivityTime() const;

private:
    // Internal helper functions
    void updateRelay();
};

#endif // PUMP_CONTROLLER_H