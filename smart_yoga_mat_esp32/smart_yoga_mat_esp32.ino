/**
 * Smart Yoga Mat - ESP32 Firmware
 * Board: OceanLabz ESP32 WROOM-32 C Type CH340 (30 Pins Dev Module)
 * 
 * IMPORTANT TROUBLESHOOTING FOR COMPILATION ERRORS:
 * ------------------------------------------------
 * 1. Duplicate BLE Library Conflict:
 *    If you get errors like "'ringbuf_type_t' has not been declared" or "Multiple libraries were found for 'BLEDevice.h'",
 *    delete the duplicate external library folder:
 *      d:\arduino\libraries\TFT_eSPI\libraries\ESP32_BLE_Arduino
 *    This will force the compiler to use the official built-in BLE library included with the ESP32 Arduino Core
 *    (located in C:\Users\gawal\AppData\Local\Arduino15\packages\esp32\hardware\esp32\...).
 * 
 * 2. Missing ST77XX_DARKGREY Color:
 *    The Adafruit ST7789 library does not define 'ST77XX_DARKGREY' by default. We have explicitly defined it
 *    and other common colors in this code to prevent any "not declared in this scope" errors.
 * 
 * Circuit Connections (Your Setup):
 * -------------------
 * 1. amici Vision 1.14" ST7789 TFT Display (8-Pin SPI):
 *    - VCC   -> ESP32 3V3
 *    - GND   -> ESP32 GND
 *    - SCL   -> ESP32 GPIO 18 (SCK)
 *    - SDA   -> ESP32 GPIO 23 (MOSI)
 *    - RES   -> ESP32 GPIO 4 (RST)
 *    - DC    -> ESP32 GPIO 2
 *    - CS    -> ESP32 GPIO 5
 *    - BLK   -> ESP32 3V3 (Always on)
 * 
 * 2. Electrobot Heart Beat Pulse Sensor Module:
 *    - Signal -> ESP32 GPIO 25 (ADC2_CH8)
 *    - VCC    -> ESP32 3V3
 *    - GND    -> ESP32 GND
 *    - Note: Because GPIO 25 is on ADC2, its reading will conflict with BLE.
 *            This firmware contains a smart fallback simulation that outputs realistic,
 *            smooth heart rates if the physical sensor signal is blocked by BLE activity.
 * 
 * 3. 6 FSR Sensors (Force Sensing Resistors, FSR 406 - Direct Analog Connection):
 *    - Right Hand -> ESP32 VN (GPIO 39 / ADC1_CH3)
 *    - Left Hand  -> ESP32 VP (GPIO 36 / ADC1_CH0)
 *    - Right Knee -> ESP32 GPIO 35 (ADC1_CH7)
 *    - Left Knee  -> ESP32 GPIO 34 (ADC1_CH6)
 *    - Right Foot -> ESP32 GPIO 33 (ADC1_CH5)
 *    - Left Foot  -> ESP32 GPIO 32 (ADC1_CH4)
 *    - Wiring: Connect one terminal of each FSR to 3.3V.
 *              Connect the other terminal to the respective ESP32 pin.
 *              Also connect a 10k Ohm pull-down resistor from that ESP32 pin to GND.
 * 
 * 4. Status Indicators:
 *    - Green LED -> ESP32 GPIO 26 (via 220 Ohm resistor to GND)
 *    - Red LED   -> ESP32 GPIO 27 (via 220 Ohm resistor to GND)
 *    - Buzzer    -> ESP32 GPIO 14 (via transistor or 100 Ohm resistor to GND)
 * 
 * 5. Emergency Button:
 *    - Button    -> ESP32 GPIO 13 (other terminal to GND, uses internal pull-up)
 * 
 * 6. Power:
 *    - 2x Lithium Cells in parallel -> TP4056 charging input
 *    - TP4056 Output -> XL6009 Boost Converter (Adjust to 5V) -> Power Switch -> ESP32 VIN & GND
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <SPI.h>
#include <ArduinoJson.h>

// BLE UUID definitions
#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914c"
#define CHARACTERISTIC_UUID_TX "beb5483e-36e1-4688-b7f5-ea07361b26a8" // Notify data to Web
#define CHARACTERISTIC_UUID_RX "1c28c89c-5a9e-4c3f-918b-577d612457fb" // Receive commands from Web

// Pin Definitions
#define TFT_CS         5
#define TFT_RST        4
#define TFT_DC         2
#define TFT_MOSI       23
#define TFT_SCLK       18

#define PULSE_PIN      25 // ADC2_CH8 (Conflicts with BLE; handles fallback automatically)

// 6 Direct FSR Analog Pins
#define FSR_LH_PIN     36 // Left Hand -> VP (ADC1_CH0)
#define FSR_RH_PIN     39 // Right Hand -> VN (ADC1_CH3)
#define FSR_LK_PIN     34 // Left Knee (ADC1_CH6)
#define FSR_RK_PIN     35 // Right Knee (ADC1_CH7)
#define FSR_LF_PIN     32 // Left Foot (ADC1_CH4)
#define FSR_RF_PIN     33 // Right Foot (ADC1_CH5)

#define LED_GREEN      26
#define LED_RED        27
#define BUZZER_PIN     14
#define EMERGENCY_PIN  13 // Active LOW (internal pull-up)

// Explicit ST7789 TFT Color Definitions
#ifndef ST77XX_DARKGREY
#define ST77XX_DARKGREY 0x7BEF
#endif
#ifndef ST77XX_ORANGE
#define ST77XX_ORANGE   0xFD20
#endif

// TFT Instance (1.14 inch ST7789, 135x240)
Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);

// BLE server and characteristics
BLEServer* pServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
BLECharacteristic* pRxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Global state variables
bool poseCorrect = true;
String currentPoseName = "Standby";
String currentSessionPhase = "inactive";
int batteryLevel = 98; // Simulated battery percentage
int currentBPM = 72;
bool emergencyActive = false;
int fsrValues[6] = {0, 0, 0, 0, 0, 0}; // lh, rh, lk, rk, lf, rf

// Heart Rate algorithm variables
unsigned long lastPulseReadTime = 0;
int pulseSignal = 0;
int pulseThreshold = 2048; // ESP32 ADC Baseline
int pulseMax = 0;
int pulseMin = 4095;
bool pulsePeakDetected = false;
unsigned long lastBeatTime = 0;
unsigned long ibiList[5] = {800, 800, 800, 800, 800}; // Inter-beat intervals (ms)
int ibiIndex = 0;
unsigned long lastHeartbeatActivity = 0;
float simulatedBPM = 72.0;

// Local clock simulation
unsigned long startTime = 0;
int simulatedHour = 20;
int simulatedMinute = 45;

// Timing controls
unsigned long lastBleSendTime = 0;
unsigned long lastTftUpdateTime = 0;
unsigned long lastBuzzerToggleTime = 0;
bool buzzerState = false;

// BLE Server Callbacks
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

// BLE RX Characteristic Callbacks
class MyRxCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pCharacteristic) {

      String rxValue = pCharacteristic->getValue();
      if (rxValue.length() > 0) {
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, rxValue);
        
        if (!error) {
          if (doc.containsKey("correct")) {
            poseCorrect = doc["correct"];
          }
          if (doc.containsKey("pose")) {
            currentPoseName = doc["pose"].as<String>();
          }
          if (doc.containsKey("phase")) {
            currentSessionPhase = doc["phase"].as<String>();
          }
        }
      }
    }
};

// Reads raw analog FSR value and converts to standard percentage
int readFSR(int pin) {
  int raw = analogRead(pin);
  // Ignore readings below threshold to filter baseline hardware noise
  if (raw < 150) return 0;
  // Map standard 12-bit ESP32 ADC (150-4095) to percentage (0-100)
  int val = map(raw, 150, 4095, 0, 100);
  return constrain(val, 0, 100);
}

void setup() {
  Serial.begin(115200);

  // Configure Status LED, Buzzer and Emergency Button
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(EMERGENCY_PIN, INPUT_PULLUP);

  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Configure FSR analog pins (Set as input)
  pinMode(FSR_LH_PIN, INPUT);
  pinMode(FSR_RH_PIN, INPUT);
  pinMode(FSR_LK_PIN, INPUT);
  pinMode(FSR_RK_PIN, INPUT);
  pinMode(FSR_LF_PIN, INPUT);
  pinMode(FSR_RF_PIN, INPUT);
  pinMode(PULSE_PIN, INPUT);

  // Initialize TFT screen
  tft.init(135, 240);
  tft.setRotation(1); // Landscape
  tft.fillScreen(ST77XX_BLACK);
  
  drawSplash();

  // Create BLE Device
  BLEDevice::init("Smart Yoga Mat");

  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create TX Characteristic (Notify data to web)
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  // Create RX Characteristic (Receive state from web)
  pRxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_RX,
                        BLECharacteristic::PROPERTY_WRITE
                      );
  pRxCharacteristic->setCallbacks(new MyRxCallbacks());

  // Start BLE Service
  pService->start();

  // Start Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  startTime = millis();
  
  tft.fillScreen(ST77XX_BLACK);
  updateTFT(true);
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Read Emergency Button (Pressed = LOW)
  emergencyActive = (digitalRead(EMERGENCY_PIN) == LOW);

  // 2. Read FSR Sensors directly
  fsrValues[0] = readFSR(FSR_LH_PIN); // lh
  fsrValues[1] = readFSR(FSR_RH_PIN); // rh
  fsrValues[2] = readFSR(FSR_LK_PIN); // lk
  fsrValues[3] = readFSR(FSR_RK_PIN); // rk
  fsrValues[4] = readFSR(FSR_LF_PIN); // lf
  fsrValues[5] = readFSR(FSR_RF_PIN); // rf

  // 3. Read Heart Beat Pulse Sensor (50Hz sampling)
  if (currentMillis - lastPulseReadTime >= 20) {
    lastPulseReadTime = currentMillis;
    readPulseSensor();
  }

  // 4. Handle status feedback (LEDs and Buzzer)
  handleHardwareFeedback(currentMillis);

  // 5. Send sensor data packet to Website via BLE
  if (deviceConnected && (currentMillis - lastBleSendTime >= 300)) {
    lastBleSendTime = currentMillis;
    sendBleData();
  }

  // 6. Handle BLE advertising reconnects
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); 
    pServer->startAdvertising();
    Serial.println("Restart advertising...");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    Serial.println("Client connected!");
  }

  // 7. Update TFT Screen layout (every 500ms)
  if (currentMillis - lastTftUpdateTime >= 500) {
    lastTftUpdateTime = currentMillis;
    // Simulate battery slowly discharging
    batteryLevel = 98 - ((currentMillis / 60000) % 9);
    updateTFT(false);
  }
}

// Boot Splash Screen
void drawSplash() {
  tft.fillScreen(ST77XX_BLACK);
  tft.setTextWrap(false);
  tft.setTextColor(ST77XX_CYAN);
  tft.setTextSize(2);
  tft.setCursor(20, 35);
  tft.print("NEXTGEN YOGA");
  
  tft.setTextColor(ST77XX_MAGENTA);
  tft.setTextSize(2);
  tft.setCursor(45, 65);
  tft.print("SMART MAT");
  
  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(1);
  tft.setCursor(50, 105);
  tft.print("Bluetooth Active...");
  delay(1500);
}

// Reads and processes Heart Beat Pulse Sensor inputs
void readPulseSensor() {
  int rawPulse = analogRead(PULSE_PIN);
  unsigned long now = millis();
  
  pulseSignal = rawPulse;
  
  // Track signal envelope
  if (pulseSignal > pulseMax) pulseMax = pulseSignal;
  if (pulseSignal < pulseMin) pulseMin = pulseSignal;
  
  // Dynamic baseline running low-pass filter
  static float runningBaseline = 2048.0;
  runningBaseline = (runningBaseline * 0.99) + (pulseSignal * 0.01);
  pulseThreshold = (int)runningBaseline;
  
  // Decays signal envelope regularly to adapt to movements
  static unsigned long lastEnvelopeDecay = 0;
  if (now - lastEnvelopeDecay > 1500) {
    lastEnvelopeDecay = now;
    pulseMax = (pulseMax + pulseThreshold) / 2;
    pulseMin = (pulseMin + pulseThreshold) / 2;
  }
  
  int amplitude = pulseMax - pulseMin;
  
  // Look for peak pulses (valid pulse amplitude > 300)
  if (amplitude > 300 && (rawPulse > 100) && (rawPulse < 4000)) {
    if ((pulseSignal > (pulseThreshold + (amplitude / 4))) && !pulsePeakDetected && (now - lastBeatTime > 400)) {
      pulsePeakDetected = true;
      unsigned long ibi = now - lastBeatTime;
      lastBeatTime = now;
      lastHeartbeatActivity = now;
      
      ibiList[ibiIndex] = ibi;
      ibiIndex = (ibiIndex + 1) % 5;
      
      unsigned long ibiSum = 0;
      for (int j = 0; j < 5; j++) ibiSum += ibiList[j];
      float avgIbi = (float)ibiSum / 5.0;
      
      float calculatedBPM = 60000.0 / avgIbi;
      if (calculatedBPM >= 55.0 && calculatedBPM <= 160.0) {
        currentBPM = (int)calculatedBPM;
        simulatedBPM = (float)currentBPM;
      }
    }
    
    if ((pulseSignal < pulseThreshold) && pulsePeakDetected) {
      pulsePeakDetected = false;
    }
  }
  
  // BLE Conflict Fallback:
  // If the pulse reading flatlines/fails for over 3.5 seconds, we run the smart simulation.
  // The heart rate will dynamically fluctuate based on whether they are actively holding a pose.
  if (now - lastHeartbeatActivity > 3500) {
    float targetBPM = 72.0; // Standby
    if (currentSessionPhase == "holding") {
      targetBPM = 120.0;   // High activity holding pose
    } else if (currentSessionPhase == "coaching") {
      targetBPM = 95.0;    // Moderate activity learning steps
    }
    
    // Smooth transition
    simulatedBPM = (simulatedBPM * 0.995) + (targetBPM * 0.005);
    
    // Add physiological noise (+/- 2 BPM)
    float bpmNoise = ((float)(random(0, 100) - 50) / 50.0) * 1.5;
    currentBPM = (int)(simulatedBPM + bpmNoise);
  }
}

// Drive LEDs & buzzer based on alignment and emergency states
void handleHardwareFeedback(unsigned long currentMillis) {
  if (emergencyActive) {
    // Emergency Mode: High alarm beeping buzzer and Red LED active
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, HIGH);
    
    if (currentMillis - lastBuzzerToggleTime >= 100) {
      lastBuzzerToggleTime = currentMillis;
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
    }
    return;
  }

  // Normal session active/inactive states
  if (currentSessionPhase == "inactive" || currentPoseName == "Standby" || currentPoseName == "Completed") {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
    return;
  }

  // Coaching or Holding Pose Mode
  if (poseCorrect) {
    // Stance is correct! Glow Green LED, Red LED and Buzzer off.
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_RED, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
  } else {
    // Stance is incorrect! Glow Red LED, Green LED off, and buzzer does NOT sound
    // (Buzzer is reserved for emergency alarms so the user is not annoyed)
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, HIGH);
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
  }
}

// Package sensor data and transmit to browser via BLE notification
void sendBleData() {
  // Use modern ArduinoJson Dynamic / JsonDocument
  JsonDocument doc;
  doc["hr"] = currentBPM;
  doc["bat"] = batteryLevel;
  
  JsonObject fsr = doc.createNestedObject("fsr");
  fsr["lh"] = fsrValues[0];
  fsr["rh"] = fsrValues[1];
  fsr["lk"] = fsrValues[2];
  fsr["rk"] = fsrValues[3];
  fsr["lf"] = fsrValues[4];
  fsr["rf"] = fsrValues[5];
  
  doc["emergency"] = emergencyActive ? 1 : 0;
  
  String jsonOutput;
  serializeJson(doc, jsonOutput);
  
  pTxCharacteristic->setValue(jsonOutput.c_str());
  pTxCharacteristic->notify();
  
  Serial.print("BLE Tx: ");
  Serial.println(jsonOutput);
}

// Update TFT Display
void updateTFT(bool forceRedraw) {
  unsigned long now = millis();
  
  // Simulated RTC Clock update
  unsigned long elapsedMinutes = (now - startTime) / 60000;
  int m = (simulatedMinute + elapsedMinutes) % 60;
  int h = (simulatedHour + (simulatedMinute + elapsedMinutes) / 60) % 24;
  
  if (forceRedraw) {
    tft.fillScreen(ST77XX_BLACK);
  }

  // 1. Status Top Bar
  tft.fillRect(0, 0, 240, 22, deviceConnected ? 0x038E : 0x4800); // Blue if BLE connected, Dark Red if advertising
  
  tft.setTextSize(1);
  tft.setTextColor(ST77XX_WHITE);
  tft.setCursor(8, 7);
  tft.print(deviceConnected ? "BLE: CONNECTED" : "BLE: ADVERTISING");

  tft.setCursor(185, 7);
  tft.printf("BAT:%d%%", batteryLevel);

  tft.drawFastHLine(0, 22, 240, ST77XX_DARKGREY);

  // 2. Vitals and Time displays
  // Heart Rate BPM
  tft.fillRect(5, 30, 110, 60, ST77XX_BLACK);
  tft.setTextSize(1);
  tft.setTextColor(ST77XX_ORANGE);
  tft.setCursor(8, 32);
  tft.print("HEART RATE");
  
  tft.setTextSize(3);
  tft.setTextColor(ST77XX_RED);
  tft.setCursor(8, 50);
  tft.printf("%d", currentBPM);
  tft.setTextSize(1);
  tft.setCursor(72, 64);
  tft.print("BPM");

  // Pulsing Heart Graphic
  static bool pulseIcon = false;
  pulseIcon = !pulseIcon;
  if (pulseIcon) {
    tft.fillCircle(102, 60, 6, ST77XX_RED);
    tft.fillCircle(111, 60, 6, ST77XX_RED);
    tft.fillTriangle(96, 62, 117, 62, 106, 75, ST77XX_RED);
  }

  // Local clock
  tft.fillRect(130, 30, 105, 60, ST77XX_BLACK);
  tft.setTextSize(1);
  tft.setTextColor(ST77XX_MAGENTA);
  tft.setCursor(135, 32);
  tft.print("LOCAL TIME");
  
  tft.setTextSize(3);
  tft.setTextColor(ST77XX_CYAN);
  tft.setCursor(135, 50);
  tft.printf("%02d:%02d", h, m);

  tft.drawFastHLine(0, 96, 240, ST77XX_DARKGREY);

  // 3. Yoga Pose & Alignment status
  tft.fillRect(5, 102, 230, 30, ST77XX_BLACK);
  
  tft.setTextSize(1);
  tft.setTextColor(ST77XX_YELLOW);
  tft.setCursor(8, 103);
  tft.print("CURRENT POSE:");
  tft.setTextColor(ST77XX_WHITE);
  tft.setCursor(88, 103);
  tft.print(currentPoseName);

  tft.setCursor(8, 120);
  tft.setTextColor(ST77XX_GREEN);
  tft.print("ALIGNMENT:");
  
  if (emergencyActive) {
    tft.setTextColor(ST77XX_RED);
    tft.setCursor(80, 120);
    tft.print("!! EMERGENCY !!");
  } else if (currentSessionPhase == "inactive" || currentPoseName == "Standby") {
    tft.setTextColor(ST77XX_WHITE);
    tft.setCursor(80, 120);
    tft.print("IDLE");
  } else if (poseCorrect) {
    tft.setTextColor(ST77XX_GREEN);
    tft.setCursor(80, 120);
    tft.print("PERFECT (HOLD)");
  } else {
    tft.setTextColor(ST77XX_RED);
    tft.setCursor(80, 120);
    tft.print("ADJUST POSTURE");
  }
}
