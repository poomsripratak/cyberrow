#include <Wire.h>

// ---------------- DAC / Controller ----------------
#define DAC_ADDR   0x4C
#define DAC_VREF   2.5f
#define CTRL_VMAX  5.0f

const float CTRL_I_FULL = 1.65f;   // true controller full-scale
const float USER_I_MAX  = 1.00f;   // hard cap for user commands
const float I_COMP      = 0.01f;   // low-current compensation
const bool  USE_COMPENSATION = true;

// ---------------- Timing ----------------
const int TOTAL_TIME_S            = 30;     // logged test duration after warm-up
const int WARMUP_TIME_S           = 20;     // warm-up before logging starts
const int NUM_DISTURBANCES        = 3;
const int DISTURBANCE_DURATION_MS = 2000;
const int MIN_GAP_S               = 5;
const uint16_t SAMPLE_MS          = 33;     // ~30 Hz serial updates

// ---------------- Current Levels ----------------
const float BASELINE_CURRENT_A    = 0.08f;
const float DISTURBANCE_CURRENT_A = 0.00f;

int disturbanceTimes[NUM_DISTURBANCES];

bool simulationRunning  = false;
bool warmupActive       = false;
bool disturbanceActive  = false;

unsigned long warmupStartMillis      = 0;
unsigned long simStartMillis         = 0;   // start of logged phase
unsigned long disturbanceStartMillis = 0;
unsigned long lastSampleMillis       = 0;
int activeDisturbanceIndex           = -1;

float manualCurrent = 0.0f;

// ---------------- Utility ----------------
float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

bool isNumericString(String s) {
  if (s.length() == 0) return false;

  bool hasDigit = false;
  for (unsigned int i = 0; i < s.length(); i++) {
    char c = s[i];

    if (c >= '0' && c <= '9') {
      hasDigit = true;
      continue;
    }
    if (c == '.' || c == '-' || c == '+') continue;

    return false;
  }
  return hasDigit;
}

