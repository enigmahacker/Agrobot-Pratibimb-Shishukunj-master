package com.agrobot.rover.ui

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agrobot.rover.bluetooth.BluetoothManager
import com.agrobot.rover.model.SafetyState
import kotlinx.coroutines.launch

// Dark Agro-Cyberpunk Color Palette
val AgroDarkBg = Color(0xFF0D131A)
val AgroCardBg = Color(0xFF141F2B)
val AgroCardBorder = Color(0xFF223548)
val AgroGreen = Color(0xFF00E676)
val AgroAmber = Color(0xFFFFB300)
val AgroRed = Color(0xFFFF1744)
val AgroCyan = Color(0xFF00E5FF)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(btManager: BluetoothManager) {
    val isConnected by btManager.isConnected.collectAsState()
    val deviceName by btManager.connectedDeviceName.collectAsState()
    val telemetry by btManager.telemetry.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    var showDeviceDialog by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableStateOf(0) } // 0: Controls, 1: AI Agronomy / Sowing

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "🌱 AGROBOT MISSION CONTROL",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = Color.White
                        )
                    }
                },
                actions = {
                    // Connection Status Badge / Button
                    FilledTonalButton(
                        onClick = { showDeviceDialog = true },
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = if (isConnected) AgroGreen.copy(alpha = 0.2f) else AgroRed.copy(alpha = 0.2f)
                        ),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Icon(
                            if (isConnected) Icons.Default.BluetoothConnected else Icons.Default.BluetoothDisabled,
                            contentDescription = null,
                            tint = if (isConnected) AgroGreen else AgroRed,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            if (isConnected) (deviceName ?: "Connected") else "Connect HC-05",
                            color = if (isConnected) AgroGreen else AgroRed,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AgroDarkBg)
            )
        },
        containerColor = AgroDarkBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Navigation Tabs
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = AgroCardBg,
                contentColor = AgroGreen
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Rover Drive Pad", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Sowing & Spray AI", fontWeight = FontWeight.Bold) }
                )
            }

            if (selectedTab == 0) {
                RoverControlTab(btManager = btManager, telemetry = telemetry, isConnected = isConnected)
            } else {
                AgronomySowingTab()
            }
        }
    }

    // Bluetooth Device Selection Dialog
    if (showDeviceDialog) {
        DeviceSelectionDialog(
            btManager = btManager,
            onDismiss = { showDeviceDialog = false }
        )
    }
}

