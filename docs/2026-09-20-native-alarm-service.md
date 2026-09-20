# 2026-09-20 — Native Alarm Service (foreground service + wake screen)

## Context
Alarm hanya mengirim notifikasi saat terpicu di background; suara dan pembukaan app tidak jalan. Layer JavaScript tidak berjalan saat app dimatikan, dan suara notifikasi/full-screen intent dibatasi XOS.

## Permintaan
- Alarm harus berbunyi dan membuka app saat schedule tiba, termasuk app dimatikan / layar mati.
- Penjelasan langkah "foreground service pemutar suara + wake screen" sebelum implementasi.

## Yang dikerjakan
- Membuat local Expo module `modules/alarm-native` (Kotlin):
  - `AlarmNativeModule`: schedule/cancel exact alarm via `AlarmManager.setExactAndAllowWhileIdle`, `stop`, `takeLastAlarm`.
  - `AlarmReceiver`: menerima broadcast alarm → start `AlarmService` (foreground, mediaPlayback) → launch MainActivity (turnScreenOn/showWhenLocked).
  - `AlarmService`: WakeLock, MediaPlayer loop dengan audio usage ALARM, vibrasi, auto-stop 5 menit, notifikasi persisten.
- `nativeAlarm.ts` kini menjadwalkan lewat AlarmManager native (bukan notifee trigger). Notifee tetap dipakai untuk permission/diagnostik; trigger notifee lama dibersihkan otomatis.
- `alarm-ringer.ts` menghentikan service native saat UI ringer mengambil alih.
- `_layout.tsx` membuka layar alarm dari id yang direkam receiver (cold/warm launch).

## Ekspektasi hasil
- Saat waktu alarm tiba (app mati sekalipun): ringtone bunyi (stream alarm), getar, layar menyala, app terbuka di layar alarm.
- "Scheduled alarms" di Settings = jumlah trigger native (alarm × hari), stabil.

## Yang belum sesuai ekspektasi
(lihat docs berikutnya setelah pengujian device)
