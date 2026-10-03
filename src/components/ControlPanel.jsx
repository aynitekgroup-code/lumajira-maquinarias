import { useState, useEffect } from 'react';
import { supabase } from '../supabase/config';

// Panel de control de motores via Supabase (machine_commands / machine_status).
// Lo lee el ESP32 cada 3 s: inject->M1, rotate->M2, stop, emergencyStop,
// emergencyReset, auto. steps=0 significa giro continuo.
export default function ControlPanel({ rtdbId, user, showToast }) {
  const [injectionSpeed, setInjectionSpeed] = useState(50);
  const [rotationSpeed, setRotationSpeed] = useState(50);
  const [steps, setSteps] = useState(1600);
  const [continuous, setContinuous] = useState(false);
  const [motorState, setMotorState] = useState(null);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastCommand, setLastCommand] = useState('');

  useEffect(() => {
    if (!rtdbId) return;
    async function fetchStatus() {
      const { data } = await supabase
        .from('machine_status')
        .select('status')
        .eq('machine_id', rtdbId)
        .single();
      if (data?.status) {
        setMotorState(data.status);
        setEmergencyStop(!!data.status.estop);
      }
    }
    fetchStatus();
    const channel = supabase
      .channel(`status-${rtdbId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machine_status', filter: `machine_id=eq.${rtdbId}` },
        (payload) => {
          const st = payload.new?.status;
          if (st) {
            setMotorState(st);
            setEmergencyStop(!!st.estop);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [rtdbId]);

  async function sendCommand(type, params = {}) {
    if (!rtdbId || !user) return;
    if (emergencyStop && type !== 'emergencyReset') {
      showToast?.('Emergencia activa: restablece primero', 'warning');
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.from('machine_commands').insert({
        machine_id: rtdbId,
        user_id: user.id,
        type,
        params,
      });
      if (error) throw error;
      setLastCommand(type);
      setTimeout(() => setLastCommand(''), 2500);
    } catch (err) {
      console.error('Error enviando comando:', err);
      showToast?.(`Error al enviar: ${err.message}`, 'error');
    }
    setIsSending(false);
  }

  const dirNote = 'CW = horario, CCW = antihorario (visto de frente al eje)';

  return (
    <div style={{
      background: '#0a1628',
      border: '1px solid #1d4e8f',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ color: '#fff', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🎮</span> Panel de Control — Motores NEMA 23
      </h2>

      {/* Estado reportado por el ESP32 */}
      <div style={{
        background: '#070f1e',
        border: '1px solid #1d4e8f',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5a8fc4', textTransform: 'uppercase' }}>Motor 1 (Iny.)</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: motorState?.m1?.run ? '#5dcaa5' : '#5a8fc4', marginTop: '0.2rem' }}>
            {motorState?.m1?.run ? '▶ GIRANDO' : '⏸ DETENIDO'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5a8fc4', textTransform: 'uppercase' }}>Motor 2 (Rot.)</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: motorState?.m2?.run ? '#5dcaa5' : '#5a8fc4', marginTop: '0.2rem' }}>
            {motorState?.m2?.run ? '▶ GIRANDO' : '⏸ DETENIDO'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5a8fc4', textTransform: 'uppercase' }}>Modo auto</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#378add', marginTop: '0.2rem' }}>
            {motorState ? (motorState.auto ? 'ON' : 'OFF') : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5a8fc4', textTransform: 'uppercase' }}>Emergencia</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: emergencyStop ? '#e24b4a' : '#5dcaa5', marginTop: '0.2rem' }}>
            {emergencyStop ? 'ACTIVADA' : 'OK'}
          </div>
        </div>
      </div>

      {/* Paro de emergencia */}
      <div style={{
        background: emergencyStop ? '#2a0a0a' : '#0a1628',
        border: `1px solid ${emergencyStop ? '#e24b4a' : '#1d4e8f'}`,
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: emergencyStop ? '#e24b4a' : '#fff' }}>
          {emergencyStop ? '🛑 EMERGENCIA ACTIVADA' : 'Paro de emergencia'}
        </div>
        {emergencyStop ? (
          <button onClick={() => sendCommand('emergencyReset')} disabled={isSending} style={{
            background: '#0f6e56', border: 'none', borderRadius: '8px', color: '#fff',
            padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: '600',
          }}>
            Restablecer
          </button>
        ) : (
          <button onClick={() => sendCommand('emergencyStop')} disabled={isSending} style={{
            background: '#e24b4a', border: 'none', borderRadius: '8px', color: '#fff',
            padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: '600', minWidth: '120px',
          }}>
            🛑 PARAR
          </button>
        )}
      </div>

      {/* Motores */}
      <div style={{ background: '#070f1e', border: '1px solid #1d4e8f', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#5a8fc4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          ⚙️ Motores (1600 pulsos/rev)
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#5a8fc4', marginBottom: '0.5rem' }}>Motor 1 — Inyección · vel {injectionSpeed}</div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="range" min="10" max="100" value={injectionSpeed} onChange={(e) => setInjectionSpeed(e.target.value)} style={{ flex: '1', minWidth: '120px' }} />
            <button onClick={() => sendCommand('inject', { speed: parseInt(injectionSpeed), steps: continuous ? 0 : parseInt(steps), dir: true })} disabled={isSending || emergencyStop} style={btn('#0f6e56', isSending || emergencyStop)}>
              CW
            </button>
            <button onClick={() => sendCommand('inject', { speed: parseInt(injectionSpeed), steps: continuous ? 0 : parseInt(steps), dir: false })} disabled={isSending || emergencyStop} style={btn('#1d4e8f', isSending || emergencyStop)}>
              CCW
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#5a8fc4', marginBottom: '0.5rem' }}>Motor 2 — Rotación · vel {rotationSpeed}</div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="range" min="10" max="100" value={rotationSpeed} onChange={(e) => setRotationSpeed(e.target.value)} style={{ flex: '1', minWidth: '120px' }} />
            <button onClick={() => sendCommand('rotate', { speed: parseInt(rotationSpeed), steps: continuous ? 0 : parseInt(steps), dir: true })} disabled={isSending || emergencyStop} style={btn('#0f6e56', isSending || emergencyStop)}>
              CW
            </button>
            <button onClick={() => sendCommand('rotate', { speed: parseInt(rotationSpeed), steps: continuous ? 0 : parseInt(steps), dir: false })} disabled={isSending || emergencyStop} style={btn('#1d4e8f', isSending || emergencyStop)}>
              CCW
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8rem', color: '#5a8fc4' }}>
            Pasos{' '}
            <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} min="0" step="100" disabled={continuous} style={numInput} />
          </label>
          <label style={{ fontSize: '0.8rem', color: '#fff', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} /> Continuo
          </label>
          <span style={{ fontSize: '0.75rem', color: '#5a8fc4' }}>{dirNote}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => sendCommand('stop')} disabled={isSending || emergencyStop} style={{ ...btn('#854f0b', isSending || emergencyStop), flex: '1' }}>
          ⏹️ Detener motores
        </button>
        <button onClick={() => sendCommand('auto', { on: motorState?.auto ? 'false' : 'true' })} disabled={isSending || emergencyStop} style={{ ...btn('#1d4e8f', isSending || emergencyStop), flex: '1' }}>
          Auto: {motorState?.auto ? 'desactivar' : 'activar'}
        </button>
      </div>

      {lastCommand && (
        <div style={{
          marginTop: '0.75rem', background: '#071a12', border: '1px solid #0f6e56',
          borderRadius: '8px', padding: '0.5rem 1rem', textAlign: 'center',
          color: '#5dcaa5', fontSize: '0.85rem',
        }}>
          ✓ Comando "{lastCommand}" enviado — el ESP32 lo ejecuta en ~3 s
        </div>
      )}
    </div>
  );
}

function btn(bg, disabled) {
  return {
    background: bg, border: 'none', borderRadius: '8px', color: '#fff',
    padding: '0.5rem 1rem', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '600', opacity: disabled ? 0.5 : 1,
  };
}

const numInput = {
  width: '90px', background: '#0a1628', border: '1px solid #1d4e8f',
  borderRadius: '8px', padding: '0.4rem 0.6rem', color: '#fff', outline: 'none',
};
