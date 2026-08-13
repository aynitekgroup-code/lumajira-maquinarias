import { colors, statusColors } from '../styles/theme';

export default function MetricCard({ label, value, sub, status }) {
  const c = statusColors[status] || statusColors.default;
  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '12px',
      padding: '1.25rem',
    }}>
      <div style={{
        fontSize: '0.75rem',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.5rem',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: c.text, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: `${colors.textMuted}88`, marginTop: '0.4rem' }}>
        {sub}
      </div>
    </div>
  );
}
