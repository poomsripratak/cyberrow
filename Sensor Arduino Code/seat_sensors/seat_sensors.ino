// -------------------- Seat Sensors --------------------

#include <WiFi.h>
#include <esp_now.h>
#include "esp_wifi.h"
#include <HX711_ADC.h>

// -------------------- MASTER MAC --------------------
uint8_t masterMAC[] = {0x24, 0x6F, 0x28, 0x96, 0x4B, 0x24};

// -------------------- Packet --------------------
typedef struct __attribute__((packed)) {
  uint8_t senderID;
  float d[12];
} ImuPacket;

ImuPacket pkt;

// -------------------- Status --------------------
volatile uint32_t sendCount = 0;
volatile bool lastSendOk = false;

// -------------------- Timing --------------------
const unsigned long SEND_MS = 13; // ~76.9 Hz
unsigned long lastSend = 0;

// --- PIN CONFIGURATION (UPDATED) ---
const int HX711_sck = 14; // Shared Clock
const int DT_FL = 18; // Front-Left
const int DT_FR = 19; // Front-Right (Note: This is also Serial TX)
const int DT_RL = 27; // Rear-Left
const int DT_RR = 5;  // Rear-Right

// --- CONSTRUCTORS ---
HX711_ADC LC_FL(DT_FL, HX711_sck);
HX711_ADC LC_FR(DT_FR, HX711_sck);
HX711_ADC LC_RL(DT_RL, HX711_sck);
HX711_ADC LC_RR(DT_RR, HX711_sck);

// --- USER SETTINGS ---
const float cal_FL = 42.93;
const float cal_FR = 45.27;
const float cal_RL = 42.53;
const float cal_RR = 45.05;

unsigned long t = 0;
bool showValues = false; // Starts in Quiet Mode

// -------------------- Send callback --------------------
void onSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
  lastSendOk = (status == ESP_NOW_SEND_SUCCESS);
}

void setup() {
  Serial.begin(460800);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println(" 4-CORNER SEAT MONITORING SYSTEM");
  Serial.println("==================================================");
  Serial.println("INSTRUCTIONS:");
  Serial.println("1. Ensure the plate is EMPTY.");
  Serial.println("2. Send 's' to START/STOP the data stream.");
  Serial.println("3. Send 't' to TARE (Zero) at any time.");
  Serial.println("==================================================");
  Serial.println(">> WAITING FOR COMMAND...");

  LC_FL.begin();
  LC_FR.begin();
  LC_RL.begin();
  LC_RR.begin();

  // Apply your unique factors
  LC_FL.setCalFactor(cal_FL);
  LC_FR.setCalFactor(cal_FR);
  LC_RL.setCalFactor(cal_RL);
  LC_RR.setCalFactor(cal_RR);

  // Keep output positive
  LC_FL.setReverseOutput();
  LC_FR.setReverseOutput();
  LC_RL.setReverseOutput();
  LC_RR.setReverseOutput();

  // Auto-Tare the plate weight
  unsigned long stabilizingtime = 3000;
  LC_FL.start(stabilizingtime, true);
  LC_FR.start(stabilizingtime, true);
  LC_RL.start(stabilizingtime, true);
  LC_RR.start(stabilizingtime, true);

  // -------------------- ESP-NOW setup --------------------
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  esp_wifi_set_ps(WIFI_PS_NONE);

  Serial.print("SEAT MAC: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init FAILED");
    while (true) delay(1000);
  }

  esp_now_register_send_cb(onSent);

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, masterMAC, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Add peer FAILED");
    while (true) delay(1000);
  }

  pkt.senderID = 4;
  for (int i = 0; i < 12; i++) pkt.d[i] = 0.0f;
}

