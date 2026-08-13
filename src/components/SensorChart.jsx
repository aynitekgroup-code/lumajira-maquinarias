import { lazy, Suspense } from 'react';
import { colors } from '../styles/theme';

const Chart = lazy(() => import('./SensorChartInner'));

export default function SensorChart({
  title,
  subtitle,
  data,
  unit,
  color,
  warningLine,
  criticalLine,
  emptyIcon,
  emptyMessage,
  emptyHint,
  domain,
}) {
  return (
    <div style={{
      background: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <h2 style={{ color: colors.white, margin: 0, fontSize: '1rem', fontWeight: '600' }}>
          {title}
        </h2>
        {subtitle && (
          <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>{subtitle}</span>
        )}
      </div>
      {data.length > 0 ? (
        <Suspense fallback={
          <div className="skeleton" style={{ height: 280, width: '100%' }} />
        }>
          <Chart
            data={data}
            unit={unit}
            color={color}
            warningLine={warningLine}
            criticalLine={criticalLine}
            domain={domain}
          />
        </Suspense>
      ) : (
        <div style={{
          height: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textMuted,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{emptyIcon}</div>
            <p>{emptyMessage}</p>
            {emptyHint && (
              <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>{emptyHint}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
