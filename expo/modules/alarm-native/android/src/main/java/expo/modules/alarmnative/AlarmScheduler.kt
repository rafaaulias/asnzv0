package expo.modules.alarmnative

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

// Central native scheduling state. SharedPreferences mirror every registered
// trigger so the receiver can repeat weekly alarms, the boot receiver can
// restore them after a reboot, and diagnostics report truthful counts.
object AlarmScheduler {
  private const val PREFS = "alarm_native"
  private const val KEY_TRIGGERS = "triggers"
  private const val KEY_TS_PREFIX = "ts:"
  private const val KEY_ENABLED_PREFIX = "enabled:"

  const val WEEK_MILLIS = 7L * 24L * 60L * 60L * 1000L

  fun triggerId(alarmId: String, weekday: Int) = "$alarmId-$weekday"

  fun alarmIdOf(triggerId: String) = triggerId.substringBeforeLast('-')

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun fireIntent(context: Context, triggerId: String, weekday: Int, timestamp: Long): Intent =
    Intent(context, AlarmReceiver::class.java)
      .setAction(AlarmReceiver.ACTION_FIRE)
      .setData(Uri.parse("alarm://$triggerId"))
      .putExtra(AlarmReceiver.EXTRA_ID, triggerId)
      .putExtra(AlarmReceiver.EXTRA_WEEKDAY, weekday)
      .putExtra(AlarmReceiver.EXTRA_TIMESTAMP, timestamp)

  private fun pendingFire(context: Context, triggerId: String, weekday: Int, timestamp: Long, create: Boolean): PendingIntent? =
    PendingIntent.getBroadcast(
      context,
      triggerId.hashCode(),
      fireIntent(context, triggerId, weekday, timestamp),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or
        (if (create) 0 else PendingIntent.FLAG_NO_CREATE)
    )

  fun scheduleTrigger(context: Context, triggerId: String, weekday: Int, timestampMillis: Long) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = pendingFire(context, triggerId, weekday, timestampMillis, create = true) ?: return
    try {
      // setAlarmClock is the API real clock apps use: OEMs whitelist it, it
      // survives Doze, and it shows the system alarm icon.
      val showIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        PendingIntent.getActivity(
          context,
          0,
          it,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      }
      alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(timestampMillis, showIntent), pending)
    } catch (error: SecurityException) {
      if (Build.VERSION.SDK_INT >= 31 && !alarmManager.canScheduleExactAlarms()) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestampMillis, pending)
      } else {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestampMillis, pending)
      }
    }
    val editor = prefs(context).edit()
    val triggers = HashSet(prefs(context).getStringSet(KEY_TRIGGERS, emptySet()) ?: emptySet())
    triggers.add(triggerId)
    editor.putStringSet(KEY_TRIGGERS, triggers)
    editor.putLong(KEY_TS_PREFIX + triggerId, timestampMillis)
    editor.putBoolean(KEY_ENABLED_PREFIX + alarmIdOf(triggerId), true)
    editor.apply()
  }

  fun cancelAlarm(context: Context, alarmId: String) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val editor = prefs(context).edit()
    val triggers = HashSet(prefs(context).getStringSet(KEY_TRIGGERS, emptySet()) ?: emptySet())
    for (weekday in -1..6) {
      val triggerId = triggerId(alarmId, weekday)
      // Attempt the cancel even when untracked: triggers registered by older
      // app versions are not in the set but share the same PendingIntent key.
      pendingFire(context, triggerId, weekday, 0L, create = false)?.let { alarmManager.cancel(it) }
      if (triggers.remove(triggerId)) editor.remove(KEY_TS_PREFIX + triggerId)
    }
    editor.putStringSet(KEY_TRIGGERS, triggers)
    editor.putBoolean(KEY_ENABLED_PREFIX + alarmId, false)
    editor.apply()
  }

  fun storedTriggers(context: Context): Map<String, Long> {
    val prefs = prefs(context)
    val result = mutableMapOf<String, Long>()
    for (triggerId in prefs.getStringSet(KEY_TRIGGERS, emptySet()) ?: emptySet()) {
      result[triggerId] = prefs.getLong(KEY_TS_PREFIX + triggerId, 0L)
    }
    return result
  }

  fun isEnabled(context: Context, alarmId: String) = prefs(context).getBoolean(KEY_ENABLED_PREFIX + alarmId, false)

  fun forgetTrigger(context: Context, triggerId: String) {
    val editor = prefs(context).edit()
    val triggers = HashSet(prefs(context).getStringSet(KEY_TRIGGERS, emptySet()) ?: emptySet())
    triggers.remove(triggerId)
    editor.putStringSet(KEY_TRIGGERS, triggers)
    editor.remove(KEY_TS_PREFIX + triggerId)
    editor.apply()
  }
}