void shuffleInts(int *arr, int n) {
  for (int i = n - 1; i > 0; i--) {
    int j = random(0, i + 1);
    int temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
}

// ---------------- DAC Output ----------------
void setCurrent(float Icmd, bool useComp) {
  Icmd = clampf(Icmd, 0.0f, USER_I_MAX);

  float I_send = Icmd;

  if (useComp && Icmd > 0.0f && Icmd < 1.0f) {
    I_send += I_COMP;
  }

  I_send = clampf(I_send, 0.0f, CTRL_I_FULL);

  float v_ctrl = (I_send / CTRL_I_FULL) * CTRL_VMAX;
  v_ctrl = clampf(v_ctrl, 0.0f, CTRL_VMAX);

  float v_dac = v_ctrl * (DAC_VREF / CTRL_VMAX);
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

// ---------------- Disturbance Generation ----------------
void generateDisturbances() {
  // Valid start times with at least 5 s between starts
  const int numCandidates = 12;
  int candidates[numCandidates] = {0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55};

  shuffleInts(candidates, numCandidates);

  for (int i = 0; i < NUM_DISTURBANCES; i++) {
    disturbanceTimes[i] = candidates[i];
  }

  // Sort into chronological order
  for (int i = 0; i < NUM_DISTURBANCES - 1; i++) {
    for (int j = i + 1; j < NUM_DISTURBANCES; j++) {
      if (disturbanceTimes[j] < disturbanceTimes[i]) {
        int temp = disturbanceTimes[i];
        disturbanceTimes[i] = disturbanceTimes[j];
        disturbanceTimes[j] = temp;
      }
    }
  }
}

// ---------------- Simulation Control ----------------
void printSchedule() {
  Serial.println();
  Serial.println("Generated disturbance schedule:");
  for (int i = 0; i < NUM_DISTURBANCES; i++) {
    Serial.print("Disturbance ");
    Serial.print(i + 1);
    Serial.print(": t = ");
    Serial.print(disturbanceTimes[i]);
    Serial.println(" s, output forced to 0.000 A");
  }
  Serial.println();
}

void beginLoggedSimulation() {
  warmupActive = false;
  disturbanceActive = false;
  activeDisturbanceIndex = -1;
  simStartMillis = millis();
  disturbanceStartMillis = 0;
  lastSampleMillis = 0;

  setCurrent(BASELINE_CURRENT_A);

  Serial.println();
  Serial.println("======================================");
  Serial.println("Warm-up complete");
  Serial.println("Starting 60-second disturbance simulation");
  Serial.print("Baseline current: ");
  Serial.print(BASELINE_CURRENT_A, 3);
  Serial.println(" A");
  Serial.print("Number of disturbances: ");
  Serial.println(NUM_DISTURBANCES);
  Serial.print("Disturbance current: ");
  Serial.print(DISTURBANCE_CURRENT_A, 3);
  Serial.println(" A");
  Serial.print("Disturbance duration: ");
  Serial.print(DISTURBANCE_DURATION_MS);
  Serial.println(" ms");
  Serial.println("Minimum spacing between disturbances: 5 s");
  Serial.println("Serial update rate: ~30 Hz");
  Serial.println("Send 's' to stop");
  Serial.println("======================================");
  printSchedule();
  Serial.println("t_ms,current_cmd_A");
}

void startSimulation() {
  generateDisturbances();

  simulationRunning = true;
  warmupActive = true;
  disturbanceActive = false;
  activeDisturbanceIndex = -1;

  warmupStartMillis = millis();
  simStartMillis = 0;
  disturbanceStartMillis = 0;
  lastSampleMillis = 0;

  setCurrent(BASELINE_CURRENT_A);

  Serial.println();
  Serial.println("======================================");
  Serial.println("Starting warm-up");
  Serial.print("Warm-up duration: ");
  Serial.print(WARMUP_TIME_S);
  Serial.println(" s");
  Serial.print("Warm-up current: ");
  Serial.print(BASELINE_CURRENT_A, 3);
  Serial.println(" A");
  Serial.println("No readings will be logged during warm-up");
  Serial.println("======================================");
  Serial.println();
}

void stopSimulation() {
  simulationRunning = false;
  warmupActive = false;
  disturbanceActive = false;
  activeDisturbanceIndex = -1;
  setCurrent(0.0f);

  Serial.println();
  Serial.println("Simulation stopped.");
  Serial.println("Output returned to 0 A.");
  Serial.println();
}

// ---------------- Manual Control ----------------
void setManualCurrent(float cmd) {
  manualCurrent = clampf(cmd, 0.0f, USER_I_MAX);
  setCurrent(manualCurrent);

  Serial.print("Manual current set to: ");
  Serial.print(manualCurrent, 3);
  Serial.print(" A");

  if (USE_COMPENSATION && manualCurrent > 0.0f && manualCurrent < 1.0f) {
    Serial.print("  (with +");
    Serial.print(I_COMP, 3);
    Serial.print(" A compensation)");
  }

  Serial.println();
}

void zeroManualCurrent() {
  manualCurrent = 0.0f;
  setCurrent(0.0f);
  Serial.println("Manual current reset to 0.000 A");
}

// ---------------- Serial Handling ----------------
void handleSerial() {
  if (!Serial.available()) return;

  String s = Serial.readStringUntil('\n');
  s.trim();

  if (s.length() == 0) return;

  if (s.equalsIgnoreCase("s")) {
    stopSimulation();
    return;
  }

  if (s.equalsIgnoreCase("r")) {
    if (!simulationRunning) {
      startSimulation();
    } else {
      Serial.println("Simulation already running.");
    }
    return;
  }

  if (s.equalsIgnoreCase("m")) {
    if (!simulationRunning) {
      zeroManualCurrent();
    } else {
      Serial.println("Stop the simulation first with 's'.");
    }
    return;
  }

  if (isNumericString(s)) {
    float cmd = clampf(s.toFloat(), 0.0f, USER_I_MAX);

    if (simulationRunning) {
      Serial.println("Simulation is running. Send 's' first, then enter a manual current.");
    } else {
      setManualCurrent(cmd);
    }
    return;
  }

  Serial.println("Unknown command.");
  Serial.println("Use:");
  Serial.println("  r  -> run simulation");
  Serial.println("  s  -> stop simulation");
  Serial.println("  m  -> output 0 A");
  Serial.println("  number -> manually set current");
}

// ---------------- Simulation Update ----------------
void updateSimulation() {
  if (!simulationRunning) return;

  unsigned long now = millis();

  // ---------------- Warm-up phase ----------------
  if (warmupActive) {
    unsigned long warmupElapsedMs = now - warmupStartMillis;

    if (warmupElapsedMs >= (unsigned long)WARMUP_TIME_S * 1000UL) {
      beginLoggedSimulation();
    }
    return;
  }

  // ---------------- Logged simulation phase ----------------
  unsigned long elapsedMs = now - simStartMillis;

  // ~30 Hz serial output
  if (now - lastSampleMillis >= SAMPLE_MS) {
    lastSampleMillis = now;

    float currentCmdNow = disturbanceActive ? DISTURBANCE_CURRENT_A : BASELINE_CURRENT_A;

    Serial.print(elapsedMs);
    Serial.print(",");
    Serial.println(currentCmdNow, 3);
  }

  // Start disturbance when due
  if (!disturbanceActive) {
    for (int i = 0; i < NUM_DISTURBANCES; i++) {
      unsigned long disturbanceTimeMs = (unsigned long)disturbanceTimes[i] * 1000UL;

      if (elapsedMs >= disturbanceTimeMs && elapsedMs < disturbanceTimeMs + 50) {
        activeDisturbanceIndex = i;
        disturbanceActive = true;
        disturbanceStartMillis = now;

        setCurrent(DISTURBANCE_CURRENT_A);

        Serial.print(">>> DISTURBANCE ");
        Serial.print(i + 1);
        Serial.print(" START at ");
        Serial.print(disturbanceTimes[i]);
        Serial.println(" s, output forced to 0.000 A");

        break;
      }
    }
  }

  // End disturbance after set duration and return to baseline
  if (disturbanceActive && (now - disturbanceStartMillis >= DISTURBANCE_DURATION_MS)) {
    setCurrent(BASELINE_CURRENT_A);

    Serial.print("<<< DISTURBANCE ");
    Serial.print(activeDisturbanceIndex + 1);
    Serial.print(" END, returned to ");
    Serial.print(BASELINE_CURRENT_A, 3);
    Serial.println(" A");

    disturbanceActive = false;
    activeDisturbanceIndex = -1;
  }

  // End simulation after logged duration
  if (elapsedMs >= (unsigned long)TOTAL_TIME_S * 1000UL) {
    simulationRunning = false;
    warmupActive = false;
    disturbanceActive = false;
    activeDisturbanceIndex = -1;
    setCurrent(0.0f);

    Serial.println();
    Serial.println("======================================");
    Serial.println("Simulation complete.");
    Serial.println("Output returned to 0 A.");
    Serial.println("======================================");
    Serial.println();
  }
}

// ---------------- Setup ----------------
void setup() {
  Wire.begin();
  Serial.begin(115200);

  randomSeed(micros());

  setCurrent(0.0f);

  Serial.println("MPB Current Controller Ready");
  Serial.println("Controller full-scale calibration = 1.65 A");
  Serial.println("User hard cap = 1.00 A");
  Serial.println("Low-current compensation = +0.01 A");
  Serial.println("Commands:");
  Serial.println("  r  -> run 20 s warm-up, then 60 s disturbance simulation");
  Serial.println("  s  -> stop simulation");
  Serial.println("  m  -> output 0 A");
  Serial.println("  number -> manually set current");
  Serial.println();
}

// ---------------- Loop ----------------
void loop() {
  handleSerial();
  updateSimulation();
}