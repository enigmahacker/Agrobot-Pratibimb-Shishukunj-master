package com.agrobot.rover

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import com.agrobot.rover.bluetooth.BluetoothManager
import com.agrobot.rover.ui.DashboardScreen

class MainActivity : ComponentActivity() {

    private lateinit var bluetoothManager: BluetoothManager

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        // Permissions granted callback
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        bluetoothManager = BluetoothManager(this)
        requestRequiredPermissions()

        setContent {
            DashboardScreen(btManager = bluetoothManager)
        }
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
        } else {
            permissions.add(Manifest.permission.BLUETOOTH)
            permissions.add(Manifest.permission.BLUETOOTH_ADMIN)
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        permissionLauncher.launch(permissions.toTypedArray())
    }

    override fun onDestroy() {
        super.onDestroy()
        bluetoothManager.disconnect()
    }
}
