#include <WiFi.h>
#include <esp_now.h>
#include "esp_wifi.h"
#include <HX711_ADC.h>

// ==================================================
//        DUAL FOOTPLATE MONITOR + ESP-NOW
// ==================================================
// senderID = 5
//
// Packet mapping:
// d[0]  = L_Heel
// d[1]  = L_BallL
// d[2]  = L_BallR
// d[3]  = R_Heel
// d[4]  = R_BallL
// d[5]  = R_BallR
// d[6]  = Left total
// d[7]  = Right total
// d[8]  = Overall total
// d[9]  = Left % of overall
// d[10] = Right % of overall
// d[11] = 0
//
// Commands:
// 's' = START/STOP local serial data display
// 't' = tare all 6 sensors
// ==================================================

#define SERIAL_PORT Serial

// -------------------- MASTER MAC --------------------
uint8_t masterMAC[] = {0x24, 0x6F, 0x28, 0x96, 0x4B, 0x24};

// -------------------- Packet --------------------
typedef struct __attribute__((packed)) {
  uint8_t senderID;
  float d[12];
} ImuPacket;

ImuPacket pkt;

// -------------------- ESP-NOW status --------------------
volatile uint32_t sendCount = 0;
volatile bool lastSendOk = false;

// -------------------- Timing --------------------
const unsigned long SEND_MS = 13;   // ~76.9 Hz
unsigned long lastSend = 0;

// -------------------- LEFT FOOT --------------------
const int HX711_sck = 14;

const int DT_L_HEEL   = 33;
const int DT_L_BALL_L = 32;
const int DT_L_BALL_R = 35;

// -------------------- RIGHT FOOT --------------------
// Assumed mapping from your provided pins:
// 25 = Heel, 26 = BallL, 27 = BallR
const int DT_R_HEEL   = 25;
const int DT_R_BALL_L = 26;
const int DT_R_BALL_R = 27;

// -------------------- HX711 objects --------------------
HX711_ADC LC_L_Heel(DT_L_HEEL, HX711_sck);
HX711_ADC LC_L_BallL(DT_L_BALL_L, HX711_sck);
HX711_ADC LC_L_BallR(DT_L_BALL_R, HX711_sck);

HX711_ADC LC_R_Heel(DT_R_HEEL, HX711_sck);
HX711_ADC LC_R_BallL(DT_R_BALL_L, HX711_sck);
HX711_ADC LC_R_BallR(DT_R_BALL_R, HX711_sck);

// -------------------- Calibration --------------------
// Using your provided calibrated values directly
const float cal_L_Heel  = -90.64f;
const float cal_L_BallL = -83.16f;
const float cal_L_BallR = -91.56f;

const float cal_R_Heel  =  71.96f;
const float cal_R_BallL = -90.17f;
const float cal_R_BallR =  90.73f;

// -------------------- Display control --------------------
unsigned long t = 0;
bool showValues = false;

void onSent(const wifi_tx_info_t *info, esp_now_send_status_t status)
{
  lastSendOk = (status == ESP_NOW_SEND_SUCCESS);
}

void setup() {
  SERIAL_PORT.begin(460800);
  delay(1000);

  SERIAL_PORT.println("\n==================================================");
  SERIAL_PORT.println("         DUAL FOOTPLATE MONITOR + ESP-NOW");
  SERIAL_PORT.println("==================================================");
  SERIAL_PORT.println("1. Send 's' to START/STOP local serial data.");
  SERIAL_PORT.println("2. Send 't' to TARE (Zero all 6 sensors).");
  SERIAL_PORT.println("==================================================");

  // Begin all 6 HX711s
  LC_L_Heel.begin();  LC_L_BallL.begin();  LC_L_BallR.begin();
  LC_R_Heel.begin();  LC_R_BallL.begin();  LC_R_BallR.begin();

  // Apply calibration directly
  LC_L_Heel.setCalFactor(cal_L_Heel);
  LC_L_BallL.setCalFactor(cal_L_BallL);
  LC_L_BallR.setCalFactor(cal_L_BallR);

  LC_R_Heel.setCalFactor(cal_R_Heel);
  LC_R_BallL.setCalFactor(cal_R_BallL);
  LC_R_BallR.setCalFactor(cal_R_BallR);

  // Stabilize and tare
  unsigned long stabilizingtime = 3000;
  LC_L_Heel.start(stabilizingtime, true);
  LC_L_BallL.start(stabilizingtime, true);
  LC_L_BallR.start(stabilizingtime, true);

  LC_R_Heel.start(stabilizingtime, true);
  LC_R_BallL.start(stabilizingtime, true);
  LC_R_BallR.start(stabilizingtime, true);

  SERIAL_PORT.println("HX711s ready.");

  // ESP-NOW setup
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  esp_wifi_set_ps(WIFI_PS_NONE);

  SERIAL_PORT.print("FOOTPLATE MAC: ");
  SERIAL_PORT.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    SERIAL_PORT.println("ESP-NOW init FAILED");
    while (true) delay(1000);
  }

  esp_now_register_send_cb(onSent);

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, masterMAC, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    SERIAL_PORT.println("Add peer FAILED");
    while (true) delay(1000);
  }

  pkt.senderID = 5;
  for (int i = 0; i < 12; i++) pkt.d[i] = 0.0f;

  SERIAL_PORT.println(">> WAITING FOR COMMAND...");
}

