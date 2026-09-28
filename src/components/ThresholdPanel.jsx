import { ALERT_THRESHOLDS } from '../utils/alerts';

const colorsCard = '#0a1826';

const rows = [
  { color: '#e24b4a', name: 'Critico alto', value: `>= ${ALERT_THRESHOLDS.current.critical} A`, desc: '+40% = cortocircuito o degradacion' },
  { color: '#e2a03f', name: 'Advertencia alta', value: `>= ${ALERT_THRESHOLDS.current.warning} A`, desc: '+20% = desgaste de resistencia' },
  { color: '#0f6e56', name: 'Normal', value: `${ALERT_THRESHOLDS.current.low_warning} - ${ALERT_THRESHOLDS.current.warning} A`, desc: 'Banda encendida y funcionando' },
  { color: '#e2a03f', name: 'Muy baja', value: `<= ${ALERT_THRESHOLDS.current.low_warning} A`, desc: '<50% = termostato o conexion' },
  { color: '#e24b4a', name: 'Banda muerta', value: `<= ${ALERT_THRESHOLDS.current.low_critical} A`, desc: 'Quemada o desconectada' },
];

export default function ThresholdPanel() {
  return (
    <div style={{
      background: colorsCard,
      border: '1px solid #1e3a5f',
      borderRadius: '12px',
      padding: '1.1rem',
      alignSelf: 'start',
    }}>
      <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: '700' }}>
        Umbrales de corriente
      </h3>
      <p style={{ margin: '0 0 0.9rem', fontSize: '0.75rem', color: '#5a8fc4' }}>
        Resistencia de banda 340W @ 110V = 3.09A nominal
      </p>

      {rows.map((r) => (
        <div key={r.name} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem',
          padding: '0.55rem 0',
          borderTop: '1px solid #16293f',
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: r.color,
            flexShrink: 0,
            marginTop: '3px',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.5rem',
              fontSize: '0.82rem',
              fontWeight: '600',
            }}>
              <span>{r.name}</span>
              <span style={{ color: r.color }}>{r.value}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#5a8fc4', marginTop: '2px' }}>
              {r.desc}
            </div>
          </div>
        </div>
      ))}

      <div style={{
        marginTop: '0.9rem',
        padding: '0.6rem',
        background: '#0d2137',
        borderRadius: '8px',
        fontSize: '0.72rem',
        color: '#5a8fc4',
        lineHeight: 1.5,
      }}>
        <strong style={{ color: '#8fb4dd' }}>Tendencia creciente:</strong> +0.3A en 5 muestras
        {' · '}
        <strong style={{ color: '#8fb4dd' }}>Inestable:</strong> varianza {'>'} 0.5
      </div>
    </div>
  );
}
