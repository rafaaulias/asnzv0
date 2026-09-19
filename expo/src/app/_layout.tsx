import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { hasSeenPermissions, loadPreferences } from '@/services/storage';
import { setLanguage } from '@/i18n';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme';

export default function RootLayout() {
  const [loaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { hasSeenPermissions().then((seen) => { if (!seen && pathname !== '/permissions') router.replace('/permissions'); }); loadPreferences().then((preferences) => setLanguage(preferences.language)); }, [pathname, router]);
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    import('@/services/nativeAlarm').then(({ addAlarmResponseHandler, consumePendingAlarm }) => {
      subscription = addAlarmResponseHandler((alarmId) => router.push({ pathname: '/active-alarm', params: alarmId ? { alarmId } : {} }));
      // A press on the alarm notification while the app was backgrounded is
      // recorded as a pending alarm; open the ringer screen once the app is active.
      const stateSubscription = AppState.addEventListener('change', async (state) => {
        if (state !== 'active') return;
        const pending = await consumePendingAlarm();
        if (pending !== undefined) router.push({ pathname: '/active-alarm', params: pending ? { alarmId: pending } : {} });
      });
      const previousRemove = subscription.remove;
      subscription.remove = () => { previousRemove(); stateSubscription.remove(); };
    });
    return () => subscription?.remove();
  }, [router]);
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><ActivityIndicator color={colors.ink} /></View>;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.paper }, headerShown: false }} />
    </SafeAreaProvider>
  );
}
