#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ============================================================
// LUMAJIRAMAQUINARIAS - ESP32 + SCT-013 + 2x NEMA23 + 2x TB6600
// ============================================================
// Fuente 12V para motores (VCC/GND de TB6600). ¡GND comun con ESP32!
// Senales del ESP32 pasan por conversor de nivel 3.3V -> 5V al TB6600.
//
// Cableado configurado:
//   Motor 1 (inyeccion): PUL=27 DIR=26 ENA=25
//   Motor 2 (rotacion) : PUL=13 DIR=12 ENA=14
//   Sensor SCT-013     : GPIO34
//
// !!! GPIO12 PROHIBIDO (era DIR M2): es pin de "strapping".
// En HIGH durante el arranque pone la flash a 1.8V: la placa no
// bootea ni graba. DIR M2 vive ahora en GPIO32.
// ============================================================

const char* WIFI_SSID = "Josepro";
const char* WIFI_PASS = "12345678";

const char* SUPABASE_HOST = "iqdthjimoxrzgqrqjhlq.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZHRoamltb3hyemdxcnFqaGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgyMDksImV4cCI6MjEwMzU4NDIwOX0.dedUoBoqsDynZXhZLHO6hjni7sYKaKwR7zuFa3A7JPs";
const char* MACHINE_ID = "de570528-0f87-4c5b-9548-5d94fac03635";

// ---------- Pines ----------
#define PIN_SCT013 34

#define PIN_M1_PUL 27
#define PIN_M1_DIR 26
#define PIN_M1_ENA 25

#define PIN_M2_PUL 13
#define PIN_M2_DIR 32   // GPIO12 prohibido: strapping de voltaje flash
#define PIN_M2_ENA 14

// TB6600: ENA optoacoplado. Con PUL+/DIR+/ENA+ a 5V y los "-" al
// conversor de nivel: ENA en LOW = driver habilitado (motor frenado),
// ENA en HIGH = driver liberado. Si tu motor queda libre cuando deberia
// estar frenado, cambia a false.
#define ENA_ACTIVE_LOW true

// 1600 pulsos/rev (DIP TB6600: OFF-ON-ON en S1-S2-S3 tipico 1600).
// Si cambias microstepping, actualiza este valor.
#define PULSES_PER_REV 1600

// ---------- Tiempos ----------
const int NUM_SAMPLES = 1400;
const unsigned long SEND_INTERVAL_MS = 2000;
const unsigned long CMD_POLL_INTERVAL_MS = 3000;
const unsigned long STATUS_INTERVAL_MS = 5000;

// ---------- Estado global ----------
float currentAmps = 0.0;
float adcOffset = 2048.0;
unsigned long lastSend = 0;
unsigned long lastCmdPoll = 0;
unsigned long lastStatus = 0;
unsigned long lastNtpCheck = 0;
unsigned long lastWifiCheck = 0;
int uploadFails = 0;
int wifiFails = 0;
bool autoMode = true;      // ciclo de prueba automatico
bool estop = false;        // paro de emergencia
String lastSeenCmd = "";   // created_at del ultimo comando procesado
bool firstPoll = true;

// ---------- Motores (no bloqueante) ----------
struct Stepper {
    Stepper(const char* n, uint8_t p, uint8_t d, uint8_t e) : name(n), pul(p), dir(d), ena(e) {}
    const char* name;
    uint8_t pul, dir, ena;
    bool enabled = false;
    bool running = false;
    bool remote = false;      // ordenado desde plataforma/serial (pausa ciclo auto)
    int speedPct = 50;        // 10..100
    unsigned long stepIntervalUs = 625; // ~1 rev/s a 1600 p/rev
    unsigned long lastStepUs = 0;
    long stepsRemaining = 0;  // -1 = continuo, 0 = detenido, >0 = cuenta atras
    long stepsDone = 0;
};

Stepper m1 = {"M1", PIN_M1_PUL, PIN_M1_DIR, PIN_M1_ENA};
Stepper m2 = {"M2", PIN_M2_PUL, PIN_M2_DIR, PIN_M2_ENA};

// speed 10..100 -> 0.2..2.0 rev/s
static unsigned long speedToIntervalUs(int speed) {
    speed = constrain(speed, 10, 100);
    float revs = 0.2f + (speed - 10) * (1.8f / 90.0f);
    return (unsigned long)(1000000.0f / (PULSES_PER_REV * revs));
}

