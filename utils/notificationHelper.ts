import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

/**
 * Lập lịch thông báo nhắc uống nước hàng ngày
 */
export async function scheduleWaterReminders() {
  // Huỷ tất cả thông báo cũ để tránh trùng lặp
  await Notifications.cancelAllScheduledNotificationsAsync();

  const reminderTimes = [
    { hour: 7, minute: 0 },
    { hour: 9, minute: 0 },
    { hour: 11, minute: 30 },
    { hour: 13, minute: 30 },
    { hour: 15, minute: 50 },
    { hour: 17, minute: 30 },
    { hour: 19, minute: 30 },
    { hour: 21, minute: 35 },
  ];

  for (const time of reminderTimes) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Đến giờ uống nước",
        body: "Hãy uống một ly nước để giữ cơ thể khỏe mạnh.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      } as any,
    });
  }

  console.log(`Đã lập lịch ${reminderTimes.length} thông báo nhắc uống nước.`);
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
