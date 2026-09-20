package expo.modules.alarmnative

import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AlarmNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AlarmNative")

    Function("schedule") { triggerId: String, weekday: Double, timestampMillis: Double ->
      val context = appContext.reactContext ?: return@Function false
      AlarmScheduler.scheduleTrigger(context, triggerId, weekday.toInt(), timestampMillis.toLong())
      true
    }

    Function("testIn30Seconds") {
      val context = appContext.reactContext ?: return@Function false
      AlarmScheduler.scheduleTrigger(context, "native_test", -1, System.currentTimeMillis() + 30_000)
      true
    }

    Function("cancel") { alarmId: String ->
      val context = appContext.reactContext ?: return@Function false
      AlarmScheduler.cancelAlarm(context, alarmId)
      true
    }

    Function("pendingCount") {
      val context = appContext.reactContext ?: return@Function -1
      AlarmScheduler.storedTriggers(context).size
    }

    Function("nextTriggerTime") {
      val context = appContext.reactContext ?: return@Function -1.0
      AlarmScheduler.storedTriggers(context).values.minOrNull()?.toDouble() ?: -1.0
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
}
