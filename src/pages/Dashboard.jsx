import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMachines } from '../hooks/useMachines';
import { useSensorData } from '../hooks/useSensorData';
import { useMockSensorData } from '../hooks/useMockSensorData';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToast } from '../components/ui/Toast';
import { requestNotificationPermission, onMessageListener, disableNotifications } from '../utils/notifications';
import Navbar from '../components/Navbar';
import MetricCard from '../components/MetricCard';
import AlertsList from '../components/AlertsList';
import SensorChart from '../components/SensorChart';
import MockControlPanel from '../components/MockControlPanel';
import DashboardSkeleton from '../components/DashboardSkeleton';
import MachineSelector, { MachineHeader, EmptyMachines } from '../components/MachineSelector';
import { colors } from '../styles/theme';

export default function Dashboard() {
  const { user, userData, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const online = useOnlineStatus();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [emergencyStop, setEmergencyStop] = useState(false);

  const {
    machines,
    selectedMachine,
    setSelectedMachine,
    loading,
    showAddMachine,
    setShowAddMachine,
    newMachineName,
    setNewMachineName,
    uploadingImage,
    addMachine,
    uploadMachineImage,
  } = useMachines(user, showToast);

  const rtdbId = selectedMachine?.rtdb_id || user?.uid;

  const realSensor = useSensorData(rtdbId, notificationsEnabled);
  const mockSensor = useMockSensorData(demoMode);

  const {
    readings,
    alerts,
    currentStatus,
    connected,
    latestReading,
  } = demoMode ? mockSensor : realSensor;

  const {
    machineState,
    currentTemp,
    targetTemp,
    injectionSpeed,
    cycleCount,
    sendCommand,
  } = mockSensor;

  useEffect(() => {
    if (!user) return;
    const unsub = onMessageListener();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user]);

  useEffect(() => {
    if (userData?.notificationsEnabled) setNotificationsEnabled(true);
  }, [userData]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleNotificationToggle() {
    if (!user) return;
    if (notificationsEnabled) {
      await disableNotifications(user);
      setNotificationsEnabled(false);
      showToast('Alertas desactivadas', 'info');
    } else {
      const token = await requestNotificationPermission(user);
      if (token) {
        setNotificationsEnabled(true);
        showToast('Alertas activadas', 'success');
      } else {
        showToast('No se pudieron activar las alertas', 'warning');
      }
    }
  }

  function handleUpload(file) {
    if (selectedMachine) uploadMachineImage(file, selectedMachine);
  }

  function handleDemoCommand(type, params = {}) {
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
    : '—';

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text }}>
      <Navbar
        userName={userData?.name || user?.displayName || 'Operador'}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleNotificationToggle}
        onLogout={handleLogout}
        online={demoMode || (online && connected)}
        isAdmin={isAdmin}
      />

      {/* Demo Mode Banner */}
      <div style={{
        background: demoMode
          ? 'linear-gradient(135deg, #1d4e8f 0%, #0f6e56 100%)'
          : colors.warningBg,
        borderBottom: `2px solid ${demoMode ? '#5dcaa5' : colors.warningBorder}`,
        color: '#fff',
        textAlign: 'center',
        padding: '0.6rem',
        fontSize: '0.85rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}>
        {demoMode && (
          <span>DEMO - Datos simulados en tiempo real</span>
        )}
        {!demoMode && !online && (
          <span style={{ color: colors.warning }}>Sin conexion a internet</span>
        )}
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
          {demoMode ? 'Salir de Demo' : 'Modo Demo'}
        </button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
          <MachineSelector
            machines={machines}
            selectedMachine={selectedMachine}
            onSelect={setSelectedMachine}
            showAddMachine={showAddMachine}
            onToggleAdd={() => setShowAddMachine(!showAddMachine)}
            newMachineName={newMachineName}
            onNameChange={setNewMachineName}
            onAdd={addMachine}
            onUploadImage={handleUpload}
            uploadingImage={uploadingImage}
          />

          {machines.length === 0 && !demoMode && (
            <EmptyMachines onAdd={() => setShowAddMachine(true)} />
          )}

          {(selectedMachine || demoMode) && (
            <>
              {!demoMode && (
                <MachineHeader
                  machine={selectedMachine}
                  onUploadImage={handleUpload}
                  uploadingImage={uploadingImage}
                />
              )}

              {demoMode && (
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
                      Plastico: PP | Ciclos: {cycleCount}
                    </p>
                  </div>
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}>
                <MetricCard
                  label="Corriente SCT-013"
                  value={latestReading ? `${latestReading.value} A` : '— A'}
                  sub="Sensor de corriente"
                  status={currentStatus?.level}
                />
                {demoMode && (
                  <MetricCard
                    label="Temperatura"
                    value={currentTemp ? `${currentTemp.toFixed(1)} °C` : '— °C'}
                    sub="NTC-10K Barril"
                    status={
                      currentTemp > 260 ? 'critical' :
                      currentTemp > 240 ? 'warning' :
                      currentTemp < 80 ? 'critical' :
                      currentTemp < 100 ? 'warning' : 'normal'
                    }
                  />
                )}
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

              {demoMode && (
                <MockControlPanel
                  machineState={machineState}
                  currentTemp={currentTemp}
                  targetTemp={targetTemp}
                  injectionSpeed={injectionSpeed}
                  cycleCount={cycleCount}
                  emergencyStop={emergencyStop}
                  onCommand={handleDemoCommand}
                />
              )}

              <AlertsList
                alerts={alerts}
                latestCurrent={latestReading?.value}
              />

              <SensorChart
                title="Corriente en tiempo real — SCT-013"
                subtitle={`Sensor de corriente · ${demoMode ? 'LumaV1 (DEMO)' : selectedMachine?.name}`}
                data={readings}
                unit="A"
                color={colors.primary}
                warningLine={{ value: 8, label: 'Advertencia 8A' }}
                criticalLine={{ value: 10, label: 'Critico 10A' }}
                emptyIcon={demoMode ? 'demo' : '📡'}
                emptyMessage={demoMode ? 'Inicia la demo para ver datos' : 'Esperando datos del ESP32...'}
                emptyHint={demoMode ? 'Haz clic en "Modo Demo" arriba' : 'Verifica que el ESP32 este conectado.'}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
