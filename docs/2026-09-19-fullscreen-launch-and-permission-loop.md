# 2026-09-19 — Full-screen launch & permission loop

## Context
Laporan user setelah build `db84dfb`:
1. Alarm terjadwal hanya mengirim notifikasi saat waktunya tiba; app tidak terbuka otomatis (harus tap notifikasi).
2. Angka "Scheduled alarms" tidak sesuai jumlah alarm dan berubah-ubah (random) tiap resync.
3. Setiap kali menyimpan alarm (tombol centang di form add/edit), app membuka halaman sistem "Alarms & reminders" terus-menerus, padahal permission sudah tercentang.

Device: Infinix Hot 50 Pro, Android 14 (XOS).

## Yang diminta
- Alarm membuka app secara langsung (full-screen) saat waktunya tiba, bukan sekadar notifikasi.
- Hentikan loop pembukaan halaman permission saat menyimpan alarm.
- Jelaskan/perbaiki angka scheduled alarms.

## Yang dikerjakan
1. **Permission loop (akar: `requestAlarmPermissions`)** — fungsi selalu memanggil `notifee.openAlarmPermissionSettings()` tanpa mengecek status dulu, jadi setiap save alarm membuka Settings sistem walau sudah di-grant. Sekarang: cek status dulu, hanya buka halaman sistem untuk permission yang benar-benar belum di-grant.
2. **Angka random (akar: `nextOccurrence`)** — menyimpan alarm untuk menit yang sama dengan waktu sekarang menghasilkan timestamp yang bukan "future", dan notifee menolak pembuatan trigger tersebut. Karena penolakan bersifat per-trigger (tergantung detik saat save), jumlah trigger yang berhasil berubah-ubah. Fix: timestamp wajib minimal 2 menit di depan; kalau kurang, digeser +7 hari.
3. **Full-screen launch** — mekanisme yang benar sudah terpasang (`fullScreenAction`), tapi Android hanya mengirim full-screen intent jika app punya akses **"Display over other apps"** — di XOS default-nya deny. Ditambahkan:
   - Helper `openOverlaySettings()` (intent `MANAGE_OVERLAY_PERMISSION` dengan package URI).
   - Baris baru di Settings → Permissions: "Display over other apps" dengan hint.
4. Label "Scheduled alarms" diperjelas: angkanya adalah jumlah **trigger** (alarm × hari berulang), bukan jumlah alarm. 3 alarm harian = 21 trigger — itu normal.

## Ekspektasi hasil
- Menyimpan alarm tidak lagi membuka Settings sistem (kecuali permission memang belum ada).
- Angka scheduled alarms stabil dan konsisten = total hari semua alarm aktif.
- Setelah "Display over other apps" di-allow: saat alarm bunyi di background/layar mati, app terbuka sendiri menampilkan layar alarm penuh.

## Yang belum sesuai ekspektasi (untuk iterasi berikutnya)
- Belum diverifikasi di device (menunggu build + grant overlay permission oleh user).
- Jika XOS tetap memblokir full-screen intent meski overlay di-allow, opsi lanjutan: native module kecil yang memanggil `startActivity` dari AlarmReceiver, atau foreground service pemutar suara + wake screen.
