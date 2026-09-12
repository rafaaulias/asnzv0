import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

export default function RootLayout() {
  return <><StatusBar style="dark" /><Stack screenOptions={{ contentStyle: { backgroundColor: colors.paper }, headerShown: false }} /></>;
}
