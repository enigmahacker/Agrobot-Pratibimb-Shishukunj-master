package com.agrobot.rover.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import com.agrobot.rover.model.RoverTelemetry
import com.agrobot.rover.model.TelemetryParser
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID

/**
 * AgroBot Bluetooth Manager
 * Manages RFCOMM SPP communication with HC-05 module (UUID: 00001101-0000-1000-8000-00805F9B34FB)
 * Aligned with idea.txt Section 6 and Section 8
 */
class BluetoothManager(private val context: Context) {

    companion object {
        // Standard SPP UUID for HC-05 / HC-06 Bluetooth Classic
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }

    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private var inputStream: InputStream? = null

    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var readJob: Job? = null
    private var heartbeatJob: Job? = null

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected

    private val _connectedDeviceName = MutableStateFlow<String?>("Disconnected")
    val connectedDeviceName: StateFlow<String?> = _connectedDeviceName

    private val _telemetry = MutableStateFlow(RoverTelemetry())
    val telemetry: StateFlow<RoverTelemetry> = _telemetry

    private val _logs = MutableSharedFlow<String>(replay = 50)
    val logs: SharedFlow<String> = _logs

    @SuppressLint("MissingPermission")
    fun getPairedDevices(): List<BluetoothDevice> {
        return bluetoothAdapter?.bondedDevices?.toList() ?: emptyList()
    }

    @SuppressLint("MissingPermission")
    suspend fun connect(device: BluetoothDevice): Boolean = withContext(Dispatchers.IO) {
        disconnect()
        try {
            emitLog("Connecting to ${device.name ?: device.address}...")
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            bluetoothAdapter?.cancelDiscovery()
            socket?.connect()

            outputStream = socket?.outputStream
            inputStream = socket?.inputStream

            _isConnected.value = true
            _connectedDeviceName.value = device.name ?: device.address
            emitLog("Connected to AgroBot HC-05 successfully!")

            startReadLoop()
            startHeartbeatLoop()
            return@withContext true
        } catch (e: Exception) {
            emitLog("Connection failed: ${e.message}")
            disconnect()
            return@withContext false
        }
    }

    fun disconnect() {
        try {
            readJob?.cancel()
            heartbeatJob?.cancel()
            outputStream?.close()
            inputStream?.close()
            socket?.close()
        } catch (_: Exception) {}
        socket = null
        outputStream = null
        inputStream = null
        _isConnected.value = false
        _connectedDeviceName.value = "Disconnected"
    }

    fun sendCommand(cmd: String) {
        val cleanCmd = cmd.trim().uppercase() + "\n"
        coroutineScope.launch(Dispatchers.IO) {
            try {
                outputStream?.write(cleanCmd.toByteArray())
                outputStream?.flush()
                emitLog("> $cmd")
            } catch (e: Exception) {
                emitLog("Send error: ${e.message}")
            }
        }
    }

    private fun startReadLoop() {
        readJob = coroutineScope.launch {
            val buffer = ByteArray(1024)
            val lineBuilder = StringBuilder()

            while (isActive && _isConnected.value) {
                try {
                    val bytesRead = inputStream?.read(buffer) ?: -1
                    if (bytesRead > 0) {
                        for (i in 0 until bytesRead) {
                            val c = buffer[i].toInt().toChar()
                            if (c == '\n' || c == '\r') {
                                if (lineBuilder.isNotEmpty()) {
                                    val line = lineBuilder.toString().trim()
                                    processIncomingLine(line)
                                    lineBuilder.clear()
                                }
                            } else {
                                lineBuilder.append(c)
                            }
                        }
                    } else if (bytesRead == -1) {
                        emitLog("Bluetooth stream closed by remote device")
                        disconnect()
                        break
                    }
                } catch (e: Exception) {
                    if (isActive) {
                        emitLog("Read loop error: ${e.message}")
                        disconnect()
                    }
                    break
                }
            }
        }
    }

    private fun startHeartbeatLoop() {
        heartbeatJob = coroutineScope.launch {
            while (isActive && _isConnected.value) {
                delay(2500)
                if (_isConnected.value) {
                    sendCommand("HEARTBEAT")
                }
            }
        }
    }

    private suspend fun processIncomingLine(line: String) {
        if (line.startsWith("TELEMETRY ")) {
            _telemetry.value = TelemetryParser.parse(line, _telemetry.value)
        } else {
            emitLog("< $line")
        }
    }

    private suspend fun emitLog(msg: String) {
        _logs.emit(msg)
    }

    // Direct Control Helpers matching idea.txt
    fun arm() = sendCommand("ARM")
    fun disarm() = sendCommand("DISARM")
    fun forward() = sendCommand("FORWARD")
    fun reverse() = sendCommand("REVERSE")
    fun turnLeft() = sendCommand("LEFT")
    fun turnRight() = sendCommand("RIGHT")
    fun stop() = sendCommand("STOP")
    fun emergencyStop() = sendCommand("EMERGENCY_STOP")
    fun clearFault() = sendCommand("CLEAR")
    fun pumpOn() = sendCommand("PUMP_ON")
    fun pumpOff() = sendCommand("PUMP_OFF")
    fun setSpeed(pwm: Int) = sendCommand("SPEED:$pwm")
}
