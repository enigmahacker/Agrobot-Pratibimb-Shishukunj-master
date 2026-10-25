#ifndef OBSTACLE_DETECTOR_H
#define OBSTACLE_DETECTOR_H

#include "Config.h"

class ObstacleDetector {
private:
    // Sensor pin configuration
    int trig_pin;
    int echo_pin;

    // Distance measurements
    unsigned long last_measurement_time;
    float current_distance_cm;
    bool distance_valid;

    // Sensor status
    bool sensor_faulted;

public:
    // Constructor
    ObstacleDetector();

    // Initialization
    void begin();

    // Sensor operations
    void updateDistance();
    float getDistance() const;
    bool isDistanceValid() const;
    bool isObstacleDetected() const;
    bool isSensorFaulted() const;

    // Configuration
    void setThreshold(float threshold_cm);
    float getThreshold() const;

    // Utility functions
    unsigned long getLastMeasurementTime() const;
    void resetSensor();

private:
    // Internal sensor functions
    float readDistance();
    bool validateDistance(float distance);
};

#endif // OBSTACLE_DETECTOR_H