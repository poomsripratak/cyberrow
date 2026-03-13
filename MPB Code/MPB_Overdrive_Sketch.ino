#include <Wire.h>
#include <math.h>

// ---------------- DAC / Controller ----------------
#define DAC_ADDR   0x4C
#define DAC_VREF   2.5f
#define CTRL_VMAX  5.0f

const float I_MAX  = 1.65f;
const float I_COMP = 0.01f;

// ---------------- Kick / Over-excitation settings ----------------
const float    KICK_GAIN   = 3.0f;
const float    KICK_MIN_A  = 0.08f;
const float    KICK_MAX_A  = I_MAX;
const float    DROP_THRESH = 0.80f;
const uint16_t MAX_KICK_MS = 1000;

const bool     USE_COMPENSATION = true;

// ---------------- Current Sensor ----------------
const int   ISENSE_PIN = A0;
const float MV_PER_AMP = 118.0f;

float vref_mV = 5000.0f;
float zero_mV = 2500.0f;

// ---------------- Logging Settings ----------------
const uint16_t SAMPLE_MS = 10;

const uint16_t PRE_MS  = 200;
const uint16_t POST_MS = 2000;

const uint16_t PRE_N  = PRE_MS  / SAMPLE_MS;
const uint16_t POST_N = POST_MS / SAMPLE_MS;

float preBuf[PRE_N];
uint16_t preIdx = 0;
bool preFilled = false;

// ---------------- Utility ----------------
float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

long readVref_mV() {
#if defined(__AVR_ATmega328P__)
  ADMUX = _BV(REFS0)|_BV(MUX3)|_BV(MUX2)|_BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  long r = ADCL; r |= (long)ADCH << 8;
  return 1126400L / r;
#else
  return 3300;
#endif
}

float readSensor_mV() {
  int adc = analogRead(ISENSE_PIN);
  return (adc * vref_mV) / 1023.0f;
}

void calibrateZero() {
  float sum = 0;
  for (int i = 0; i < 400; i++) {
    sum += readSensor_mV();
    delay(2);
  }
  zero_mV = sum / 400.0f;
}

float readCurrentA() {
  const int N = 25;
  float sum = 0;
  for (int i = 0; i < N; i++) sum += readSensor_mV();

  float v = sum / N;
  float I = (v - zero_mV) / MV_PER_AMP;

  if (fabs(I) < 0.03f) I = 0.0f;
  return I;
}

void setCurrent(float Icmd, bool useComp) {
  Icmd = clampf(Icmd, 0.0f, I_MAX);

  float I_send = Icmd;
  if (useComp && Icmd > 0.0f && Icmd < 1.0f) I_send += I_COMP;

  I_send = clampf(I_send, 0.0f, I_MAX);

  float v_ctrl = (I_send / I_MAX) * CTRL_VMAX;
  float v_dac  = v_ctrl * (DAC_VREF / CTRL_VMAX);

  uint16_t code = (uint16_t)((v_dac / DAC_VREF) * 65535.0f);

  Wire.beginTransmission(DAC_ADDR);
  Wire.write(0x30);
  Wire.write(code >> 8);
  Wire.write(code & 0xFF);
  Wire.endTransmission();
}

void setCurrent(float Icmd) {
  setCurrent(Icmd, USE_COMPENSATION);
}

float kickValue(float Icmd) {
  float Ik = Icmd * KICK_GAIN;

  if (Icmd > 0.0f && Ik < (Icmd + KICK_MIN_A))
    Ik = Icmd + KICK_MIN_A;

  Ik = clampf(Ik, 0.0f, KICK_MAX_A);
  return Ik;
}

void pushPre(float I) {
  preBuf[preIdx++] = I;
  if (preIdx >= PRE_N) {
    preIdx = 0;
    preFilled = true;
  }
}

// ---------------- Logging ----------------
void logStep(float Icmd) {

  Serial.println("t_ms\tI_meas_A");

  uint16_t available = preFilled ? PRE_N : preIdx;
  int start = preFilled ? preIdx : 0;

  // ---- Pre data ----
  for (uint16_t k = 0; k < available; k++) {
    uint16_t idx = (start + k) % PRE_N;
    long t = -((long)(available - k) * SAMPLE_MS);

    Serial.print(t);
    Serial.print("\t");
    Serial.println(preBuf[idx], 6);
  }

  // ---- Kick then settle (feedback-based) ----
  const float Ikick = kickValue(Icmd);

  setCurrent(Ikick);

  unsigned long tKick0 = millis();
  bool dropped = false;

  for (uint16_t k = 0; k < POST_N; k++) {

    delay(SAMPLE_MS);
    float I = readCurrentA();
    long t = k * SAMPLE_MS;

    if (!dropped) {
      bool hitThresh = (Icmd > 0.0f) && (I >= DROP_THRESH * Icmd);
      bool timedOut  = (millis() - tKick0) >= MAX_KICK_MS;

      if (hitThresh || timedOut) {
        setCurrent(Icmd);
        dropped = true;
      }
    }

    Serial.print(t);
    Serial.print("\t");
    Serial.println(I, 6);
  }

  setCurrent(0.0f);
}

// ---------------- Setup ----------------
void setup() {
  Wire.begin();
  Serial.begin(115200);

  vref_mV = readVref_mV();

  setCurrent(0.0f);
  delay(200);
  calibrateZero();
}

// ---------------- Loop ----------------
void loop() {

  float I = readCurrentA();
  pushPre(I);
  delay(SAMPLE_MS);

  if (Serial.available()) {
    String s = Serial.readStringUntil('\n');
    s.trim();
    if (s.length()) {
      float newCmd = clampf(s.toFloat(), 0.0f, I_MAX);
      logStep(newCmd);
    }
  }
}