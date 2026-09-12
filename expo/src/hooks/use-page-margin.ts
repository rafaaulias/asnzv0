import { useWindowDimensions } from 'react-native';
import { nav } from '@/theme';

// Every screen and both nav pills share this exact horizontal inset so
// margins line up across the whole app.
export function usePageMargin() {
  const { width } = useWindowDimensions();
  return Math.round(width * nav.sideMarginPercent);
}
