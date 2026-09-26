/**
 * CitizenVoiceModule Theme
 *
 * Self-contained theme tokens for Voice UI components.
 * Can be overridden via props on VoiceReportScreen.
 */

export const DEFAULT_VOICE_THEME = {
  colors: {
    primary: '#0D9488',
    primaryDark: '#0F766E',
    primaryLight: '#5EEAD4',
    primary50: '#F0FDFA',
    text: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',
    card: '#FFFFFF',
    background: '#F9FAFB',
    border: '#E5E7EB',
    error: '#EF4444',
    error50: '#FEF2F2',
    success: '#10B981',
    success50: '#ECFDF5',
    warning: '#F59E0B',
    warning50: '#FFFBEB',
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    pill: 9999,
  },
  typography: {
    size: {
      xxs: 10,
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
  },
};

export type VoiceTheme = typeof DEFAULT_VOICE_THEME;
