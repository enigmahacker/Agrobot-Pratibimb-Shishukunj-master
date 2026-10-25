#ifndef TELEMETRY_H
#define TELEMETRY_H

#include "Config.h"
#include "MotorController.h"
#include "ObstacleDetector.h"
#include "GPSController.h"
#include "PumpController.h"
#include "SafetyController.h"
#include <Arduino.h>

class Telemetry {
private:
    // System components
    MotorController* motor_controller;
    ObstacleDetector* obstacle_detector;
    GPSController* gps_controller;
    PumpController* pump_controller;
    SafetyController* safety_controller;

    // Telemetry data storage
    char telemetry_buffer[MAX_TELEMETRY_LENGTH];
    unsigned long last_telemetry_time;

public:
    // Constructor
    Telemetry();

    // Initialization
    void begin(MotorController* motor_ctrl, ObstacleDetector* obstacle_ctrl,
               GPSController* gps_ctrl, PumpController* pump_ctrl,
               SafetyController* safety_ctrl);

    // Telemetry generation
    void update();
    const char* generateTelemetry();
    void sendTelemetry();

    // Data accessors
    float getLatitude() const;
    float getLongitude() const;
    bool isGPSValid() const;
    unsigned long getGPSAge() const;
    float getObstacleDistance() const;
    bool isObstacleDetected() const;
    bool isPumpOn() const;
    SafetyState getCurrentState() const;
    bool isSystemSafe() const;

    // Status reporting
    void setLastUpdateTime(unsigned long time);
    unsigned long getLastUpdateTime() const;

private:
    // Internal helper functions
    void formatTelemetry();
};

#endif // TELEMETRY_H