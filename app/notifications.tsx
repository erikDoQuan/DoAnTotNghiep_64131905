import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/supabaseClient';
import { scheduleSleepReminder, scheduleWaterReminders } from '@/utils/notificationHelper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WATER_REMINDERS_KEY  = 'water_reminders_enabled';
const WATER_COUNT_KEY      = 'water_reminder_count';
const WATER_ML_KEY         = 'water_ml_per_glass';

const formatTime = (d: Date) =>
  d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  // ── Sleep reminder ──────────────────────────────────────────────────────
  const [sleepReminderEnabled, setSleepReminderEnabled] = useState(
    !!profile?.sleep_reminder_time,
  );
  const [reminderTime, setReminderTime] = useState<Date>(() => {
    if (profile?.sleep_reminder_time) {
      const [h, m] = profile.sleep_reminder_time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }
    const d = new Date();
    d.setHours(22, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSavingSleep, setIsSavingSleep] = useState(false);

  // ── Water reminder ──────────────────────────────────────────────────────
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(true);
  const [isLoadingWater, setIsLoadingWater] = useState(true);
  const [reminderCount, setReminderCount] = useState(8);
  const [mlPerGlass, setMlPerGlass] = useState(250);

  // Load all water settings
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(WATER_REMINDERS_KEY),
      AsyncStorage.getItem(WATER_COUNT_KEY),
      AsyncStorage.getItem(WATER_ML_KEY),
    ]).then(([enabled, count, ml]) => {
      setWaterReminderEnabled(enabled !== 'false');
      setReminderCount(parseInt(count || '8')   || 8);
      setMlPerGlass(parseInt(ml   || '250') || 250);
      setIsLoadingWater(false);
    });
  }, []);

  // ── Save sleep reminder ─────────────────────────────────────────────────
  const saveSleepReminder = async (time: Date, enabled: boolean) => {
    if (!user) return;
    setIsSavingSleep(true);
    try {
      const hh = String(time.getHours()).padStart(2, '0');
      const mm = String(time.getMinutes()).padStart(2, '0');
      const timeStr = enabled ? `${hh}:${mm}:00` : null;

      await supabase
        .from('profiles')
        .update({ sleep_reminder_time: timeStr })
        .eq('id', user.id);

      await refreshProfile();

      if (enabled) {
        await scheduleSleepReminder(`${hh}:${mm}:00`);
      }
    } catch (e) {
      console.error('Save sleep reminder error:', e);
    } finally {
      setIsSavingSleep(false);
    }
  };

  const handleSleepToggle = async (val: boolean) => {
    setSleepReminderEnabled(val);
    await saveSleepReminder(reminderTime, val);
  };

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selected) {
        setReminderTime(selected);
        saveSleepReminder(selected, sleepReminderEnabled);
      }
    } else {
      if (selected) setReminderTime(selected);
    }
  };

  const handleTimeConfirm = () => {
    setShowTimePicker(false);
    saveSleepReminder(reminderTime, sleepReminderEnabled);
  };

  // ── Save water reminder toggle ─────────────────────────────────────────
  const handleWaterToggle = async (val: boolean) => {
    setWaterReminderEnabled(val);
    await AsyncStorage.setItem(WATER_REMINDERS_KEY, val ? 'true' : 'false');
  };

  const handleCountChange = async (delta: number) => {
    const next = Math.min(Math.max(reminderCount + delta, 4), 12);
    setReminderCount(next);
    await AsyncStorage.setItem(WATER_COUNT_KEY, String(next));
    await scheduleWaterReminders(next, mlPerGlass);
  };

  const handleMlChange = async (delta: number) => {
    const next = Math.min(Math.max(mlPerGlass + delta, 100), 500);
    setMlPerGlass(next);
    await AsyncStorage.setItem(WATER_ML_KEY, String(next));
    await scheduleWaterReminders(reminderCount, next);
  };

  return (
    <SafeAreaView className="flex-1 bg-dashboard-bg">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 py-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-4"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-black text-xl font-bold">Nhắc nhở & Thông báo</Text>
      </View>

      <View className="flex-1 px-5 pt-2">

        {/* Sleep reminder card */}
        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 ml-1">
          Giấc ngủ
        </Text>
        <View className="bg-white rounded-3xl shadow-sm mb-6 overflow-hidden">
          {/* Toggle row */}
          <View className="flex-row items-center px-5 py-4 border-b border-gray-50">
            <View className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center mr-4">
              <MaterialCommunityIcons name="moon-waning-crescent" size={20} color="#8B5CF6" />
            </View>
            <View className="flex-1">
              <Text className="text-black text-base font-semibold">Nhắc đi ngủ</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Thông báo hàng ngày</Text>
            </View>
            {isSavingSleep
              ? <ActivityIndicator size="small" color="#8B5CF6" />
              : <Switch
                  value={sleepReminderEnabled}
                  onValueChange={handleSleepToggle}
                  trackColor={{ false: '#E5E7EB', true: '#8B5CF640' }}
                  thumbColor={sleepReminderEnabled ? '#8B5CF6' : '#9CA3AF'}
                />
            }
          </View>

          {/* Time picker row — only show if enabled */}
          {sleepReminderEnabled && (
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              className="flex-row items-center px-5 py-4"
            >
              <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-4">
                <MaterialCommunityIcons name="clock-outline" size={20} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-0.5">Giờ nhắc</Text>
                <Text className="text-black text-lg font-bold">{formatTime(reminderTime)}</Text>
              </View>
              <Text className="text-gray-400 text-xs">Chạm để đổi</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" className="ml-1" />
            </TouchableOpacity>
          )}
        </View>

        {/* Water reminder card */}
        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 ml-1">
          Uống nước
        </Text>
        <View className="bg-white rounded-3xl shadow-sm mb-6 overflow-hidden">
          {/* Toggle row */}
          <View className="flex-row items-center px-5 py-4 border-b border-gray-50">
            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
              <MaterialCommunityIcons name="water" size={20} color="#38BDF8" />
            </View>
            <View className="flex-1">
              <Text className="text-black text-base font-semibold">Nhắc uống nước</Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                Phân bổ đều từ 7:00 → 21:30
              </Text>
            </View>
            {isLoadingWater
              ? <ActivityIndicator size="small" color="#38BDF8" />
              : <Switch
                  value={waterReminderEnabled}
                  onValueChange={handleWaterToggle}
                  trackColor={{ false: '#E5E7EB', true: '#38BDF840' }}
                  thumbColor={waterReminderEnabled ? '#38BDF8' : '#9CA3AF'}
                />
            }
          </View>

          {/* Count selector */}
          <View className="flex-row items-center px-5 py-3 border-b border-gray-50">
            <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-4">
              <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#6B7280" />
            </View>
            <View className="flex-1">
              <Text className="text-black text-sm font-medium">Số lần nhắc / ngày</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Tối thiểu 4, tối đa 12 lần</Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={() => handleCountChange(-1)}
                disabled={reminderCount <= 4}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <MaterialCommunityIcons name="minus" size={16} color={reminderCount <= 4 ? '#D1D5DB' : '#374151'} />
              </TouchableOpacity>
              <Text className="text-black text-base font-bold w-6 text-center">{reminderCount}</Text>
              <TouchableOpacity
                onPress={() => handleCountChange(1)}
                disabled={reminderCount >= 12}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <MaterialCommunityIcons name="plus" size={16} color={reminderCount >= 12 ? '#D1D5DB' : '#374151'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ML per glass selector */}
          <View className="flex-row items-center px-5 py-3 border-b border-gray-50">
            <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-4">
              <MaterialCommunityIcons name="cup-water" size={18} color="#6B7280" />
            </View>
            <View className="flex-1">
              <Text className="text-black text-sm font-medium">Lượng mỗi lần uống</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Bước nhảy 50ml</Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={() => handleMlChange(-50)}
                disabled={mlPerGlass <= 100}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <MaterialCommunityIcons name="minus" size={16} color={mlPerGlass <= 100 ? '#D1D5DB' : '#374151'} />
              </TouchableOpacity>
              <Text className="text-black text-base font-bold w-12 text-center">{mlPerGlass}ml</Text>
              <TouchableOpacity
                onPress={() => handleMlChange(50)}
                disabled={mlPerGlass >= 500}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <MaterialCommunityIcons name="plus" size={16} color={mlPerGlass >= 500 ? '#D1D5DB' : '#374151'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Total summary */}
          {(() => {
            const totalMl   = reminderCount * mlPerGlass;
            const isEnough  = totalMl >= 2000;
            const shortfall = 2000 - totalMl;
            return (
              <View className={`px-5 py-3 ${isEnough ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name={isEnough ? 'check-circle-outline' : 'alert-circle-outline'}
                    size={16}
                    color={isEnough ? '#38BDF8' : '#F97316'}
                  />
                  <Text className={`text-xs font-semibold ml-2 ${isEnough ? 'text-blue-500' : 'text-orange-500'}`}>
                    {reminderCount} lần × {mlPerGlass}ml = {totalMl}ml / ngày
                    {isEnough ? ' ✓' : ''}
                  </Text>
                </View>
                {!isEnough && (
                  <Text className="text-orange-400 text-xs mt-1 ml-6">
                    Còn thiếu {shortfall}ml để đạt 2L — cơ thể cần ít nhất 2L/ngày để khoẻ mạnh.
                  </Text>
                )}
              </View>
            );
          })()}
        </View>

        {/* Info note */}
        <View className="flex-row items-start bg-blue-50 rounded-2xl px-4 py-3">
          <MaterialCommunityIcons name="information-outline" size={16} color="#3B82F6" style={{ marginTop: 1 }} />
          <Text className="text-blue-600 text-xs leading-5 ml-2 flex-1">
            Nhắc nhở hoạt động khi app đang mở. Đảm bảo bạn đã cấp quyền thông báo cho LifeTrack trong Cài đặt iPhone.
          </Text>
        </View>
      </View>

      {/* iOS time picker modal */}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showTimePicker}>
          <TouchableOpacity
            className="flex-1 bg-black/50 justify-end"
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          >
            <View className="bg-white rounded-t-3xl pb-10 pt-4 px-5">
              <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-4" />
              <Text className="text-black text-base font-bold mb-2 text-center">
                Chọn giờ nhắc đi ngủ
              </Text>
              <DateTimePicker
                value={reminderTime}
                mode="time"
                display="spinner"
                onChange={onTimeChange}
                locale="vi-VN"
              />
              <TouchableOpacity
                onPress={handleTimeConfirm}
                className="mt-2 py-4 rounded-2xl items-center bg-black"
              >
                <Text className="text-white font-bold">Lưu</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Android time picker */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </SafeAreaView>
  );
}
