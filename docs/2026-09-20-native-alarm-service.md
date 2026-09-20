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

## Iterasi 3: build sukses tapi alarm background tetap diam (tidak ada apa-apa)
- Laporan user: app hanya di-home (bukan force-stop), semua permission XOS nyala, hasil: tidak ada notif/suara/layar sama sekali.
- Analisis: receiver kemungkinan tidak pernah dipicu — dua kandidat: (1) alarm tidak terdaftar di AlarmManager dan diagnostik lama buta (membaca trigger notifee yang sudah dibersihkan), (2) XOS memblokir `setExactAndAllowWhileIdle` untuk non-clock-app.
- Perbaikan (A+B+C):
  - A: scheduling diganti ke `AlarmManager.setAlarmClock()` — API khusus app jam, di-whitelist OEM, fallback ke exact/inexact bila SecurityException.
  - B: `pendingCount()` native membaca AlarmManager langsung (id dilacak di SharedPreferences) — diagnostik Settings kini jujur lintas restart.
  - C: tombol "Tes alarm native" di Settings — memicu jalur native penuh 30 detik kemudian, tanpa lewat data alarm.
- Ekspektasi: tes 30 detik bunyi di background; "Scheduled alarms" ≥ 1 setelah resync. Jika tes bunyi tapi alarm biasa tidak, masalah di data/sync; jika tes pun diam, kirim logcat.

## Iterasi 4: build A+B+C gagal (Gradle)
- Penyebab yang ditemukan lewat review statis: `AlarmManager.AlarmClockInfo(timestamp, showIntent)` dikirim `Intent?` mentah dari `getLaunchIntentForPackage`, padahal konstruktornya menuntut `PendingIntent` — type mismatch saat kompilasi Kotlin.
- Fix: launch intent dibungkus `PendingIntent.getActivity(...)` sebelum masuk `AlarmClockInfo`.
- Catatan proses: sandbox tidak punya Android SDK/Gradle dan tidak ter-auth ke EAS, jadi error build hanya bisa diverifikasi dari log EAS yang dikirim user atau review statis. Untuk iterasi berikutnya, selalu minta potongan error dari log `Run gradlew` sebelum menebak.

## Iterasi 5: tes native bunyi, alarm asli diam — AKAR MASALAH SEBENARNYA
- Laporan user: "Tes alarm native" bunyi di background dan layar mati, tapi alarm asli tidak terjadi apa-apa.
- Deduksi: receiver/service id-agnostic — tes dan alarm asli lewat jalur native yang sama. Satu-satunya perbedaan: tes tidak melibatkan hari. Kesimpulan: alarm asli tidak pernah terdaftar karena resolusi hari gagal.
- Bukti: `alarm-form.tsx` memuat dua format hari (`DAY_KEYS` dan `DAY_LETTERS = ['S','M','T','W','T','F','S']`). Alarm lama tersimpan sebagai huruf; `dayToWeekday('S')` → -1 → semua hari ter-filter → `scheduleNativeAlarm` return 0 diam-diam.
- Fix: `loadAlarms()` kini menormalisasi semua format (EN 3-huruf, label Indonesia MIN/SEN/..., single-letter 7-elemen dipetakan posisional) ke format kanonik saat load — satu titik, mencakup scheduling, tampilan, dan watcher.
- Pengaman: `scheduleNativeAlarm` kini mencatat error terlihat di Settings jika alarm aktif punya 0 hari valid — bug kelas ini tidak bisa diam-diam lagi.
- Ekspektasi: setelah update, buka app (focus → sync) → "Scheduled alarms" ≥ 1 → alarm asli bunyi di background seperti tes.

## Iterasi 6: work sekali lalu tidak pernah lagi — alarm one-shot tanpa repeat/boot restore
- Laporan user: setelah fix hari, alarm bunyi sekali (bahkan layar mati), lalu tidak pernah lagi — termasuk app di background, dan resync tidak menolong.
- Akar: `setAlarmClock` itu one-shot. Tidak ada mekanisme repeat mingguan, tidak ada BootReceiver (reboot menghapus semua alarm), dan `pendingCount` menghitung PendingIntent basi sehingga diagnostik menyesatkan.
- Fix native:
  - `AlarmScheduler` (baru): state terpusat di SharedPreferences — daftar trigger (id → timestamp) + flag enabled per alarm id.
  - `AlarmReceiver`: setelah memicu, mendaftarkan ulang slot yang sama +7 hari (kecuali alarm sudah dimatikan/dihapus — flag enabled dicek).
  - `BootReceiver` (baru): setelah reboot, memulihkan semua trigger dari state tersimpan (timestamp lewat → +7 hari).
  - `cancel(alarmId)` native kini satu panggilan yang membatalkan semua slot hari + membersihkan state.
  - Diagnostik jujur: trigger yang sudah terpicu dihapus dari state; `nextTriggerTime()` baru menampilkan "Alarm berikutnya" di Settings.
- Fix JS: `schedule(triggerId, weekday, ts)`; `consumeLastNativeAlarm` tidak lagi split '-' (UUID mengandung dash — bug tersembunyi yang membuat active-alarm salah match); lead 2 menit diturunkan ke 10 detik agar sync menjelang waktu alarm tidak mendorong trigger seminggu.
- Ekspektasi: alarm harian kini bunyi setiap hari tanpa membuka app; bertahan reboot; Settings menampilkan tanggal+jam alarm berikutnya yang harusnya cocok dengan alarm terdekat.
