# Abhigyan (अभिज्ञान)
**Offline-First Edge AI Facial Recognition & Liveness Detection System**
*Architected by Pratyaksh and Sanskar*

Abhigyan (Sanskrit for "Identification") is a mobile-based secure facial recognition system designed specifically for extreme remote environments. Built for Hackathon 7.0, it performs instantaneous biometric verification and 3D liveness detection without requiring an active internet connection.

## 🎯 The Challenge
**Hackathon 7.0 Problem Statement:** Develop a mobile-based secure offline facial recognition and liveness detection system for remote locations.

## ✨ Key Capabilities

- **100% Offline Edge Inference:** Facial mathematics (128D tensor extraction) are calculated directly on the device CPU using a lightweight `TinyFaceDetector` model (~4MB footprint).
- **Sub-Second Speed:** By optimizing the computer vision input resolution to 160px and implementing deterministic algorithmic fallbacks, biometric processing completes in `< 0.1s` even on low-tier hardware.
- **3D Liveness Anti-Spoofing:** Defeats static photo spoofing by analyzing physical yaw movements (Turn Left, Turn Right) and expressions (Smile) offline.
- **Zero-Storage Privacy Architecture:** Abhigyan holds the camera frame in RAM, extracts the mathematical embedding, and immediately flushes the photo. Raw images are never saved to disk.
- **Cloud-Native Master Sync:** Auth logs are cryptographically stored in local SQLite. Once network connectivity is restored, the Supervisor can trigger a master sync that POSTs logs to an AWS API Gateway, aggressively purging the local cache upon a `200 OK` response.

## 🛠 Tech Stack
- **Framework:** React Native / Expo (100% Cross-platform Android & iOS)
- **Computer Vision:** TensorFlow.js, face-api.js
- **Storage:** React Native AsyncStorage / SQLite
- **UI System:** "Aurora Glass" Flexbox Design System

## 🚀 Getting Started

### Installation
1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Metro bundler:
   ```bash
   npx expo start -c
   ```
4. Scan the QR code with the Expo Go app on your phone.

### Build (Android APK)
To compile the raw native Android binary:
```bash
cd mobile/android
./gradlew assembleRelease
```
The output will be generated at: `mobile/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`
