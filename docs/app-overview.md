# Anti-Snooze Alarm — Ringkasan Aplikasi

Dokumen presentasi: apa ini, bagaimana bekerjanya, dan keputusan teknis di baliknya.

---

## 1. Ringkasan

Alarm bangun tidur yang **tidak bisa di-snooze**. Untuk mematikan alarm, pengguna harus menyelesaikan challenge — memecahkan soal matematika atau menggoyangkan HP dengan keras. Semuanya berjalan **100% offline di perangkat**, tanpa akun, tanpa server.

## 2. Fitur Utama

| Fitur | Penjelasan |
|---|---|
| Alarm native Android | Bunyi di background, layar mati, bahkan setelah HP restart |
| Challenge bangun | Matematika (3 tingkat kesulitan) atau Shake (target goyangan) |
| Auto-repeat mingguan | Alarm harian otomatis terjadwal ulang +7 hari setelah berbunyi |
| Boot restore | Alarm dipulihkan otomatis setelah HP dimatikan/nyalakan |
| Streak | Hitungan hari berturut-turut menyelesaikan challenge |
| Statistik | Riwayat 7 hari, jumlah completion per jenis challenge, rata-rata waktu |
| Custom ringtone | Tambah banyak nada dering dari file MP3/WAV/OGG, bebas pilih |
| Dua bahasa | Indonesia & Inggris, bisa diganti kapan saja |
| Diagnostik | Status izin, jumlah trigger terjadwal, dan "Alarm berikutnya" yang akurat |

## 3. Cara Kerja Alarm (Tech Stack)

**Stack:** React Native (Expo) + expo-router untuk navigasi, TypeScript, AsyncStorage untuk data, dan **native module Kotlin kustom** (`modules/alarm-native`) untuk penjadwalan.

Alur pemicuan, dari JS sampai bunyi:

```
JS (nativeAlarm.ts)
  └─ schedule(triggerId, weekday, timestamp)  → bridge ke native
AlarmNativeModule (Kotlin)
  └─ AlarmScheduler: simpan state trigger di SharedPreferences,
     daftarkan AlarmManager.setAlarmClock() — satu trigger per hari aktif
  [waktu tiba]
AlarmReceiver
  └─ cek alarm masih aktif → daftarkan ulang trigger yang sama +7 hari
     (auto-repeat mingguan) → nyalakan layar (full-screen intent)
AlarmService (foreground service)
  └─ bunyikan ringtone + getaran sampai challenge selesai
```

Keputusan teknis penting:

- **`setAlarmClock()`, bukan `setExact()`** — paling dihormati OS (didesain khusus untuk alarm pengguna), dan tidak butuh izin khusus di Android 14+.
- **Satu trigger per hari aktif** — alarm "Sen–Jum 06:30" adalah 4-5 trigger terpisah, masing-masing dengan ID unik `{alarmId}-{weekday}`.
- **State native di SharedPreferences** — sumber kebenaran untuk boot restore dan diagnostik; JS hanya mengirim perintah.
- **Fallback watcher di JS** — lapisan kedua kalau trigger native gagal.

## 4. Cara Kerja Streak

1. Setiap challenge selesai → `recordChallengeCompletion(type, durasi)` menyimpan `{tanggal, jenis, durasi}` (maks. 1 record per hari, riwayat 365 hari).
2. Streak dihitung mundur dari hari ini: hari ini ada record → +1, kemarin ada → +1, dst. Berhenti di hari pertama yang kosong.
3. Tidak bangun = tidak ada record = streak putus. Sederhana dan jujur — tidak ada "streak freeze".

## 5. Alur Aplikasi

```
Splash → Permissions (sekali, onboarding izin)
  └─ Tab Alarm     : daftar alarm, toggle, tambah/edit (alarm-form)
  └─ Tab Statistik : streak, grafik 7 hari, efisiensi challenge
  └─ Tab Pengaturan: izin & diagnostik, ringtone, preferensi
[Alarm berbunyi]
  → Active Alarm (layar penuh) → Challenge (math/shake)
  → Success → record completion → kembali ke Tab Alarm
```

## 6. Di Mana Data Disimpan

| Data | Lokasi | Kunci |
|---|---|---|
| Daftar alarm | AsyncStorage | `anti_snooze_alarms_v1` |
| Preferensi (bahasa, ringtone, dll) | AsyncStorage | `anti_snooze_preferences_v1` |
| Record completion (streak & stats) | AsyncStorage | `anti_snooze_completion_dates_v1` |
| File ringtone kustom | Filesystem app (`.../ringtones/`) | — |
| State trigger native | SharedPreferences Android | — |

Tidak ada data yang keluar dari perangkat. Menghapus app = menghapus semua data (by design, privasi-first).

## 7. Q&A / Pertanyaan Jebakan

**Q: Kalau app-nya di-force-close / di-swipe dari recents, alarm tetap bunyi?**
A: Ya. Penjadwalan ada di level OS (AlarmManager), bukan di proses app. Force-close tidak menghapus trigger yang sudah terdaftar.

**Q: Kalau HP dimatikan, alarm tetap bunyi?**
A: Setelah dinyalakan ulang, ya — BootReceiver memulihkan semua alarm dari state native. Tidak ada alarm yang bisa berbunyi saat HP benar-benar mati (itu batasan semua alarm, termasuk bawaan Android).

**Q: Kenapa tidak pakai Firebase/Supabase biar "modern"?**
A: Alarm adalah fitur kritis yang harus bekerja offline. Server menambah titik gagal (down, latency, auth) tanpa manfaat — tidak ada fitur yang butuh internet.

**Q: Kenapa challenge-nya matematika, bukan captcha/gambar?**
A: Matematika memaksa otak bagian sadar aktif — tidak bisa diselesaikan setengah sadar. Shake menguji fisik. Keduanya butuh 5-30 detik, cukup untuk bangun tapi tidak cukup lama membuat frustrasi.

**Q: Bisa di-bypass dengan mematikan HP sebelum alarm bunyi?**
A: Bisa — dan itu bukan bug. Tujuan app adalah menambah friksi bangun, bukan penjara. Bahkan alarm bawaan pun bisa dimatikan dengan reboot.

**Q: Kenapa efisiensi di statistik menampilkan rata-rata waktu, bukan persen sukses?**
A: Karena app hanya mencatat completion (alarm yang berhasil dimatikan), bukan percobaan yang gagal/di-skip. Persen tanpa data attempts = angka palsu. Rata-rata waktu dihitung dari data nyata.

**Q: Kenapa ringtone kustom disalin ke storage app, bukan dipakai dari lokasi aslinya?**
A: File hasil DocumentPicker ada di cache sementara yang bisa dibersihkan Android kapan saja. Menyalinnya menjamin ringtone tetap ada saat alarm berbunyi minggu-minggu depan.

**Q: Kenapa `setAlarmClock` per hari, bukan `setRepeating`?**
A: `setRepeating` di Android tidak exact (dapat digeser OS untuk hemat baterai). Exact per-trigger + re-schedule otomatis di receiver = presisi tinggi dan tetap hemat.

**Q: Apa yang terjadi kalau dua alarm bunyi bersamaan?**
A: Keduanya tampil; challenge dikerjakan berurutan. Tiap alarm punya ID dan layar sendiri.

**Q: Kenapa ada fallback watcher di JS kalau native sudah cukup?**
A: Defense in depth. Native adalah jalur utama; watcher menutup kasus tepi (misal trigger gagal daftar karena update OS). Kalau keduanya gagal, diagnostik di Settings menunjukkan errornya — tidak ada kegagalan diam-diam.
