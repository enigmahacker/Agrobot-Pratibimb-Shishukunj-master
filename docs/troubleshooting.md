# AgroBot Troubleshooting Guide

This guide provides solutions for common issues that may occur when building and operating the AgroBot agricultural rover system.

## General Troubleshooting Steps

1. **Check power connections** - Ensure all components are properly powered
2. **Verify wiring** - Confirm all connections match the hardware wiring diagram
3. **Review serial output** - Use Arduino IDE Serial Monitor for diagnostic information
4. **Test individual components** - Isolate and test each module separately
5. **Check component specifications** - Ensure voltage/current ratings are compatible

## Hardware Issues

### 1. No Power to Motors or Sensors

**Symptoms:**
- Motors don't turn
- Sensors show no data
- System doesn't initialize

**Troubleshooting:**
- Check main power supply voltage (should be 12V for motors)
- Verify Arduino is receiving 5V power
- Inspect fuse connections
- Confirm all ground connections are secure
- Test individual components with multimeter

### 2. Motor Driver Not Working

**Symptoms:**
- Motors don't respond to commands
- Error messages on serial monitor
- Motor driver gets hot

**Troubleshooting:**
- Verify motor driver power supply (12V-24V input)
- Check if motor driver is properly connected to Arduino
- Ensure adequate heat dissipation for driver chip
- Test with known good motor and wiring
- Check for short circuits in motor connections

### 3. Bluetooth Communication Issues

**Symptoms:**
- No serial communication
- Commands not recognized
- Connection drops frequently

**Troubleshooting:**
- Verify HC-05 module is properly paired with phone
- Check Bluetooth module voltage levels (should be 3.3V logic)
- Ensure correct baud rate settings (9600 for Arduino)
- Test with serial monitor to verify communication
- Confirm proper wiring of TX/RX lines

### 4. GPS Not Providing Data

**Symptoms:**
- No GPS fix
- Coordinates show zero or invalid values
- "GPS not responding" messages

**Troubleshooting:**
- Check GPS module power supply (3.3V)
- Verify correct serial pin connections (D8 for RX, D10 for TX)
- Ensure clear sky view for satellite acquisition
- Wait 2-5 minutes for initial fix (GPS warm start)
- Check if module is receiving power and signals properly

### 5. Ultrasonic Sensor Not Responding

**Symptoms:**
- No distance readings
- Constant maximum distances
- Erratic readings

**Troubleshooting:**
- Verify sensor connections (VCC, GND, TRIG, ECHO)
- Check for interference from other components
- Ensure proper power supply to sensor (5V)
- Test with multimeter for signal integrity
- Confirm correct pin assignments in code

## Software Issues

### 1. Firmware Upload Failures

**Symptoms:**
- Arduino IDE shows upload errors
- "Programmer is not responding"
- Code fails to compile

**Troubleshooting:**
- Check Arduino connection (USB cable, port selection)
- Verify correct board and processor settings
- Ensure no other programs are using the serial port
- Try different USB cable or port
- Check for conflicting libraries in IDE

### 2. Communication Protocol Errors

**Symptoms:**
- "Invalid command" responses
- Commands not acknowledged
- Unexpected behavior

**Troubleshooting:**
- Verify correct command format (uppercase, newline terminated)
- Check serial baud rates match on both ends
- Confirm proper message boundaries
- Test with serial monitor to debug communication

### 3. Safety System Issues

**Symptoms:**
- Emergency stop not activating
- Obstacle detection not working
- Motors don't stop when they should

**Troubleshooting:**
- Verify relay connections for pump control
- Check obstacle sensor wiring and calibration
- Confirm safety interlock settings
- Test emergency stop button functionality
- Review safety state machine logic

## Common Error Messages

### Firmware Errors:
```
"Initial State: 0"
"System initialized successfully"
"ERROR: Motor driver not responding"
"GPS timeout"
"Bluetooth communication lost"
```

### Android App Issues:
- "Connection failed" - Bluetooth pairing issues
- "Invalid command" - Protocol mismatch
- "System offline" - Communication loss
- "Obstacle detected" - Sensor alert

## Testing Procedures

### 1. Component-Level Testing
- Test each sensor independently with multimeter
- Verify motor driver operation with known good motors
- Check relay operation with LED or multimeter
- Validate Bluetooth connection with serial monitor

### 2. System Integration Testing
- Test manual movement commands
- Verify obstacle detection and stopping
- Confirm GPS data reception
- Test pump activation/deactivation
- Run communication timeout tests

### 3. Safety Checks
- Emergency stop functionality
- Communication loss recovery
- Obstacle detection range verification
- Pump safety interlocks
- System fault detection

## Preventive Maintenance

1. **Regular inspections** - Check all connections periodically
2. **Cleanliness** - Keep sensors and components clean
3. **Battery monitoring** - Monitor system power levels
4. **Calibration** - Periodic recalibration of sensors
5. **Software updates** - Keep firmware up to date

## Advanced Troubleshooting

### 1. Debugging Communication Issues
Use Arduino Serial Monitor to:
- Check for malformed commands
- Monitor command acknowledgment
- Track communication timeouts
- Verify message format consistency

### 2. Power Supply Analysis
Measure voltage at:
- Main power input
- Arduino 5V output
- Motor driver supply
- Sensor power lines
- Relay module input

### 3. Signal Integrity Testing
Use oscilloscope or multimeter to check:
- Signal waveforms on control lines
- Voltage levels on logic inputs
- Current draw of components
- Ground integrity

## When to Seek Help

Contact technical support when experiencing:
1. Hardware component failures that cannot be resolved
2. System-wide malfunctions after basic troubleshooting
3. Safety system issues that compromise operation
4. Persistent communication problems despite verification
5. Unexpected behavior not covered in this guide

## Version Information

This troubleshooting guide applies to AgroBot firmware version 1.0 and above.

Last updated: October 2023