#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===================== CONFIGURACION =====================
const char* WIFI_SSID = "Josepro";
const char* WIFI_PASS = "12345678";
const char* FIREBASE_HOST = "lumajiramaquinarias-d273c-default-rtdb.firebaseio.com";
String MACHINE_RTDB_ID = "ecFPpcTf1Rgd5OyC2XSwXyfpFHo2";

// ===================== PINES =====================
#define PIN_SCT013 34    // SCT-013-100A 50mA en GPIO 34

// ===================== SENSOR =====================
// SCT-013 100A:50mA
// Con burden resistor de 100 ohm: 50mA * 100 = 5V pico
// Con burden resistor de 47 ohm: 50mA * 47 = 2.35V pico
// Factor de calibracion: ajustar segun tu burden resistor
const float BURDEN_RESISTANCE = 47.0;  // ohms (ajustar al tuyo)
const float SENSOR_RATIO = 2000.0;      // 100A / 50mA = 2000
const float ADC_VOLTAGE = 3.3;          // Voltaje maximo ADC ESP32
const float ADC_MAX = 4095.0;           // Resolucion ADC

//muestras para RMS
const int NUM_SAMPLES = 200;

// ===================== VARIABLES =====================
float currentAmps = 0.0;
unsigned long lastSend = 0;

// ===================== FUNCIONES =====================
float readCurrentRMS() {
    long sumSquares = 0;
    int validSamples = 0;

    for (int i = 0; i < NUM_SAMPLES; i++) {
        int adcValue = analogRead(PIN_SCT013);

        // Convertir ADC a voltaje
        float voltage = (adcValue / ADC_MAX) * ADC_VOLTAGE;

        // Restar offset DC (centro del rango ADC = 1.65V)
        float voltageAC = voltage - (ADC_VOLTAGE / 2.0);

        sumSquares += voltageAC * voltageAC;
        validSamples++;

        delayMicroseconds(500);  // ~2kHz sample rate
    }

    if (validSamples == 0) return 0.0;

    // Voltaje RMS
    float rmsVoltage = sqrt(sumSquares / (float)validSamples);

    // Corriente RMS = Voltaje RMS / Burden * Factor sensor
    float rmsCurrent = (rmsVoltage / BURDEN_RESISTANCE) * SENSOR_RATIO;

    return rmsCurrent;
}

void sendSensorData() {
    StaticJsonDocument<128> doc;
    doc["type"] = "sensor_data";
    doc["current_a"] = round(currentAmps * 100) / 100.0;
    doc["temperature_c"] = 25.0;
    doc["timestamp"] = millis();

    serializeJson(doc, Serial);
    Serial.println();
}

void uploadToFirebase() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    int ts = millis();

    // Subir corriente
    String url1 = "https://" + String(FIREBASE_HOST) + "/sensors/" + MACHINE_RTDB_ID + "/sct013.json";
    http.begin(url1);
    http.addHeader("Content-Type", "application/json");
    String body1 = "{\"current_a\":" + String(currentAmps, 2) + ",\"timestamp\":" + String(ts) + "}";
    http.POST(body1);
    http.end();

    // Subir temperatura fija (para que la app no muestre error)
    String url2 = "https://" + String(FIREBASE_HOST) + "/sensors/" + MACHINE_RTDB_ID + "/thermistor.json";
    http.begin(url2);
    http.addHeader("Content-Type", "application/json");
    String body2 = "{\"temperature_c\":25.0,\"timestamp\":" + String(ts) + "}";
    http.POST(body2);
    http.end();
}

// ===================== SETUP =====================
void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(PIN_SCT013, INPUT);

    Serial.println("{\"type\":\"boot\",\"message\":\"SCT-013 100A listo\"}");

    // Conectar WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.print("WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(" OK");

    Serial.println("{\"type\":\"ready\",\"message\":\"Sistema listo\"}");
}

// ===================== LOOP =====================
void loop() {
    unsigned long now = millis();

    // Leer sensor cada segundo
    if (now - lastSend >= 1000) {
        lastSend = now;

        currentAmps = readCurrentRMS();

        // Enviar por Serial
        sendSensorData();

        // Subir a Firebase
        uploadToFirebase();
    }
}
