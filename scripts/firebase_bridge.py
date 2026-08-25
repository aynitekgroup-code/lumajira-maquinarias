#!/usr/bin/env python3
"""
LumaControl - Puente Serial <-> Firebase RTDB
Parsea texto plano del ESP32 y sube datos a Firebase.
"""

import sys
import json
import time
import argparse
import signal
import os
import re

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("Error: pip install pyserial")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Error: pip install requests")
    sys.exit(1)


class Config:
    FIREBASE_HOST = os.environ.get(
        "FIREBASE_HOST",
        "lumajiramaquinarias-d273c-default-rtdb.firebaseio.com"
    )
    FIREBASE_AUTH = os.environ.get("FIREBASE_AUTH", "")
    MACHINE_RTDB_ID = os.environ.get("MACHINE_ID", "")
    SERIAL_PORT = os.environ.get("SERIAL_PORT", "COM3")
    SERIAL_BAUD = int(os.environ.get("SERIAL_BAUD", "115200"))


def load_env_file():
    env_paths = [
        os.path.join(os.path.dirname(__file__), '..', '.env'),
        os.path.join(os.getcwd(), '.env'),
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key == "REACT_APP_FIREBASE_DATABASE_URL":
                            url = value.replace('https://', '').replace('http://', '')
                            Config.FIREBASE_HOST = url.rstrip('/')
                        elif key == "REACT_APP_FIREBASE_API_KEY":
                            if not Config.FIREBASE_AUTH:
                                Config.FIREBASE_AUTH = value


class FirebaseBridge:
    def __init__(self, port, baud, machine_id):
        self.port = port
        self.baud = baud
        self.machine_id = machine_id
        self.serial_conn = None
        self.running = False
        self.last_upload = 0
        self.last_cmd_check = 0
        self.current_a = 0.0
        self.temperature_c = 25.0
        self.stats = {"reads": 0, "uploads": 0, "errors": 0}

    def connect_serial(self):
        try:
            self.serial_conn = serial.Serial(self.port, self.baud, timeout=0.1)
            time.sleep(2)
            print(f"Serial: {self.port} @ {self.baud}")
            return True
        except serial.SerialException as e:
            print(f"Error: {e}")
            print("Puertos:")
            for p in serial.tools.list_ports.comports():
                print(f"  {p.device} - {p.description}")
            return False

    def fb_post(self, path, data):
        url = f"https://{Config.FIREBASE_HOST}/{path}.json"
        if Config.FIREBASE_AUTH:
            url += f"?auth={Config.FIREBASE_AUTH}"
        try:
            r = requests.post(url, json=data, timeout=10)
            if r.status_code != 200:
                print(f"  FB err {r.status_code}: {r.text[:100]}")
                self.stats["errors"] += 1
                return False
            return True
        except Exception as e:
            print(f"  FB err: {e}")
            self.stats["errors"] += 1
            return False

    def fb_put(self, path, data):
        url = f"https://{Config.FIREBASE_HOST}/{path}.json"
        if Config.FIREBASE_AUTH:
            url += f"?auth={Config.FIREBASE_AUTH}"
        try:
            r = requests.put(url, json=data, timeout=10)
            return r.status_code == 200
        except Exception:
            self.stats["errors"] += 1
            return False

    def fb_get(self, path):
        url = f"https://{Config.FIREBASE_HOST}/{path}.json"
        if Config.FIREBASE_AUTH:
            url += f"?auth={Config.FIREBASE_AUTH}"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        return None

    def upload_sensors(self):
        ts = int(time.time() * 1000)
        base = f"sensors/{self.machine_id}"

        ok1 = self.fb_post(f"{base}/sct013", {
            "current_a": round(self.current_a, 2),
            "timestamp": ts
        })
        ok2 = self.fb_post(f"{base}/thermistor", {
            "temperature_c": round(self.temperature_c, 1),
            "timestamp": ts
        })

        if ok1 or ok2:
            self.stats["uploads"] += 1
            print(f"  [OK] I={self.current_a:.2f}A T={self.temperature_c:.1f}C")

    def upload_status(self, state="idle", target_temp=220):
        path = f"machines/{self.machine_id}/status"
        self.fb_put(path, {
            "state": state,
            "currentTemp": round(self.temperature_c, 1),
            "targetTemp": target_temp,
            "injectionSpeed": 0,
            "rotationSpeed": 0,
            "emergencyStop": False,
            "heaterOn": False,
        })

    def check_commands(self):
        path = f"machines/{self.machine_id}/commands"
        data = self.fb_get(path)
        if data and isinstance(data, dict):
            for cmd_id, cmd in data.items():
                if isinstance(cmd, dict) and cmd.get("type"):
                    self.send_command(cmd)
                    self.fb_put(f"{path}/{cmd_id}", None)

    def send_command(self, cmd):
        if not self.serial_conn or not self.serial_conn.is_open:
            return
        try:
            line = json.dumps(cmd) + "\n"
            self.serial_conn.write(line.encode('utf-8'))
            self.serial_conn.flush()
            print(f"  -> ESP32: {cmd.get('type')}")
        except Exception as e:
            print(f"  Send err: {e}")

    def parse_line(self, line):
        """Parsear texto plano del ESP32: 'Corriente RMS: 51.90 A'"""
        line = line.strip()
        if not line:
            return

        # Corriente: "Corriente RMS: 51.90 A" o "I=51.90A"
        m = re.search(r'(?:Corriente RMS|I)[=:]\s*([\d.]+)\s*A', line, re.IGNORECASE)
        if m:
            self.current_a = float(m.group(1))
            self.stats["reads"] += 1
            sys.stdout.write(f"\r  I={self.current_a:.2f}A  T={self.temperature_c:.1f}C  ")
            sys.stdout.flush()
            return

        # Temperatura: "Temperatura: 220.5 C" o "T=220.5C"
        m = re.search(r'(?:Temperatura|T)[=:]\s*([\d.]+)\s*C', line, re.IGNORECASE)
        if m:
            self.temperature_c = float(m.group(1))
            return

        # JSON del ESP32
        try:
            data = json.loads(line)
            if data.get("type") == "sensor_data":
                self.current_a = data.get("current_a", self.current_a)
                self.temperature_c = data.get("temperature_c", self.temperature_c)
                self.stats["reads"] += 1
            elif data.get("type") == "machine_status":
                print(f"\n  Estado: {data.get('state', '?')}")
        except json.JSONDecodeError:
            pass

    def run(self):
        if not self.connect_serial():
            return

        self.running = True
        print(f"\nFirebase: {Config.FIREBASE_HOST}")
        print(f"Maquina:  {self.machine_id}")
        print("Ctrl+C para salir\n")

        # Subir estado inicial
        self.upload_status()

        while self.running:
            now = time.time()

            if self.serial_conn and self.serial_conn.in_waiting:
                try:
                    raw = self.serial_conn.readline()
                    if raw:
                        line = raw.decode('utf-8', errors='ignore').strip()
                        if line:
                            self.parse_line(line)
                except Exception as e:
                    print(f"\n  Read err: {e}")

            if now - self.last_upload >= 2.0:
                self.last_upload = now
                if self.stats["reads"] > 0:
                    self.upload_sensors()
                self.upload_status()

            if now - self.last_cmd_check >= 1.0:
                self.last_cmd_check = now
                try:
                    self.check_commands()
                except Exception:
                    pass

            time.sleep(0.05)

    def stop(self):
        self.running = False
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
        print(f"\n\nStats: reads={self.stats['reads']} uploads={self.stats['uploads']} errors={self.stats['errors']}")


def main():
    parser = argparse.ArgumentParser(description="LumaControl Bridge")
    parser.add_argument("--port", default="COM3")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--machine", required=True, help="UID de Firebase del usuario")
    args = parser.parse_args()

    load_env_file()

    if not Config.FIREBASE_HOST:
        print("ERROR: FIREBASE_HOST no configurado")
        sys.exit(1)

    bridge = FirebaseBridge(args.port, args.baud, args.machine)

    def handler(sig, frame):
        bridge.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handler)
    signal.signal(signal.SIGTERM, handler)

    try:
        bridge.run()
    except KeyboardInterrupt:
        bridge.stop()


if __name__ == "__main__":
    main()
