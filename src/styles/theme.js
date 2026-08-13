export const colors = {
  bg: '#070f1e',
  bgCard: '#0a1628',
  bgInput: '#070f1e',
  border: '#1d4e8f',
  borderLight: '#1d4e8f44',
  primary: '#378add',
  primaryDark: '#1d4e8f',
  text: '#e8eef8',
  textMuted: '#5a8fc4',
  success: '#5dcaa5',
  successBg: '#071a12',
  successBorder: '#0f6e56',
  warning: '#ef9f27',
  warningBg: '#1a1200',
  warningBorder: '#854f0b',
  critical: '#f09595',
  criticalBg: '#1a0707',
  criticalBorder: '#a32d2d',
  white: '#ffffff',
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
};

export const touchTarget = {
  minHeight: '44px',
  minWidth: '44px',
};

export const statusColors = {
  normal: { bg: colors.successBg, border: colors.successBorder, text: colors.success },
  warning: { bg: colors.warningBg, border: colors.warningBorder, text: colors.warning },
  critical: { bg: colors.criticalBg, border: colors.criticalBorder, text: colors.critical },
  default: { bg: colors.bgCard, border: colors.border, text: colors.primary },
};
