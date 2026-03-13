// ===================== Right Handle SLAVE IMU1 (ICM-20948) + 6x HX711 =====================
//
// senderID = 3
//
// Sends:
// d[0..2] = Acc (m/s^2) tared
// d[3..5] = Gyro (tared + LPF)
// d[6..8] = Velocity (m/s) with ZUPT
// d[9] = Fx (B+D) in Newtons
// d[10] = Fy (A+C) in Newtons
// d[11] = Fz (E+F) in Newtons
//
// Axis mapping:
// X = B + D
// Y = A + C
// Z = E + F
// |F| = sqrt(Fx^2 + Fy^2 + Fz^2)
//
// Rate: ~30 Hz (SEND_MS=33)
//
// Serial commands:
// 't' = re-tare IMU + all 6 load cells (keep still + no load)
// 'h' = toggle output mode:
// - Plotter mode (default): labelled line at 30Hz
// - Human mode: neat formatted table at 1Hz
//
// ZUPT triggers:
// 1. Accelerometer + gyro below threshold for 250ms (stillness)
// 2. Rate of change of force magnitude changes sign (dF/dt crosses zero)
// i.e. force peak or trough — handle momentarily stops at stroke transition
//
// Calibration: load cells calibrated with 1000g weight => output in grams
// Apply G_TO_N = 9.80665/1000 to convert to Newtons
//
// ICM I2C: SDA=23, SCL=22, AD0=GND => AD0_VAL=0
// HX711: all share SCK=14
// DT: A=35, B=32, C=27, D=26, E=25, F=33
// MASTER MAC: 24:6F:28:96:4B:24

#include <WiFi.h>
#include <esp_now.h>
#include "esp_wifi.h"
#include <Wire.h>
#include "ICM_20948.h"
#include <HX711_ADC.h>

#if defined(ESP8266) || defined(ESP32) || defined(AVR)
#include <EEPROM.h>
#endif

#define SERIAL_PORT Serial
#define WIRE_PORT Wire
#define AD0_VAL 0

ICM_20948_I2C myICM;

// -------------------- Master MAC --------------------
uint8_t masterMAC[] = {0x24, 0x6F, 0x28, 0x96, 0x4B, 0x24};

typedef struct __attribute__((packed)) {
  uint8_t senderID;
  float d[12];
} ImuPacket;

ImuPacket pkt;

// -------------------- Timing --------------------
const unsigned long SEND_MS = 13; // ~30 Hz
unsigned long lastSend = 0;

// -------------------- Output mode --------------------
bool humanMode = false;
unsigned long lastHumanPrint = 0;

// -------------------- ICM accel scaling --------------------
float accScaleToMS2 = 1.0f;

// -------------------- ICM tare offsets --------------------
float offAx=0, offAy=0, offAz=0;
float offGx=0, offGy=0, offGz=0;

// -------------------- Gyro LPF --------------------
float fgx=0, fgy=0, fgz=0;
const float GYRO_LPF_ALPHA = 0.15f;

// -------------------- Velocity integration --------------------
float vx=0, vy=0, vz=0;
unsigned long lastVelTime = 0;

// -------------------- ZUPT: stillness --------------------
unsigned long stillSince = 0;
const unsigned long STILL_TIME_MS = 250;
const float A_STILL_TH = 0.25f; // m/s^2
const float G_STILL_TH = 2.0f;  // deg/s after tare+LPF

// -------------------- ZUPT: force magnitude dF/dt sign change --------------------
float lastFMag = 0.0f;
float lastDFdt = 0.0f;
const float DFDT_MIN_TH = 0.5f; // N/s

// -------------------- HX711 pins --------------------
const int SCK_PIN = 14;
const int DT_A = 35;
const int DT_B = 32;
const int DT_C = 27;
const int DT_D = 26;
const int DT_E = 25;
const int DT_F = 33;

// -------------------- Calibration (grams -> Newtons) --------------------
const float G_TO_N = 9.80665f / 1000.0f;

const float CAL_A = 103.820000f;
const float CAL_B = 102.561005f;
const float CAL_C = 105.177002f;
const float CAL_D = 106.367996f;
const float CAL_E = 104.166000f;
const float CAL_F = 103.489998f;

