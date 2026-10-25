# 📱 AgroBot Android Mobile Application

The **AgroBot Android Application** is the farmer's handheld control centre for the AgroBot Agricultural Rover, designed and architected in strict alignment with **`idea.txt` (Section 6 & Section 8)**.

---

## 🌟 Key Capabilities
- **Direct Bluetooth HC-05 Connection**: Uses standard RFCOMM SPP socket (`00001101-0000-1000-8000-00805F9B34FB`) to stream commands and telemetry without requiring an internet connection in rural fields.
- **Tactile Drive Pad**: Responsive Forward, Reverse, Left, Right, Stop, and PWM throttle slider (80–255).
- **Physical Safety Interlocks**:
  - Live Sonar Obstacle Alert: auto-halts and alerts when obstacle distance < 30 cm.
  - Latched Emergency Stop (E-Stop): cuts motor driver outputs and relay immediately.
  - Heartbeat Watchdog: pings every 2.5s to keep the Arduino 5.0s failsafe timer active.
  - Clear Fault recovery button to resume operation safely after an obstacle is cleared.
- **12V Spray Pump Control**: Toggle relay spray activation with safety interlocks (preventing spraying if stopped or disarmed).
- **AI Sowing & Seed Estimation**: Implements the deterministic agronomic calculation formulas from `idea.txt` Section 9 ($M = \text{Area} \times \text{SeedRate} / \text{Germination\%}$).

---

## 🚀 How to Run in Android Studio

1. **Prerequisites**:
   - [Android Studio Iguana or newer](https://developer.android.com/studio)
   - Android SDK 34 (Android 14) and Android Device or Emulator with Bluetooth.

2. **Open the Project**:
   - Open Android Studio.
   - Click **Open** and select the `/android` folder inside this repository:
     ```
     /Users/lcpatne/Downloads/Agrobot-Pratibimb-Shishukunj-master/android
     ```

3. **Pair HC-05 on your Phone**:
   - Go to your Android phone's **Settings > Bluetooth**.
   - Scan and tap **HC-05**.
   - Enter PIN (typically `1234` or `0000`).

4. **Build and Run**:
   - Connect your phone via USB with USB Debugging enabled (or use Wireless Debugging).
   - Press **Run ▶️** in Android Studio.
   - Tap **Connect HC-05** in the app header and choose your paired HC-05 module.
   - Tap **ARM ROVER** and drive with the tactile pad!

---

## ⚡ Instant Alternative: Mobile Web Controller
If you want to control the rover from your phone **immediately without installing Android Studio**:
1. Make sure your computer running the AgroBot dashboard is on the same Wi-Fi network as your phone.
2. Open Chrome on your phone and go to:
   ```
   http://<YOUR_COMPUTER_LOCAL_IP>:8080/mobile.html
   ```
3. You get the exact same tactile driving pad, live sonar radar, and pump control directly in your mobile browser!
