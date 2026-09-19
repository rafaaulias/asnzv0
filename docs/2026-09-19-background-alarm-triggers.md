# 2026-09-19 — Background Alarm Triggers (Scheduled = 0)

## Context

Laporan terbaru: alarm bunyi sesuai schedule **hanya saat app terbuka**. Saat app di background / layar mati, alarm tidak muncul. Diagnostics di Settings menunjukkan **Scheduled alarms = 0** padahal 3 alarm aktif (06:30 all days, 23:09 all days, 06:30 all days) dan semua permission Allowed (Notifications, Alarms & reminders, Battery Unrestricted).

Fakta penting: alarm "bunyi saat app terbuka" berasal dari fallback in-app watcher (15 detik) yang dibuat sebelumnya — bukan dari native trigger. Ini mengonfirmasi bahwa **native trigger tidak pernah berhasil dibuat**.

## Yang Diminta

1. Alarm harus berbunyi dan membuka layar alarm saat app di background / layar mati.
2. Cari penyebab `Scheduled alarms = 0` dan perbaiki.

## Yang Dikerjakan

1. **Error scheduling ditampilkan, bukan ditelan.** Selama ini kegagalan `createTriggerNotification` hanya masuk `console.log` (tidak terlihat di device). Sekarang error terakhir disimpan dan ditampilkan di Settings (teks merah di bawah kartu Permissions) saat Scheduled = 0.
2. **Fallback channel minimal.** Jika ROM menolak field channel yang extended (sound/vibrationPattern/bypassDnd/visibility), channel dibuat ulang minimal agar scheduling tetap jalan.
3. **Fallback notifikasi minimal.** Jika `createTriggerNotification` dengan config lengkap (loopSound, sound, ongoing, vibrationPattern) ditolak native, dicoba ulang dengan config minimal (channel + full-screen intent saja). Alarm tetap terpasang walau tanpa custom sound.
4. **Resync manual.** Baris "Scheduled alarms" di Settings sekarang bisa diketuk untuk menjalankan ulang sinkronisasi dan langsung melihat hasil + error terbaru.
5. **Fix deteksi warm-launch.** `checkFiredAlarm` sebelumnya mencocokkan id yang diawali `'alarm'` (tidak pernah cocok karena id notifikasi berupa `<alarmId>-<weekday>`). Sekarang cukup mencocokkan channelId.

## Ekspektasi Hasil

- Setelah buka app (atau ketuk "Scheduled alarms"), angka berubah dari 0 menjadi ≥ jumlah hari alarm aktif (3 alarm all-days = 21 trigger).
- Alarm terjadwal menyala saat layar mati / app di background: layar menyala menampilkan layar alarm dengan suara looping.
- Jika masih 0, teks merah di Settings menampilkan pesan error native yang sebenarnya — itu jawaban pasti untuk langkah berikutnya, bukan tebakan.

## Yang Belum Sesuai Ekspektasi

- (Iterasi sebelumnya) Scheduling pernah di-gate oleh hasil permission check yang salah laporan di XOS — sudah dihilangkan, tapi ternyata trigger tetap gagal dibuat secara native; penyebab pastinya belum terlihat karena error hanya masuk console. Iterasi ini menambahkan visibilitas error + fallback agar kasus "gagal diam-diam" tidak terulang.
- Belum terverifikasi di device: perlu build APK baru lalu cek angka "Scheduled alarms" dan teks error (jika ada) via tombol resync.
