import { colors, radius } from '../../styles/theme';

export default function Card({ children, style = {}, padding = '1.25rem' }) {
  return (
    <div style={{
      background: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding,
      ...style,
    }}>
      {children}
    </div>
  );
}
