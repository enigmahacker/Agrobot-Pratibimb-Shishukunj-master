# AgroBot - AI-Powered Agricultural Rover

An intelligent agricultural rover system with obstacle detection, GPS positioning, and pesticide application capabilities.

## System Overview

This project implements a complete agricultural rover solution with three main components:
1. Arduino Uno firmware for embedded control
2. Android application for remote control and monitoring
3. Python FastAPI backend for AI-assisted calculations and data management

## Hardware Components

- Arduino Uno
- Motor driver (L298N or similar)
- HC-SR04 ultrasonic sensor
- HC-05 Bluetooth module
- NEO-6M GPS module
- Relay module for pump control
- 12V pump circuit

## Project Structure

```
agrobot/
├── firmware/
│   ├── AgroBot.ino
│   ├── Config.h
│   ├── MotorController.h
│   ├── MotorController.cpp
│   ├── ObstacleDetector.h
│   ├── ObstacleDetector.cpp
│   ├── BluetoothProtocol.h
│   ├── BluetoothProtocol.cpp
│   ├── GPSController.h
│   ├── GPSController.cpp
│   ├── PumpController.h
│   ├── PumpController.cpp
│   ├── SafetyController.h
│   ├── SafetyController.cpp
│   ├── Telemetry.h
│   └── Telemetry.cpp
├── android/
│   └── (Android app files)
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── health.py
│   │   │   ├── rover.py
│   │   │   ├── agronomy.py
│   │   │   ├── pesticide.py
│   │   │   ├── weather.py
│   │   │   └── spray_sessions.py
│   │   ├── services/
│   │   │   ├── ai_service.py
│   │   │   ├── agronomy_service.py
│   │   │   ├── dose_calculator.py
│   │   │   ├── weather_service.py
│   │   │   └── validation_service.py
│   │   ├── schemas/
│   │   │   ├── telemetry.py
│   │   │   ├── crop.py
│   │   │   ├── pesticide.py
│   │   │   ├── recommendation.py
│   │   │   └── spray_session.py
│   │   ├── security/
│   │   │   └── authentication.py
│   │   └── tests/
│   │       ├── test_health.py
│   │       ├── test_dose_calculator.py
│   │       ├── test_validation.py
│   │       └── test_authentication.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   └── README.md
└── docs/
    ├── hardware_wiring.md
    ├── bill_of_materials.md
    └── troubleshooting.md
```

## Getting Started

1. **Hardware Setup**: Connect all components according to the wiring diagram
2. **Firmware**: Upload the Arduino firmware to the Uno
3. **Backend**: Set up and run the Python backend server
4. **Android App**: Install and configure the mobile application

## Safety Features

- Emergency stop functionality
- Obstacle detection and automatic stopping
- Communication timeout handling
- Pump safety interlocks
- Physical safety checks that cannot be bypassed by remote commands