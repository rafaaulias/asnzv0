package expo.modules.alarmnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

object LastAlarmHolder {
  @Volatile
  var id: String? = null
}

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_FIRE) return
    val triggerId = intent.getStringExtra(EXTRA_ID) ?: "alarm"
    val weekday = intent.getIntExtra(EXTRA_WEEKDAY, -1)
    val timestamp = intent.getLongExtra(EXTRA_TIMESTAMP, 0L)
    val alarmId = AlarmScheduler.alarmIdOf(triggerId)

    LastAlarmHolder.id = alarmId
    // setAlarmClock is one-shot; drop the consumed trigger from tracking so
    // diagnostics stay truthful.
    AlarmScheduler.forgetTrigger(context, triggerId)

    // Weekly repeat: re-register the same slot for next week unless the alarm
    // was disabled or deleted (cancel clears the enabled flag). This keeps
    // alarms alive without requiring the app to be reopened.
    if (weekday >= 0 && timestamp > 0L && AlarmScheduler.isEnabled(context, alarmId)) {
      AlarmScheduler.scheduleTrigger(context, triggerId, weekday, timestamp + AlarmScheduler.WEEK_MILLIS)
    }

    // Android 12+ explicitly allows starting a foreground service from an
    // exact-alarm broadcast, so the ringtone plays even with the app killed.
    val service = Intent(context, AlarmService::class.java).putExtra(EXTRA_ID, alarmId)
    if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service) else context.startService(service)

    // With "Display over other apps" granted this opens the app over the
    // lock screen; MainActivity turns the screen on via turnScreenOn.
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    if (launch != null) {
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      try {
        context.startActivity(launch)
      } catch (_: Exception) {
      }
    }
  }

  companion object {
    const val ACTION_FIRE = "expo.modules.alarmnative.FIRE_ALARM"
    const val EXTRA_ID = "alarmId"
    const val EXTRA_WEEKDAY = "weekday"
    const val EXTRA_TIMESTAMP = "timestamp"

    fun consumeLastAlarmId(): String? = LastAlarmHolder.id.also { LastAlarmHolder.id = null }
  }
}
