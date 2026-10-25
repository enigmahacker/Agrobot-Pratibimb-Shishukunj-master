#ifndef CONFIG_H
#define CONFIG_H

// Pin Configuration (Revised)
#define MOTOR_DRIVER1_RPWM 3   // Motor 1 Brown RPWM (Hardware PWM)
#define MOTOR_DRIVER1_LPWM 2   // Motor 1 Red LPWM
#define MOTOR_DRIVER2_RPWM 4   // Motor 2 White RPWM
#define MOTOR_DRIVER2_LPWM 5   // Motor 2 Black LPWM (Hardware PWM)

#define HC05_TXD 10            // Arduino Pin 10 connected to HC-05 TXD
#define HC05_RXD 9             // Arduino Pin 9 connected to HC-05 RXD

#define GPS_TX 1               // Arduino Default Hardware Serial TX
#define GPS_RX 0               // Arduino Default Hardware Serial RX

#define RELAY_IN 6             // Relay control input (GPIO 6)

#define ULTRASONIC_TRIG 12     // Ultrasonic Trigger (GPIO 12)
#define ULTRASONIC_ECHO 11     // Ultrasonic Echo (GPIO 11)

// Motor driver configuration
#define MOTOR_DRIVER1_RPWM_PIN MOTOR_DRIVER1_RPWM
#define MOTOR_DRIVER1_LPWM_PIN MOTOR_DRIVER1_LPWM
#define MOTOR_DRIVER2_RPWM_PIN MOTOR_DRIVER2_RPWM
#define MOTOR_DRIVER2_LPWM_PIN MOTOR_DRIVER2_LPWM

// Safety and control parameters
#define OBSTACLE_THRESHOLD_CM 30    // Distance threshold for obstacle detection (cm)
#define MAX_SPEED 255               // Maximum motor speed (0-255)
#define MIN_SPEED 80                // Minimum operational speed
#define COMMUNICATION_TIMEOUT_MS 5000 // Bluetooth communication timeout in milliseconds
#define PUMP_TIMEOUT_MS 30000       // Maximum pump activation time in milliseconds
#define GPS_TIMEOUT_MS 30000        // GPS data timeout in milliseconds

// Protocol version and message limits
#define PROTOCOL_VERSION "1.0"
#define MAX_MESSAGE_LENGTH 64
#define MAX_TELEMETRY_LENGTH 128

// Safety states
typedef enum {
    DISARMED,
    IDLE,
    MOVING_FORWARD,
    MOVING_REVERSE,
    OBSTACLE_STOP,
    COMMUNICATION_LOSS,
    FAULT
} SafetyState;

// Motor directions
typedef enum {
    MOTOR_STOP,
    MOTOR_FORWARD,
    MOTOR_REVERSE
} MotorDirection;

#endif // CONFIG_H