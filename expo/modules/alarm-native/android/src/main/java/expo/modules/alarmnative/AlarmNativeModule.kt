package expo.modules.alarmnative

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AlarmNativeModule : Module() {
  private fun fireIntent(context: Context, id: String): Intent =
    Intent(context, AlarmReceiver::class.java)
      .setAction(AlarmReceiver.ACTION_FIRE)
      .setData(Uri.parse("alarm://$id"))
      .putExtra(AlarmReceiver.EXTRA_ID, id)

  private fun pendingFire(context: Context, id: String, create: Boolean): PendingIntent? =
    PendingIntent.getBroadcast(
      context,
      id.hashCode(),
      fireIntent(context, id),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or
        (if (create) 0 else PendingIntent.FLAG_NO_CREATE)
    )

  private fun storedIds(context: Context): MutableSet<String> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return HashSet(prefs.getStringSet(KEY_IDS, emptySet()) ?: emptySet())
  }

  private fun rememberId(context: Context, id: String) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val ids = storedIds(context)
    ids.add(id)
    prefs.edit().putStringSet(KEY_IDS, ids).apply()
  }

  private fun forgetId(context: Context, id: String) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val ids = storedIds(context)
    ids.remove(id)
    prefs.edit().putStringSet(KEY_IDS, ids).apply()
  }

  // setAlarmClock is the API real clock apps use: OEMs like XOS whitelist it
  // (blocking it would break legitimate alarm apps), it survives Doze, and it
  // shows the system alarm icon. Exact alarms fall back gracefully.
  private fun scheduleExact(context: Context, id: String, timestampMillis: Long) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = pendingFire(context, id, create = true) ?: return
    try {
      // AlarmClockInfo's show intent must be a PendingIntent, not a raw Intent.
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
    rememberId(context, id)
  }

  override fun definition() = ModuleDefinition {
    Name("AlarmNative")

    Function("schedule") { id: String, timestampMillis: Double ->
      val context = appContext.reactContext ?: return@Function false
      scheduleExact(context, id, timestampMillis.toLong())
      true
    }

    Function("testIn30Seconds") {
      val context = appContext.reactContext ?: return@Function false
      scheduleExact(context, "native-test", System.currentTimeMillis() + 30_000)
      true
    }

    Function("cancel") { id: String ->
      val context = appContext.reactContext ?: return@Function false
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      pendingFire(context, id, create = false)?.let { alarmManager.cancel(it) }
      forgetId(context, id)
      true
    }

    Function("pendingCount") {
      val context = appContext.reactContext ?: return@Function -1
      var count = 0
      for (id in storedIds(context)) {
        if (pendingFire(context, id, create = false) != null) count += 1
      }
      count
    }

    Function("stop") {
      val context = appContext.reactContext ?: return@Function false
      context.stopService(Intent(context, AlarmService::class.java))
      true
    }

    Function("takeLastAlarm") {
      AlarmReceiver.consumeLastAlarmId() ?: ""
    }
  }

  companion object {
    private const val PREFS = "alarm_native"
    private const val KEY_IDS = "ids"
  }
}
