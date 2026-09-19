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
    let lastFiredKey = '';
    import('@/services/nativeAlarm').then(({ addAlarmResponseHandler, consumePendingAlarm, checkFiredAlarm }) => {
      subscription = addAlarmResponseHandler((alarmId) => router.push({ pathname: '/active-alarm', params: alarmId ? { alarmId } : {} }));
      const openAlarm = async (alarmId?: string) => router.push({ pathname: '/active-alarm', params: alarmId && alarmId !== 'true' ? { alarmId } : {} });
      const stateSubscription = AppState.addEventListener('change', async (state) => {
        if (state !== 'active') return;
        // Full-screen intent on a warm launch fires no PRESS event; the
        // displayed-notification check is the only reliable signal.
        const fired = await checkFiredAlarm();
        if (fired !== undefined) { await openAlarm(fired); return; }
        const pending = await consumePendingAlarm();
        if (pending !== undefined) await openAlarm(pending);
      });
      // In-app fallback: if the OS notification is delayed or dropped (common
      // on aggressive ROMs), the app itself opens the ringer at fire time.
      const watcher = setInterval(async () => {
        if (AppState.currentState !== 'active') return;
        const now = new Date();
        const key = `${now.getHours()}:${now.getMinutes()}`;
        if (key === lastFiredKey) return;
        const alarms = await import('@/services/storage').then(({ loadAlarms }) => loadAlarms());
        const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()];
        const due = alarms.find((alarm) => alarm.enabled && alarm.days.includes(weekday) && alarm.time === `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        if (due) { lastFiredKey = key; await openAlarm(due.id); }
      }, 15_000);
      const previousRemove = subscription.remove;
      subscription.remove = () => { previousRemove(); stateSubscription.remove(); clearInterval(watcher); };
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
