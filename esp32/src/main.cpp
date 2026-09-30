#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>

const char* WIFI_SSID = "Josepro";
const char* WIFI_PASS = "12345678";

const char* SUPABASE_HOST = "iqdthjimoxrzgqrqjhlq.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZHRoamltb3hyemdxcnFqaGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgyMDksImV4cCI6MjEwMzU4NDIwOX0.dedUoBoqsDynZXhZLHO6hjni7sYKaKwR7zuFa3A7JPs";
const char* MACHINE_ID = "de570528-0f87-4c5b-9548-5d94fac03635";

#define PIN_SCT013 34

const int NUM_SAMPLES = 1400;
const unsigned long SEND_INTERVAL_MS = 2000;

float currentAmps = 0.0;
float adcOffset = 2048.0;
unsigned long lastSend = 0;
int uploadFails = 0;
unsigned long lastWifiCheck = 0;
int wifiFails = 0;

void ensureWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    unsigned long now = millis();
    if (now - lastWifiCheck < 5000) return;
    lastWifiCheck = now;

    wifiFails++;
    Serial.print("[WIFI] disconnected, reconnecting... attempt=");
    Serial.println(wifiFails);

    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    unsigned long t = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t < 10000) {
        delay(200);
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[WIFI] OK IP=");
        Serial.println(WiFi.localIP());
        wifiFails = 0;
    }
}


float readCurrentRMS() {
    long sumSquares = 0;

    for (int i = 0; i < NUM_SAMPLES; i++) {
        int adcValue = analogRead(PIN_SCT013);
        float diff = adcValue - adcOffset;
        sumSquares += diff * diff;
        delayMicroseconds(100);
    }

    float rmsADC = sqrt((float)sumSquares / NUM_SAMPLES);
    float rmsVoltage = (rmsADC / 4095.0) * 3.3;
    float sensorVoltage = rmsVoltage * 2.0;
    float amps = sensorVoltage * 15.0;

    return amps;
}

int64_t epochMs() {
    struct timeval tv;
    gettimeofday(&tv, nullptr);
    return (int64_t)tv.tv_sec * 1000LL + tv.tv_usec / 1000LL;
}

int uploadToSupabase() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[HTTP] skipped: wifi down");
        return -1;
    }

    HTTPClient http;
    String url = "https://" + String(SUPABASE_HOST) + "/rest/v1/sensor_readings";
    http.begin(url);
    http.setTimeout(8000);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
    http.addHeader("Prefer", "return=minimal");

    String body = "{\"machine_id\":\"" + String(MACHINE_ID) +
                  "\",\"current_a\":" + String(currentAmps, 2) +
                  ",\"timestamp\":" + String((long long)epochMs()) + "}";

    int code = http.POST(body);
    if (code <= 0) {
        Serial.print("[HTTP] fail code=");
        Serial.println(code);
        Serial.println(http.errorToString(code).c_str());
    } else if (code >= 400) {
        Serial.print("[HTTP] ");
        Serial.print(code);
        Serial.print(" ");
        Serial.println(http.getString());
    } else if (code >= 200 && code < 300) {
        static int okCount = 0;
        okCount++;
        if (okCount == 1 || okCount % 15 == 0) {
            Serial.print("[HTTP] ");
            Serial.print(code);
            Serial.print(" ok=");
            Serial.println(okCount);
        }
    }
    http.end();
    return code;
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(PIN_SCT013, INPUT);
    analogSetAttenuation(ADC_11db);
    analogSetWidth(12);

    Serial.println("[BOOT] SCT-013-030 30A listo");

    long sum = 0;
    for (int i = 0; i < 2000; i++) {
        sum += analogRead(PIN_SCT013);
        delayMicroseconds(100);
    }
    float measured = sum / 2000.0;
    adcOffset = measured;

    Serial.print("[CAL] measured=");
    Serial.print(measured, 1);
    Serial.print(" offset=");
    Serial.print(adcOffset, 1);
    if (measured < 100.0 || measured > 3900.0) {
        Serial.print(" WARN=bias?");
    }
    Serial.println();

    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.print("[WIFI]");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(" OK");
        Serial.print("[IP] ");
        Serial.println(WiFi.localIP());

        configTime(-5 * 3600, 0, "pool.ntp.org", "time.nist.gov");
        struct tm timeinfo;
        int ntpTry = 0;
        while (!getLocalTime(&timeinfo, 2000) && ntpTry < 10) {
            ntpTry++;
            delay(500);
        }
        if (ntpTry < 10) {
            Serial.println("[NTP] OK");
        } else {
            Serial.println("[NTP] FAIL (usara millis)");
        }
    } else {
        Serial.println(" FAIL");
    }

    Serial.println("[READY] Sistema listo");
}

void loop() {
    unsigned long now = millis();

    if (now - lastSend >= SEND_INTERVAL_MS) {
        lastSend = now;

        ensureWiFi();

        currentAmps = readCurrentRMS();

        Serial.print("[SENSOR] amps=");
        Serial.print(currentAmps, 2);
        Serial.print(" ts=");
        Serial.println(epochMs());

        int code = uploadToSupabase();
        if (code >= 200 && code < 300) {
            uploadFails = 0;
        } else if (code > 0) {
            uploadFails++;
            if (uploadFails == 1 || uploadFails % 10 == 0) {
                Serial.print("[UPLOAD] rejected count=");
                Serial.println(uploadFails);
            }
        }
    }
}
