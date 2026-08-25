<#
.SYNOPSIS
    LumaControl - Puente Serial <-> Firebase (PowerShell)

.DESCRIPTION
    Conecta al ESP32 por Serial, lee datos de sensores y los sube a Firebase RTDB.
    Lee comandos de Firebase y los envia al ESP32.

.USO
    .\firebase_bridge.ps1 -Port COM3 -Baud 115200
    .\firebase_bridge.ps1 -Port COM3 -MachineId MAQUINA_01

.NOTES
    Requiere: PowerShell 5.1+ (incluido en Windows 10/11)
#>

param(
    [string]$Port = "COM3",
    [int]$Baud = 115200,
    [string]$MachineId = "MAQUINA_01",
    [string]$FirebaseHost = "",
    [string]$FirebaseAuth = ""
)

$ErrorActionPreference = "Stop"

# ===================== CARGAR .env =====================
function Load-EnvFile {
    $envPaths = @(
        Join-Path $PSScriptRoot "..\.env"
        Join-Path (Get-Location) ".env"
    )
    foreach ($path in $envPaths) {
        if (Test-Path $path) {
            Write-Host "Config: $path" -ForegroundColor DarkGray
            Get-Content $path | ForEach-Object {
                $line = $_.Trim()
                if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
                    $parts = $line.Split('=', 2)
                    $key = $parts[0].Trim()
                    $value = $parts[1].Trim().Trim('"').Trim("'")
                    switch ($key) {
                        "REACT_APP_FIREBASE_DATABASE_URL" {
                            $script:FirebaseHost = $value -replace 'https?://', '' -replace '/$', ''
                        }
                        "REACT_APP_FIREBASE_API_KEY" {
                            if (-not $script:FirebaseAuth) {
                                $script:FirebaseAuth = $value
                            }
                        }
                    }
                }
            }
            return $true
        }
    }
    return $false
}

# ===================== FIREBASE REST API =====================
function Invoke-FirebasePut {
    param([string]$Path, [object]$Data)
    $url = "https://$FirebaseHost/$Path.json"
    if ($FirebaseAuth) { $url += "?auth=$FirebaseAuth" }
    try {
        $json = $Data | ConvertTo-Json -Depth 10 -Compress
        $resp = Invoke-RestMethod -Uri $url -Method Put -Body $json -ContentType "application/json" -TimeoutSec 10
        return $true
    } catch {
        Write-Host "  FB PUT error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Invoke-FirebasePost {
    param([string]$Path, [object]$Data)
    $url = "https://$FirebaseHost/$Path.json"
    if ($FirebaseAuth) { $url += "?auth=$FirebaseAuth" }
    try {
        $json = $Data | ConvertTo-Json -Depth 10 -Compress
        $resp = Invoke-RestMethod -Uri $url -Method Post -Body $json -ContentType "application/json" -TimeoutSec 10
        return $true
    } catch {
        Write-Host "  FB POST error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Invoke-FirebaseGet {
    param([string]$Path)
    $url = "https://$FirebaseHost/$Path.json"
    if ($FirebaseAuth) { $url += "?auth=$FirebaseAuth" }
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10
        return $resp
    } catch {
        return $null
    }
}

# ===================== MAIN =====================
Load-EnvFile

if (-not $FirebaseHost) {
    Write-Host "ERROR: No se encontro FIREBASE_HOST" -ForegroundColor Red
    Write-Host "Configura el archivo .env o usa -FirebaseHost" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== LumaControl Firebase Bridge ===" -ForegroundColor Cyan
Write-Host "Firebase: $FirebaseHost"
Write-Host "Maquina:  $MachineId"
Write-Host "Serial:   $Port @ $Baud"
Write-Host ""

# Conectar Serial
try {
    $portObj = New-Object System.IO.Ports.SerialPort $Port, $Baud, None, 8, One
    $portObj.ReadTimeout = 100
    $portObj.Open()
    Start-Sleep -Seconds 2
    Write-Host "Serial conectado: $Port" -ForegroundColor Green
} catch {
    Write-Host "Error Serial: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nPuertos disponibles:" -ForegroundColor Yellow
    [System.IO.Ports.SerialPort]::GetPortNames() | ForEach-Object { Write-Host "  $_" }
    exit 1
}

Write-Host "`nCtrl+C para salir`n" -ForegroundColor DarkGray

$lastUpload = [DateTime]::Now
$lastCmdCheck = [DateTime]::Now
$stats = @{ reads = 0; uploads = 0; cmds = 0 }

try {
    while ($true) {
        # Leer Serial
        if ($portObj.BytesToRead -gt 0) {
            try {
                $line = $portObj.ReadLine()
                if ($line) {
                    $line = $line.Trim()
                    try {
                        $data = $line | ConvertFrom-Json
                        switch ($data.type) {
                            "sensor_data" {
                                $stats.reads++
                                $currentA = "{0:N2}" -f $data.current_a
                                $tempC = "{0:N1}" -f $data.temperature_c
                                Write-Host "`r  I=${currentA}A  T=${tempC}C  " -NoNewline
                            }
                            "machine_status" {
                                Write-Host ""
                                Write-Host "  Estado: $($data.state)" -ForegroundColor Yellow
                            }
                            default {
                                if ($data.message) {
                                    Write-Host "  [$($data.type.ToUpper())] $($data.message)" -ForegroundColor DarkGray
                                }
                            }
                        }
                        $lastSensor = $data
                    } catch {}
                }
            } catch {}
        }

        $now = [DateTime]::Now

        # Subir datos cada 2s
        if (($now - $lastUpload).TotalSeconds -ge 2) {
            $lastUpload = $now
            $ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

            if ($lastSensor -and $lastSensor.type -eq "sensor_data") {
                $sctPath = "sensors/$MachineId/sct013"
                Invoke-FirebasePost -Path $sctPath -Data @{
                    current_a = $lastSensor.current_a
                    timestamp = $ts
                }

                $tempPath = "sensors/$MachineId/thermistor"
                Invoke-FirebasePost -Path $tempPath -Data @{
                    temperature_c = $lastSensor.temperature_c
                    timestamp = $ts
                }
                $stats.uploads++
            }
        }

        # Verificar comandos cada 1s
        if (($now - $lastCmdCheck).TotalSeconds -ge 1) {
            $lastCmdCheck = $now
            $cmds = Invoke-FirebaseGet -Path "machines/$MachineId/commands"
            if ($cmds -and $cmds -is [PSCustomObject]) {
                $cmds.PSObject.Properties | ForEach-Object {
                    $cmd = $_.Value
                    if ($cmd.type) {
                        $cmdJson = $cmd | ConvertTo-Json -Compress
                        $portObj.WriteLine($cmdJson)
                        Write-Host " -> ESP32: $($cmd.type)" -ForegroundColor Green
                        Invoke-FirebasePut -Path "machines/$MachineId/commands/$($_.Name)" -Data $null
                        $stats.cmds++
                    }
                }
            }
        }

        Start-Sleep -Milliseconds 50
    }
} finally {
    if ($portObj -and $portObj.IsOpen) {
        $portObj.Close()
    }
    Write-Host "`n`nEstadisticas:" -ForegroundColor Cyan
    Write-Host "  Lecturas: $($stats.reads)"
    Write-Host "  Subidas:  $($stats.uploads)"
    Write-Host "  Comandos: $($stats.cmds)"
}
