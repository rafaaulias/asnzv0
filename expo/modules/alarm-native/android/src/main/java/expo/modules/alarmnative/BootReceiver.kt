package expo.modules.alarmnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// A reboot wipes every AlarmManager registration. This receiver restores all
// tracked triggers from the scheduler's persisted state right after boot.
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED && action != ACTION_QUICKBOOT_POWER_ON) return

    val now = System.currentTimeMillis()
    for ((triggerId, storedTs) in AlarmScheduler.storedTriggers(context)) {
      val weekday = triggerId.substringAfterLast('-').toIntOrNull() ?: continue
      if (weekday < 0 || storedTs <= 0L) continue
      if (!AlarmScheduler.isEnabled(context, AlarmScheduler.alarmIdOf(triggerId))) continue
      var next = storedTs
      while (next < now + 10_000L) next += AlarmScheduler.WEEK_MILLIS
      AlarmScheduler.scheduleTrigger(context, triggerId, weekday, next)
    }
  }

  companion object {
    private const val ACTION_QUICKBOOT_POWER_ON = "android.intent.action.QUICKBOOT_POWER_ON"
  }
}
