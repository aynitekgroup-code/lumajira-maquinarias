import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMachines } from '../hooks/useMachines';
import { useSensorData } from '../hooks/useSensorData';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToast } from '../components/ui/Toast';
import { requestNotificationPermission, onMessageListener, disableNotifications } from '../utils/notifications';
import Navbar from '../components/Navbar';
import MetricCard from '../components/MetricCard';
import AlertsList from '../components/AlertsList';
import SensorChart from '../components/SensorChart';
import ControlPanel from '../components/ControlPanel';
import DashboardSkeleton from '../components/DashboardSkeleton';
import MachineSelector, { MachineHeader, EmptyMachines, SensorList } from '../components/MachineSelector';
import { colors } from '../styles/theme';

export default function Dashboard() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const online = useOnlineStatus();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

  const rtdbId = selectedMachine?.rtdbId || user?.uid;

  const {
    readings,
    tempReadings,
    alerts,
    currentStatus,
    tempStatus,
    connected,
    latestReading,
    latestTemp,
  } = useSensorData(rtdbId, notificationsEnabled);

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
        online={online && connected}
      />

      {!online && (
        <div style={{
          background: colors.warningBg,
          borderBottom: `1px solid ${colors.warningBorder}`,
          color: colors.warning,
          textAlign: 'center',
          padding: '0.5rem',
          fontSize: '0.85rem',
        }}>
          Sin conexion a internet
        </div>
      )}

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

          {machines.length === 0 && (
            <EmptyMachines onAdd={() => setShowAddMachine(true)} />
          )}

          {selectedMachine && (
            <>
              <MachineHeader
                machine={selectedMachine}
                onUploadImage={handleUpload}
                uploadingImage={uploadingImage}
              />

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}>
                <MetricCard
                  label="Corriente SCT-013"
                  value={latestReading ? `${latestReading.value} A` : '— A'}
                  sub="Resistencias de banda"
                  status={currentStatus?.level}
                />
                <MetricCard
                  label="Temperatura"
                  value={latestTemp ? `${latestTemp.value}°C` : '— °C'}
                  sub="Termistor NTC-10K"
                  status={tempStatus?.level}
                />
                <MetricCard
                  label="Estado"
                  value={statusLabel}
                  sub="Resistencias de banda"
                  status={currentStatus?.level}
                />
                <MetricCard
                  label="Alertas activas"
                  value={alerts.length}
                  sub="Mantenimiento predictivo"
                  status={alerts.length > 0 ? 'warning' : 'normal'}
                />
              </div>

              <AlertsList
                alerts={alerts}
                latestCurrent={latestReading?.value}
                latestTemp={latestTemp?.value}
              />

              <ControlPanel rtdbId={rtdbId} />

              <SensorChart
                title="Corriente en tiempo real — SCT-013"
                subtitle={`Resistencias de banda · ${selectedMachine.name}`}
                data={readings}
                unit="A"
                color={colors.primary}
                warningLine={{ value: 8, label: 'Advertencia 8A' }}
                criticalLine={{ value: 10, label: 'Critico 10A' }}
                emptyIcon="📡"
                emptyMessage="Esperando datos del ESP32..."
                emptyHint="Verifica que el ESP32 este conectado y enviando datos."
              />

              <SensorChart
                title="Temperatura en tiempo real — NTC-10K"
                subtitle={`Termistor · ${selectedMachine.name}`}
                data={tempReadings}
                unit="°C"
                color={colors.warning}
                domain={[0, 300]}
                warningLine={{ value: 240, label: 'Advertencia 240°C' }}
                criticalLine={{ value: 260, label: 'Critico 260°C' }}
                emptyIcon="🌡"
                emptyMessage="Esperando datos de temperatura..."
                emptyHint="Verifica que el termistor este conectado."
              />

              <SensorList />
            </>
          )}
        </div>
      )}
    </div>
  );
}
