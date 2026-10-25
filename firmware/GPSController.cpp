#include "GPSController.h"
#include <Arduino.h>

// Constructor implementation
GPSController::GPSController() {
    // Initialize GPS serial connection with configured pins
    gps_serial = new SoftwareSerial(GPS_RX, GPS_TX);

    // Initialize data storage
    latitude = 0.0f;
    longitude = 0.0f;
    fix_valid = false;
    last_fix_time = 0;
    num_satellites = 0;
    speed_knots = 0.0f;
    altitude_meters = 0.0f;
    gps_data_updated = false;
}

// Initialize GPS controller
void GPSController::begin() {
    // Start SoftwareSerial communication with GPS module at 9600 baud
    gps_serial->begin(9600);

    // Initialize data storage
    latitude = 0.0f;
    longitude = 0.0f;
    fix_valid = false;
    last_fix_time = 0;
    num_satellites = 0;
    speed_knots = 0.0f;
    altitude_meters = 0.0f;
    gps_data_updated = false;
}

// Update GPS data
void GPSController::update() {
    // Check for new GPS data
    while (gps_serial->available()) {
        // Parse GPS data using TinyGPS++ library
        if (gps.encode(gps_serial->read())) {
            parseGPSData();
        }
    }

    // Mark that we've updated at least once
    gps_data_updated = true;
}

// Parse GPS data from TinyGPS++
void GPSController::parseGPSData() {
    // Update location data if valid
    if (gps.location.isValid()) {
        latitude = gps.location.lat();
        longitude = gps.location.lng();
        fix_valid = true;
        last_fix_time = millis();
    } else {
        fix_valid = false;
    }

    // Update satellite count
    num_satellites = gps.satellites.value();

    // Update speed if available
    if (gps.speed.isValid()) {
        speed_knots = gps.speed.knots();
    } else {
        speed_knots = 0.0f;
    }

    // Update altitude if available
    if (gps.altitude.isValid()) {
        altitude_meters = gps.altitude.meters();
    } else {
        altitude_meters = 0.0f;
    }
}

// Check if GPS fix is valid
bool GPSController::isFixValid() const {
    return fix_valid;
}

// Get latitude
float GPSController::getLatitude() const {
    return latitude;
}

// Get longitude
float GPSController::getLongitude() const {
    return longitude;
}

// Get time of last fix
unsigned long GPSController::getLastFixTime() const {
    return last_fix_time;
}

// Get number of satellites used in fix
int GPSController::getSatelliteCount() const {
    return num_satellites;
}

// Get speed in knots
float GPSController::getSpeedKnots() const {
    return speed_knots;
}

// Get altitude in meters
float GPSController::getAltitudeMeters() const {
    return altitude_meters;
}

// Check if GPS data has been updated
bool GPSController::isDataUpdated() const {
    return gps_data_updated;
}

// Reset GPS controller state
void GPSController::reset() {
    latitude = 0.0f;
    longitude = 0.0f;
    fix_valid = false;
    last_fix_time = 0;
    num_satellites = 0;
    speed_knots = 0.0f;
    altitude_meters = 0.0f;
    gps_data_updated = false;
}

// Check if we have a valid location
bool GPSController::hasValidLocation() const {
    return fix_valid && latitude != 0.0f && longitude != 0.0f;
}

// Get age of last GPS fix in milliseconds
unsigned long GPSController::getAgeOfFix() const {
    unsigned long now = millis();
    if (last_fix_time > 0) {
        return now - last_fix_time;
    }
    return GPS_TIMEOUT_MS; // Return timeout value if no fix yet
}

// Set update interval (not directly used in this implementation)
void GPSController::setUpdateInterval(unsigned long interval_ms) {
    // This would be used for controlling how often to check for updates
    // In current implementation, we process all available data as it comes in
}