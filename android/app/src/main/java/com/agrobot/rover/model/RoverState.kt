package com.agrobot.rover.model

/**
 * AgroBot Rover States and Telemetry Models
 * Aligned with idea.txt and arduino_controller.ino
 */
enum class SafetyState(val code: Int, val displayName: String) {
    DISARMED(0, "DISARMED"),
    IDLE(1, "ARMED (IDLE)"),
    MOVING_FORWARD(2, "MOVING FORWARD"),
    MOVING_REVERSE(3, "MOVING REVERSE"),
    OBSTACLE_STOP(4, "OBSTACLE DETECTED - STOPPED"),
    COMMUNICATION_LOSS(5, "COMMUNICATION LOSS"),
    FAULT(6, "SYSTEM FAULT"),
    EMERGENCY_STOP(7, "EMERGENCY STOPPED");

    companion object {
        fun fromCode(code: Int): SafetyState {
            return entries.find { it.code == code } ?: IDLE
        }
    }
}

data class RoverTelemetry(
    val version: String = "1.0",
    val state: SafetyState = SafetyState.DISARMED,
    val obstacleDistanceCm: Float = 150.0f,
    val pumpActive: Boolean = false,
    val speedPwm: Int = 180,
    val gpsCoordinates: String = "0.000000,0.000000",
    val gpsFix: Boolean = false,
    val lastUpdated: Long = System.currentTimeMillis()
)

object TelemetryParser {
    fun parse(line: String, current: RoverTelemetry): RoverTelemetry {
        val trimmed = line.trim()
        if (!trimmed.startsWith("TELEMETRY ")) return current

        val payload = trimmed.substring(10)
        val tokens = payload.split('|')
        var newState = current.state
        var newDist = current.obstacleDistanceCm
        var newPump = current.pumpActive
        var newSpeed = current.speedPwm
        var newGps = current.gpsCoordinates
        var newFix = current.gpsFix

        for (token in tokens) {
            val parts = token.split(':', limit = 2)
            if (parts.size == 2) {
                val (k, v) = parts
                when (k) {
                    "S" -> v.toIntOrNull()?.let { newState = SafetyState.fromCode(it) }
                    "O" -> v.toFloatOrNull()?.let { newDist = it }
                    "P" -> newPump = (v == "1")
                    "SPD" -> v.toIntOrNull()?.let { newSpeed = it }
                    "GPS" -> newGps = v
                    "FIX" -> newFix = (v == "1")
                }
            }
        }

        return current.copy(
            state = newState,
            obstacleDistanceCm = newDist,
            pumpActive = newPump,
            speedPwm = newSpeed,
            gpsCoordinates = newGps,
            gpsFix = newFix,
            lastUpdated = System.currentTimeMillis()
        )
    }
}
