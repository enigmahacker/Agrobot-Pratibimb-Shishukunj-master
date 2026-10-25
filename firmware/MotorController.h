#ifndef MOTOR_CONTROLLER_H
#define MOTOR_CONTROLLER_H

#include "Config.h"

class MotorController {
private:
    // Motor driver pin configurations
    int right_pwm1_pin;
    int left_pwm1_pin;
    int right_pwm2_pin;
    int left_pwm2_pin;

    // Current motor states
    MotorDirection current_direction1;
    MotorDirection current_direction2;
    int current_speed1;
    int current_speed2;

    // PWM state tracking
    bool pwm1_enabled;
    bool pwm2_enabled;

public:
    // Constructor
    MotorController();

    // Initialization
    void begin();

    // Motor control functions
    void setSpeed(int speed1, int speed2);
    void moveForward(int speed = MAX_SPEED);
    void moveReverse(int speed = MAX_SPEED);
    void stopMotors();
    void setDirection(MotorDirection dir1, MotorDirection dir2);

    // Safety and monitoring
    bool isMoving() const;
    MotorDirection getDirection1() const;
    MotorDirection getDirection2() const;
    int getSpeed1() const;
    int getSpeed2() const;

    // Calibration and control
    void calibrateLeftMotor(int offset);
    void calibrateRightMotor(int offset);
    void updateMotorOutputs();

    // Fault handling
    void handleFault();
    bool isFaulted() const;
};

#endif // MOTOR_CONTROLLER_H