void loop() {
  static boolean newDataReady = 0;

  // Background updates for all sensors
  if (LC_FL.update()) newDataReady = true;
  LC_FR.update();
  LC_RL.update();
  LC_RR.update();

  // -------------------- ESP-NOW send at ~75 Hz --------------------
  unsigned long now = millis();
  if (now - lastSend >= SEND_MS) {
    lastSend = now;

    float fl_send = LC_FL.getData();
    float fr_send = LC_FR.getData();
    float rl_send = LC_RL.getData();
    float rr_send = LC_RR.getData();

    if (fl_send < 0) fl_send = 0;
    if (fr_send < 0) fr_send = 0;
    if (rl_send < 0) rl_send = 0;
    if (rr_send < 0) rr_send = 0;

    float top_send = fl_send + fr_send;
    float bottom_send = rl_send + rr_send;
    float left_send = fl_send + rl_send;
    float right_send = fr_send + rr_send;
    float total_send = fl_send + fr_send + rl_send + rr_send;

    pkt.d[0] = top_send;
    pkt.d[1] = bottom_send;
    pkt.d[2] = left_send;
    pkt.d[3] = right_send;
    pkt.d[4] = total_send;
    pkt.d[5] = 0.0f;
    pkt.d[6] = 0.0f;
    pkt.d[7] = 0.0f;
    pkt.d[8] = 0.0f;
    pkt.d[9] = 0.0f;
    pkt.d[10] = 0.0f;
    pkt.d[11] = 0.0f;

    esp_now_send(masterMAC, (uint8_t*)&pkt, sizeof(pkt));
    sendCount++;
  }

  // Data Display Logic
  if (newDataReady && showValues) {
    if (millis() > t + 500) { // Print every 0.5 seconds
      float fl = LC_FL.getData();
      float fr = LC_FR.getData();
      float rl = LC_RL.getData();
      float rr = LC_RR.getData();

      // Guard against negative drift (lever effects)
      if (fl < 0) fl = 0;
      if (fr < 0) fr = 0;
      if (rl < 0) rl = 0;
      if (rr < 0) rr = 0;

      float totalWeight = fl + fr + rl + rr;

      // Threshold: If weight is < 500g, show Empty
      if (totalWeight < 500.0) {
        Serial.println("Status: Empty/Standby");
      } else {
        // Calculate Percentages
        float weightFront = fl + fr;
        float weightBack = rl + rr;
        float weightLeft = fl + rl;
        float weightRight = fr + rr;

        float frontPct = (weightFront / totalWeight) * 100.0;
        float leftPct = (weightLeft / totalWeight) * 100.0;

        // Print Output
        Serial.print("TOTAL WEIGHT: ");
        Serial.print(totalWeight / 1000.0, 2);
        Serial.println(" kg");

        Serial.print("POSITION: ");
        if (frontPct > 60) Serial.print("FRONT-");
        else if (frontPct < 40) Serial.print("REAR-");
        else Serial.print("MID-");

        if (leftPct > 60) Serial.println("LEFT");
        else if (leftPct < 40) Serial.println("RIGHT");
        else Serial.println("CENTER");

        Serial.print("[ F: ");
        Serial.print(frontPct, 0);
        Serial.print("% | ");
        Serial.print("B: ");
        Serial.print(100 - frontPct, 0);
        Serial.print("% ]   ");
        Serial.print("[ L: ");
        Serial.print(leftPct, 0);
        Serial.print("% | ");
        Serial.print("R: ");
        Serial.print(100 - leftPct, 0);
        Serial.println("% ]");
        Serial.print("[ESP-NOW pkts: ");
        Serial.print(sendCount);
        Serial.print(" | last: ");
        Serial.print(lastSendOk ? "OK" : "FAIL");
        Serial.println("]");
        Serial.println("-------------------------------------------------");
      }
      newDataReady = 0;
      t = millis();
    }
  }

  // Serial Commands
  if (Serial.available() > 0) {
    char inByte = Serial.read();

    // START/STOP TOGGLE
    if (inByte == 's') {
      showValues = !showValues;
      if (showValues) Serial.println("\n[DATA STREAM: ON]");
      else Serial.println("\n[DATA STREAM: OFF]");
    }

    // TARE
    if (inByte == 't') {
      Serial.println("\n[TARE] Zeroing all sensors...");
      LC_FL.tareNoDelay();
      LC_FR.tareNoDelay();
      LC_RL.tareNoDelay();
      LC_RR.tareNoDelay();
    }
  }
}