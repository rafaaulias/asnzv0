import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { hasSeenPermissions } from '@/services/storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme';

export default function RootLayout() {
  const [loaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { hasSeenPermissions().then((seen) => { if (!seen && pathname !== '/permissions') router.replace('/permissions'); }); }, [pathname, router]);
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><ActivityIndicator color={colors.ink} /></View>;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.paper }, headerShown: false }} />
    </SafeAreaProvider>
  );
}
