// ===================== SLAVE CHEST IMU (BNO055) =====================

#include <WiFi.h>
#include <esp_now.h>
#include "esp_wifi.h"
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>
#include <string.h>
#include <math.h>

#define SERIAL_PORT Serial
#define WIRE_PORT   Wire
#define BNO055_ADDR 0x28

Adafruit_BNO055 bno = Adafruit_BNO055(55, BNO055_ADDR, &WIRE_PORT);

// MASTER MAC
uint8_t masterMAC[] = {0x24, 0x6F, 0x28, 0x96, 0x4B, 0x24};

typedef struct __attribute__((packed)) {
  uint8_t senderID;
  float d[12];
} ImuPacket;

ImuPacket pkt;

const unsigned long SEND_MS = 13;   // ~76.9 Hz
unsigned long lastSend = 0;

bool humanMode = false;
unsigned long lastHumanPrint = 0;

float offAx=0, offAy=0, offAz=0;
float offGx=0, offGy=0, offGz=0;
float offRoll=0, offPitch=0, offYaw=0;

volatile uint32_t sendCount = 0;
volatile bool lastSendOk = false;
unsigned long lastAlivePrint = 0;

void onSent(const wifi_tx_info_t *info, esp_now_send_status_t status)
{
  lastSendOk = (status == ESP_NOW_SEND_SUCCESS);
}

static float wrapDeg180(float a)
{
  while (a > 180.0f) a -= 360.0f;
  while (a < -180.0f) a += 360.0f;
  return a;
}

// ------------------ UPDATED AXIS MAP ------------------
static inline void mapSensToSys(float xs, float ys, float zs, float &xsys, float &ysys, float &zsys)
{
  xsys =  zs;
  ysys = -ys;
  zsys =  xs;
}

static void quatToR(const imu::Quaternion &q, float R[3][3])
{
  const float w = q.w(), x = q.x(), y = q.y(), z = q.z();
  const float ww=w*w, xx=x*x, yy=y*y, zz=z*z;

  R[0][0] = ww + xx - yy - zz;
  R[0][1] = 2.0f*(x*y - w*z);
  R[0][2] = 2.0f*(x*z + w*y);

  R[1][0] = 2.0f*(x*y + w*z);
  R[1][1] = ww - xx + yy - zz;
  R[1][2] = 2.0f*(y*z - w*x);

  R[2][0] = 2.0f*(x*z - w*y);
  R[2][1] = 2.0f*(y*z + w*x);
  R[2][2] = ww - xx - yy + zz;
}

static void basisTransformR_fromMapping(float Rin[3][3], float Rout[3][3])
{
  const float P[3][3] = {
    { 0,  0,  1},
    { 0, -1,  0},
    { 1,  0,  0}
  };
  const float PT[3][3] = {
    { 0,  0,  1},
    { 0, -1,  0},
    { 1,  0,  0}
  };

  float tmp[3][3];
  for (int i=0; i<3; i++) {
    for (int j=0; j<3; j++) {
      tmp[i][j] = P[i][0]*Rin[0][j] + P[i][1]*Rin[1][j] + P[i][2]*Rin[2][j];
    }
  }
  for (int i=0; i<3; i++) {
    for (int j=0; j<3; j++) {
      Rout[i][j] = tmp[i][0]*PT[0][j] + tmp[i][1]*PT[1][j] + tmp[i][2]*PT[2][j];
    }
  }
}

static void rotToYawPitchRollDeg(const float R[3][3], float &rollDeg, float &pitchDeg, float &yawDeg)
{
  float roll  = atan2f(R[2][1], R[2][2]);
  float pitch = -asinf(R[2][0]);
  float yaw   = atan2f(R[1][0], R[0][0]);

  rollDeg  = roll * RAD_TO_DEG;
  pitchDeg = pitch * RAD_TO_DEG;
  yawDeg   = yaw * RAD_TO_DEG;
}

void tareBNO(int samples = 400, int delayMs = 5)
{
  SERIAL_PORT.println("CHEST: Taring Acc/Gyro/Angles (keep still)...");

  double sAx=0, sAy=0, sAz=0;
  double sGx=0, sGy=0, sGz=0;
  double sRoll=0, sPitch=0, sYaw=0;

  sensors_event_t acc, gyr;

  for (int i=0; i<samples; i++) {
    bno.getEvent(&acc, Adafruit_BNO055::VECTOR_LINEARACCEL);
    bno.getEvent(&gyr, Adafruit_BNO055::VECTOR_GYROSCOPE);

    float ax_s = acc.acceleration.x;
    float ay_s = acc.acceleration.y;
    float az_s = acc.acceleration.z;

    float gx_s = gyr.gyro.x * RAD_TO_DEG;
    float gy_s = gyr.gyro.y * RAD_TO_DEG;
    float gz_s = gyr.gyro.z * RAD_TO_DEG;

    float ax, ay, az, gx, gy, gz;
    mapSensToSys(ax_s, ay_s, az_s, ax, ay, az);
    mapSensToSys(gx_s, gy_s, gz_s, gx, gy, gz);

    imu::Quaternion q = bno.getQuat();
    float Rin[3][3], Rout[3][3];
    quatToR(q, Rin);
    basisTransformR_fromMapping(Rin, Rout);

    float rollDeg, pitchDeg, yawDeg;
    rotToYawPitchRollDeg(Rout, rollDeg, pitchDeg, yawDeg);

    sAx += ax; sAy += ay; sAz += az;
    sGx += gx; sGy += gy; sGz += gz;
    sRoll += rollDeg; sPitch += pitchDeg; sYaw += yawDeg;

    delay(delayMs);
  }

  offAx = sAx/samples; offAy = sAy/samples; offAz = sAz/samples;
  offGx = sGx/samples; offGy = sGy/samples; offGz = sGz/samples;
  offRoll = sRoll/samples; offPitch = sPitch/samples; offYaw = sYaw/samples;

  SERIAL_PORT.println("CHEST re-tare complete");
}