// -------------------- HX711 objects --------------------
HX711_ADC CellA(DT_A, SCK_PIN);
HX711_ADC CellB(DT_B, SCK_PIN);
HX711_ADC CellC(DT_C, SCK_PIN);
HX711_ADC CellD(DT_D, SCK_PIN);
HX711_ADC CellE(DT_E, SCK_PIN);
HX711_ADC CellF(DT_F, SCK_PIN);

// -------------------- Force readings (N) --------------------
float fA=0, fB=0, fC=0, fD=0, fE=0, fF=0;

// -------------------- Status --------------------
volatile uint32_t sendCount = 0;
volatile bool lastSendOk = false;

void onSent(const wifi_tx_info_t *info, esp_now_send_status_t status)
{
  lastSendOk = (status == ESP_NOW_SEND_SUCCESS);
}

// -------------------- ICM helpers --------------------
void detectAccelUnits()
{
  double sx=0, sy=0, sz=0;
  const int samples = 200;

  for (int i=0; i<samples; i++) {
    if (myICM.dataReady()) myICM.getAGMT();
    sx += myICM.accX();
    sy += myICM.accY();
    sz += myICM.accZ();
    delay(5);
  }

  float ax = sx / samples;
  float ay = sy / samples;
  float az = sz / samples;
  float mag = sqrtf(ax*ax + ay*ay + az*az);

  if (mag > 200.0f) accScaleToMS2 = 9.80665f / 1000.0f;
  else if (mag > 2.0f) accScaleToMS2 = 1.0f;
  else accScaleToMS2 = 9.80665f;

  SERIAL_PORT.print("IMU1 accScaleToMS2 = ");
  SERIAL_PORT.println(accScaleToMS2, 6);
}

void tareICM(int samples = 800, int delayMs = 5)
{
  SERIAL_PORT.println("IMU1: Taring (keep still)...");
  double sAx=0, sAy=0, sAz=0;
  double sGx=0, sGy=0, sGz=0;

  for (int i=0; i<samples; i++) {
    if (myICM.dataReady()) myICM.getAGMT();

    sAx += myICM.accX() * accScaleToMS2;
    sAy += myICM.accY() * accScaleToMS2;
    sAz += myICM.accZ() * accScaleToMS2;

    sGx += myICM.gyrX();
    sGy += myICM.gyrY();
    sGz += myICM.gyrZ();

    delay(delayMs);
  }

  offAx = sAx/samples; offAy = sAy/samples; offAz = sAz/samples;
  offGx = sGx/samples; offGy = sGy/samples; offGz = sGz/samples;

  fgx = fgy = fgz = 0;
  vx = vy = vz = 0;
  lastVelTime = millis();
  stillSince = 0;
  lastFMag = 0.0f;
  lastDFdt = 0.0f;

  SERIAL_PORT.println("IMU1 re-tare complete (vel reset to 0)");
}

// -------------------- HX711 helpers --------------------
void initHX711()
{
  SERIAL_PORT.println("HX711: Initialising all 6 cells...");

  CellA.begin(); CellB.begin(); CellC.begin();
  CellD.begin(); CellE.begin(); CellF.begin();

  const unsigned long stabilizingtime = 2000;
  bool _tare = true;
  byte rdyA=0, rdyB=0, rdyC=0, rdyD=0, rdyE=0, rdyF=0;

  while ((rdyA+rdyB+rdyC+rdyD+rdyE+rdyF) < 6) {
    if (!rdyA) rdyA = CellA.startMultiple(stabilizingtime, _tare);
    if (!rdyB) rdyB = CellB.startMultiple(stabilizingtime, _tare);
    if (!rdyC) rdyC = CellC.startMultiple(stabilizingtime, _tare);
    if (!rdyD) rdyD = CellD.startMultiple(stabilizingtime, _tare);
    if (!rdyE) rdyE = CellE.startMultiple(stabilizingtime, _tare);
    if (!rdyF) rdyF = CellF.startMultiple(stabilizingtime, _tare);
  }

  if (CellA.getTareTimeoutFlag()) SERIAL_PORT.println("TIMEOUT: Cell A — check wiring");
  if (CellB.getTareTimeoutFlag()) SERIAL_PORT.println("TIMEOUT: Cell B — check wiring");
  if (CellC.getTareTimeoutFlag()) SERIAL_PORT.println("TIMEOUT: Cell C — check wiring");
  if (CellD.getTareTimeoutFlag()) SERIAL_PORT.println("TIMEOUT: Cell D — check wiring");
  if (CellE.getTareTimeoutFlag()) SERIAL_PORT.println("TIMEOUT: Cell E — check wiring");
  if (CellF.getTareTimeoutFlag()) SERIAL_PORT.println("TIMEOUT: Cell F — check wiring");

  CellA.setCalFactor(CAL_A);
  CellB.setCalFactor(CAL_B);
  CellC.setCalFactor(CAL_C);
  CellD.setCalFactor(CAL_D);
  CellE.setCalFactor(CAL_E);
  CellF.setCalFactor(CAL_F);

  SERIAL_PORT.println("HX711: All 6 cells ready. Units: Newtons.");
}

