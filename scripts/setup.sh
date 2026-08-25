#!/bin/bash
echo "=============================="
echo " LumaControl - Instalacion"
echo "=============================="

cd "$(dirname "$0")/.."

echo ""
echo "[1/3] Creando virtual environment..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "ERROR: Fallo python3-venv"
    echo "Ejecuta: sudo apt install python3-full python3-venv"
    exit 1
fi

echo ""
echo "[2/3] Activando venv e instalando dependencias..."
source venv/bin/activate
pip install pyserial requests

echo ""
echo "[3/3] Verificando PlatformIO..."
if ! command -v pio &> /dev/null; then
    pip install platformio
fi

echo ""
echo "=============================="
echo " Instalacion completa"
echo "=============================="
echo ""
echo "Para usar:"
echo "  1. Activar entorno:  source venv/bin/activate"
echo "  2. Subir firmware:   cd esp32 && pio run -t upload"
echo "  3. Ejecutar puente:  python3 scripts/firebase_bridge.py --port /dev/ttyUSB0"
