import { useState, useEffect } from 'react';
import { useMockSensorData } from '../hooks/useMockSensorData';
import MockControlPanel from '../components/MockControlPanel';
import MetricCard from '../components/MetricCard';
import AlertsList from '../components/AlertsList';
import SensorChart from '../components/SensorChart';
import Navbar from '../components/Navbar';
import { colors } from '../styles/theme';

export default function DemoPage() {
  const [demoMode, setDemoMode] = useState(true);
  const [emergencyStop, setEmergencyStop] = useState(false);

  const {
    readings,
    alerts,
    currentStatus,
    connected,
    latestReading,
    machineState,
    currentTemp,
    targetTemp,
    injectionSpeed,
    cycleCount,
    sendCommand,
  } = useMockSensorData(demoMode);

  function handleCommand(type, params = {}) {
    if (type === 'emergencyStop') {
      setEmergencyStop(true);
      sendCommand('emergencyStop');
    } else if (type === 'emergencyReset') {
      setEmergencyStop(false);
      sendCommand('emergencyReset');
    } else {
      sendCommand(type, params);
    }
  }

  const statusLabel = currentStatus
    ? currentStatus.level === 'normal'
      ? 'NORMAL'
      : currentStatus.level === 'warning'
        ? 'ADVERTENCIA'
        : 'CRITICO'
    : '---';

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text }}>
      <Navbar
        userName="Demo - LumaControl"
        notificationsEnabled={false}
        onToggleNotifications={() => {}}
        onLogout={() => window.location.href = '/'}
        online={connected}
        isAdmin={false}
      />

      {/* Demo Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4e8f 0%, #0f6e56 100%)',
        borderBottom: '2px solid #5dcaa5',
        color: '#fff',
        textAlign: 'center',
        padding: '0.75rem',
        fontSize: '0.9rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}>
        <span>MODO DEMO - Datos simulados en tiempo real</span>
        <button
          onClick={() => {
            setDemoMode(!demoMode);
            setEmergencyStop(false);
          }}
          style={{
            background: demoMode ? '#e24b4a' : '#0f6e56',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            padding: '0.3rem 0.8rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: '600',
          }}
        >
          {demoMode ? 'Detener Demo' : 'Iniciar Demo'}
        </button>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
        {/* Machine Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1d4e8f, #0f6e56)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#fff',
            fontWeight: '700',
          }}>
            LV1
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
              LumaV1 - Maquina de Inyeccion
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#5a8fc4', fontSize: '0.9rem' }}>
              Plastico: PP (Polipropileno) | Ciclos completados: {cycleCount}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <MetricCard
            label="Corriente SCT-013"
            value={latestReading ? `${latestReading.value} A` : '--- A'}
            sub="Sensor de corriente"
            status={currentStatus?.level}
          />
          <MetricCard
            label="Temperatura"
            value={currentTemp ? `${currentTemp.toFixed(1)} °C` : '--- °C'}
            sub="NTC-10K Barril"
            status={
              currentTemp > 260 ? 'critical' :
              currentTemp > 240 ? 'warning' :
              currentTemp < 80 ? 'critical' :
              currentTemp < 100 ? 'warning' : 'normal'
            }
          />
          <MetricCard
            label="Estado"
            value={statusLabel}
            sub="Sistema"
            status={currentStatus?.level}
          />
          <MetricCard
            label="Alertas activas"
            value={alerts.length}
            sub="Mantenimiento predictivo"
            status={alerts.length > 0 ? 'warning' : 'normal'}
          />
        </div>

        {/* Control Panel */}
        <MockControlPanel
          machineState={machineState}
          currentTemp={currentTemp}
          targetTemp={targetTemp}
          injectionSpeed={injectionSpeed}
          cycleCount={cycleCount}
          emergencyStop={emergencyStop}
          onCommand={handleCommand}
        />

        {/* Alerts */}
        <AlertsList
          alerts={alerts}
          latestCurrent={latestReading?.value}
        />

        {/* Chart */}
        <SensorChart
          title="Corriente en tiempo real - SCT-013"
          subtitle="Sensor de corriente - LumaV1 (DEMO)"
          data={readings}
          unit="A"
          color={colors.primary}
          warningLine={{ value: 8, label: 'Advertencia 8A' }}
          criticalLine={{ value: 10, label: 'Critico 10A' }}
          emptyIcon="demo"
          emptyMessage="Inicia la demo para ver datos en tiempo real"
          emptyHint="Haz clic en 'Iniciar Demo' arriba"
        />
      </div>
    </div>
  );
}