static void stepperEnable(Stepper& m, bool en) {
    m.enabled = en;
    if (ENA_ACTIVE_LOW) digitalWrite(m.ena, en ? LOW : HIGH);
    else digitalWrite(m.ena, en ? HIGH : LOW);
    if (!en) m.running = false;
    Serial.printf("[%s] %s\n", m.name, en ? "habilitado" : "liberado");
}

static void stepperStop(Stepper& m) {
    m.running = false;
    m.stepsRemaining = 0;
    m.remote = false;
    digitalWrite(m.pul, LOW);
}

// steps > 0: mover N pasos en dir (true=HIGH/CW). steps < 0: continuo.
static void stepperMove(Stepper& m, long steps, bool dirHigh, int speed) {
    if (estop) { Serial.println("[MOT] bloqueado: emergencia activa"); return; }
    m.speedPct = constrain(speed, 10, 100);
    m.stepIntervalUs = speedToIntervalUs(m.speedPct);
    digitalWrite(m.dir, dirHigh ? HIGH : LOW);
    delayMicroseconds(10); // setup DIR antes de pulsar
    stepperEnable(m, true);
    m.stepsRemaining = steps;
    m.stepsDone = 0;
    m.lastStepUs = micros();
    m.running = true;
    Serial.printf("[%s] marcha dir=%s pasos=%ld vel=%d%% (%luus/paso)\n",
                  m.name, dirHigh ? "CW" : "CCW", steps, m.speedPct, m.stepIntervalUs);
}

static void stepperUpdate(Stepper& m) {
    if (!m.running || !m.enabled || estop) return;
    if (m.stepsRemaining == 0) { m.running = false; return; }
    unsigned long now = micros();
    if (now - m.lastStepUs >= m.stepIntervalUs) {
        m.lastStepUs = now;
        digitalWrite(m.pul, HIGH);
        delayMicroseconds(5); // TB6600 pide pulso > 2.5us
        digitalWrite(m.pul, LOW);
        m.stepsDone++;
        if (m.stepsRemaining > 0) {
            m.stepsRemaining--;
            if (m.stepsRemaining == 0) {
                m.running = false;
                m.remote = false;
                Serial.printf("[%s] tramo listo (%ld pasos)\n", m.name, m.stepsDone);
            }
        }
    }
}

static bool anyRunning() { return m1.running || m2.running; }
static bool anyRemote() { return m1.remote || m2.remote; }

static void stopAll(const char* why) {
    stepperStop(m1);
    stepperStop(m2);
    Serial.printf("[MOT] todo detenido (%s)\n", why);
}

static void setEstop(bool on) {
    estop = on;
    if (on) {
        stepperStop(m1); stepperStop(m2);
        stepperEnable(m1, false); stepperEnable(m2, false);
        Serial.println("[ESTOP] ACTIVADO: drivers liberados");
    } else {
        Serial.println("[ESTOP] liberado. Drivers listos.");
    }
}

// ---------- Ciclo automatico de prueba ----------
// M1 CW 1rev -> pausa -> M1 CCW 1rev -> pausa -> M2 CW -> pausa -> M2 CCW -> pausa ...
enum AutoPhase { A_M1_CW, A_P1, A_M1_CCW, A_P2, A_M2_CW, A_P3, A_M2_CCW, A_P4 };
AutoPhase autoPhase = A_M1_CW;
unsigned long autoPhaseT = 0;

static void autoCycle() {
    if (!autoMode || estop || anyRemote() || anyRunning()) return;
    if (millis() - autoPhaseT < 800 && autoPhaseT != 0) return;
    switch (autoPhase) {
        case A_M1_CW:  stepperMove(m1, PULSES_PER_REV, true, 50);  autoPhase = A_P1; break;
        case A_P1:     autoPhase = A_M1_CCW; autoPhaseT = millis(); break;
        case A_M1_CCW: stepperMove(m1, PULSES_PER_REV, false, 50); autoPhase = A_P2; break;
        case A_P2:     autoPhase = A_M2_CW; autoPhaseT = millis(); break;
        case A_M2_CW:  stepperMove(m2, PULSES_PER_REV, true, 50);  autoPhase = A_P3; break;
        case A_P3:     autoPhase = A_M2_CCW; autoPhaseT = millis(); break;
        case A_M2_CCW: stepperMove(m2, PULSES_PER_REV, false, 50); autoPhase = A_P4; break;
        case A_P4:     autoPhase = A_M1_CW; autoPhaseT = millis(); break;
    }
    if (autoPhase == A_P1 || autoPhase == A_P3) autoPhaseT = millis();
}

