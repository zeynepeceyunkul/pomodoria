import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const TIMER_NOTIFICATION_ID = 'pomodoria-timer-end';

let handlerConfigured = false;

export function initNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('pomodoria-timer', {
    name: 'Pomodoro timer',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  initNotificationHandler();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') {
    await ensureAndroidChannel();
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.status === 'granted') {
    await ensureAndroidChannel();
  }
  return requested.status === 'granted';
}

export async function cancelTimerEndNotification(): Promise<void> {
  if (!Device.isDevice) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(TIMER_NOTIFICATION_ID);
  } catch {
    /* ignore */
  }
}

export async function scheduleTimerEndNotification(
  seconds: number,
  title: string,
  body: string,
): Promise<void> {
  if (!Device.isDevice || seconds < 1) return;
  initNotificationHandler();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await cancelTimerEndNotification();
  await Notifications.scheduleNotificationAsync({
    identifier: TIMER_NOTIFICATION_ID,
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.ceil(seconds),
      channelId: Platform.OS === 'android' ? 'pomodoria-timer' : undefined,
    },
  });
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  if (!Device.isDevice) return;
  initNotificationHandler();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export async function syncPhaseTimerNotification(
  phase: 'focus' | 'break',
  secondsLeft: number,
  prefs: { notifyBreakReminders: boolean; notifySessionReminders: boolean },
): Promise<void> {
  if (secondsLeft < 1) {
    await cancelTimerEndNotification();
    return;
  }
  if (phase === 'focus' && prefs.notifyBreakReminders) {
    await scheduleTimerEndNotification(
      secondsLeft,
      'Break time',
      'Your focus session finished — take a break.',
    );
    return;
  }
  if (phase === 'break' && prefs.notifySessionReminders) {
    await scheduleTimerEndNotification(
      secondsLeft,
      'Focus time',
      'Break is over — ready when you are.',
    );
    return;
  }
  await cancelTimerEndNotification();
}
