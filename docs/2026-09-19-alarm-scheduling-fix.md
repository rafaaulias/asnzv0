# 2026-09-19 — Perbaikan Scheduling Alarm

## Context

- Alarm test (app terbuka) berbunyi normal, tetapi alarm terjadwal tidak pernah muncul di device (Infinix Hot 50 Pro, Android 14 / XOS).
- Sebelumnya sudah diperbaiki: off-by-one weekday mapping, migrasi ke notifee (exact alarm + full-screen intent), custom ringtone, i18n penuh, EAS Update (`expo-updates` terinstall, APK terakhir sudah di-rebuild).
- User melaporkan alarm tetap tidak berfungsi meski semua permission sudah diberikan manual.

## Permintaan

1. Fokus mencari penyebab alarm tidak berfungsi dan memperbaikinya.
2. Dokumentasikan kondisi permission device yang dibutuhkan agar alarm berfungsi optimal.
3. Buat folder `docs/` berisi dokumentasi progres (file ini).

## Akar Masalah yang Ditemukan

1. **Scheduling di-gate oleh hasil permission prompt.** `useFocusEffect` di halaman Alarms memanggil `requestAlarmPermissions()` dan hanya menjadwalkan alarm jika return `true`. Fungsi itu mengecek `settings.android?.alarm === 1` — di sebagian ROM (termasuk XOS) nilai ini bisa dilaporkan `0` meskipun exact alarm sudah di-grant via `USE_EXACT_ALARM`. Akibatnya **semua alarm tidak pernah dijadwalkan, tanpa error dan tanpa tampilan apa pun**.
2. **Kegagalan pembuatan channel di-cache permanen.** `getNotifee()` menyimpan hasil `catch(() => null)`; satu kegagalan transient membuat scheduling mati total sampai app di-restart.
3. **Tidak ada verifikasi.** Kegagalan `createTriggerNotification` hanya masuk console.log; tidak ada cara melihat dari UI apakah alarm benar-benar terjadwal.
4. **Full-screen intent warm-launch tidak menavigasi.** Saat alarm menyala saat app di background (activity masih hidup), tidak ada event PRESS maupun initial notification — app terbuka tapi tetap di layar terakhir.
5. **Tidak ada fallback in-app.** Jika notifikasi tertunda/diblokir ROM, tidak ada mekanisme lain yang memicu layar alarm.

## Yang Dikerjakan

- `src/services/nativeAlarm.ts` (ditulis ulang):
  - `syncAlarms()` — menyamakan daftar trigger native dengan storage; menjadwalkan semua alarm aktif **tanpa gate permission**, membatalkan trigger milik alarm nonaktif/terhapus.
  - Retry channel creation (tidak lagi cache `null` permanen).
  - `getAlarmDiagnostics()` — status notifikasi, exact alarm, battery optimization, dan **jumlah trigger terjadwal** yang bisa dibaca dari native.
  - `checkFiredAlarm()` — mendeteksi notifikasi alarm yang tampil (sumber kebenaran untuk warm-launch full-screen intent) lalu membatalkannya setelah dikonsumsi.
- `src/app/(tabs)/index.tsx` — fokus layar memanggil `syncAlarms()`; prompt permission tidak lagi menjadi syarat scheduling.
- `src/app/_layout.tsx` — saat app kembali aktif: cek `checkFiredAlarm()` + pending alarm; plus **watcher in-app tiap 15 detik** yang membuka layar alarm jika waktu alarm tercapai saat app terbuka (fallback jika notifikasi OS tertunda).
- `src/app/(tabs)/settings.tsx` — kartu Permissions kini menampilkan status riil: Notifications, Alarms & reminders, Battery (Unrestricted/Restricted + tap untuk perbaiki), dan **jumlah alarm terjadwal** — alat diagnosis langsung di device.
- `docs/` — dokumentasi progres (file ini dan README).

## Ekspektasi Hasil

1. Alarm terjadwal menyala pada waktu yang dipilih: notifikasi full-screen muncul, layar menyala, app terbuka ke layar Active Alarm dengan suara looping.
2. Jika notifikasi OS tertunda/diblokir ROM tetapi app terbuka, watcher in-app tetap membuka layar alarm pada menit yang tepat.
3. Di Settings terlihat: semua permission "Allowed", Battery "Unrestricted", dan Scheduled alarms ≥ jumlah hari alarm aktif (mis. alarm 5 hari kerja = 5).
4. Jika alarm tetap tidak menyala, angka "Scheduled alarms" langsung menunjukkan di mana masalahnya (0 = scheduling gagal; ≥1 = masalah di lapisan OS).

## Kondisi Permission Device yang Dibutuhkan (Infinix/XOS)

| Permission | Cara cek | Catatan |
|---|---|---|
| Notifications | Settings > Apps > Anti-Snooze > Notifications | Wajib. |
| Alarms & reminders | Settings > Apps > Special app access > Alarms & reminders | Wajib agar exact alarm tepat waktu. |
| Display over other apps | Settings > Apps > Special app access > Display over other apps | Wajib agar full-screen intent membuka app saat layar mati. |
| Battery: Unrestricted | Settings > Apps > Anti-Snooze > Battery | Wajib di XOS; tanpa ini alarm bisa tertunda bermenit-menit atau tidak jalan. |
| Background/Auto-launch (XOS) | Settings > Background management / App launch | Izinkan auto-launch agar trigger tidak dibekukan. |

## Yang Belum Sesuai Ekspektasi

- (Diisi pada sesi berikutnya setelah pengujian di device.)
