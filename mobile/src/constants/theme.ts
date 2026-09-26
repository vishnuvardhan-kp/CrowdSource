export const theme = {
  colors: {
    // Canvas & Surfaces
    background: '#FAF9F6',
    card: '#FFFFFF',
    border: '#E8E5DF',
    borderLight: '#F5F3ED',
    surfaceSubtle: '#F9F8F5',

    // Civic Green Primary (Jharkhand Civic Identity)
    primary: '#15803D',
    primaryHover: '#166534',
    primaryDark: '#14532D',
    primaryLight: '#DCFCE7',
    primary50: '#F0FDF4',

    // Warm Amber / Saffron Accent
    accent: '#D97706',
    accentLight: '#FEF3C7',
    accentDark: '#92400E',
    accent50: '#FFFBEB',

    // Civic Blue (Telemetry & Information)
    blue: '#1D4ED8',
    blueLight: '#DBEAFE',
    blueDark: '#1E3A8A',
    blue50: '#EFF6FF',

    // Destructive / Danger
    destructive: '#DC2626',
    destructiveLight: '#FEE2E2',
    destructiveDark: '#991B1B',
    destructive50: '#FEF2F2',

    // Typography Colors
    text: '#18181B',
    textSecondary: '#52525B',
    textMuted: '#71717A',
    textInverse: '#FFFFFF',

    // Status Badges
    status: {
      draft: { bg: '#F4F4F5', text: '#52525B', border: '#E4E4E7' },
      submitted: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
      underReview: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
      validated: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
      rejected: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
      inProgress: { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
    },
  },

  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    size: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      xxl: 24,
      title: 28,
    },
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },

  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 9999,
  },

  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },

  shadows: {
    card: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    hover: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};
