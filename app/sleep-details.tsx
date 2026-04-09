import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/supabaseClient';
import { scheduleSleepReminder } from '../utils/notificationHelper';

const SLEEP_COLOR = '#8B5CF6';
const MIN_SLEEP_HOURS = 8;

interface SleepRecord {
  id: number;
  sleep_time: string;
  wake_time: string;
  sleep_duration: number;
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

const formatDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

// Calculate overnight-aware duration in hours
const calcDuration = (sleep: Date, wake: Date): number => {
  let diff = wake.getTime() - sleep.getTime();
  if (diff <= 0) diff += 24 * 60 * 60 * 1000;
  return diff / (1000 * 60 * 60);
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function SleepDetailsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingId, setExistingId] = useState<number | null>(null);

  const [sleepTime, setSleepTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(22, 0, 0, 0);
    return d;
  });
  const [wakeTime, setWakeTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
  });

  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Reminder
  const [reminderTime, setReminderTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(22, 0, 0, 0);
    return d;
  });
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  const [weeklyData, setWeeklyData] = useState<{ label: string; duration: number }[]>([]);

  const duration = calcDuration(sleepTime, wakeTime);

  // ─── Fetch today's record ────────────────────────────────────────────────
  const fetchTodayRecord = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from('sleep_records')
        .select('id, sleep_time, wake_time, sleep_duration')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setExistingId(data.id);
        setSleepTime(new Date(data.sleep_time));
        setWakeTime(new Date(data.wake_time));
      }
    } catch (e) {
      console.error('fetchTodayRecord error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ─── Fetch weekly history ────────────────────────────────────────────────
  const fetchWeeklyData = useCallback(async () => {
    if (!user) return;
    const today = new Date();
    const days: { label: string; duration: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from('sleep_records')
        .select('sleep_duration')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .limit(1)
        .maybeSingle();

      days.push({
        label: DAY_LABELS[d.getDay()],
        duration: data?.sleep_duration ?? 0,
      });
    }
    setWeeklyData(days);
  }, [user]);

  useEffect(() => {
    fetchTodayRecord();
    fetchWeeklyData();
  }, [fetchTodayRecord, fetchWeeklyData]);

  // ─── Save logic ──────────────────────────────────────────────────────────
  const doSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        sleep_time: sleepTime.toISOString(),
        wake_time: wakeTime.toISOString(),
        sleep_duration: parseFloat(duration.toFixed(2)),
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        await supabase.from('sleep_records').update(payload).eq('id', existingId);
      } else {
        const { data } = await supabase
          .from('sleep_records')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select('id')
          .single();
        if (data) setExistingId(data.id);
      }

      fetchWeeklyData();
      Alert.alert('Đã lưu', 'Thông tin giấc ngủ đã được cập nhật.');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu dữ liệu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePress = () => {
    if (duration < MIN_SLEEP_HOURS) {
      setShowWarningModal(true);
    } else {
      doSave();
    }
  };

  const handleWarningContinue = () => {
    setShowWarningModal(false);
    doSave();
  };

  const handleWarningCancel = () => {
    setShowWarningModal(false);
  };

  // ─── Reminder: sync từ profile khi load ──────────────────────────────────
  useEffect(() => {
    if (profile?.sleep_reminder_time) {
      const [h, m] = profile.sleep_reminder_time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      setReminderTime(d);
    }
  }, [profile?.sleep_reminder_time]);

  // ─── Reminder: lưu vào profiles + lên lịch notification ──────────────────
  const saveReminder = async (time: Date) => {
    if (!user) return;
    setIsSavingReminder(true);
    try {
      const hh = String(time.getHours()).padStart(2, '0');
      const mm = String(time.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}:00`;
      await supabase
        .from('profiles')
        .update({ sleep_reminder_time: timeStr })
        .eq('id', user.id);
      await refreshProfile();
      await scheduleSleepReminder(timeStr);
      Alert.alert('Đã lưu', `Sẽ nhắc bạn đi ngủ lúc ${hh}:${mm} mỗi ngày.`);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu giờ nhắc.');
    } finally {
      setIsSavingReminder(false);
    }
  };

  // ─── Picker handlers ─────────────────────────────────────────────────────
  const onSleepTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowSleepPicker(false);
    if (selected) setSleepTime(selected);
  };

  const onWakeTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowWakePicker(false);
    if (selected) setWakeTime(selected);
  };

  const onReminderTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowReminderPicker(false);
      if (selected) {
        setReminderTime(selected);
        saveReminder(selected);
      }
    } else {
      if (selected) setReminderTime(selected);
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────────────
  const progressPct = Math.min(duration / MIN_SLEEP_HOURS, 1);
  const qualityLabel =
    duration >= 9 ? 'Rất tốt' : duration >= 8 ? 'Tốt' : duration >= 6 ? 'Trung bình' : 'Thiếu ngủ';
  const qualityColor =
    duration >= 9 ? '#4ADE80' : duration >= 8 ? '#4ADE80' : duration >= 6 ? '#FACC15' : '#F87171';

  const maxWeekly = Math.max(...weeklyData.map(d => d.duration), 8);

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color={SLEEP_COLOR} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* ── Header ── */}
      <View className="flex-row justify-between items-center px-5 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={32} color={SLEEP_COLOR} />
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Sleep Tracker</Text>
        <TouchableOpacity
          onPress={handleSavePress}
          disabled={isSaving}
          className="px-4 py-1.5 rounded-full"
          style={{ backgroundColor: SLEEP_COLOR }}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-semibold text-sm">Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Duration hero ── */}
        <View className="items-center py-8">
          <View
            className="w-32 h-32 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: `${SLEEP_COLOR}18` }}
          >
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{ backgroundColor: `${SLEEP_COLOR}30` }}
            >
              <MaterialCommunityIcons name="moon-waning-crescent" size={44} color={SLEEP_COLOR} />
            </View>
          </View>
          <Text className="text-white text-4xl font-bold mb-1">{formatDuration(duration)}</Text>
          <View
            className="flex-row items-center px-3 py-1 rounded-full mt-1"
            style={{ backgroundColor: `${qualityColor}20` }}
          >
            <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: qualityColor }} />
            <Text className="text-sm font-semibold" style={{ color: qualityColor }}>
              {qualityLabel}
            </Text>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View className="mx-5 mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400 text-xs">0h</Text>
            <Text className="text-gray-400 text-xs">Mục tiêu: 8h</Text>
          </View>
          <View className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${progressPct * 100}%`, backgroundColor: SLEEP_COLOR }}
            />
          </View>
          <Text className="text-gray-500 text-xs mt-1 text-right">
            {duration < 8 ? `Còn thiếu ${formatDuration(8 - duration)}` : 'Đạt mục tiêu ✓'}
          </Text>
        </View>

        {/* ── Time picker cards ── */}
        <View className="flex-row justify-between mx-5 mb-6 gap-3">
          {/* Sleep Time */}
          <TouchableOpacity
            onPress={() => setShowSleepPicker(true)}
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: '#1c1c1c' }}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: `${SLEEP_COLOR}20` }}
            >
              <MaterialCommunityIcons name="weather-night" size={20} color={SLEEP_COLOR} />
            </View>
            <Text className="text-gray-400 text-xs mb-1">Giờ ngủ</Text>
            <Text className="text-white text-2xl font-bold">{formatTime(sleepTime)}</Text>
            <Text className="text-gray-500 text-xs mt-1">Chạm để chỉnh</Text>
          </TouchableOpacity>

          {/* Wake Time */}
          <TouchableOpacity
            onPress={() => setShowWakePicker(true)}
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: '#1c1c1c' }}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: '#FACC1520' }}
            >
              <MaterialCommunityIcons name="weather-sunny" size={20} color="#FACC15" />
            </View>
            <Text className="text-gray-400 text-xs mb-1">Giờ thức</Text>
            <Text className="text-white text-2xl font-bold">{formatTime(wakeTime)}</Text>
            <Text className="text-gray-500 text-xs mt-1">Chạm để chỉnh</Text>
          </TouchableOpacity>
        </View>

        {/* ── Sleep timeline ── */}
        <View className="mx-5 mb-6 rounded-2xl p-4" style={{ backgroundColor: '#1c1c1c' }}>
          <Text className="text-white font-semibold mb-3">Lịch trình giấc ngủ</Text>
          <View className="flex-row items-center">
            <View className="items-center mr-3">
              <MaterialCommunityIcons name="bed" size={20} color={SLEEP_COLOR} />
              <Text className="text-gray-400 text-[10px] mt-1">{formatTime(sleepTime)}</Text>
            </View>
            <View className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#333' }}>
              <View
                className="h-full rounded-full"
                style={{
                  width: `${progressPct * 100}%`,
                  backgroundColor: SLEEP_COLOR,
                }}
              />
            </View>
            <View className="items-center ml-3">
              <MaterialCommunityIcons name="alarm" size={20} color="#FACC15" />
              <Text className="text-gray-400 text-[10px] mt-1">{formatTime(wakeTime)}</Text>
            </View>
          </View>
          <View className="flex-row justify-between mt-4">
            <View className="items-center">
              <Text className="text-gray-500 text-xs">Thời gian ngủ</Text>
              <Text className="text-white font-bold">{formatDuration(duration)}</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-xs">Mục tiêu</Text>
              <Text className="text-white font-bold">8h 00m</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-xs">Chênh lệch</Text>
              <Text
                className="font-bold"
                style={{ color: duration >= 8 ? '#4ADE80' : '#F87171' }}
              >
                {duration >= 8 ? '+' : '-'}{formatDuration(Math.abs(duration - 8))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Weekly history chart ── */}
        <View className="mx-5 rounded-2xl p-4" style={{ backgroundColor: '#1c1c1c' }}>
          <Text className="text-white font-semibold mb-4">Lịch sử 7 ngày</Text>
          <View className="flex-row justify-between items-end" style={{ height: 80 }}>
            {weeklyData.map((item, idx) => {
              const barH = item.duration > 0 ? (item.duration / maxWeekly) * 70 : 4;
              const isToday = idx === weeklyData.length - 1;
              const barColor = item.duration === 0
                ? '#333'
                : item.duration >= 8
                ? '#4ADE80'
                : item.duration >= 6
                ? '#FACC15'
                : '#F87171';
              return (
                <View key={idx} className="items-center" style={{ flex: 1 }}>
                  <Text
                    className="text-[9px] mb-1"
                    style={{ color: item.duration > 0 ? 'white' : '#555' }}
                  >
                    {item.duration > 0 ? `${Math.floor(item.duration)}h` : ''}
                  </Text>
                  <View
                    className="w-6 rounded-t-lg"
                    style={{
                      height: barH,
                      backgroundColor: barColor,
                      opacity: isToday ? 1 : 0.7,
                    }}
                  />
                  <Text
                    className="text-[10px] mt-1 font-medium"
                    style={{ color: isToday ? SLEEP_COLOR : '#666' }}
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View className="flex-row justify-center mt-4 gap-4">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-[#4ADE80] mr-1" />
              <Text className="text-gray-500 text-[10px]">≥ 8h</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-[#FACC15] mr-1" />
              <Text className="text-gray-500 text-[10px]">6–8h</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-[#F87171] mr-1" />
              <Text className="text-gray-500 text-[10px]">{'< 6h'}</Text>
            </View>
          </View>
        </View>

        {/* ── Reminder card ── */}
        <View className="mx-5 mt-6 rounded-2xl p-4" style={{ backgroundColor: '#1c1c1c' }}>
          <View className="flex-row items-center mb-3">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${SLEEP_COLOR}20` }}
            >
              <MaterialCommunityIcons name="bell-ring-outline" size={18} color={SLEEP_COLOR} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">Nhắc đi ngủ</Text>
              <Text className="text-gray-500 text-xs">Thông báo hàng ngày vào giờ đã chọn</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowReminderPicker(true)}
            className="flex-row items-center justify-between rounded-xl px-4 py-3"
            style={{ backgroundColor: '#2a2a2a' }}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="clock-outline" size={18} color="#666" />
              <Text className="text-white text-lg font-bold ml-3">{formatTime(reminderTime)}</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-500 text-xs mr-2">Chạm để đổi</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#555" />
            </View>
          </TouchableOpacity>

          {isSavingReminder && (
            <View className="flex-row items-center justify-center mt-2">
              <ActivityIndicator size="small" color={SLEEP_COLOR} />
              <Text className="text-gray-500 text-xs ml-2">Đang lưu...</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── DateTimePicker: Sleep ── */}
      {showSleepPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showSleepPicker}>
            <TouchableOpacity
              className="flex-1 bg-black/60 justify-end"
              activeOpacity={1}
              onPress={() => setShowSleepPicker(false)}
            >
              <View className="rounded-t-3xl pb-10 pt-4 px-5" style={{ backgroundColor: '#1c1c1c' }}>
                <View className="w-12 h-1 bg-white/10 rounded-full self-center mb-4" />
                <Text className="text-white text-base font-bold mb-2 text-center">Chọn giờ ngủ</Text>
                <DateTimePicker
                  value={sleepTime}
                  mode="time"
                  display="spinner"
                  onChange={onSleepTimeChange}
                  textColor="white"
                  themeVariant="dark"
                  locale="vi-VN"
                />
                <TouchableOpacity
                  onPress={() => setShowSleepPicker(false)}
                  className="mt-2 py-3 rounded-2xl items-center"
                  style={{ backgroundColor: SLEEP_COLOR }}
                >
                  <Text className="text-white font-bold">Xong</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={sleepTime}
            mode="time"
            display="default"
            onChange={onSleepTimeChange}
          />
        )
      )}

      {/* ── DateTimePicker: Wake ── */}
      {showWakePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showWakePicker}>
            <TouchableOpacity
              className="flex-1 bg-black/60 justify-end"
              activeOpacity={1}
              onPress={() => setShowWakePicker(false)}
            >
              <View className="rounded-t-3xl pb-10 pt-4 px-5" style={{ backgroundColor: '#1c1c1c' }}>
                <View className="w-12 h-1 bg-white/10 rounded-full self-center mb-4" />
                <Text className="text-white text-base font-bold mb-2 text-center">Chọn giờ thức</Text>
                <DateTimePicker
                  value={wakeTime}
                  mode="time"
                  display="spinner"
                  onChange={onWakeTimeChange}
                  textColor="white"
                  themeVariant="dark"
                  locale="vi-VN"
                />
                <TouchableOpacity
                  onPress={() => setShowWakePicker(false)}
                  className="mt-2 py-3 rounded-2xl items-center"
                  style={{ backgroundColor: SLEEP_COLOR }}
                >
                  <Text className="text-white font-bold">Xong</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={wakeTime}
            mode="time"
            display="default"
            onChange={onWakeTimeChange}
          />
        )
      )}

      {/* ── DateTimePicker: Reminder ── */}
      {showReminderPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showReminderPicker}>
            <TouchableOpacity
              className="flex-1 bg-black/60 justify-end"
              activeOpacity={1}
              onPress={() => setShowReminderPicker(false)}
            >
              <View className="rounded-t-3xl pb-10 pt-4 px-5" style={{ backgroundColor: '#1c1c1c' }}>
                <View className="w-12 h-1 bg-white/10 rounded-full self-center mb-4" />
                <Text className="text-white text-base font-bold mb-2 text-center">
                  Chọn giờ nhắc đi ngủ
                </Text>
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  display="spinner"
                  onChange={onReminderTimeChange}
                  textColor="white"
                  themeVariant="dark"
                  locale="vi-VN"
                />
                <TouchableOpacity
                  onPress={() => {
                    setShowReminderPicker(false);
                    saveReminder(reminderTime);
                  }}
                  className="mt-2 py-3 rounded-2xl items-center"
                  style={{ backgroundColor: SLEEP_COLOR }}
                >
                  <Text className="text-white font-bold">Lưu nhắc nhở</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowReminderPicker(false)}
                  className="mt-2 py-3 rounded-2xl items-center bg-white/5"
                >
                  <Text className="text-gray-400">Huỷ</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            display="default"
            onChange={onReminderTimeChange}
          />
        )
      )}

      {/* ── Warning Modal (< 8h) ── */}
      <Modal transparent animationType="fade" visible={showWarningModal}>
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="w-full rounded-3xl p-6" style={{ backgroundColor: '#1c1c1c' }}>
            {/* Icon */}
            <View className="items-center mb-4">
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: '#F87171' + '22' }}
              >
                <MaterialCommunityIcons name="alert-circle" size={44} color="#F87171" />
              </View>
            </View>

            <Text className="text-white text-xl font-bold text-center mb-3">
              Ngủ không đủ giấc!
            </Text>
            <Text className="text-gray-400 text-sm text-center leading-5 mb-2">
              Bạn chỉ ngủ{' '}
              <Text className="text-[#F87171] font-semibold">{formatDuration(duration)}</Text>
              , trong khi cơ thể cần ít nhất{' '}
              <Text className="text-white font-semibold">8 tiếng</Text> mỗi đêm.
            </Text>
            <Text className="text-gray-500 text-xs text-center leading-4 mb-6">
              Ngủ đủ giấc giúp tăng cường hệ miễn dịch, cải thiện trí nhớ và duy trì sức khoẻ tổng thể. Hãy cố gắng đi ngủ sớm hơn nhé!
            </Text>

            {/* Progress comparison */}
            <View className="bg-white/5 rounded-2xl p-3 mb-5">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-gray-400 text-xs">Thực tế</Text>
                <Text className="text-[#F87171] text-xs font-semibold">{formatDuration(duration)}</Text>
              </View>
              <View className="h-2 bg-white/10 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full bg-[#F87171]"
                  style={{ width: `${(duration / 8) * 100}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-2 mb-1.5">
                <Text className="text-gray-400 text-xs">Khuyến nghị</Text>
                <Text className="text-[#4ADE80] text-xs font-semibold">8h 00m</Text>
              </View>
              <View className="h-2 bg-white/10 rounded-full overflow-hidden">
                <View className="h-full rounded-full bg-[#4ADE80] w-full" />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleWarningContinue}
              className="py-3.5 rounded-2xl items-center mb-3"
              style={{ backgroundColor: SLEEP_COLOR }}
            >
              <Text className="text-white font-bold">Vẫn lưu lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleWarningCancel}
              className="py-3.5 rounded-2xl items-center bg-white/5"
            >
              <Text className="text-gray-300 font-medium">Chỉnh lại giờ ngủ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