// ---------- WiFi / NTP / sensor (igual que antes) ----------
void ensureWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;
    unsigned long now = millis();
    if (now - lastWifiCheck < 5000) return;
    lastWifiCheck = now;
    wifiFails++;
    Serial.print("[WIFI] reconectando... intento=");
    Serial.println(wifiFails);
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    unsigned long t = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t < 10000) delay(200);
    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[WIFI] OK IP=");
        Serial.println(WiFi.localIP());
        wifiFails = 0;
    }
}

float readCurrentRMS() {
    double sumSquares = 0.0;
    for (int i = 0; i < NUM_SAMPLES; i++) {
        int adcValue = analogRead(PIN_SCT013);
        double diff = (double)adcValue - (double)adcOffset;
        sumSquares += diff * diff;
        delayMicroseconds(100);
    }
    float rmsADC = sqrt((float)(sumSquares / NUM_SAMPLES));
    float rmsVoltage = (rmsADC / 4095.0) * 3.3;
    float sensorVoltage = rmsVoltage * 2.0;
    return sensorVoltage * 15.0;
}

int64_t epochMs() {
    struct timeval tv;
    gettimeofday(&tv, nullptr);
    return (int64_t)tv.tv_sec * 1000LL + tv.tv_usec / 1000LL;
}

bool timeSynced() { return time(nullptr) > 1600000000L; }

void syncNTP() {
    if (timeSynced()) return;
    configTime(-5 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    struct tm timeinfo;
    int ntpTry = 0;
    while (!getLocalTime(&timeinfo, 1500) && ntpTry < 8) { ntpTry++; delay(300); }
    if (timeSynced()) { Serial.print("[NTP] OK epochMs="); Serial.println(epochMs()); }
    else Serial.println("[NTP] pendiente (reintento en 30s)");
}

// ---------- Supabase ----------
static void sbHeaders(HTTPClient& http) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
}

int uploadToSupabase() {
    if (WiFi.status() != WL_CONNECTED) { Serial.println("[HTTP] omitido: wifi caido"); return -1; }
    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(8000);
    HTTPClient http;
    String url = "https://" + String(SUPABASE_HOST) + "/rest/v1/sensor_readings";
    http.begin(client, url);
    http.setTimeout(8000);
    sbHeaders(http);
    http.addHeader("Prefer", "return=minimal");
    String body = "{\"machine_id\":\"" + String(MACHINE_ID) +
                  "\",\"current_a\":" + String(currentAmps, 2) +
                  ",\"timestamp\":" + String((long long)epochMs()) + "}";
    int code = http.POST(body);
    if (code <= 0) { Serial.print("[HTTP] fallo code="); Serial.println(code); }
    else if (code >= 400) { Serial.print("[HTTP] "); Serial.print(code); Serial.print(" "); Serial.println(http.getString()); }
    else if (code >= 200 && code < 300) {
        static int okCount = 0; okCount++;
        if (okCount == 1 || okCount % 15 == 0) { Serial.print("[HTTP] "); Serial.print(code); Serial.print(" ok="); Serial.println(okCount); }
    }
    http.end();
    return code;
}

// Ejecuta un comando remoto sobre los motores
static void execCommand(const char* type, JsonObject params) {
    int speed = params["speed"] | 50;
    long steps = params["steps"] | 0; // 0 = continuo
    String sm = String(type);
    sm.toLowerCase();
    if (sm == "inject") {
        bool dir = params["dir"] | true;
        stepperMove(m1, steps == 0 ? -1 : steps, dir, speed);
        m1.remote = true;
    } else if (sm == "rotate") {
        bool dir = params["dir"] | true;
        stepperMove(m2, steps == 0 ? -1 : steps, dir, speed);
        m2.remote = true;
    } else if (sm == "stop") {
        stopAll("cmd");
    } else if (sm == "emergencystop") {
        setEstop(true);
    } else if (sm == "emergencyreset") {
        setEstop(false);
    } else if (sm == "auto") {
        String v = params["on"] | "true";
        autoMode = !(v == "false" || v == "0" || v == "off");
        Serial.printf("[CMD] auto=%s\n", autoMode ? "ON" : "OFF");
    } else {
        Serial.printf("[CMD] tipo desconocido: %s\n", type);
    }
}

