import { useState } from 'react';
import { colors } from '../styles/theme';
import Button from './ui/Button';
import { getSmartAlert } from '../utils/alerts';

export default function AlertsList({ alerts, latestCurrent, latestTemp }) {
  const [aiAlerts, setAiAlerts] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  if (alerts.length === 0) return null;

  async function handleGetAIRecommendation(alert, index) {
    setAiLoading((prev) => ({ ...prev, [index]: true }));
    const smartAlert = await getSmartAlert(alert, {
      currentA: latestCurrent,
      tempC: latestTemp,
      machineState: null,
    });
    setAiAlerts((prev) => ({ ...prev, [index]: smartAlert }));
    setAiLoading((prev) => ({ ...prev, [index]: false }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {alerts.map((a, i) => (
        <div
          key={`${a.message}-${i}`}
          style={{
            background: a.level === 'critical' ? '#2a0a0a' : '#1a1500',
            border: `1px solid ${a.level === 'critical' ? '#7a2020' : '#6b5500'}`,
            borderRadius: '12px',
            padding: '1rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.3rem' }}>{a.level === 'critical' ? '!' : '⚠'}</span>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{
                fontWeight: '600',
                color: a.level === 'critical' ? colors.critical : colors.warning,
                marginBottom: '0.2rem',
              }}>
                {a.message}
              </div>
              {a.maintenance && (
                <div style={{
                  fontSize: '0.875rem',
                  color: a.level === 'critical' ? '#e24b4a88' : '#ba751788',
                }}>
                  {a.maintenance}
                </div>
              )}
            </div>
            {!aiAlerts[i] && (
              <Button
                size="sm"
                onClick={() => handleGetAIRecommendation(a, i)}
                disabled={aiLoading[i]}
                style={{ whiteSpace: 'nowrap' }}
              >
                {aiLoading[i] ? 'Analizando...' : 'Explicar con IA'}
              </Button>
            )}
          </div>
          {aiAlerts[i] && (
            <div style={{
              marginTop: '0.75rem',
              background: colors.bg,
              border: `1px solid ${colors.primary}`,
              borderRadius: '8px',
              padding: '0.75rem 1rem',
            }}>
              <div style={{
                fontSize: '0.7rem',
                color: colors.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.4rem',
                fontWeight: '600',
              }}>
                Analisis IA
              </div>
              <div style={{ fontSize: '0.85rem', color: colors.text, lineHeight: 1.5, marginBottom: aiAlerts[i].aiFix ? '0.5rem' : 0 }}>
                {aiAlerts[i].aiExplanation}
              </div>
              {aiAlerts[i].aiFix && (
                <div style={{ fontSize: '0.85rem', color: colors.success, lineHeight: 1.5 }}>
                  <strong>Solucion:</strong> {aiAlerts[i].aiFix}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