@Composable
fun RoverControlTab(
    btManager: BluetoothManager,
    telemetry: com.agrobot.rover.model.RoverTelemetry,
    isConnected: Boolean
) {
    var throttleSpeed by remember { mutableStateOf(telemetry.speedPwm.toFloat()) }
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // 1. Safety Status Banner
        val stateColor = when (telemetry.state) {
            SafetyState.DISARMED -> Color.Gray
            SafetyState.IDLE -> AgroGreen
            SafetyState.MOVING_FORWARD, SafetyState.MOVING_REVERSE -> AgroCyan
            SafetyState.OBSTACLE_STOP -> AgroAmber
            SafetyState.EMERGENCY_STOP, SafetyState.FAULT -> AgroRed
            SafetyState.COMMUNICATION_LOSS -> AgroAmber
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = AgroCardBg),
            shape = RoundedCornerShape(12.dp),
            border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(stateColor, AgroCardBorder)))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("SYSTEM STATE", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
                        Text(telemetry.state.displayName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = stateColor)
                    }

                    // Arm / Disarm Toggle
                    if (telemetry.state == SafetyState.DISARMED) {
                        Button(
                            onClick = { btManager.arm() },
                            colors = ButtonDefaults.buttonColors(containerColor = AgroGreen),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("ARM ROVER", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        OutlinedButton(
                            onClick = { btManager.disarm() },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.LightGray),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("DISARM")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Divider(color = AgroCardBorder)
                Spacer(modifier = Modifier.height(10.dp))

                // Sensors Grid
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Sonar Obstacle
                    Column {
                        Text("OBSTACLE DISTANCE", fontSize = 10.sp, color = Color.Gray)
                        val distColor = if (telemetry.obstacleDistanceCm < 30.0f) AgroRed else if (telemetry.obstacleDistanceCm < 60.0f) AgroAmber else AgroGreen
                        Text(
                            "${"%.1f".format(telemetry.obstacleDistanceCm)} cm",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = distColor
                        )
                    }

                    // Pump State
                    Column {
                        Text("SPRAY PUMP", fontSize = 10.sp, color = Color.Gray)
                        Text(
                            if (telemetry.pumpActive) "ACTIVE (2.4 L/m)" else "OFF",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (telemetry.pumpActive) AgroCyan else Color.LightGray
                        )
                    }

                    // GPS Position
                    Column {
                        Text("GPS POSITION", fontSize = 10.sp, color = Color.Gray)
                        Text(
                            if (telemetry.gpsFix) telemetry.gpsCoordinates else "Searching Fix...",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (telemetry.gpsFix) AgroGreen else Color.Gray
                        )
                    }
                }

                // If obstacle stopped, show Clear / Reset button
                if (telemetry.state == SafetyState.OBSTACLE_STOP || telemetry.state == SafetyState.EMERGENCY_STOP) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = { btManager.clearFault() },
                        colors = ButtonDefaults.buttonColors(containerColor = AgroAmber),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = Color.Black)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("CLEAR FAULT & RESUME IDLE", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 2. Tactile Driving D-Pad
        Text("MANUAL TACTILE DRIVE CONTROLS", fontSize = 12.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(12.dp))

        Box(
            modifier = Modifier
                .size(240.dp)
                .clip(CircleShape)
                .background(AgroCardBg)
                .border(2.dp, AgroCardBorder, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            // Forward (Up)
            IconButton(
                onClick = { btManager.forward() },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 12.dp)
                    .size(56.dp)
                    .background(AgroGreen.copy(alpha = 0.15f), CircleShape)
            ) {
                Icon(Icons.Default.ArrowUpward, contentDescription = "Forward", tint = AgroGreen, modifier = Modifier.size(32.dp))
            }

            // Reverse (Down)
            IconButton(
                onClick = { btManager.reverse() },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 12.dp)
                    .size(56.dp)
                    .background(AgroCyan.copy(alpha = 0.15f), CircleShape)
            ) {
                Icon(Icons.Default.ArrowDownward, contentDescription = "Reverse", tint = AgroCyan, modifier = Modifier.size(32.dp))
            }

            // Left
            IconButton(
                onClick = { btManager.turnLeft() },
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = 12.dp)
                    .size(56.dp)
                    .background(AgroCyan.copy(alpha = 0.15f), CircleShape)
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Left", tint = AgroCyan, modifier = Modifier.size(32.dp))
            }

            // Right
            IconButton(
                onClick = { btManager.turnRight() },
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 12.dp)
                    .size(56.dp)
                    .background(AgroCyan.copy(alpha = 0.15f), CircleShape)
            ) {
                Icon(Icons.Default.ArrowForward, contentDescription = "Right", tint = AgroCyan, modifier = Modifier.size(32.dp))
            }

            // Center STOP button
            Button(
                onClick = { btManager.stop() },
                modifier = Modifier.size(68.dp),
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(containerColor = AgroAmber)
            ) {
                Text("STOP", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 3. Throttle Speed Slider
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = AgroCardBg),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("THROTTLE PWM SPEED", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                    Text("${throttleSpeed.toInt()} / 255", fontSize = 12.sp, color = AgroGreen, fontWeight = FontWeight.Bold)
                }
                Slider(
                    value = throttleSpeed,
                    onValueChange = {
                        throttleSpeed = it
                        btManager.setSpeed(it.toInt())
                    },
                    valueRange = 80f..255f,
                    colors = SliderDefaults.colors(
                        thumbColor = AgroGreen,
                        activeTrackColor = AgroGreen,
                        inactiveTrackColor = AgroCardBorder
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 4. Pesticide Pump Toggle Switch
        Button(
            onClick = {
                if (telemetry.pumpActive) btManager.pumpOff() else btManager.pumpOn()
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (telemetry.pumpActive) AgroCyan else AgroCardBg
            ),
            border = if (!telemetry.pumpActive) CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(AgroCyan, AgroCardBorder))) else null
        ) {
            Icon(
                Icons.Default.WaterDrop,
                contentDescription = null,
                tint = if (telemetry.pumpActive) Color.Black else AgroCyan
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                if (telemetry.pumpActive) "TOGGLE PUMP: ACTIVE (TAP TO SHUTDOWN)" else "ACTIVATE 12V SPRAY PUMP",
                color = if (telemetry.pumpActive) Color.Black else Color.White,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 5. Giant E-Stop Button
        Button(
            onClick = { btManager.emergencyStop() },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AgroRed)
        ) {
            Icon(Icons.Default.Warning, contentDescription = null, tint = Color.White)
            Spacer(modifier = Modifier.width(8.dp))
            Text("🚨 EMERGENCY STOP (LATCHED)", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
        }
    }
}

@Composable
fun AgronomySowingTab() {
    var crop by remember { mutableStateOf("Wheat") }
    var areaHa by remember { mutableStateOf("1.0") }
    var seedRateKg by remember { mutableStateOf("100.0") }
    var germinationPct by remember { mutableStateOf("90") }
    var resultText by remember { mutableStateOf<String?>(null) }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        Text("AI-ASSISTED SOWING & SEED CALCULATOR", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("Deterministic Agronomic Formulas (idea.txt Section 9)", fontSize = 11.sp, color = Color.Gray)

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = crop,
            onValueChange = { crop = it },
            label = { Text("Crop Type") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AgroGreen,
                focusedLabelColor = AgroGreen
            )
        )

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
            value = areaHa,
            onValueChange = { areaHa = it },
            label = { Text("Field Area (Hectares)") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AgroGreen,
                focusedLabelColor = AgroGreen
            )
        )

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
            value = seedRateKg,
            onValueChange = { seedRateKg = it },
            label = { Text("Recommended Seed Rate (kg / ha)") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AgroGreen,
                focusedLabelColor = AgroGreen
            )
        )

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
            value = germinationPct,
            onValueChange = { germinationPct = it },
            label = { Text("Germination Percentage (%)") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AgroGreen,
                focusedLabelColor = AgroGreen
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {
                val a = areaHa.toFloatOrNull() ?: 1.0f
                val s = seedRateKg.toFloatOrNull() ?: 100.0f
                val g = (germinationPct.toFloatOrNull() ?: 90.0f) / 100.0f
                val base = a * s
                val adjusted = base / maxOf(0.1f, g)
                val totalMeters = (a * 10000.0f) / 0.22f // 22cm row spacing
                resultText = """
                    🌾 Target Crop: $crop
                    📐 Area: $a Hectares (${(a * 10000).toInt()} m²)
                    📦 Baseline Seed Requirement: ${"%.2f".format(base)} kg
                    🌱 Germination Adjusted Requirement: ${"%.2f".format(adjusted)} kg
                    🚜 Total Linear Row Distance: ${"%.0f".format(totalMeters)} meters
                """.trimIndent()
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AgroGreen)
        ) {
            Text("CALCULATE SEED REQUIREMENTS", color = Color.Black, fontWeight = FontWeight.Bold)
        }

        if (resultText != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = AgroCardBg),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(AgroGreen, AgroCardBorder)))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("CALCULATION RESULTS", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = AgroGreen)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(resultText!!, color = Color.White, fontSize = 13.sp, lineHeight = 20.sp)
                }
            }
        }
    }
}

@SuppressLint("MissingPermission")
@Composable
fun DeviceSelectionDialog(
    btManager: BluetoothManager,
    onDismiss: () -> Unit
) {
    val devices = remember { btManager.getPairedDevices() }
    val coroutineScope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Select Paired AgroBot Bluetooth (HC-05)") },
        text = {
            if (devices.isEmpty()) {
                Text("No paired Bluetooth devices found.\nPair with HC-05 (PIN 1234) in Android Settings first.")
            } else {
                Column {
                    devices.forEach { dev ->
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    btManager.connect(dev)
                                    onDismiss()
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AgroCardBg)
                        ) {
                            Text(dev.name ?: dev.address, color = Color.White)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Close") }
        }
    )
}
