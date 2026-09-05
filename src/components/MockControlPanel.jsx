import { useState } from 'react';

const stateColors = {
  idle: '#378add',
  heating: '#ef9f27',
  injecting: '#0f6e56',
  cooling: '#5a8fc4',
  error: '#e24b4a',
};

const stateLabels = {
  idle: 'INACTIVO',
  heating: 'CALENTANDO',
  injecting: 'INYECTANDO',
  cooling: 'ENFRIANDO',
  error: 'ERROR',
};

export default function MockControlPanel({
  machineState,
  currentTemp,
  targetTemp,
  injectionSpeed,
  cycleCount,
  emergencyStop,
  onCommand,
  onToggleEmergency,
}) {
  const [tempInput, setTempInput] = useState(targetTemp);
  const [injectionInput, setInjectionInput] = useState(injectionSpeed);
  const [lastCommand, setLastCommand] = useState('');

  function handleCommand(type, params = {}) {
    onCommand(type, params);
    setLastCommand(type);
    setTimeout(() => setLastCommand(''), 2000);
  }

  return (
    <div style={{
      background: '#0a1628',
      border: '1px solid #1d4e8f',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ color: '#fff', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🎮</span> Panel de Control (DEMO)
      </h2>

      {/* Emergency Stop */}
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
        <div>
          <div style={{ fontSize: '0.75rem', color: '#5a8fc4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Paro de Emergencia
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: emergencyStop ? '#e24b4a' : '#5dcaa5', marginTop: '0.25rem' }}>
            {emergencyStop ? 'ACTIVADO' : 'DESACTIVADO'}
          </div>
        </div>
        {emergencyStop ? (
          <button onClick={() => handleCommand('emergencyReset')} style={{
            background: '#0f6e56',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
          }}>
            Restablecer
          </button>
        ) : (
          <button onClick={() => handleCommand('emergencyStop')} style={{
            background: '#e24b4a',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            minWidth: '120px',
          }}>
            PARAR
          </button>
        )}
      </div>

      {/* Machine Status */}
      <div style={{
        background: '#070f1e',
        border: '1px solid #1d4e8f',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5a8fc4', textTransform: 'uppercase' }}>Estado</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: stateColors[machineState], marginTop: '0.2rem' }}>
            {stateLabels[machineState]}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5a8fc4', textTransform: 'uppercase' }}>Temp Actual</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ef9f27', marginTop: '0.2rem' }}>
            {currentTemp?.toFixed(1)}°C
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5a8fc4', textTransform: 'uppercase' }}>Temp Objetivo</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#378add', marginTop: '0.2rem' }}>
            {targetTemp}°C
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#5a8fc4', textTransform: 'uppercase' }}>Ciclos</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#5dcaa5', marginTop: '0.2rem' }}>
            {cycleCount}
          </div>
        </div>
      </div>

      {/* Temperature Control */}
      <div style={{
        background: '#070f1e',
        border: '1px solid #1d4e8f',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#5a8fc4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Control de Temperatura
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            min="100"
            max="260"
            style={{
              flex: '1',
              minWidth: '100px',
              background: '#0a1628',
              border: '1px solid #1d4e8f',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          <span style={{ color: '#5a8fc4' }}>°C</span>
          <button onClick={() => handleCommand('setTemp', { targetTemp: parseFloat(tempInput) })} disabled={emergencyStop} style={{
            background: '#1d4e8f',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            padding: '0.6rem 1.2rem',
            cursor: emergencyStop ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            opacity: emergencyStop ? 0.5 : 1,
          }}>
            Aplicar
          </button>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#5a8fc4' }}>
          PP: 200-230°C | ABS: 220-260°C | PET: 260-280°C
        </div>
      </div>

      {/* Motor Controls */}
      <div style={{
        background: '#070f1e',
        border: '1px solid #1d4e8f',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#5a8fc4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Control de Motores
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#5a8fc4', marginBottom: '0.5rem' }}>Motor Inyeccion</div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="range"
              min="10"
              max="100"
              value={injectionInput}
              onChange={(e) => setInjectionInput(e.target.value)}
              style={{ flex: '1', minWidth: '150px' }}
            />
            <span style={{ color: '#fff', fontWeight: '600', minWidth: '40px' }}>{injectionInput}</span>
            <button onClick={() => handleCommand('inject', { speed: parseInt(injectionInput) })} disabled={emergencyStop || machineState === 'heating'} style={{
              background: '#0f6e56',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              padding: '0.5rem 1rem',
              cursor: emergencyStop || machineState === 'heating' ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: emergencyStop || machineState === 'heating' ? 0.5 : 1,
            }}>
              Inyectar
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.8rem', color: '#5a8fc4', marginBottom: '0.5rem' }}>Motor Rotacion</div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="range"
              min="10"
              max="80"
              value="30"
              readOnly
              style={{ flex: '1', minWidth: '150px' }}
            />
            <span style={{ color: '#fff', fontWeight: '600', minWidth: '40px' }}>30</span>
            <button onClick={() => handleCommand('rotate', { speed: 30 })} disabled={emergencyStop} style={{
              background: '#1d4e8f',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              padding: '0.5rem 1rem',
              cursor: emergencyStop ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: emergencyStop ? 0.5 : 1,
            }}>
              Rotar
            </button>
          </div>
        </div>
      </div>

      {/* Stop Button */}
      <button onClick={() => handleCommand('stop')} disabled={emergencyStop} style={{
        width: '100%',
        background: '#854f0b',
        border: 'none',
        borderRadius: '12px',
        color: '#fff',
        padding: '1rem',
        cursor: emergencyStop ? 'not-allowed' : 'pointer',
        fontWeight: '700',
        fontSize: '1rem',
        opacity: emergencyStop ? 0.5 : 1,
      }}>
        Detener Todo
      </button>

      {/* Last Command Feedback */}
      {lastCommand && (
        <div style={{
          marginTop: '0.75rem',
          background: '#071a12',
          border: '1px solid #0f6e56',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          textAlign: 'center',
          color: '#5dcaa5',
          fontSize: '0.85rem',
        }}>
          Comando "{lastCommand}" enviado correctamente
        </div>
      )}
    </div>
  );
}
