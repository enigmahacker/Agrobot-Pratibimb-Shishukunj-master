#include "BluetoothProtocol.h"
#include <Arduino.h>

// Constructor implementation
BluetoothProtocol::BluetoothProtocol() {
    bluetooth_serial = &Serial;
    buffer_index = 0;
    last_command_time = 0;
    command_complete = false;
    comm_state = COMM_IDLE;
    current_command = CMD_UNKNOWN;
}

// Initialize Bluetooth protocol
void BluetoothProtocol::begin() {
    // Start serial communication with HC-05 at 9600 baud
    bluetooth_serial->begin(9600);

    // Clear buffer
    clearBuffer();

    // Reset state
    last_command_time = millis();
    command_complete = false;
    comm_state = COMM_IDLE;
}

// Update communication handling
void BluetoothProtocol::update() {
    // Check for incoming data
    while (bluetooth_serial->available()) {
        char incoming_char = bluetooth_serial->read();

        // Handle command termination
        if (incoming_char == '\n' || incoming_char == '\r') {
            // End of command received
            if (buffer_index > 0) {
                received_buffer[buffer_index] = '\0';  // Null terminate
                command_complete = true;
                last_command_time = millis();

                // Parse the command
                parseCommand();

                // Clear buffer for next command
                clearBuffer();
            }
        } else if (buffer_index < MAX_MESSAGE_LENGTH - 1) {
            // Add character to buffer
            received_buffer[buffer_index++] = incoming_char;
        } else {
            // Buffer overflow - clear and start over
            clearBuffer();
        }
    }
}

// Check if a complete command has been received
bool BluetoothProtocol::hasCommand() const {
    return command_complete;
}

// Get the current command type
CommandType BluetoothProtocol::getCommand() const {
    return current_command;
}

// Send response back to Android app
void BluetoothProtocol::sendResponse(ResponseType type, const char* message) {
    if (message == nullptr) {
        message = "";
    }

    switch (type) {
        case RESP_SUCCESS:
            bluetooth_serial->print("OK ");
            break;
        case RESP_ERROR:
            bluetooth_serial->print("ERROR ");
            break;
        case RESP_INVALID_COMMAND:
            bluetooth_serial->print("INVALID_CMD ");
            break;
        case RESP_TIMEOUT:
            bluetooth_serial->print("TIMEOUT ");
            break;
    }

    bluetooth_serial->println(message);
}

// Send telemetry data
void BluetoothProtocol::sendTelemetry(const char* telemetry_data) {
    if (telemetry_data != nullptr) {
        bluetooth_serial->print("TELEMETRY ");
        bluetooth_serial->println(telemetry_data);
    }
}

// Process command received from Android app
void BluetoothProtocol::processCommand(CommandType command) {
    // Command processing will be handled by the main firmware logic
    current_command = command;
    command_complete = false;  // Reset after processing
}

// Check if command is valid
bool BluetoothProtocol::isCommandValid(CommandType command) const {
    switch (command) {
        case CMD_ARM:
        case CMD_DISARM:
        case CMD_FORWARD:
        case CMD_REVERSE:
        case CMD_STOP:
        case CMD_EMERGENCY_STOP:
        case CMD_PUMP_OFF:
        case CMD_STATUS:
        case CMD_HEARTBEAT:
            return true;
        default:
            return false;
    }
}

// Get time of last command
unsigned long BluetoothProtocol::getLastCommandTime() const {
    return last_command_time;
}

// Reset command state
void BluetoothProtocol::resetCommand() {
    command_complete = false;
    current_command = CMD_UNKNOWN;
    clearBuffer();
}

// Check if communication has timed out
bool BluetoothProtocol::isCommunicationTimeout() const {
    unsigned long now = millis();
    if (now - last_command_time > COMMUNICATION_TIMEOUT_MS) {
        return true;
    }
    return false;
}

// Parse incoming command from buffer
void BluetoothProtocol::parseCommand() {
    // Convert to uppercase for comparison
    for (int i = 0; i < buffer_index; i++) {
        received_buffer[i] = toupper(received_buffer[i]);
    }

    // Convert command string to enum
    current_command = stringToCommand(received_buffer);

    // Validate command
    if (!isCommandValid(current_command)) {
        sendResponse(RESP_INVALID_COMMAND, "Unknown command");
        current_command = CMD_UNKNOWN;
    } else {
        sendResponse(RESP_SUCCESS, "Command accepted");
    }
}

// Convert string command to enum
CommandType BluetoothProtocol::stringToCommand(const char* command_str) const {
    if (strcmp(command_str, "ARM") == 0) {
        return CMD_ARM;
    } else if (strcmp(command_str, "DISARM") == 0) {
        return CMD_DISARM;
    } else if (strcmp(command_str, "FORWARD") == 0) {
        return CMD_FORWARD;
    } else if (strcmp(command_str, "REVERSE") == 0) {
        return CMD_REVERSE;
    } else if (strcmp(command_str, "STOP") == 0) {
        return CMD_STOP;
    } else if (strcmp(command_str, "EMERGENCY_STOP") == 0) {
        return CMD_EMERGENCY_STOP;
    } else if (strcmp(command_str, "PUMP_OFF") == 0) {
        return CMD_PUMP_OFF;
    } else if (strcmp(command_str, "STATUS") == 0) {
        return CMD_STATUS;
    } else if (strcmp(command_str, "HEARTBEAT") == 0) {
        return CMD_HEARTBEAT;
    } else {
        return CMD_UNKNOWN;
    }
}

// Clear command buffer
void BluetoothProtocol::clearBuffer() {
    for (int i = 0; i < MAX_MESSAGE_LENGTH; i++) {
        received_buffer[i] = '\0';
    }
    buffer_index = 0;
}