void tareHX711()
{
  SERIAL_PORT.println("HX711: Taring all 6 cells (NO load)...");
  CellA.tareNoDelay();
  CellB.tareNoDelay();
  CellC.tareNoDelay();
  CellD.tareNoDelay();
  CellE.tareNoDelay();
  CellF.tareNoDelay();
}

// -------------------- Setup --------------------
void setup()
{
  SERIAL_PORT.begin(460800);
  delay(300);
  SERIAL_PORT.println("\nIMU1 + 6x HX711 Force Handle booting...");
  SERIAL_PORT.println("Axis mapping: Fx = B+D | Fy = A+C | Fz = E+F");

  WIRE_PORT.begin(23, 22);
  WIRE_PORT.setClock(400000);

  while (true) {
    myICM.begin(WIRE_PORT, AD0_VAL);
    if (myICM.status == ICM_20948_Stat_Ok) break;
    delay(500);
  }

  delay(200);
  detectAccelUnits();
  delay(200);
  tareICM();

  initHX711();

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  esp_wifi_set_ps(WIFI_PS_NONE);

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

  pkt.senderID = 3;
  for (int i=0; i<12; i++) pkt.d[i] = 0;

  SERIAL_PORT.println("Running. Commands: 't' re-tare | 'h' toggle human/plotter");
  SERIAL_PORT.println("Starting in PLOTTER mode...\n");
}

