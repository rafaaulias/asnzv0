const { withAndroidManifest } = require('@expo/config-plugins');

// Full-screen alarm intents launch MainActivity while the device is locked.
// These flags let the activity turn the screen on and show over the lock screen.
module.exports = function withAlarmActivity(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    const activity = application?.activity?.find((item) => item.$?.['android:name'] === '.MainActivity');
    if (activity?.$) {
      activity.$['android:showWhenLocked'] = 'true';
      activity.$['android:turnScreenOn'] = 'true';
    }
    return config;
  });
};
