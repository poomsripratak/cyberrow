#include <Wire.h>
#include <math.h>

// ---------------- DAC / Controller ----------------
#define DAC_ADDR   0x4C
#define DAC_VREF   2.5f
#define CTRL_VMAX  5.0f

const float I_MAX  = 1.65f;
const float I_COMP = 0.01f;

const bool  USE_COMPENSATION = true;

// ---------------- Current Sensor ----------------
const int   ISENSE_PIN = A0;
const float MV_PER_AMP = 112.0f;

float vref_mV = 5000.0f;
float zero_mV = 2500.0f;

// ---------------- Logging Settings ----------------
const uint16_t SAMPLE_MS = 10;  // 100 Hz

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

void pushPre(float I) {
  preBuf[preIdx++] = I;
  if (preIdx >= PRE_N) {
    preIdx = 0;
    preFilled = true;
  }
}

// ---------------- Logging: STEP ----------------
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

  // ---- Apply step ----
  setCurrent(Icmd);

  // ---- Post data ----
  for (uint16_t k = 0; k < POST_N; k++) {
    delay(SAMPLE_MS);
    float I = readCurrentA();
    long t = k * SAMPLE_MS;

    Serial.print(t);
    Serial.print("\t");
    Serial.println(I, 6);
  }

  setCurrent(0.0f);
}

// ---------------- Logging: SINE ----------------
// Command: Icmd(t) = I0 + A*sin(2*pi*f*t)
void logSine(float I0, float A, float f_Hz, float duration_s) {

  // Keep waveform within 0..I_MAX
  A = fabs(A);
  if (I0 - A < 0.0f)   A = I0;
  if (I0 + A > I_MAX)  A = I_MAX - I0;
  A = clampf(A, 0.0f, I_MAX);

  const float w = 2.0f * 3.14159265f * f_Hz;
  const uint32_t Ts_us = (uint32_t)SAMPLE_MS * 1000UL;
  const uint32_t N = (uint32_t)(duration_s * 1000.0f / SAMPLE_MS);

  Serial.println("t_ms\tI_meas_A");

  uint32_t t0 = micros();
  uint32_t next = t0;

  for (uint32_t k = 0; k < N; k++) {

    // Wait until the scheduled sample time
    while ((int32_t)(micros() - next) < 0) { /* busy wait */ }
    uint32_t now = micros();
    float t_s = (now - t0) * 1e-6f;

    // Command sine using REAL time
    float Icmd = I0 + A * sinf(w * t_s);
    setCurrent(Icmd);

    // Measure & log
    float I = readCurrentA();
    uint32_t t_ms = (now - t0) / 1000UL;

    Serial.print((long)t_ms);
    Serial.print("\t");
    Serial.println(I, 6);

    next += Ts_us;
  }

  setCurrent(0.0f);
}

// -------- Simple token parsing (no sscanf) --------
bool nextToken(const String &s, int &pos, String &tok) {
  int n = s.length();
  while (pos < n && s.charAt(pos) == ' ') pos++;
  if (pos >= n) return false;
  int start = pos;
  while (pos < n && s.charAt(pos) != ' ') pos++;
  tok = s.substring(start, pos);
  tok.trim();
  return tok.length() > 0;
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
// Step: type a number, e.g. 0.50
// Sine: S I0 A f duration, e.g. S 0.60 0.20 0.5 8
void loop() {

  // Keep pre-buffer updated
  float I = readCurrentA();
  pushPre(I);
  delay(SAMPLE_MS);

  if (!Serial.available()) return;

  String s = Serial.readStringUntil('\n');
  s.trim();
  if (!s.length()) return;

  // Sine mode
  if (s.charAt(0) == 'S' || s.charAt(0) == 's') {
    int pos = 1;
    String t1, t2, t3, t4;

    if (!nextToken(s, pos, t1)) return;
    if (!nextToken(s, pos, t2)) return;
    if (!nextToken(s, pos, t3)) return;
    if (!nextToken(s, pos, t4)) return;

    float I0  = clampf(t1.toFloat(), 0.0f, I_MAX);
    float A   = fabs(t2.toFloat());
    float f   = t3.toFloat();
    float dur = t4.toFloat();

    if (f <= 0.0f || dur <= 0.0f) return;

    // Guardrails
    f   = clampf(f,   0.01f, 10.0f);
    dur = clampf(dur, 0.1f,  120.0f);

    logSine(I0, A, f, dur);
    return;
  }

  // Step mode (numeric)
  float cmd = clampf(s.toFloat(), 0.0f, I_MAX);
  logStep(cmd);
}