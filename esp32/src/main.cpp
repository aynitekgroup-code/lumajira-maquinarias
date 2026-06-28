#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "EmonLib.h"
#include <math.h>

// ============================================================
// CONFIGURACIÓN — CAMBIA ESTOS VALORES
// ============================================================
const char* WIFI_SSID     = "Josepro";
const char* WIFI_PASSWORD = "12345678";
const char* FIREBASE_HOST = "lumajiramaquinarias-9f2d4-default-rtdb.firebaseio.com";

// ⚠️  REEMPLAZA con tu API key real de Firebase Console
// Firebase Console → Proyecto → Configuración → API Key
const char* FIREBASE_API_KEY = "AIzaSyAcy7oZip5edaB1gnX6WrB4_d65BbXpvi4";

const char* MACHINE_ID = "t6WfDV4dLfcg91PkdmXwTblkbLl1";

// ============================================================
// PINES
// ============================================================
const int SCT_PIN           = 34;   // ADC-only pin — corriente
const int THERMISTOR_PIN    = 36;   // ADC-only pin — temperatura
const int EMERGENCY_STOP_PIN = 27;

// Motor Inyección (Motor 1)
const int INJ_STEP_PIN = 12;
const int INJ_DIR_PIN  = 13;

// Motor Rotación (Motor 2)
const int ROT_STEP_PIN = 14;
const int ROT_DIR_PIN  = 15;

// Calentador (Relay/PWM)
const int HEATER_PIN = 26;

// ============================================================
// CONSTANTES
// ============================================================
// CALIBRATION: ajusta comparando con multímetro
// SCT-2185 con Rb=33Ω → empieza en 11.0 y afina
const float CALIBRATION      = 11.0;   // ← CORREGIDO (era 29.0)
const float NOISE_THRESHOLD  = 0.3;    // A — lecturas bajo esto = 0

const unsigned long SEND_INTERVAL         = 2000;  // ms entre envíos Firebase
const unsigned long COMMAND_CHECK_INTERVAL = 500;

// NTC 10K Thermistor — Steinhart-Hart
const float THERMISTOR_NOMINAL = 10000.0;
const float TEMP_NOMINAL       = 25.0;
const float B_COEFFICIENT      = 3950.0;
const float SERIES_RESISTOR    = 10000.0;

// PID
const float KP = 2.0;
const float KI = 0.5;
const float KD = 1.0;

// Límites de seguridad
const float MAX_TEMP    = 260.0;   // °C — para emergencia
const float MIN_TEMP    = 100.0;   // °C — mínimo para inyectar
const float MAX_CURRENT =  12.0;   // A  — dispara emergencia

// ============================================================
// OBJETOS GLOBALES
// ============================================================
FirebaseData    fbdo;
FirebaseData    fbdoStream;
FirebaseAuth    fbAuth;
FirebaseConfig  fbConfig;
EnergyMonitor   emon1;

unsigned long lastSend        = 0;
unsigned long lastCommandCheck = 0;
bool          firebaseReady   = false;

// Temperatura y PID
float currentTemp   = 0.0;
float targetTemp    = 0.0;
float pidOutput     = 0.0;
float pidError      = 0.0;
float pidIntegral   = 0.0;
float pidLastError  = 0.0;
unsigned long lastPidTime = 0;

// Estado de la máquina
enum MachineState { IDLE, HEATING, INJECTING, COOLING, ERROR_STATE };
MachineState machineState = IDLE;

// Estado de motores
bool injectionRunning = false;
bool rotationRunning  = false;
int  injectionSpeed   = 50;
int  rotationSpeed    = 30;

// Seguridad
bool emergencyStopActive = false;

// ============================================================
// PROTOTIPOS (necesarios por orden de definición)
// ============================================================
String machineStateToString();
void   emergencyStop();
void   resetEmergencyStop();
void   connectWiFi();
void   setupFirebaseStream();
void   sendSensorData();

