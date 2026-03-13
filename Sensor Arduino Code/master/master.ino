// ===================== MASTER ESP32 =====================
// Receives ESP-NOW packets from:
//   senderID = 1 -> Left Handle
//   senderID = 2 -> Chest Sensor
//   senderID = 3 -> Right Handle
//   senderID = 4 -> Seat Sensor
//   senderID = 5 -> Footplate Sensor
//
// Packet format from all slaves:
//   d[0..2]   = Acc
//   d[3..5]   = Gyro
//   d[6..8]   = Velocity OR Angles (depends on sender)
//   d[9..11]  = Force XYZ (handles) or zeros (chest)
//
// Seat packet format:
//   d[0]      = Seat Top
//   d[1]      = Seat Bottom
//   d[2]      = Seat Left
//   d[3]      = Seat Right
//   d[4]      = Seat Total
//   d[5..11]  = zeros
//
// Footplate packet format:
//   d[0]  = L_Heel
//   d[1]  = L_BallL
//   d[2]  = L_BallR
//   d[3]  = R_Heel
//   d[4]  = R_BallL
//   d[5]  = R_BallR
//   d[6]  = Left total
//   d[7]  = Right total
//   d[8]  = Overall total
//   d[9]  = Left % of overall
//   d[10] = Right % of overall
//   d[11] = 0
//
// Serial commands:
//   'h' = toggle HUMAN / PLOTTER mode
//
// HUMAN mode:
//   neat print every 1 second
//
// PLOTTER mode:
//   one labelled line at ~30 Hz showing ALL received data
// ========================================================

#include <WiFi.h>
#include <esp_now.h>
#include "esp_wifi.h"

#define SERIAL_PORT Serial

typedef struct __attribute__((packed)) {
  uint8_t senderID;
  float d[12];
} ImuPacket;

// -------------------- Latest packets --------------------
volatile bool leftValid = false;
volatile bool chestValid = false;
volatile bool rightValid = false;
volatile bool seatValid = false;
volatile bool footValid = false;

ImuPacket leftPkt;
ImuPacket chestPkt;
ImuPacket rightPkt;
ImuPacket seatPkt;
ImuPacket footPkt;

// -------------------- Status --------------------
volatile uint32_t leftCount = 0;
volatile uint32_t chestCount = 0;
volatile uint32_t rightCount = 0;
volatile uint32_t seatCount = 0;
volatile uint32_t footCount = 0;

unsigned long lastLeftRx = 0;
unsigned long lastChestRx = 0;
unsigned long lastRightRx = 0;
unsigned long lastSeatRx = 0;
unsigned long lastFootRx = 0;

// -------------------- Output mode --------------------
bool humanMode = false;
unsigned long lastHumanPrint = 0;
unsigned long lastPlotPrint = 0;
const unsigned long PRINT_MS = 13; // ~76.9 Hz

// -------------------- Receive callback --------------------
void onReceive(const esp_now_recv_info_t *recvInfo, const uint8_t *incomingData, int len) {
  if (len != sizeof(ImuPacket)) return;

  ImuPacket pkt;
  memcpy(&pkt, incomingData, sizeof(ImuPacket));

  unsigned long now = millis();

  if (pkt.senderID == 1) {
    leftPkt = pkt;
    leftValid = true;
    leftCount++;
    lastLeftRx = now;
  } else if (pkt.senderID == 2) {
    chestPkt = pkt;
    chestValid = true;
    chestCount++;
    lastChestRx = now;
  } else if (pkt.senderID == 3) {
    rightPkt = pkt;
    rightValid = true;
    rightCount++;
    lastRightRx = now;
  } else if (pkt.senderID == 4) {
    seatPkt = pkt;
    seatValid = true;
    seatCount++;
    lastSeatRx = now;
  } else if (pkt.senderID == 5) {
    footPkt = pkt;
    footValid = true;
    footCount++;
    lastFootRx = now;
  }
}

// -------------------- Setup --------------------
void setup() {
  SERIAL_PORT.begin(460800);
  delay(300);

  SERIAL_PORT.println();
  SERIAL_PORT.println("MASTER booting...");
  SERIAL_PORT.println("Expected senders: 1=LEFT, 2=CHEST, 3=RIGHT, 4=SEAT, 5=FOOT");

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  esp_wifi_set_ps(WIFI_PS_NONE);

  SERIAL_PORT.print("MASTER MAC: ");
  SERIAL_PORT.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    SERIAL_PORT.println("ESP-NOW init FAILED");
    while (true) delay(1000);
  }

  esp_now_register_recv_cb(onReceive);

  SERIAL_PORT.println("ESP-NOW receiver started");
  SERIAL_PORT.println("Command: 'h' = toggle HUMAN/PLOTTER");
  SERIAL_PORT.println("Starting in PLOTTER mode...\n");
}