// Lee comandos nuevos de Supabase (requiere migration 004). Fallo = solo log.
static void pollCommands() {
    if (WiFi.status() != WL_CONNECTED) return;
    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(8000);
    HTTPClient http;
    String url = "https://" + String(SUPABASE_HOST) +
                 "/rest/v1/machine_commands?machine_id=eq." + String(MACHINE_ID) +
                 "&order=created_at.desc&limit=5";
    http.begin(client, url);
    http.setTimeout(8000);
    sbHeaders(http);
    int code = http.GET();
    if (code != 200) {
        static unsigned long lastWarn = 0;
        if (millis() - lastWarn > 60000) {
            lastWarn = millis();
            Serial.printf("[CMD] poll code=%d (aplica migration 004 si es 401/403/404)\n", code);
        }
        http.end();
        return;
    }
    String payload = http.getString();
    http.end();
    DynamicJsonDocument doc(4096);
    if (deserializeJson(doc, payload)) { Serial.println("[CMD] JSON invalido"); return; }
    JsonArray arr = doc.as<JsonArray>();
    if (arr.size() == 0) return;
    // arr viene desc: procesar del mas viejo al mas nuevo
    for (int i = arr.size() - 1; i >= 0; i--) {
        JsonObject o = arr[i];
        const char* created = o["created_at"] | "";
        const char* type = o["type"] | "";
        if (firstPoll) continue; // primera vez: solo marcar, no re-ejecutar historial
        if (lastSeenCmd != "" && String(created) <= lastSeenCmd) continue;
        Serial.printf("[CMD] nuevo: %s\n", type);
        JsonObject params = o["params"].as<JsonObject>();
        execCommand(type, params);
    }
    const char* newest = arr[0]["created_at"] | "";
    if (strlen(newest)) lastSeenCmd = String(newest);
    firstPoll = false;
}

// Sube estado de motores (requiere migration 004). Fallo = solo log.
static void upsertStatus() {
    if (WiFi.status() != WL_CONNECTED) return;
    char updated[32] = "";
    if (timeSynced()) {
        time_t t = time(nullptr);
        struct tm* g = gmtime(&t);
        strftime(updated, sizeof(updated), "%Y-%m-%dT%H:%M:%SZ", g);
    }
    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(8000);
    HTTPClient http;
    String url = "https://" + String(SUPABASE_HOST) + "/rest/v1/machine_status";
    http.begin(client, url);
    http.setTimeout(8000);
    sbHeaders(http);
    http.addHeader("Prefer", "resolution=merge-duplicates");
    String body = "{\"machine_id\":\"" + String(MACHINE_ID) + "\",\"status\":{"
        "\"m1\":{\"run\":" + String(m1.running ? "true" : "false") +
        ",\"spd\":" + String(m1.speedPct) + ",\"steps\":" + String((long)m1.stepsDone) + "},"
        "\"m2\":{\"run\":" + String(m2.running ? "true" : "false") +
        ",\"spd\":" + String(m2.speedPct) + ",\"steps\":" + String((long)m2.stepsDone) + "},"
        "\"auto\":" + String(autoMode ? "true" : "false") +
        ",\"estop\":" + String(estop ? "true" : "false") +
        ",\"current_a\":" + String(currentAmps, 2) + "}";
    if (strlen(updated)) body += ",\"updated_at\":\"" + String(updated) + "\"";
    body += "}";
    int code = http.POST(body);
    if (code <= 0 || code >= 400) {
        static unsigned long lastWarn = 0;
        if (millis() - lastWarn > 60000) {
            lastWarn = millis();
            Serial.printf("[STATUS] code=%d (aplica migration 004 si es 401/403)\n", code);
        }
    }
    http.end();
}

