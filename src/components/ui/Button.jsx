import { colors, radius, touchTarget } from '../../styles/theme';

const variants = {
  primary: { bg: colors.primaryDark, color: colors.white, border: 'none' },
  success: { bg: colors.successBorder, color: colors.white, border: 'none' },
  danger: { bg: '#e24b4a', color: colors.white, border: 'none' },
  ghost: { bg: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}` },
  outline: { bg: 'transparent', color: colors.primary, border: `1px dashed ${colors.border}` },
};

export default function Button({
  children,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  size = 'md',
  style = {},
  ...props
}) {
  const v = variants[variant] || variants.primary;
  const padding = size === 'sm' ? '0.4rem 0.9rem' : size === 'lg' ? '0.875rem 1.5rem' : '0.6rem 1.2rem';
  const fontSize = size === 'sm' ? '0.85rem' : size === 'lg' ? '1rem' : '0.9rem';

  return (
    <button
      disabled={disabled}
      style={{
        background: v.bg,
        color: v.color,
        border: v.border,
        borderRadius: radius.sm,
        padding,
        fontSize,
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : undefined,
        minHeight: touchTarget.minHeight,
        transition: 'opacity 0.2s, transform 0.1s',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