void loop() {
  static boolean newDataReady = 0;

  // Continuous updates
  if (LC_L_Heel.update()) newDataReady = true;
  LC_L_BallL.update();
  LC_L_BallR.update();
  LC_R_Heel.update();
  LC_R_BallL.update();
  LC_R_BallR.update();

  // Latest values
  float lh  = LC_L_Heel.getData();
  float lbl = LC_L_BallL.getData();
  float lbr = LC_L_BallR.getData();
  float rh  = LC_R_Heel.getData();
  float rbl = LC_R_BallL.getData();
  float rbr = LC_R_BallR.getData();

  // Floor negatives to 0
  if (lh  < 0) lh  = 0;
  if (lbl < 0) lbl = 0;
  if (lbr < 0) lbr = 0;
  if (rh  < 0) rh  = 0;
  if (rbl < 0) rbl = 0;
  if (rbr < 0) rbr = 0;

  float leftTotal    = lh + lbl + lbr;
  float rightTotal   = rh + rbl + rbr;
  float overallTotal = leftTotal + rightTotal;

  float leftPctOverall  = (overallTotal > 0.01f) ? (leftTotal / overallTotal) * 100.0f : 0.0f;
  float rightPctOverall = (overallTotal > 0.01f) ? (rightTotal / overallTotal) * 100.0f : 0.0f;

  // ESP-NOW send at ~75 Hz
  unsigned long now = millis();
  if (now - lastSend >= SEND_MS) {
    lastSend = now;

    pkt.d[0]  = lh;
    pkt.d[1]  = lbl;
    pkt.d[2]  = lbr;
    pkt.d[3]  = rh;
    pkt.d[4]  = rbl;
    pkt.d[5]  = rbr;
    pkt.d[6]  = leftTotal;
    pkt.d[7]  = rightTotal;
    pkt.d[8]  = overallTotal;
    pkt.d[9]  = leftPctOverall;
    pkt.d[10] = rightPctOverall;
    pkt.d[11] = 0.0f;

    esp_now_send(masterMAC, (uint8_t*)&pkt, sizeof(pkt));
    sendCount++;
  }

  // Local serial monitor output
  if (newDataReady && showValues) {
    if (millis() > t + 500) {
      if (overallTotal < 500.0f) {
        SERIAL_PORT.println("Status: No foot detected");
      } else {
        // Individual percentages wrt side total
        float lh_pct_left   = (leftTotal > 0.01f) ? (lh / leftTotal) * 100.0f : 0.0f;
        float lbl_pct_left  = (leftTotal > 0.01f) ? (lbl / leftTotal) * 100.0f : 0.0f;
        float lbr_pct_left  = (leftTotal > 0.01f) ? (lbr / leftTotal) * 100.0f : 0.0f;

        float rh_pct_right  = (rightTotal > 0.01f) ? (rh / rightTotal) * 100.0f : 0.0f;
        float rbl_pct_right = (rightTotal > 0.01f) ? (rbl / rightTotal) * 100.0f : 0.0f;
        float rbr_pct_right = (rightTotal > 0.01f) ? (rbr / rightTotal) * 100.0f : 0.0f;

        // Individual percentages wrt overall total
        float lh_pct_all  = (overallTotal > 0.01f) ? (lh / overallTotal) * 100.0f : 0.0f;
        float lbl_pct_all = (overallTotal > 0.01f) ? (lbl / overallTotal) * 100.0f : 0.0f;
        float lbr_pct_all = (overallTotal > 0.01f) ? (lbr / overallTotal) * 100.0f : 0.0f;

        float rh_pct_all  = (overallTotal > 0.01f) ? (rh / overallTotal) * 100.0f : 0.0f;
        float rbl_pct_all = (overallTotal > 0.01f) ? (rbl / overallTotal) * 100.0f : 0.0f;
        float rbr_pct_all = (overallTotal > 0.01f) ? (rbr / overallTotal) * 100.0f : 0.0f;

        SERIAL_PORT.println("\n==================================================");
        SERIAL_PORT.println("              DUAL FOOTPLATE STATUS");
        SERIAL_PORT.println("==================================================");

        SERIAL_PORT.println("LEFT FOOT");
        SERIAL_PORT.print("  Heel   : "); SERIAL_PORT.print(lh, 2);  SERIAL_PORT.print(" | %Left=");  SERIAL_PORT.print(lh_pct_left, 1);  SERIAL_PORT.print(" | %All="); SERIAL_PORT.println(lh_pct_all, 1);
        SERIAL_PORT.print("  Ball L : "); SERIAL_PORT.print(lbl, 2); SERIAL_PORT.print(" | %Left=");  SERIAL_PORT.print(lbl_pct_left, 1); SERIAL_PORT.print(" | %All="); SERIAL_PORT.println(lbl_pct_all, 1);
        SERIAL_PORT.print("  Ball R : "); SERIAL_PORT.print(lbr, 2); SERIAL_PORT.print(" | %Left=");  SERIAL_PORT.print(lbr_pct_left, 1); SERIAL_PORT.print(" | %All="); SERIAL_PORT.println(lbr_pct_all, 1);
        SERIAL_PORT.print("  Left Total  : "); SERIAL_PORT.println(leftTotal, 2);

        SERIAL_PORT.println("--------------------------------------------------");

        SERIAL_PORT.println("RIGHT FOOT");
        SERIAL_PORT.print("  Heel   : "); SERIAL_PORT.print(rh, 2);  SERIAL_PORT.print(" | %Right="); SERIAL_PORT.print(rh_pct_right, 1);  SERIAL_PORT.print(" | %All="); SERIAL_PORT.println(rh_pct_all, 1);
        SERIAL_PORT.print("  Ball L : "); SERIAL_PORT.print(rbl, 2); SERIAL_PORT.print(" | %Right="); SERIAL_PORT.print(rbl_pct_right, 1); SERIAL_PORT.print(" | %All="); SERIAL_PORT.println(rbl_pct_all, 1);
        SERIAL_PORT.print("  Ball R : "); SERIAL_PORT.print(rbr, 2); SERIAL_PORT.print(" | %Right="); SERIAL_PORT.print(rbr_pct_right, 1); SERIAL_PORT.print(" | %All="); SERIAL_PORT.println(rbr_pct_all, 1);
        SERIAL_PORT.print("  Right Total : "); SERIAL_PORT.println(rightTotal, 2);

        SERIAL_PORT.println("--------------------------------------------------");

        SERIAL_PORT.print("OVERALL TOTAL FORCE : "); SERIAL_PORT.println(overallTotal, 2);
        SERIAL_PORT.print("LEFT SIDE % OF OVERALL  : "); SERIAL_PORT.println(leftPctOverall, 1);
        SERIAL_PORT.print("RIGHT SIDE % OF OVERALL : "); SERIAL_PORT.println(rightPctOverall, 1);

        SERIAL_PORT.print("ESP-NOW pkts="); SERIAL_PORT.print(sendCount);
        SERIAL_PORT.print(" | last="); SERIAL_PORT.println(lastSendOk ? "OK" : "FAIL");
        SERIAL_PORT.println("==================================================");
      }

      newDataReady = 0;
      t = millis();
    }
  }

  // Serial commands
  if (SERIAL_PORT.available() > 0) {
    char inByte = SERIAL_PORT.read();

    if (inByte == 's') showValues = !showValues;

    if (inByte == 't') {
      SERIAL_PORT.println("\n[TARE] Zeroing both footplates...");
      LC_L_Heel.tareNoDelay();
      LC_L_BallL.tareNoDelay();
      LC_L_BallR.tareNoDelay();
      LC_R_Heel.tareNoDelay();
      LC_R_BallL.tareNoDelay();
      LC_R_BallR.tareNoDelay();
    }
  }
}