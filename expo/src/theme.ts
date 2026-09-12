import { Platform } from 'react-native';

export const colors = {
  ink: '#000000',
  paper: '#FFFFFF',
  label: '#555555',
  muted: '#5E5E5E',
  faintText: '#7F7F7F',
  surface: '#F9F9F9',
  border: '#EAEAEA',
  borderSoft: '#EEEEEE',
  disabled: '#E2E2E2',
  disabledBorder: '#C4C7C7',
  dayInactiveBg: '#EAEAEA',
  dayInactiveText: '#7F7F7F',
  orange: '#FF7A00',
  danger: '#D92D20',
  success: '#16803C',
  systemBackground: Platform.OS === 'ios' ? '#FFFFFF' : '#FAFAFA',
  // Aliases kept for screens (e.g. challenge.tsx) not touched in this pass.
  line: '#EAEAEA',
  soft: '#F9F9F9',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 24, full: 999 } as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, fontFamily: fonts.bold, color: colors.ink },
  title: { fontSize: 24, fontWeight: '700' as const, fontFamily: fonts.bold, color: colors.ink },
  headline: { fontSize: 17, fontWeight: '600' as const, fontFamily: fonts.semibold, color: colors.ink },
  body: { fontSize: 16, fontWeight: '400' as const, fontFamily: fonts.regular, color: colors.ink },
  subhead: { fontSize: 14, fontWeight: '400' as const, fontFamily: fonts.regular, color: colors.label },
  caption: { fontSize: 12, fontWeight: '500' as const, fontFamily: fonts.medium, color: colors.label },
};

export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
};

// Sticky pill navigation — liquid glass style shared by the top bar and bottom tab bar.
export const nav = {
  pillHeight: 56,
  bottomPillHeight: 64,
  sideMarginPercent: 0.08,
  glassTint: 'rgba(255,255,255,0.7)',
  glassBorder: 'rgba(0,0,0,0.08)',
  // Top nav: barely-there elevation.
  topShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  // Bottom nav: more visible than the top bar, per design.
  bottomShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
};
