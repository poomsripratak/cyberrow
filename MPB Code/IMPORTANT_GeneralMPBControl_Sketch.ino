#include <Wire.h>
#include <math.h>

// ---------------- DAC / Controller ----------------
#define DAC_ADDR   0x4C
#define DAC_VREF   2.5f
#define CTRL_VMAX  5.0f

const float I_MAX  = 1.65f;
const float I_COMP = 0.01f;

// ---------------- Current Sensor ----------------
const int   ISENSE_PIN = A0;
const float MV_PER_AMP = 112.0f;   // calibrated sensitivity

float vref_mV = 5000.0f;
float zero_mV = 2500.0f;

// ---------------- Serial / Logging ----------------
const uint16_t PRINT_MS = 200;   // live print interval
unsigned long lastPrint = 0;

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
  long r = ADCL;
  r |= (long)ADCH << 8;
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
  float sum = 0.0f;
  for (int i = 0; i < 400; i++) {
    sum += readSensor_mV();
    delay(2);
  }
  zero_mV = sum / 400.0f;
}

float readCurrentA() {
  const int N = 25;
  float sum = 0.0f;

  for (int i = 0; i < N; i++) {
    sum += readSensor_mV();
  }

  float v = sum / N;
  float I = (v - zero_mV) / MV_PER_AMP;

  if (fabs(I) < 0.03f) I = 0.0f;
  return I;
}

void setCurrent(float Icmd) {
  Icmd = clampf(Icmd, 0.0f, I_MAX);

  float I_send = Icmd;
  if (Icmd > 0.0f && Icmd < 1.0f) {
    I_send += I_COMP;
  }

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

// ---------------- Setup ----------------
void setup() {
  Wire.begin();
  Serial.begin(115200);

  vref_mV = readVref_mV();

  setCurrent(0.0f);
  delay(200);
  calibrateZero();

  Serial.println("Enter desired current in amps, e.g. 0.50");
  Serial.print("Detected ADC reference (mV): ");
  Serial.println(vref_mV);
  Serial.print("Zero offset (mV): ");
  Serial.println(zero_mV, 2);
}

// ---------------- Loop ----------------
void loop() {
  // Check for new serial command
  if (Serial.available()) {
    String s = Serial.readStringUntil('\n');
    s.trim();

    if (s.length() > 0) {
      float newCmd = clampf(s.toFloat(), 0.0f, I_MAX);
      setCurrent(newCmd);

      Serial.print("Commanded current set to: ");
      Serial.print(newCmd, 3);
      Serial.println(" A");
    }
  }

  // Live measured current printout
  if (millis() - lastPrint >= PRINT_MS) {
    lastPrint = millis();

    float I_meas = readCurrentA();
    Serial.print("Measured current: ");
    Serial.print(I_meas, 3);
    Serial.println(" A");
  }
}