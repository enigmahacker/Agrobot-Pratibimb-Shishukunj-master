#ifndef GPS_CONTROLLER_H
#define GPS_CONTROLLER_H

#include "Config.h"
#include <TinyGPS++.h>
#include <SoftwareSerial.h>

class GPSController {
private:
    // GPS module connection
    SoftwareSerial* gps_serial;
    TinyGPSPlus gps;

    // GPS data storage
    float latitude;
    float longitude;
    bool fix_valid;
    unsigned long last_fix_time;
    int num_satellites;
    float speed_knots;
    float altitude_meters;
    bool gps_data_updated;

public:
    // Constructor
    GPSController();

    // Initialization
    void begin();

    // GPS operations
    void update();
    bool isFixValid() const;
    float getLatitude() const;
    float getLongitude() const;
    unsigned long getLastFixTime() const;
    int getSatelliteCount() const;
    float getSpeedKnots() const;
    float getAltitudeMeters() const;
    bool isDataUpdated() const;

    // Utility functions
    void reset();
    bool hasValidLocation() const;
    unsigned long getAgeOfFix() const;

    // Configuration
    void setUpdateInterval(unsigned long interval_ms);

private:
    // Internal helper functions
    void parseGPSData();
};

#endif // GPS_CONTROLLER_H