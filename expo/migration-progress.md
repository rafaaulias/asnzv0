# Anti-Snooze Expo migration

## Status
- [x] Audit source repo: PRD, package manifest, all routes/components/services.
- [x] Scaffold Expo Router shell with Alarms, Stats, Premium, Settings tabs.
- [x] Native alarm path: active alarm → math/shake challenge → success route boundary.
- [ ] Replace notification boundary with production Android full-screen intent + foreground audio module.
- [ ] Add generated 880 Hz / 1320 Hz WAV assets and native ramp playback.
- [ ] Physical-device verification on iOS and Android.

## Screen worklist
| Screen | Bucket | Status |
|---|---|---|
| Alarms | nativize-now | Native route with offline alarm cards |
| Active alarm | nativize-now | Native dark lock-in surface |
| Math challenge | nativize-now | Native keypad and difficulty-driven generation |
| Shake challenge | nativize-now | Accelerometer vector magnitude + 200ms debounce |
| Success | hybrid | Route boundary pending |
| Stats | port-as-is | Native shell placeholder wired for local history |
| Premium | port-as-is | Native shell placeholder; no cloud/payment |
| Settings | nativize-later | Core settings surface wired, controls pending |

## Dependency audit
| Web dependency | Native replacement | Reason |
|---|---|---|
| motion/react | Native stack + Reanimated when gesture work lands | Platform navigation and UI-thread motion |
| lucide-react | @expo/vector-icons | Native icon fonts |
| DeviceMotionEvent | expo-sensors Accelerometer | Native accelerometer permissions and sampling |
| Web Audio API | expo-audio + WAV assets; native alarm module for background | Oscillators are not reliable while locked |
| navigator.vibrate | expo-haptics | Native haptic feedback |
| localStorage | AsyncStorage | Offline device persistence |
| setInterval alarm | expo-notifications + Android native alarm module | JS timers are not reliable in background |
| Tailwind CSS | StyleSheet + single theme.ts | Native layout and design tokens |
| express/dotenv | none | No backend or secrets by product design |

## Platform decisions and limitations
- Approved strategy: custom native alarm module, pre-rendered dual-frequency WAV loops, native shell first.
- Android production requires EAS development/release build, exact-alarm permissions, full-screen intent, wake lock, boot rescheduling, and foreground media playback service. Expo Go is not sufficient.
- iOS schedules local notifications and uses native audio where allowed. iOS cannot force-launch the challenge UI over a locked screen without user interaction; Critical Alerts require Apple entitlement approval. This is an explicit platform limitation.
- Shake threshold starts at 1.8G with 100ms sampling and 200ms debounce from the PRD, but must be recalibrated on physical devices.
- No cloud, analytics, API keys, tracking, or remote persistence.

## Run/build
```bash
cd expo
pnpm install
npx expo start
npx eas build:configure
npx eas build -p android --profile preview
```
