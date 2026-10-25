#include "MotorController.h"
#include <Arduino.h>

// Constructor implementation
MotorController::MotorController() {
    // Initialize pin variables with configuration values
    right_pwm1_pin = MOTOR_DRIVER1_RPWM_PIN;
    left_pwm1_pin = MOTOR_DRIVER1_LPWM_PIN;
    right_pwm2_pin = MOTOR_DRIVER2_RPWM_PIN;
    left_pwm2_pin = MOTOR_DRIVER2_LPWM_PIN;

    current_direction1 = MOTOR_STOP;
    current_direction2 = MOTOR_STOP;
    current_speed1 = 0;
    current_speed2 = 0;
    pwm1_enabled = false;
    pwm2_enabled = false;
}

// Initialize motor controller
void MotorController::begin() {
    // Set all motor control pins as outputs
    pinMode(right_pwm1_pin, OUTPUT);
    pinMode(left_pwm1_pin, OUTPUT);
    pinMode(right_pwm2_pin, OUTPUT);
    pinMode(left_pwm2_pin, OUTPUT);

    // Initialize all outputs to LOW (motors stopped)
    digitalWrite(right_pwm1_pin, LOW);
    digitalWrite(left_pwm1_pin, LOW);
    digitalWrite(right_pwm2_pin, LOW);
    digitalWrite(left_pwm2_pin, LOW);

    // Set initial motor states
    stopMotors();
}

// Set speed for both motors
void MotorController::setSpeed(int speed1, int speed2) {
    current_speed1 = max(0, min(speed1, MAX_SPEED));
    current_speed2 = max(0, min(speed2, MAX_SPEED));
}

// Move forward with optional speed
void MotorController::moveForward(int speed) {
    // Set maximum speed if not specified
    if (speed == 0) {
        speed = MAX_SPEED;
    }

    setSpeed(speed, speed);
    current_direction1 = MOTOR_FORWARD;
    current_direction2 = MOTOR_FORWARD;

    updateMotorOutputs();
}

// Move reverse with optional speed
void MotorController::moveReverse(int speed) {
    // Set maximum speed if not specified
    if (speed == 0) {
        speed = MAX_SPEED;
    }

    setSpeed(speed, speed);
    current_direction1 = MOTOR_REVERSE;
    current_direction2 = MOTOR_REVERSE;

    updateMotorOutputs();
}

// Stop all motors
void MotorController::stopMotors() {
    current_direction1 = MOTOR_STOP;
    current_direction2 = MOTOR_STOP;
    current_speed1 = 0;
    current_speed2 = 0;

    updateMotorOutputs();
}

// Set direction for both motor groups
void MotorController::setDirection(MotorDirection dir1, MotorDirection dir2) {
    current_direction1 = dir1;
    current_direction2 = dir2;
    updateMotorOutputs();
}

// Update motor outputs based on current state
void MotorController::updateMotorOutputs() {
    // Control first motor driver (motor group 1)
    if (current_direction1 == MOTOR_FORWARD) {
        digitalWrite(left_pwm1_pin, LOW);  // Set left motor to low
        analogWrite(right_pwm1_pin, current_speed1);  // Set right motor speed
    } else if (current_direction1 == MOTOR_REVERSE) {
        digitalWrite(right_pwm1_pin, LOW);  // Set right motor to low
        analogWrite(left_pwm1_pin, current_speed1);  // Set left motor speed
    } else {  // MOTOR_STOP
        digitalWrite(left_pwm1_pin, LOW);
        digitalWrite(right_pwm1_pin, LOW);
    }

    // Control second motor driver (motor group 2)
    if (current_direction2 == MOTOR_FORWARD) {
        digitalWrite(left_pwm2_pin, LOW);  // Set left motor to low
        analogWrite(right_pwm2_pin, current_speed2);  // Set right motor speed
    } else if (current_direction2 == MOTOR_REVERSE) {
        digitalWrite(right_pwm2_pin, LOW);  // Set right motor to low
        analogWrite(left_pwm2_pin, current_speed2);  // Set left motor speed
    } else {  // MOTOR_STOP
        digitalWrite(left_pwm2_pin, LOW);
        digitalWrite(right_pwm2_pin, LOW);
    }
}

// Check if motors are currently moving
bool MotorController::isMoving() const {
    return (current_direction1 != MOTOR_STOP || current_direction2 != MOTOR_STOP);
}

// Get current direction of motor group 1
MotorDirection MotorController::getDirection1() const {
    return current_direction1;
}

// Get current direction of motor group 2
MotorDirection MotorController::getDirection2() const {
    return current_direction2;
}

// Get current speed of motor group 1
int MotorController::getSpeed1() const {
    return current_speed1;
}

// Get current speed of motor group 2
int MotorController::getSpeed2() const {
    return current_speed2;
}

// Calibrate left motor (adjust for differences in motor speeds)
void MotorController::calibrateLeftMotor(int offset) {
    // This would adjust the speed to compensate for motor differences
    // offset is typically a value between -100 and +100
    // For now, we just store it but don't apply it to actual motor control
}

// Calibrate right motor (adjust for differences in motor speeds)
void MotorController::calibrateRightMotor(int offset) {
    // This would adjust the speed to compensate for motor differences
    // offset is typically a value between -100 and +100
    // For now, we just store it but don't apply it to actual motor control
}

// Handle fault condition
void MotorController::handleFault() {
    stopMotors();
    // Additional fault handling can be added here
}

// Check if motor controller is in fault state
bool MotorController::isFaulted() const {
    // Placeholder for fault detection logic
    return false;
}