// ---------- Comandos por USB (prueba sin plataforma) ----------
// m1 <pasos> [vel] [cw|ccw] | m2 ... | stop | auto on|off | estop | reset | status | help
static void handleSerial() {
    if (!Serial.available()) return;
    String line = Serial.readStringUntil('\n');
    line.trim(); line.toLowerCase();
    if (line.length() == 0) return;
    if (line == "help") {
        Serial.println("cmd: m1 <pasos|0=cont> [vel 10-100] [cw|ccw] | m2 ... | stop | auto on|off | estop | reset | status");
        return;
    }
    if (line == "stop") { stopAll("serial"); return; }
    if (line == "estop") { setEstop(true); return; }
    if (line == "reset") { setEstop(false); return; }
    if (line == "status") {
        Serial.printf("auto=%d estop=%d M1 run=%d pasos=%ld M2 run=%d pasos=%ld I=%.2fA\n",
                      autoMode, estop, m1.running, (long)m1.stepsDone, m2.running, (long)m2.stepsDone, currentAmps);
        return;
    }
    if (line.startsWith("auto")) {
        autoMode = line.indexOf("off") < 0;
        Serial.printf("auto=%s\n", autoMode ? "ON" : "OFF");
        return;
    }
    Stepper* m = nullptr;
    if (line.startsWith("m1")) m = &m1;
    else if (line.startsWith("m2")) m = &m2;
    if (m) {
        // parsear: m1 pasos vel dir
        long pasos = 1600; int vel = 50; bool dir = true;
        int a = line.indexOf(' ');
        if (a > 0) {
            pasos = line.substring(a + 1).toInt();
            int b = line.indexOf(' ', a + 1);
            if (b > 0) {
                vel = line.substring(a + 1, b).toInt();
                if (line.indexOf("ccw", b) >= 0) dir = false;
            } else if (line.indexOf("ccw") >= 0) dir = false;
        }
        stepperMove(*m, pasos == 0 ? -1 : pasos, dir, vel);
        m->remote = true;
        return;
    }
    Serial.println("? help");
}

// ---------- Setup / Loop ----------
void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(PIN_SCT013, INPUT);
    analogSetAttenuation(ADC_11db);
    analogSetWidth(12);

    pinMode(PIN_M1_PUL, OUTPUT); pinMode(PIN_M1_DIR, OUTPUT); pinMode(PIN_M1_ENA, OUTPUT);
    pinMode(PIN_M2_PUL, OUTPUT); pinMode(PIN_M2_DIR, OUTPUT); pinMode(PIN_M2_ENA, OUTPUT);
    digitalWrite(PIN_M1_PUL, LOW); digitalWrite(PIN_M2_PUL, LOW);
    digitalWrite(PIN_M1_DIR, HIGH); digitalWrite(PIN_M2_DIR, HIGH);
    stepperEnable(m1, true);
    stepperEnable(m2, true);

    Serial.println("[BOOT] ESP32 + SCT-013 + 2x NEMA23/TB6600 listo");
    Serial.println("[BOOT] Escribe 'help' para comandos de prueba");

    long sum = 0;
    for (int i = 0; i < 2000; i++) { sum += analogRead(PIN_SCT013); delayMicroseconds(100); }
    adcOffset = sum / 2000.0;
    Serial.printf("[CAL] offset=%.1f\n", adcOffset);

    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.print("[WIFI]");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) { delay(500); Serial.print("."); attempts++; }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(" OK");
        Serial.print("[IP] "); Serial.println(WiFi.localIP());
        syncNTP();
    } else Serial.println(" FAIL");

    autoPhaseT = millis();
    Serial.println("[READY] Sistema listo");
}

void loop() {
    unsigned long now = millis();

    if (!timeSynced() && WiFi.status() == WL_CONNECTED && now - lastNtpCheck >= 30000) {
        lastNtpCheck = now;
        syncNTP();
    }

    handleSerial();          // comandos USB
    stepperUpdate(m1);       // pulsos no bloqueantes
    stepperUpdate(m2);
    autoCycle();             // ciclo de prueba si nada remoto lo usa

    if (now - lastSend >= SEND_INTERVAL_MS) {
        lastSend = now;
        ensureWiFi();
        currentAmps = readCurrentRMS();
        Serial.printf("[SENSOR] amps=%.2f M1 run=%d M2 run=%d\n", currentAmps, m1.running, m2.running);
        int code = uploadToSupabase();
        if (code >= 200 && code < 300) uploadFails = 0;
        else if (code > 0) { uploadFails++; if (uploadFails == 1 || uploadFails % 10 == 0) Serial.printf("[UPLOAD] rechazos=%d\n", uploadFails); }
    }

    if (now - lastCmdPoll >= CMD_POLL_INTERVAL_MS) { lastCmdPoll = now; pollCommands(); }
    if (now - lastStatus >= STATUS_INTERVAL_MS) { lastStatus = now; upsertStatus(); }
}
