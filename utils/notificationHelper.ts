import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SLEEP_REMINDER_ID = 'sleep-reminder-daily';

// Cấu hình cách hiển thị thông báo khi app đang mở (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Xin quyền thông báo từ người dùng
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get notification permissions!');
    return;
  }

  if (!Device.isDevice) {
    console.log('Permission granted on simulator, local notifications should work.');
  }

  return token;
}


export async function scheduleWaterReminders(count: number = 8, mlPerGlass: number = 250) {
  // Chỉ huỷ water reminders, không huỷ sleep reminder
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.content.data?.type === 'water_reminder')
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const START = 7;    // 7:00
  const END   = 21.5; // 21:30
  const step  = count > 1 ? (END - START) / (count - 1) : 0;

  for (let i = 0; i < count; i++) {
    const totalH = START + i * step;
    const hour   = Math.floor(totalH);
    const minute = Math.round((totalH % 1) * 60);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Đến giờ uống nước!',
        body:  `Uống ${mlPerGlass}ml để duy trì cơ thể khoẻ mạnh.`,
        sound: true,
        data:  { type: 'water_reminder' },
      },
      trigger: {
        type:   Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      } as any,
    });
  }

  console.log(`Đã lập lịch ${count} thông báo nhắc uống nước (${mlPerGlass}ml/lần).`);
}

/**
 * Lên lịch nhắc đi ngủ hàng ngày dựa theo sleep_reminder_time trong profile
 * Truyền null để huỷ lịch hiện tại.
 */
export async function scheduleSleepReminder(sleepReminderTime: string | null) {
  // Huỷ reminder cũ (nếu có) — không throw nếu không tồn tại
  try {
    await Notifications.cancelScheduledNotificationAsync(SLEEP_REMINDER_ID);
  } catch (_) { }

  if (!sleepReminderTime) return;

  // Format từ Postgres TIME: "HH:MM:SS" hoặc "HH:MM"
  const parts = sleepReminderTime.split(':').map(Number);
  const hour = parts[0];
  const minute = parts[1] ?? 0;

  if (isNaN(hour) || isNaN(minute)) return;

  await Notifications.scheduleNotificationAsync({
    identifier: SLEEP_REMINDER_ID,
    content: {
      title: '🌙 Đến giờ đi ngủ rồi!',
      body: 'Hãy nghỉ ngơi để cơ thể phục hồi. Ngủ đủ 8 tiếng giúp tăng cường sức khoẻ mỗi ngày.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as any,
  });

  console.log(`Đã lập lịch nhắc ngủ lúc ${hour}:${String(minute).padStart(2, '0')}`);
}

/**
 * Test nhanh notification (hiển thị sau 5 giây)
 */
export async function testNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 Kiểm tra thông báo",
      body: "Đây là thông báo thử nghiệm từ ứng dụng Health Tracker.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5
    } as any,
  });
}
