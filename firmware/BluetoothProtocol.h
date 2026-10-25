#ifndef BLUETOOTH_PROTOCOL_H
#define BLUETOOTH_PROTOCOL_H

#include "Config.h"
#include <Arduino.h>

// Command types
typedef enum {
    CMD_ARM,
    CMD_DISARM,
    CMD_FORWARD,
    CMD_REVERSE,
    CMD_STOP,
    CMD_EMERGENCY_STOP,
    CMD_PUMP_OFF,
    CMD_STATUS,
    CMD_HEARTBEAT,
    CMD_UNKNOWN
} CommandType;

// Response types
typedef enum {
    RESP_SUCCESS,
    RESP_ERROR,
    RESP_INVALID_COMMAND,
    RESP_TIMEOUT
} ResponseType;

// Communication state
typedef enum {
    COMM_IDLE,
    COMM_WAITING_FOR_RESPONSE,
    COMM_TIMEOUT
} CommunicationState;

class BluetoothProtocol {
private:
    // Serial communication
    HardwareSerial* bluetooth_serial;

    // Command handling
    char received_buffer[MAX_MESSAGE_LENGTH];
    int buffer_index;
    unsigned long last_command_time;
    bool command_complete;

    // State tracking
    CommunicationState comm_state;
    CommandType current_command;

public:
    // Constructor
    BluetoothProtocol();

    // Initialization
    void begin();

    // Communication handling
    void update();
    bool hasCommand() const;
    CommandType getCommand() const;
    void sendResponse(ResponseType type, const char* message = "");
    void sendTelemetry(const char* telemetry_data);

    // Command processing
    void processCommand(CommandType command);
    bool isCommandValid(CommandType command) const;

    // Utility functions
    unsigned long getLastCommandTime() const;
    void resetCommand();
    bool isCommunicationTimeout() const;

private:
    // Internal helper functions
    void parseCommand();
    CommandType stringToCommand(const char* command_str) const;
    void clearBuffer();
};

#endif // BLUETOOTH_PROTOCOL_H