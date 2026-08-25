@echo off
echo ==============================
echo  LumaControl - Instalacion
echo ==============================

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python no encontrado
    echo.
    echo Opciones:
    echo   1. Descargar de: https://www.python.org/downloads/
    echo   2. Marcar "Add Python to PATH" al instalar
    echo.
    echo Despues de instalar, reinicia la terminal y vuelve a ejecutar este script.
    pause
    exit /b 1
)

echo.
echo Python encontrado:
python --version

echo.
echo [1/2] Creando virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: No se pudo crear venv
    pause
    exit /b 1
)

echo.
echo [2/2] Instalando dependencias...
call venv\Scripts\activate.bat
pip install pyserial requests

echo.
echo ==============================
echo  Instalacion completa
echo ==============================
echo.
echo Para usar:
echo   1. Activar entorno: venv\Scripts\activate
echo   2. Subir firmware al ESP32:
echo      cd esp32
echo      pio run -t upload
echo   3. Ejecutar puente:
echo      python scripts\firebase_bridge.py --port COM3
echo.
pause
