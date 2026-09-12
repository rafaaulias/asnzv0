import { Platform } from 'react-native';

export const colors = {
  ink: '#0A0A0A',
  paper: '#FFFFFF',
  muted: '#6B6B6B',
  line: '#E9E9E9',
  soft: '#F6F6F6',
  orange: '#FF7A00',
  danger: '#D92D20',
  success: '#16803C',
  systemBackground: Platform.OS === 'ios' ? '#FFFFFF' : '#FAFAFA',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 22, full: 999 } as const;
export const type = {
  largeTitle: { fontSize: 34, fontWeight: '800' as const, color: colors.ink },
  title: { fontSize: 24, fontWeight: '800' as const, color: colors.ink },
  headline: { fontSize: 17, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.ink },
  subhead: { fontSize: 14, fontWeight: '500' as const, color: colors.muted },
  caption: { fontSize: 12, fontWeight: '600' as const, color: colors.muted },
};
export const shadow = { card: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 } };