// ============================================================
// TEMPERATURA — Steinhart-Hart NTC 10K
// ============================================================
float readThermistor() {
    int   adcValue   = analogRead(THERMISTOR_PIN);
    if (adcValue <= 0) return -999.0;   // protección división por cero

    float resistance = SERIES_RESISTOR / ((4095.0 / (float)adcValue) - 1.0);

    float steinhart  = resistance / THERMISTOR_NOMINAL;
    steinhart = log(steinhart);
    steinhart /= B_COEFFICIENT;
    steinhart += 1.0f / (TEMP_NOMINAL + 273.15f);
    steinhart  = 1.0f / steinhart;
    steinhart -= 273.15f;

    return steinhart;
}

// ============================================================
// PID — Control de temperatura
// ============================================================
float computePID(float current, float target) {
    unsigned long now = millis();
    float dt = (now - lastPidTime) / 1000.0f;
    if (dt <= 0) dt = 0.001f;   // evita división por cero
    lastPidTime = now;

    pidError     = target - current;
    pidIntegral += pidError * dt;

    // Anti-windup
    if (pidIntegral > 255.0f) pidIntegral = 255.0f;
    if (pidIntegral <   0.0f) pidIntegral =   0.0f;

    float derivative = (pidError - pidLastError) / dt;
    pidLastError = pidError;

    float output = KP * pidError + KI * pidIntegral + KD * derivative;

    if (output > 255.0f) output = 255.0f;
    if (output <   0.0f) output =   0.0f;

    return output;
}

void setHeaterPower(int power) {
    analogWrite(HEATER_PIN, (!emergencyStopActive && power > 0) ? power : 0);
}

// ============================================================
// MOTORES — Stepper
// ============================================================
void moveMotor(int stepPin, int dirPin, int steps, bool direction, int speed) {
    digitalWrite(dirPin, direction ? HIGH : LOW);
    int delayUs = max(100, 1000 / speed);   // mínimo 100 µs

    for (int i = 0; i < steps; i++) {
        if (emergencyStopActive) break;
        digitalWrite(stepPin, HIGH);
        delayMicroseconds(delayUs);
        digitalWrite(stepPin, LOW);
        delayMicroseconds(delayUs);
    }
}

void startInjection(int speed) {
    if (emergencyStopActive || currentTemp < MIN_TEMP) {
        Serial.println("Inyección bloqueada: emergencia activa o temp insuficiente");
        return;
    }
    injectionRunning = true;
    machineState     = INJECTING;
    moveMotor(INJ_STEP_PIN, INJ_DIR_PIN, 200, true, speed);
    injectionRunning = false;
    if (machineState != ERROR_STATE) machineState = IDLE;
}

void startRotation(int speed) {
    if (emergencyStopActive) return;
    rotationRunning = true;
    moveMotor(ROT_STEP_PIN, ROT_DIR_PIN, 1000, true, speed);
    rotationRunning = false;
}

// ============================================================
// SEGURIDAD
// ============================================================
void emergencyStop() {
    emergencyStopActive = true;
    machineState        = ERROR_STATE;
    setHeaterPower(0);
    injectionRunning = false;
    rotationRunning  = false;
    Serial.println("⚠️  EMERGENCIA ACTIVA");
}

void resetEmergencyStop() {
    emergencyStopActive = false;
    machineState        = IDLE;
    pidIntegral         = 0;
    pidLastError        = 0;
    Serial.println("✅ Emergencia reseteada");
}

// ============================================================
// ESTADO → STRING
// ============================================================
String machineStateToString() {
    switch (machineState) {
        case IDLE:       return "idle";
        case HEATING:    return "heating";
        case INJECTING:  return "injecting";
        case COOLING:    return "cooling";
        case ERROR_STATE: return "error";
        default:         return "idle";
    }
}

// ============================================================
// WIFI
// ============================================================
void connectWiFi() {
    WiFi.disconnect(true);
    delay(500);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.printf("Conectando a %s", WIFI_SSID);

    unsigned long t = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t < 30000) {
        Serial.print(".");
        delay(500);
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\nWiFi OK! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\nFallo WiFi — reintentando en próximo ciclo");
    }
}

