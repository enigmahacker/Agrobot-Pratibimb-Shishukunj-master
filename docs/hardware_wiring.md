# AgroBot Hardware Wiring Diagram

This document details the pin connections and wiring for the AgroBot agricultural rover system.

## Overview

The AgroBot system uses an Arduino Uno as its main controller with the following components:
- Motor driver (L298N or similar)
- HC-SR04 ultrasonic sensor
- HC-05 Bluetooth module
- NEO-6M GPS module
- Relay module for pump control
- 12V pesticide pump circuit

## Pin Assignments (Revised)

### Motor Driver Connections
| Motor Driver | Wire Color | Arduino Uno Pin | Description |
|--------------|------------|----------------|-------------|
| Motor Driver 1 RPWM | Brown | D3 | Right motor forward (Hardware PWM) |
| Motor Driver 1 LPWM | Red | D2 | Right motor reverse |
| Motor Driver 2 RPWM | White | D4 | Left motor reverse |
| Motor Driver 2 LPWM | Black | D5 | Left motor forward (Hardware PWM) |

### Bluetooth Module (HC-05)
| HC-05 Pin | Arduino Uno Pin | Description |
|-----------|----------------|-------------|
| TXD | D10 | Arduino RX (SoftwareSerial) |
| RXD | D9 | Arduino TX (SoftwareSerial) |

### GPS Module
| GPS Pin | Arduino Uno Pin | Description |
|---------|----------------|-------------|
| TX | D0 (RX) | Arduino Default Hardware Serial RX |
| RX | D1 (TX) | Arduino Default Hardware Serial TX |

### Relay Module (12V Spray Pump)
| Relay Pin | Arduino Uno Pin | Description |
|-----------|----------------|-------------|
| IN | D6 | Relay control input (Active LOW) |

### Ultrasonic Sensor (HC-SR04)
| HC-SR04 Pin | Arduino Uno Pin | Description |
|-------------|----------------|-------------|
| TRIG | D12 | Ultrasonic trigger pulse output |
| ECHO | D11 | Ultrasonic echo return input |

## Circuit Diagram

```
Arduino Uno
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [Motor Driver 1]              [Motor Driver 2]                     │
│  ┌─────────────┐               ┌─────────────┐                      │
│  │    IN1      │◄──────────────┤    IN1      │                       │
│  │    IN2      │◄──────────────┤    IN2      │                       │
│  │    ENA      │◄──────────────┤    ENA      │                       │
│  │    IN3      │◄──────────────┤    IN3      │                       │
│  │    IN4      │◄──────────────┤    IN4      │                       │
│  │    ENB      │◄──────────────┤    ENB      │                       │
│  └─────────────┘               └─────────────┘                      │
│         │                        │                                 │
│         │                        │                                 │
│         ▼                        ▼                                 │
│   [Left Motors]               [Right Motors]                       │
│                                                                     │
│        [Ultrasonic Sensor]                                          │
│        ┌─────────────┐                                              │
│        │    TRIG     │◄────────── D11                                   │
│        │    ECHO     │◄────────── D12                                   │
│        └─────────────┘                                              │
│                                                                     │
│       [Bluetooth Module]                                            │
│        ┌─────────────┐                                              │
│        │    TXD      │◄────────── D9                                    │
│        │    RXD      │◄────────── D13                                   │
│        └─────────────┘                                              │
│                                                                     │
│         [GPS Module]                                                │
│        ┌─────────────┐                                              │
│        │    TX       │◄────────── D10                                   │
│        │    RX       │◄────────── D8                                    │
│        └─────────────┘                                              │
│                                                                     │
│         [Relay Module]                                              │
│        ┌─────────────┐                                              │
│        │    IN       │◄────────── D7                                    │
│        └─────────────┘                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

```

## Power Supply Requirements

### Main Power Supply
- 12V DC power supply for motors and pump
- 5V USB power for Arduino Uno (via USB or regulated power)

### Motor Driver Power
- 12V to 24V input for motor driver
- Separate ground connection for motors

### Safety Considerations
- Fuse protection for motor circuits
- Proper heat dissipation for motor drivers
- Isolation between control and power circuits
- Emergency stop button in system

## Wiring Notes

1. **PWM Pins**: D3 and D5 support hardware PWM, while D2 and D4 do not.
2. **Bluetooth Module**: The HC-05 requires 3.3V logic levels (Arduino's 5V may need level shifting).
3. **GPS Module**: The NEO-6M is a 3.3V device, so level shifting might be needed if using 5V Arduino.
4. **Relay Module**: Ensure the relay module uses appropriate voltage for your pump circuit.
5. **Sensor Power**: All sensors should be powered from the Arduino's 5V pin with proper current limiting.

## Testing Connections

Before final assembly:
1. Test all motor connections with a multimeter
2. Verify sensor power and signal levels
3. Check Bluetooth communication with serial monitor
4. Confirm GPS data reception
5. Test relay operation independently
6. Validate obstacle detection range