package expo.modules.alarmnative

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.ModuleDefinition

class AlarmNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AlarmNative")

    Function("schedule") { id: String, timestampMillis: Double ->
      val context = appContext.reactContext ?: return@Function false
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(context, AlarmReceiver::class.java)
        .setAction(AlarmReceiver.ACTION_FIRE)
        .putExtra(AlarmReceiver.EXTRA_ID, id)
      val pending = PendingIntent.getBroadcast(
        context,
        id.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      if (Build.VERSION.SDK_INT >= 31 && !alarmManager.canScheduleExactAlarms()) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestampMillis.toLong(), pending)
      } else {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestampMillis.toLong(), pending)
      }
      true
    }

    Function("cancel") { id: String ->
      val context = appContext.reactContext ?: return@Function
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(context, AlarmReceiver::class.java).setAction(AlarmReceiver.ACTION_FIRE)
      val pending = PendingIntent.getBroadcast(
        context,
        id.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
      )
      pending?.let { alarmManager.cancel(it) }
    }

    Function("stop") {
      val context = appContext.reactContext ?: return@Function
      context.stopService(Intent(context, AlarmService::class.java))
    }

    Function("takeLastAlarm") {
      AlarmReceiver.consumeLastAlarmId() ?: ""
    }
  }
}