// ============================================================
// FIREBASE — Envío de datos
// ============================================================
void sendSensorData() {
    String basePath = String("machines/") + MACHINE_ID;

    // — Corriente —
    double irms = emon1.calcIrms(1480);  // ← CORREGIDO: 1480 muestras (era 200, muy pocas)
    if (irms < NOISE_THRESHOLD) irms = 0.0;

    FirebaseJson currentJson;
    currentJson.set("current_a",       irms);
    currentJson.set("timestamp/.sv",   "timestamp");
    currentJson.set("sensor",          "SCT-2185");   // ← CORREGIDO nombre del sensor
    currentJson.set("unit",            "A");
    Firebase.RTDB.pushJSON(&fbdo, (basePath + "/sensors/sct013").c_str(), &currentJson);

    // — Temperatura —
    currentTemp = readThermistor();

    FirebaseJson tempJson;
    tempJson.set("temperature_c",    currentTemp);
    tempJson.set("timestamp/.sv",    "timestamp");
    tempJson.set("sensor",           "NTC-10K");
    tempJson.set("unit",             "C");
    Firebase.RTDB.pushJSON(&fbdo, (basePath + "/sensors/thermistor").c_str(), &tempJson);

    // — Estado general —
    FirebaseJson statusJson;
    statusJson.set("state",            machineStateToString());
    statusJson.set("currentTemp",      currentTemp);
    statusJson.set("targetTemp",       targetTemp);
    statusJson.set("injectionSpeed",   injectionSpeed);
    statusJson.set("rotationSpeed",    rotationSpeed);
    statusJson.set("emergencyStop",    emergencyStopActive);
    statusJson.set("injectionRunning", injectionRunning);
    statusJson.set("rotationRunning",  rotationRunning);
    statusJson.set("timestamp/.sv",    "timestamp");
    Firebase.RTDB.setJSON(&fbdo, (basePath + "/status").c_str(), &statusJson);

    Serial.printf("Enviado: %.2f A | %.1f°C | Estado: %s\n",
                  irms, currentTemp, machineStateToString());
}

// ============================================================
// FIREBASE — Stream de comandos
// ============================================================
void streamCallback(StreamData data) {
    if (data.dataType() != "json") return;

    FirebaseJson*   json = data.toStreamObject();
    FirebaseJsonData jsonData;

    json->get(jsonData, "type");
    String commandType = jsonData.stringValue;
    Serial.printf("Comando: %s\n", commandType.c_str());

    if (commandType == "setTemp") {
        json->get(jsonData, "params/targetTemp");
        targetTemp = jsonData.floatValue;
        if (targetTemp > 0 && machineState == IDLE) machineState = HEATING;

    } else if (commandType == "inject") {
        json->get(jsonData, "params/speed");
        injectionSpeed = jsonData.intValue;
        if (injectionSpeed <= 0) injectionSpeed = 50;
        startInjection(injectionSpeed);

    } else if (commandType == "rotate") {
        json->get(jsonData, "params/speed");
        rotationSpeed = jsonData.intValue;
        if (rotationSpeed <= 0) rotationSpeed = 30;
        startRotation(rotationSpeed);

    } else if (commandType == "stop") {
        injectionRunning = false;
        rotationRunning  = false;
        machineState     = IDLE;
        setHeaterPower(0);

    } else if (commandType == "emergencyStop") {
        emergencyStop();

    } else if (commandType == "resetEmergency" ||
               commandType == "emergencyReset") {
        resetEmergencyStop();
    }
}

void streamTimeout(bool timeout) {
    if (timeout) {
        Serial.println("Stream timeout — reconectando...");
        Firebase.RTDB.beginStream(&fbdoStream,
            (String("machines/") + MACHINE_ID + "/commands").c_str());
    }
}

