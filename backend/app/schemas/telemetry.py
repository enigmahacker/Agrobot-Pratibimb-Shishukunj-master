from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class GPSData(BaseModel):
    latitude: float
    longitude: float
    valid: bool
    age_seconds: int
    satellites: int = 0

class MotorData(BaseModel):
    direction: str
    speed: int
    left_speed: int
    right_speed: int

class PumpData(BaseModel):
    is_on: bool
    duration_seconds: int = 0
    flow_rate_lpm: Optional[float] = None

class SafetyData(BaseModel):
    state: str
    emergency_stop: bool
    obstacle_detected: bool
    communication_loss: bool
    fault_active: bool

class TelemetryData(BaseModel):
    timestamp: datetime
    protocol_version: str = "1.0"
    gps: GPSData
    motor: MotorData
    pump: PumpData
    safety: SafetyData
    obstacle_distance_cm: float
    battery_level_percent: int = 100

class WeatherData(BaseModel):
    temperature_celsius: float
    humidity_percent: int
    wind_speed_mps: float
    wind_direction_degrees: Optional[int] = None
    pressure_hpa: Optional[float] = None
    precipitation_mm: Optional[float] = None
    condition: str
    timestamp: datetime