// -------------------- Loop --------------------
void loop()
{
  unsigned long now = millis();

  if (CellA.update()) fA = CellA.getData() * G_TO_N;
  if (CellB.update()) fB = CellB.getData() * G_TO_N;
  if (CellC.update()) fC = CellC.getData() * G_TO_N;
  if (CellD.update()) fD = CellD.getData() * G_TO_N;
  if (CellE.update()) fE = CellE.getData() * G_TO_N;
  if (CellF.update()) fF = CellF.getData() * G_TO_N;

  while (SERIAL_PORT.available() > 0) {
    char c = (char)SERIAL_PORT.read();
    if (c == 't' || c == 'T') {
      tareICM();
      tareHX711();
      SERIAL_PORT.println("Re-tare done (IMU + all 6 cells)");
    } else if (c == 'h' || c == 'H') {
      humanMode = !humanMode;
      SERIAL_PORT.print("Mode: ");
      SERIAL_PORT.println(humanMode ? "HUMAN" : "PLOTTER");
    }
  }

  if (CellA.getTareStatus()) SERIAL_PORT.println("Tare A complete");
  if (CellB.getTareStatus()) SERIAL_PORT.println("Tare B complete");
  if (CellC.getTareStatus()) SERIAL_PORT.println("Tare C complete");
  if (CellD.getTareStatus()) SERIAL_PORT.println("Tare D complete");
  if (CellE.getTareStatus()) SERIAL_PORT.println("Tare E complete");
  if (CellF.getTareStatus()) SERIAL_PORT.println("Tare F complete");

  if (now - lastSend < SEND_MS) return;
  lastSend = now;

  if (!myICM.dataReady()) return;
  myICM.getAGMT();

  float ax = myICM.accX() * accScaleToMS2 - offAx;
  float ay = myICM.accY() * accScaleToMS2 - offAy;
  float az = myICM.accZ() * accScaleToMS2 - offAz;

  float gx = myICM.gyrX() - offGx;
  float gy = myICM.gyrY() - offGy;
  float gz = myICM.gyrZ() - offGz;

  fgx = (1.0f - GYRO_LPF_ALPHA) * fgx + GYRO_LPF_ALPHA * gx;
  fgy = (1.0f - GYRO_LPF_ALPHA) * fgy + GYRO_LPF_ALPHA * gy;
  fgz = (1.0f - GYRO_LPF_ALPHA) * fgz + GYRO_LPF_ALPHA * gz;

  float dt = (lastVelTime == 0) ? (SEND_MS / 1000.0f) : ((now - lastVelTime) / 1000.0f);
  lastVelTime = now;

  vx += ax * dt;
  vy += ay * dt;
  vz += az * dt;

  float aMag = sqrtf(ax*ax + ay*ay + az*az);
  float gMag = sqrtf(fgx*fgx + fgy*fgy + fgz*fgz);
  bool stillNow = (aMag < A_STILL_TH) && (gMag < G_STILL_TH);

  if (stillNow) {
    if (stillSince == 0) stillSince = now;
  } else {
    stillSince = 0;
  }

  if ((stillSince != 0) && ((now - stillSince) >= STILL_TIME_MS)) {
    vx = vy = vz = 0.0f;
  }

  float forceX = fB + fD;
  float forceY = fA + fC;
  float forceZ = fE + fF;
  float fMag = sqrtf(forceX*forceX + forceY*forceY + forceZ*forceZ);

  float dFdt = (fMag - lastFMag) / dt;

  bool dFdtSignChanged = (lastDFdt * dFdt) < 0.0f;
  bool dFdtLargeEnough = fabsf(lastDFdt) > DFDT_MIN_TH && fabsf(dFdt) > DFDT_MIN_TH;

  if (dFdtSignChanged && dFdtLargeEnough) {
    vx = vy = vz = 0.0f;
  }

  lastFMag = fMag;
  lastDFdt = dFdt;

  if (!humanMode) {
    SERIAL_PORT.print("Fx:"); SERIAL_PORT.print(forceX, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("Fy:"); SERIAL_PORT.print(forceY, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("Fz:"); SERIAL_PORT.print(forceZ, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("Mag:"); SERIAL_PORT.print(fMag, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("VX:"); SERIAL_PORT.print(vx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("VY:"); SERIAL_PORT.print(vy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("VZ:"); SERIAL_PORT.println(vz, 3);
  } else {
    if (now - lastHumanPrint >= 1000) {
      lastHumanPrint = now;
      SERIAL_PORT.println("========================================");
      SERIAL_PORT.println(" FORCE HANDLE — IMU1 (Newtons) ");
      SERIAL_PORT.println("========================================");
      SERIAL_PORT.print(" Cell A : "); SERIAL_PORT.print(fA, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.print(" Cell B : "); SERIAL_PORT.print(fB, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.print(" Cell C : "); SERIAL_PORT.print(fC, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.print(" Cell D : "); SERIAL_PORT.print(fD, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.print(" Cell E : "); SERIAL_PORT.print(fE, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.print(" Cell F : "); SERIAL_PORT.print(fF, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.println("----------------------------------------");
      SERIAL_PORT.print(" Fx (B+D): "); SERIAL_PORT.print(forceX, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.print(" Fy (A+C): "); SERIAL_PORT.print(forceY, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.print(" Fz (E+F): "); SERIAL_PORT.print(forceZ, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.print(" |F| mag : "); SERIAL_PORT.print(fMag, 3); SERIAL_PORT.println(" N");
      SERIAL_PORT.println("----------------------------------------");
      SERIAL_PORT.print(" VX : "); SERIAL_PORT.print(vx, 3); SERIAL_PORT.println(" m/s");
      SERIAL_PORT.print(" VY : "); SERIAL_PORT.print(vy, 3); SERIAL_PORT.println(" m/s");
      SERIAL_PORT.print(" VZ : "); SERIAL_PORT.print(vz, 3); SERIAL_PORT.println(" m/s");
      SERIAL_PORT.println("----------------------------------------");
      SERIAL_PORT.print(" Sending to MASTER | pkts="); SERIAL_PORT.print(sendCount);
      SERIAL_PORT.print(" | last="); SERIAL_PORT.println(lastSendOk ? "OK" : "FAIL");
      SERIAL_PORT.println("========================================\n");
    }
  }

  pkt.d[0] = ax; pkt.d[1] = ay; pkt.d[2] = az;
  pkt.d[3] = fgx; pkt.d[4] = fgy; pkt.d[5] = fgz;
  pkt.d[6] = vx; pkt.d[7] = vy; pkt.d[8] = vz;
  pkt.d[9] = forceX; pkt.d[10] = forceY; pkt.d[11] = forceZ;

  esp_now_send(masterMAC, (uint8_t*)&pkt, sizeof(pkt));
  sendCount++;
}