void setup()
{
  SERIAL_PORT.begin(460800);
  delay(300);
  SERIAL_PORT.println("\nCHEST booting...");

  WIRE_PORT.begin(19, 18);
  WIRE_PORT.setClock(400000);

  while (!bno.begin()) {
    SERIAL_PORT.println("CHEST BNO init failed, retrying...");
    delay(500);
  }

  delay(1000);
  bno.setExtCrystalUse(true);
  SERIAL_PORT.println("CHEST BNO OK");

  tareBNO();

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  esp_wifi_set_ps(WIFI_PS_NONE);

  if (esp_now_init() != ESP_OK) {
    SERIAL_PORT.println("CHEST ESP-NOW init FAILED");
    while (true) delay(1000);
  }

  esp_now_register_send_cb(onSent);

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, masterMAC, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    SERIAL_PORT.println("CHEST add peer FAILED");
    while (true) delay(1000);
  }

  pkt.senderID = 2;
  for (int i=0; i<12; i++) pkt.d[i] = 0;

  SERIAL_PORT.println("CHEST sending started @ ~30Hz");
  SERIAL_PORT.println("Commands: 't' re-tare | 'h' toggle HUMAN/PLOTTER");
}

void loop()
{
  unsigned long now = millis();

  while (SERIAL_PORT.available() > 0) {
    char c = (char)SERIAL_PORT.read();
    if (c=='t' || c=='T') tareBNO();
    else if (c=='h' || c=='H') {
      humanMode = !humanMode;
      SERIAL_PORT.print("Mode: ");
      SERIAL_PORT.println(humanMode ? "HUMAN" : "PLOTTER");
    }
  }

  if (now - lastAlivePrint >= 1000) {
    lastAlivePrint = now;
    SERIAL_PORT.print("CHEST ALIVE | packets=");
    SERIAL_PORT.print(sendCount);
    SERIAL_PORT.print(" | last=");
    SERIAL_PORT.println(lastSendOk ? "OK" : "FAIL");
  }

  if (now - lastSend < SEND_MS) return;
  lastSend = now;

  sensors_event_t acc, gyr;
  bno.getEvent(&acc, Adafruit_BNO055::VECTOR_LINEARACCEL);
  bno.getEvent(&gyr, Adafruit_BNO055::VECTOR_GYROSCOPE);

  float ax_s = acc.acceleration.x;
  float ay_s = acc.acceleration.y;
  float az_s = acc.acceleration.z;

  float gx_s = gyr.gyro.x * RAD_TO_DEG;
  float gy_s = gyr.gyro.y * RAD_TO_DEG;
  float gz_s = gyr.gyro.z * RAD_TO_DEG;

  float ax, ay, az, gx, gy, gz;
  mapSensToSys(ax_s, ay_s, az_s, ax, ay, az);
  mapSensToSys(gx_s, gy_s, gz_s, gx, gy, gz);

  ax -= offAx; ay -= offAy; az -= offAz;
  gx -= offGx; gy -= offGy; gz -= offGz;

  imu::Quaternion q = bno.getQuat();
  float Rin[3][3], Rout[3][3];
  quatToR(q, Rin);
  basisTransformR_fromMapping(Rin, Rout);

  float rollDeg, pitchDeg, yawDeg;
  rotToYawPitchRollDeg(Rout, rollDeg, pitchDeg, yawDeg);

  float rRoll  = wrapDeg180(rollDeg  - offRoll);
  float rPitch = wrapDeg180(pitchDeg - offPitch);
  float rYaw   = wrapDeg180(yawDeg   - offYaw);

  if (!humanMode) {
    SERIAL_PORT.print("C_Gx:");    SERIAL_PORT.print(gx, 2); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Gy:");    SERIAL_PORT.print(gy, 2); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Gz:");    SERIAL_PORT.print(gz, 2); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Roll:");  SERIAL_PORT.print(rRoll, 2); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Pitch:"); SERIAL_PORT.print(rPitch, 2); SERIAL_PORT.print(",");
    SERIAL_PORT.print("C_Yaw:");   SERIAL_PORT.println(rYaw, 2);
  } else {
    if (now - lastHumanPrint >= 1000) {
      lastHumanPrint = now;
      SERIAL_PORT.print("CHEST Gyro SYS (deg/s) = ");
      SERIAL_PORT.print(gx, 2); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(gy, 2); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(gz, 2);
      SERIAL_PORT.print(" | Angles SYS Roll/Pitch/Yaw (deg) = ");
      SERIAL_PORT.print(rRoll, 2); SERIAL_PORT.print(", ");
      SERIAL_PORT.print(rPitch, 2); SERIAL_PORT.print(", ");
      SERIAL_PORT.println(rYaw, 2);
    }
  }

  pkt.d[0] = ax;    pkt.d[1] = ay;    pkt.d[2] = az;
  pkt.d[3] = gx;    pkt.d[4] = gy;    pkt.d[5] = gz;
  pkt.d[6] = rRoll; pkt.d[7] = rPitch; pkt.d[8] = rYaw;
  pkt.d[9] = 0;     pkt.d[10] = 0;    pkt.d[11] = 0;

  esp_now_send(masterMAC, (uint8_t*)&pkt, sizeof(pkt));
  sendCount++;
}