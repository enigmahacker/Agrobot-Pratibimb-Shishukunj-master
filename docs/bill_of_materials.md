# AgroBot Bill of Materials

This document lists all hardware components required to build the AgroBot agricultural rover system.

## Main Controller

| Component | Quantity | Description | Notes |
|-----------|----------|-------------|-------|
| Arduino Uno | 1 | Microcontroller board | ATmega328P processor |
| Motor Driver (L298N) | 2 | Dual H-bridge motor driver | Controls 4 motors |
| HC-SR04 Ultrasonic Sensor | 1 | Distance measurement sensor | 2cm - 400cm range |
| HC-05 Bluetooth Module | 1 | Serial communication module | Bluetooth 2.0/3.0 |
| NEO-6M GPS Module | 1 | GPS receiver module | With U-blox M8N chip |
| Relay Module | 1 | 5V relay switch | For pump control |
| Jumper Wires | Various | Breadboard and connecting wires | Male/female, various lengths |

## Power Supply

| Component | Quantity | Description | Notes |
|-----------|----------|-------------|-------|
| 12V DC Power Supply | 1 | 12V 5A power adapter | For motors and pump |
| 5V USB Power Adapter | 1 | 5V 2A power adapter | For Arduino and sensors |

## Motors and Mechanical

| Component | Quantity | Description | Notes |
|-----------|----------|-------------|-------|
| DC Motors (4) | 4 | 12V brushed DC motors | With encoders recommended |
| Wheels | 4 | Rubber or plastic wheels | Match motor shaft size |
| Chassis | 1 | Plastic or metal chassis | Custom design required |
| Mounting Hardware | Various | Screws, brackets, standoffs | For component mounting |

## Pesticide Application

| Component | Quantity | Description | Notes |
|-----------|----------|-------------|-------|
| 12V Pesticide Pump | 1 | High-pressure pump | With appropriate flow rate |
| Spray Nozzles | 4-8 | Adjustable nozzles | For uniform coverage |
| Tank Reservoir | 1 | Plastic tank | 50L-200L capacity |
| Hose Assembly | 1 | Flexible tubing | For fluid delivery |

## Safety and Protection

| Component | Quantity | Description | Notes |
|-----------|----------|-------------|-------|
| Fuses | 4-6 | Circuit protection | Appropriate amperage |
| Capacitors | 2-4 | Decoupling capacitors | 100uF, 0.1uF |
| Heat Sinks | 2 | For motor drivers | If needed |
| Diodes | 4-8 | Flyback diodes | For motor protection |

## Tools and Accessories

| Component | Quantity | Description | Notes |
|-----------|----------|-------------|-------|
| Breadboard | 1 | Solderless breadboard | For prototyping |
| Multimeter | 1 | Digital multimeter | For testing |
| Soldering Iron | 1 | Soldering kit | With flux and solder |
| Wire Stripper/Cutter | 1 | Electrical tool | For wire preparation |
| Screwdriver Set | 1 | Various sizes | For assembly |

## Optional Components

| Component | Quantity | Description | Notes |
|-----------|----------|-------------|-------|
| Encoders | 4 | Motor position feedback | For precise control |
| Inclinometer | 1 | Angle sensor | For terrain tracking |
| Camera Module | 1 | Vision system | For crop monitoring |
| Temperature Sensor | 1 | Environmental sensor | For climate data |

## Estimated Costs

| Category | Approximate Cost (USD) |
|----------|------------------------|
| Main Controller & Drivers | $30-50 |
| Motors & Chassis | $50-100 |
| Sensors | $20-40 |
| Power Supply | $15-25 |
| Pesticide System | $50-100 |
| Safety Components | $10-20 |
| Tools & Accessories | $20-30 |
| **Total** | **$195-365** |

## Specifications Summary

### Electrical Requirements
- Supply Voltage: 12V DC (motors/pump), 5V DC (controller)
- Motor Current: 1A-3A per motor (depending on model)
- Pump Power: 12V DC, 2-4A (depending on model)
- Sensor Power: 5V DC, <100mA each

### Physical Dimensions
- Chassis Size: 30cm x 20cm x 10cm (approximate)
- Weight: 5-8kg (excluding pesticide system)

### Operating Environment
- Temperature Range: -10°C to +50°C
- Humidity: Up to 95% RH
- Protection Rating: IP65 minimum

## Notes for Procurement

1. **Motor Drivers**: L298N or similar dual H-bridge drivers are recommended.
2. **GPS Module**: NEO-6M is a reliable choice with good signal reception.
3. **Bluetooth Module**: Ensure HC-05 module supports 3.3V logic levels.
4. **Pump Selection**: Choose a pump with appropriate flow rate for your application.
5. **Safety**: All electrical connections should be properly insulated and fused.

## Customization Options

1. **Motor Type**: Brushed vs brushless motors
2. **Chassis Design**: Plastic vs metal construction
3. **Sensor Array**: Additional sensors for enhanced capabilities
4. **Pump System**: Different pump types for various applications
5. **Control Interface**: Enhanced user interface options

This bill of materials provides a starting point for building the AgroBot system. Actual costs and specifications may vary based on component selection, quantity purchased, and regional pricing.