// -------------------- Loop --------------------
void loop() {
  unsigned long now = millis();

  while (SERIAL_PORT.available() > 0) {
    char c = (char)SERIAL_PORT.read();
    if (c == 'h' || c == 'H') {
      humanMode = !humanMode;
      SERIAL_PORT.print("Mode: ");
      SERIAL_PORT.println(humanMode ? "HUMAN" : "PLOTTER");
    }
  }

  if (now - lastPlotPrint < PRINT_MS) return;
  lastPlotPrint = now;

  // -------------------- Extract LEFT --------------------
  float L_ax = 0, L_ay = 0, L_az = 0;
  float L_gx = 0, L_gy = 0, L_gz = 0;
  float L_vx = 0, L_vy = 0, L_vz = 0;
  float L_fx = 0, L_fy = 0, L_fz = 0;

  if (leftValid) {
    L_ax = leftPkt.d[0];
    L_ay = leftPkt.d[1];
    L_az = leftPkt.d[2];
    L_gx = leftPkt.d[3];
    L_gy = leftPkt.d[4];
    L_gz = leftPkt.d[5];
    L_vx = leftPkt.d[6];
    L_vy = leftPkt.d[7];
    L_vz = leftPkt.d[8];
    L_fx = leftPkt.d[9];
    L_fy = leftPkt.d[10];
    L_fz = leftPkt.d[11];
  }

  // -------------------- Extract CHEST --------------------
  float C_ax = 0, C_ay = 0, C_az = 0;
  float C_gx = 0, C_gy = 0, C_gz = 0;
  float C_roll = 0, C_pitch = 0, C_yaw = 0;

  if (chestValid) {
    C_ax = chestPkt.d[0];
    C_ay = chestPkt.d[1];
    C_az = chestPkt.d[2];
    C_gx = chestPkt.d[3];
    C_gy = chestPkt.d[4];
    C_gz = chestPkt.d[5];
    C_roll = chestPkt.d[6];
    C_pitch = chestPkt.d[7];
    C_yaw = chestPkt.d[8];
  }

  // -------------------- Extract RIGHT --------------------
  float R_ax = 0, R_ay = 0, R_az = 0;
  float R_gx = 0, R_gy = 0, R_gz = 0;
  float R_vx = 0, R_vy = 0, R_vz = 0;
  float R_fx = 0, R_fy = 0, R_fz = 0;

  if (rightValid) {
    R_ax = rightPkt.d[0];
    R_ay = rightPkt.d[1];
    R_az = rightPkt.d[2];
    R_gx = rightPkt.d[3];
    R_gy = rightPkt.d[4];
    R_gz = rightPkt.d[5];
    R_vx = rightPkt.d[6];
    R_vy = rightPkt.d[7];
    R_vz = rightPkt.d[8];
    R_fx = rightPkt.d[9];
    R_fy = rightPkt.d[10];
    R_fz = rightPkt.d[11];
  }

  // -------------------- Extract SEAT --------------------
  float S_top = 0, S_bottom = 0, S_left = 0, S_right = 0, S_total = 0;

  if (seatValid) {
    S_top = seatPkt.d[0];
    S_bottom = seatPkt.d[1];
    S_left = seatPkt.d[2];
    S_right = seatPkt.d[3];
    S_total = seatPkt.d[4];
  }

  // -------------------- Extract FOOTPLATE --------------------
  float FP_L_Heel = 0, FP_L_BallL = 0, FP_L_BallR = 0;
  float FP_R_Heel = 0, FP_R_BallL = 0, FP_R_BallR = 0;
  float FP_LeftTotal = 0, FP_RightTotal = 0, FP_OverallTotal = 0;
  float FP_LeftPctOverall = 0, FP_RightPctOverall = 0;

  if (footValid) {
    FP_L_Heel = footPkt.d[0];
    FP_L_BallL = footPkt.d[1];
    FP_L_BallR = footPkt.d[2];
    FP_R_Heel = footPkt.d[3];
    FP_R_BallL = footPkt.d[4];
    FP_R_BallR = footPkt.d[5];
    FP_LeftTotal = footPkt.d[6];
    FP_RightTotal = footPkt.d[7];
    FP_OverallTotal = footPkt.d[8];
    FP_LeftPctOverall = footPkt.d[9];
    FP_RightPctOverall = footPkt.d[10];
  }

  // -------------------- Combined metrics --------------------
  float totalFx = L_fx + R_fx;
  float totalFy = L_fy + R_fy;
  float totalFz = L_fz + R_fz;

  // -------------------- PLOTTER mode --------------------
  if (!humanMode) {
    SERIAL_PORT.print("L_Ax:"); SERIAL_PORT.print(L_ax, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Ay:"); SERIAL_PORT.print(L_ay, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Az:"); SERIAL_PORT.print(L_az, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Gx:"); SERIAL_PORT.print(L_gx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Gy:"); SERIAL_PORT.print(L_gy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Gz:"); SERIAL_PORT.print(L_gz, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Vx:"); SERIAL_PORT.print(L_vx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Vy:"); SERIAL_PORT.print(L_vy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Vz:"); SERIAL_PORT.print(L_vz, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Fx:"); SERIAL_PORT.print(L_fx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Fy:"); SERIAL_PORT.print(L_fy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("L_Fz:"); SERIAL_PORT.print(L_fz, 3); SERIAL_PORT.print(",");

    SERIAL_PORT.print("C_Ax:"); SERIAL_PORT.print(C_ax, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Ay:"); SERIAL_PORT.print(C_ay, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Az:"); SERIAL_PORT.print(C_az, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Gx:"); SERIAL_PORT.print(C_gx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Gy:"); SERIAL_PORT.print(C_gy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Gz:"); SERIAL_PORT.print(C_gz, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Roll:"); SERIAL_PORT.print(C_roll, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Pitch:"); SERIAL_PORT.print(C_pitch, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Yaw:"); SERIAL_PORT.print(C_yaw, 3); SERIAL_PORT.print(",");

    SERIAL_PORT.print("R_Ax:"); SERIAL_PORT.print(R_ax, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Ay:"); SERIAL_PORT.print(R_ay, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Az:"); SERIAL_PORT.print(R_az, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Gx:"); SERIAL_PORT.print(R_gx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Gy:"); SERIAL_PORT.print(R_gy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Gz:"); SERIAL_PORT.print(R_gz, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Vx:"); SERIAL_PORT.print(R_vx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Vy:"); SERIAL_PORT.print(R_vy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Vz:"); SERIAL_PORT.print(R_vz, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Fx:"); SERIAL_PORT.print(R_fx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Fy:"); SERIAL_PORT.print(R_fy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("R_Fz:"); SERIAL_PORT.print(R_fz, 3); SERIAL_PORT.print(",");

    SERIAL_PORT.print("Tot_Fx:"); SERIAL_PORT.print(totalFx, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("Tot_Fy:"); SERIAL_PORT.print(totalFy, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("Tot_Fz:"); SERIAL_PORT.print(totalFz, 3); SERIAL_PORT.print(",");

    SERIAL_PORT.print("S_Top:"); SERIAL_PORT.print(S_top, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("S_Bottom:"); SERIAL_PORT.print(S_bottom, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("S_Left:"); SERIAL_PORT.print(S_left, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("S_Right:"); SERIAL_PORT.print(S_right, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("S_Total:"); SERIAL_PORT.print(S_total, 3); SERIAL_PORT.print(",");

    SERIAL_PORT.print("FP_LH:"); SERIAL_PORT.print(FP_L_Heel, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_LBL:"); SERIAL_PORT.print(FP_L_BallL, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_LBR:"); SERIAL_PORT.print(FP_L_BallR, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_RH:"); SERIAL_PORT.print(FP_R_Heel, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_RBL:"); SERIAL_PORT.print(FP_R_BallL, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_RBR:"); SERIAL_PORT.print(FP_R_BallR, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_LT:"); SERIAL_PORT.print(FP_LeftTotal, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_RT:"); SERIAL_PORT.print(FP_RightTotal, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_TOT:"); SERIAL_PORT.print(FP_OverallTotal, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_LPCT:"); SERIAL_PORT.print(FP_LeftPctOverall, 3); SERIAL_PORT.print(",");
    SERIAL_PORT.print("FP_RPCT:"); SERIAL_PORT.println(FP_RightPctOverall, 3);
  }

  // -------------------- HUMAN mode --------------------
  else {
    if (now - lastHumanPrint >= 1000) {
      lastHumanPrint = now;

      SERIAL_PORT.println("============================================================");
      SERIAL_PORT.println("                    MASTER RECEIVER STATUS                  ");
      SERIAL_PORT.println("============================================================");

      SERIAL_PORT.print("LEFT   valid="); SERIAL_PORT.print(leftValid ? "YES" : "NO");
      SERIAL_PORT.print("  pkts="); SERIAL_PORT.print(leftCount);
      SERIAL_PORT.print("  age(ms)="); SERIAL_PORT.println(leftValid ? (now - lastLeftRx) : 0);

      SERIAL_PORT.print("CHEST  valid="); SERIAL_PORT.print(chestValid ? "YES" : "NO");
      SERIAL_PORT.print("  pkts="); SERIAL_PORT.print(chestCount);
      SERIAL_PORT.print("  age(ms)="); SERIAL_PORT.println(chestValid ? (now - lastChestRx) : 0);

      SERIAL_PORT.print("RIGHT  valid="); SERIAL_PORT.print(rightValid ? "YES" : "NO");
      SERIAL_PORT.print("  pkts="); SERIAL_PORT.print(rightCount);
      SERIAL_PORT.print("  age(ms)="); SERIAL_PORT.println(rightValid ? (now - lastRightRx) : 0);

      SERIAL_PORT.print("SEAT   valid="); SERIAL_PORT.print(seatValid ? "YES" : "NO");
      SERIAL_PORT.print("  pkts="); SERIAL_PORT.print(seatCount);
      SERIAL_PORT.print("  age(ms)="); SERIAL_PORT.println(seatValid ? (now - lastSeatRx) : 0);

      SERIAL_PORT.print("FOOT   valid="); SERIAL_PORT.print(footValid ? "YES" : "NO");
      SERIAL_PORT.print("  pkts="); SERIAL_PORT.print(footCount);
      SERIAL_PORT.print("  age(ms)="); SERIAL_PORT.println(footValid ? (now - lastFootRx) : 0);

      SERIAL_PORT.println("------------------------------------------------------------");
      SERIAL_PORT.println("LEFT HANDLE");
      SERIAL_PORT.print("  Acc   : "); SERIAL_PORT.print(L_ax, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(L_ay, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(L_az, 3);
      SERIAL_PORT.print("  Gyro  : "); SERIAL_PORT.print(L_gx, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(L_gy, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(L_gz, 3);
      SERIAL_PORT.print("  Vel   : "); SERIAL_PORT.print(L_vx, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(L_vy, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(L_vz, 3);
      SERIAL_PORT.print("  Force : "); SERIAL_PORT.print(L_fx, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(L_fy, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(L_fz, 3);

      SERIAL_PORT.println("------------------------------------------------------------");
      SERIAL_PORT.println("CHEST");
      SERIAL_PORT.print("  Acc   : "); SERIAL_PORT.print(C_ax, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(C_ay, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(C_az, 3);
      SERIAL_PORT.print("  Gyro  : "); SERIAL_PORT.print(C_gx, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(C_gy, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(C_gz, 3);
      SERIAL_PORT.print("  Angle : "); SERIAL_PORT.print(C_roll, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(C_pitch, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(C_yaw, 3);

      SERIAL_PORT.println("------------------------------------------------------------");
      SERIAL_PORT.println("RIGHT HANDLE");
      SERIAL_PORT.print("  Acc   : "); SERIAL_PORT.print(R_ax, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(R_ay, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(R_az, 3);
      SERIAL_PORT.print("  Gyro  : "); SERIAL_PORT.print(R_gx, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(R_gy, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(R_gz, 3);
      SERIAL_PORT.print("  Vel   : "); SERIAL_PORT.print(R_vx, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(R_vy, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(R_vz, 3);
      SERIAL_PORT.print("  Force : "); SERIAL_PORT.print(R_fx, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(R_fy, 3); SERIAL_PORT.print(", "); SERIAL_PORT.println(R_fz, 3);

      SERIAL_PORT.println("------------------------------------------------------------");
      SERIAL_PORT.println("COMBINED HANDLES");
      SERIAL_PORT.print("  Total Force XYZ : ");
      SERIAL_PORT.print(totalFx, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(totalFy, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.println(totalFz, 3);

      SERIAL_PORT.println("------------------------------------------------------------");
      SERIAL_PORT.println("SEAT");
      SERIAL_PORT.print("  Top/Bottom : ");
      SERIAL_PORT.print(S_top, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.println(S_bottom, 3);
      SERIAL_PORT.print("  Left/Right : ");
      SERIAL_PORT.print(S_left, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.println(S_right, 3);
      SERIAL_PORT.print("  Total      : ");
      SERIAL_PORT.println(S_total, 3);

      SERIAL_PORT.println("------------------------------------------------------------");
      SERIAL_PORT.println("FOOTPLATES");
      SERIAL_PORT.print("  L Heel/BallL/BallR : ");
      SERIAL_PORT.print(FP_L_Heel, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(FP_L_BallL, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.println(FP_L_BallR, 3);
      SERIAL_PORT.print("  R Heel/BallL/BallR : ");
      SERIAL_PORT.print(FP_R_Heel, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(FP_R_BallL, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.println(FP_R_BallR, 3);
      SERIAL_PORT.print("  Left/Right Totals  : ");
      SERIAL_PORT.print(FP_LeftTotal, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.println(FP_RightTotal, 3);
      SERIAL_PORT.print("  Overall Total      : ");
      SERIAL_PORT.println(FP_OverallTotal, 3);
      SERIAL_PORT.print("  Left/Right % Total : ");
      SERIAL_PORT.print(FP_LeftPctOverall, 3); SERIAL_PORT.print(", ");
      SERIAL_PORT.println(FP_RightPctOverall, 3);

      SERIAL_PORT.println("============================================================\n");
    }
  }
}