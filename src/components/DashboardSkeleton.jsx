import { colors } from '../styles/theme';

export default function DashboardSkeleton() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ width: 140, height: 44, borderRadius: 10 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 120, marginBottom: '1.5rem', borderRadius: 16 }} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 320, marginBottom: '1.5rem', borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: colors.primaryDark,
              animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span style={{ color: colors.textMuted, fontSize: '0.95rem' }}>Cargando...</span>
    </div>
  );
}
