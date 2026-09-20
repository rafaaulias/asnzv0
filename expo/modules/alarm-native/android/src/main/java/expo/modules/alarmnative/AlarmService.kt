package expo.modules.alarmnative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat

class AlarmService : Service() {
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private val handler = Handler(Looper.getMainLooper())

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
        enableVibration(true)
      }
    )
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Anti-Snooze alarm")
      .setContentText("Complete your challenge to unlock.")
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setOngoing(true)
      .build()
    startForeground(NOTIFICATION_ID, notification)

    wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AntiSnooze:AlarmRinging")
    wakeLock?.acquire(RING_TIMEOUT)

    startSound()
    startVibration()
    handler.postDelayed({ stopSelf() }, RING_TIMEOUT)
    return START_STICKY
  }

  private fun startSound() {
    val resId = resources.getIdentifier("radar", "raw", packageName)
    if (resId == 0) return
    try {
      player = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        val afd = resources.openRawResourceFd(resId)
        setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
        afd.close()
        isLooping = true
        prepare()
        start()
      }
    } catch (_: Exception) {
      player = null
    }
  }

  private fun startVibration() {
    vibrator = if (Build.VERSION.SDK_INT >= 31) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 250, 150, 250), 0))
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    player?.let { try { it.stop(); it.release() } catch (_: Exception) {} }
    player = null
    vibrator?.cancel()
    wakeLock?.let { if (it.isHeld) it.release() }
    super.onDestroy()
  }

  companion object {
    private const val CHANNEL_ID = "alarm_native"
    private const val NOTIFICATION_ID = 2001
    private const val RING_TIMEOUT = 5L * 60_000L
  }
}
