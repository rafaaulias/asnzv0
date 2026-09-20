# 2026-09-20 — Native Alarm Service (lanjutan: perbaikan build)

## Context
Iterasi sebelumnya menambahkan native module `modules/alarm-native` (AlarmManager + foreground service pemutar suara + wake screen) karena alarm tidak berbunyi di background. Build EAS pertama dengan modul ini **gagal** di fase Gradle.

## Yang diminta
Perbaiki build yang gagal tanpa mengubah perilaku fitur.

## Yang dikerjakan
1. **Akar kegagalan build:** `android/build.gradle` modul memakai pola template lama (`applyNativeModulesSettingsGradle`, `safeExtGet`, `apply from: ExpoModulesCorePlugin.gradle`) yang **tidak tersedia** di expo-modules-core SDK 54 — Gradle gagal saat konfigurasi. Ditulis ulang mengikuti pola modul resmi SDK 54 (`expo-module-gradle-plugin`), disamakan dengan `expo-keep-awake`.
2. **Fix import Kotlin:** `expo.modules.kotlin.ModuleDefinition` → `expo.modules.kotlin.modules.ModuleDefinition` (sesuai API SDK 54).
3. **Lengkapi permission native** di manifest modul: `WAKE_LOCK` (wajib untuk WakeLock), `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (wajib targetSdk 34 untuk service type mediaPlayback), `VIBRATE`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`.

## Ekspektasi hasil
- Build EAS sukses.
- Alarm berbunyi di background/app dimatikan: ringtone via stream ALARM, getar, layar menyala, app terbuka di layar alarm.

## Yang belum sesuai ekspektasi
- (Menunggu verifikasi user) Build pertama gagal — diperbaiki di commit ini. Jika build berikutnya masih gagal, kirim baris error dari log `Run gradlew`.

## Iterasi 2: build gagal lagi (compileReleaseKotlin)
- Error persis dari log: `AlarmNativeModule.kt:49:48 Return type mismatch: expected 'Any?', actual 'Unit'`.
- Penyebab: `return@Function` kosong di lambda `Function("cancel")` / `Function("stop")` yang tipe kembaliannya di-infer `Any?`.
- Fix: semua fungsi modul konsisten return `Boolean` (`return@Function false` saat context hilang, `true` saat sukses).
- Sekalian: hapus `runtimeVersion` duplikat di dalam `updates` (error schema expo doctor), deduplikasi `android.permissions` dan iOS `UIBackgroundModes` yang terdaftar dua kali.
- Ekspektasi: build berikutnya sukses; perilaku fitur tidak berubah.
