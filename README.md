# 🧘‍♂️ NextGen Smart AI Yoga Mat 🚀

Welcome to the **NextGen Smart AI Yoga Mat** repository! This project blends ancient wellness traditions with modern technology, integrating a hardware-enabled smart mat (ESP32 + sensors) with a premium React web dashboard to deliver real-time posture correction, AI-guided training, and holistic health insights.

---

## 🌟 Project Overview

Say goodbye to poor form and unguided routines. The **NextGen Smart AI Yoga Mat** features a network of pressure-sensing resistors (FSRs) and biometric sensors built directly into the mat. Combined with our **AI Yoga Guru** (powered by Google Gemini), it corrects your alignment, guides you through custom routines, and tracks your wellness journey over time.

---

## 🛠 Key Features

### 🤖 AI Yoga Guru & Real-Time Posture Correction
- **Real-Time Posture Feedback**: Interactive voice and visual guidance during your poses.
- **Alignment Scoring**: Receive instant accuracy metrics (e.g., *98% Perfect Form*) based on real pressure distributions.
- **AI Instructor Cues**: Customized recommendations to shift your weight or adjust your limbs.

### 🏃‍♂️ Start Practice (Interactive Yoga Sessions)
- **Guided Poses**: Step-by-step walkthroughs of common poses (e.g., *Warrior Pose*, *Tree Pose*, *Cobra Pose*).
- **Interactive Timer & Progress Bar**: Tracks hold times, transitions, and sets.
- **Confetti Celebration**: Immediate reward cues upon successfully completing poses.

### 📊 Smart Dashboard
- **Session History**: Logs active sessions, calorie burn, and duration.
- **Biometric Trackers**: Monitor real-time heart rate, daily steps, sleep quality, and active minutes.
- **Interactive Weight Tracker**: Keep track of body weight changes with visually rich UI indicators.

### 🥗 AI Diet Planner
- **Customized Meal Planning**: Dynamically generates tailored diet structures and caloric goals based on your height, weight, activity levels, and goals.
- **Macro Breakdown**: Visually tracking Protein, Carbs, Fats, and total calories.

### 👥 Group Virtual Sessions
- **Live Sync**: Connect with friends and join live group yoga classes.
- **Synced Mats**: Share progress and comparison metrics in real-time.

---

## 💻 Tech Stack

### Web Application
- **Core**: React 19, Vite (Fast HMR)
- **Animations**: Framer Motion (premium micro-interactions, smooth transitions)
- **Icons**: Lucide React
- **Authentication & Database**: Firebase (Auth, Firestore, Cloud Storage)
- **AI Engine**: `@google/generative-ai` (Google Gemini API Integration)
- **Styling**: Vanilla CSS (Premium dark mode, glassmorphism, responsive grid layouts)

### Hardware & IoT
- **Microcontroller**: OceanLabz ESP32 WROOM-32 C Type CH340 (30 Pins Dev Module)
- **Display**: amici Vision 1.14" ST7789 TFT Display (8-Pin SPI)
- **Biometrics**: Electrobot Heart Beat Pulse Sensor Module
- **Force Sensors**: 6x FSR 406 Force Sensing Resistors (Analog Connections)
- **Indicators**: High-brightness Red/Green LEDs & Piezo Buzzer
- **Power**: Dual 18650 Lithium cells with TP4056 charging + XL6009 Boost Converter (Adjusted to 5V)
- **Connectivity**: Bluetooth Low Energy (BLE) for high-speed local data transmission

---

## 🔌 Hardware Configuration (ESP32 Pinout)

If you are setting up the physical smart mat, wire your ESP32 dev board according to this schematic:

| Component | ESP32 Pin | Details / Wiring |
| :--- | :--- | :--- |
| **ST7789 TFT SCL** | GPIO 18 (SCK) | SPI Clock |
| **ST7789 TFT SDA** | GPIO 23 (MOSI)| SPI Data |
| **ST7789 TFT RES** | GPIO 4 (RST)  | Reset Pin |
| **ST7789 TFT DC**  | GPIO 2        | Data/Command Selection |
| **ST7789 TFT CS**  | GPIO 5        | Chip Select |
| **Pulse Sensor**   | GPIO 25       | ADC2_CH8 (Simulated fallback handling when BLE is active) |
| **FSR Left Hand**  | GPIO 36       | VP / ADC1_CH0 (with 10k Ohm pull-down) |
| **FSR Right Hand** | GPIO 39       | VN / ADC1_CH3 (with 10k Ohm pull-down) |
| **FSR Left Knee**  | GPIO 34       | ADC1_CH6 (with 10k Ohm pull-down) |
| **FSR Right Knee** | GPIO 35       | ADC1_CH7 (with 10k Ohm pull-down) |
| **FSR Left Foot**  | GPIO 32       | ADC1_CH4 (with 10k Ohm pull-down) |
| **FSR Right Foot** | GPIO 33       | ADC1_CH5 (with 10k Ohm pull-down) |
| **Green LED**      | GPIO 26       | Staged/Perfect pose indicator |
| **Red LED**        | GPIO 27       | Error/Incorrect form indicator |
| **Buzzer**         | GPIO 14       | Audio alerts |
| **Emergency Button**| GPIO 13      | Active LOW (uses internal pull-up) |

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed on your system.

### 2. Configure Environment Variables
Create a `.env` file in the root of the project directory and paste your configuration:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_firebase_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id_here
```

### 3. Installation
Install the project dependencies:
```bash
npm install
```

### 4. Run Development Server
Start the local Vite dev server:
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

---

## 🤖 Firmware Setup (ESP32)

1. Open Arduino IDE.
2. Install the following libraries via the Library Manager:
   - `Adafruit GFX Library`
   - `Adafruit ST7735 and ST7789 Library`
   - `ArduinoJson`
3. Load the sketch from `smart_yoga_mat_esp32/smart_yoga_mat_esp32.ino`.
4. Select board **ESP32 Dev Module** and the correct COM Port.
5. Compile and upload!

---

## 👥 Meet the Founders

We are dedicated to combining digital intelligence with wellness practices.
- **Khushal Gawali** - IoT & Machine Learning Engineer (gawalikhushal26@gmail.com | [LinkedIn](https://www.linkedin.com/in/gawalikhushal))
- **Aboli More** - Researcher
- **Devraj Bagul** - Software Engineer