void setupFirebaseStream() {
    String commandPath = String("machines/") + MACHINE_ID + "/commands";
    Firebase.RTDB.beginStream(&fbdoStream, commandPath.c_str());
    Firebase.RTDB.setStreamCallback(&fbdoStream, streamCallback, streamTimeout);
    Firebase.RTDB.setStreamTimeout(&fbdoStream, 1000UL * 60 * 5);
}

// ============================================================
// SETUP
// ============================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    // ADC — resolución 12 bits, atenuación 11dB (0-3.3V)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // Sensor de corriente
    emon1.current(SCT_PIN, CALIBRATION);

    // Pines de motores
    pinMode(INJ_STEP_PIN, OUTPUT);  digitalWrite(INJ_STEP_PIN, LOW);
    pinMode(INJ_DIR_PIN,  OUTPUT);  digitalWrite(INJ_DIR_PIN,  LOW);
    pinMode(ROT_STEP_PIN, OUTPUT);  digitalWrite(ROT_STEP_PIN, LOW);
    pinMode(ROT_DIR_PIN,  OUTPUT);  digitalWrite(ROT_DIR_PIN,  LOW);

    // Calentador
    pinMode(HEATER_PIN, OUTPUT);
    analogWrite(HEATER_PIN, 0);

    // Botón de emergencia — INPUT_PULLUP (LOW = presionado)
    pinMode(EMERGENCY_STOP_PIN, INPUT_PULLUP);

    // WiFi
    connectWiFi();

    // Firebase
    fbConfig.host    = FIREBASE_HOST;
    fbConfig.api_key = FIREBASE_API_KEY;
    fbAuth.user.email    = "";
    fbAuth.user.password = "";
    Firebase.begin(&fbConfig, &fbAuth);
    Firebase.reconnectWiFi(true);

    unsigned long t = millis();
    while (!Firebase.ready() && millis() - t < 10000) { delay(200); }
    firebaseReady = Firebase.ready();
    Serial.println(firebaseReady ? "Firebase OK ✅" : "Firebase FALLO ❌");

    if (firebaseReady) setupFirebaseStream();

    lastPidTime = millis();
    Serial.println("Setup completo — AcademIA Machine Monitor v2.0");
}

// ============================================================
// LOOP
// ============================================================
void loop() {
    // — Botón de emergencia físico —
    if (digitalRead(EMERGENCY_STOP_PIN) == LOW) {
        emergencyStop();
        Serial.println("EMERGENCY STOP BUTTON PRESSED!");
    }

    // — Envío periódico a Firebase —
    if (millis() - lastSend >= SEND_INTERVAL) {
        lastSend = millis();

        if (firebaseReady && WiFi.status() == WL_CONNECTED) {
            sendSensorData();
        } else {
            Serial.println("WiFi caído — reconectando...");
            connectWiFi();
            firebaseReady = Firebase.ready();
            if (firebaseReady) setupFirebaseStream();
        }
    }

    // — Control PID de temperatura —
    if (machineState == HEATING || machineState == INJECTING) {
        currentTemp = readThermistor();

        if (currentTemp >= MAX_TEMP) {
            emergencyStop();
            Serial.println("❌ TEMPERATURA MÁXIMA EXCEDIDA!");
        } else {
            pidOutput = computePID(currentTemp, targetTemp);
            setHeaterPower((int)pidOutput);

            if (currentTemp >= targetTemp - 2.0f && machineState == HEATING) {
                Serial.printf("✅ Temperatura objetivo alcanzada: %.1f°C\n", currentTemp);
            }
        }
    }

    // — Seguridad de corriente (cada ciclo) —
    double irms = emon1.calcIrms(1480);
    if (irms > MAX_CURRENT && !emergencyStopActive) {
        emergencyStop();
        Serial.printf("❌ CORRIENTE MÁXIMA EXCEDIDA: %.2f A\n", irms);
    }

    // — Mantener stream Firebase activo —
    Firebase.RTDB.readTimeout(&fbdoStream);
}