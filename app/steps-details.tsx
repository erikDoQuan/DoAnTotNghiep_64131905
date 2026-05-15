import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/supabaseClient';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.7;
const STROKE_WIDTH = 40;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const STEP_GOAL = 10000;

interface WeekDay {
  label: string;
  date: string;
  steps: number;
  isToday: boolean;
}

export default function StepsDetailsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const [currentStepCount, setCurrentStepCount] = useState(0);
  const [pastStepCount, setPastStepCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastSyncedSteps, setLastSyncedSteps] = useState(0);
  const [weekDayData, setWeekDayData] = useState<WeekDay[]>([]);

  // Keep latest step values accessible in cleanup without stale closures
  const latestStepsRef = useRef({ totalSteps: 0, distanceKm: 0, caloriesBurned: 0 });

  const weight    = profile?.weight_kg  || 70;
  const height    = profile?.height_cm  || 170;
  const gender    = profile?.gender?.toLowerCase() || 'male';
  const moveGoal  = profile?.move_goal_kcal || 400;

  const totalSteps      = pastStepCount + currentStepCount;
  const stepLengthCm    = gender === 'male' ? height * 0.415 : height * 0.413;
  const distanceKm      = (totalSteps * stepLengthCm) / 100000;
  const caloriesBurned  = weight * distanceKm * 0.75;
  const progress        = Math.min(caloriesBurned / moveGoal, 1);

  // Keep ref in sync with latest computed values
  useEffect(() => {
    latestStepsRef.current = { totalSteps, distanceKm, caloriesBurned };
  }, [totalSteps, distanceKm, caloriesBurned]);

  /* ── Sync to DB ── */
  const syncStepData = useCallback(async (steps: number, dist: number, cal: number) => {
    if (!user || steps === 0) return;
    try {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);

      const { data: existing } = await supabase
        .from('step_records')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .maybeSingle();

      if (existing) {
        await supabase
          .from('step_records')
          .update({
            steps,
            distance_km:     parseFloat(dist.toFixed(2)),
            calories_burned: Math.round(cal),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('step_records')
          .insert({
            user_id:         user.id,
            steps,
            distance_km:     parseFloat(dist.toFixed(2)),
            calories_burned: Math.round(cal),
            created_at:      new Date().toISOString(),
          });
      }
      setLastSyncedSteps(steps);
    } catch (e) {
      console.error('Sync error:', e);
    }
  }, [user]);

  /* ── Fetch 7-day history ── */
  const fetchWeeklySteps = useCallback(async () => {
    if (!user) return;
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      return {
        label: DAY_LABELS[d.getDay()],
        date:  d.toISOString().split('T')[0],
        steps: 0,
        isToday: i === 6,
      };
    });

    const { data } = await supabase
      .from('step_records')
      .select('steps, created_at')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .lte('created_at', endOfToday.toISOString());

    (data || []).forEach(r => {
      const ds  = new Date(r.created_at).toISOString().split('T')[0];
      const day = days.find(d => d.date === ds);
      if (day) day.steps = Math.max(day.steps, r.steps || 0);
    });

    setWeekDayData(days);
  }, [user]);

  /* ── Pedometer setup ── */
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const subscribe = async () => {
      // Request permission first — required on iOS for Core Motion access
      const { granted } = await Pedometer.requestPermissionsAsync();
      const isAvailable = granted && (await Pedometer.isAvailableAsync());
      setIsPedometerAvailable(isAvailable ? 'true' : 'false');

      // Load today's saved count from DB first
      if (user) {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);

        const { data: dbData } = await supabase
          .from('step_records')
          .select('steps')
          .eq('user_id', user.id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbData) {
          setPastStepCount(dbData.steps);
          setLastSyncedSteps(dbData.steps);
        }
      }

      if (isAvailable) {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end   = new Date();

        try {
          // Reads ALL steps today from Core Motion — includes steps counted
          // while app was closed (same source as iPhone Health/Fitness app)
          const result = await Pedometer.getStepCountAsync(start, end);
          if (result) setPastStepCount(prev => Math.max(result.steps, prev));
        } catch {}

        // watchStepCount gives incremental steps since subscription start
        subscription = Pedometer.watchStepCount(result => {
          setCurrentStepCount(result.steps);
        });
      }

      setIsLoading(false);
    };

    subscribe();
    fetchWeeklySteps();

    // Sync on unmount — read latest values from ref (no stale closure)
    return () => {
      subscription?.remove();
      const { totalSteps, distanceKm, caloriesBurned } = latestStepsRef.current;
      if (totalSteps > 0) syncStepData(totalSteps, distanceKm, caloriesBurned);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Periodic sync every 20 steps
  useEffect(() => {
    if (totalSteps > lastSyncedSteps + 20) {
      syncStepData(totalSteps, distanceKm, caloriesBurned);
    }
  }, [totalSteps, lastSyncedSteps, distanceKm, caloriesBurned, syncStepData]);

  /* ── Goal update ── */
  const handleUpdateGoal = async () => {
    if (!newGoal || isNaN(Number(newGoal))) {
      Alert.alert('Lỗi', 'Vui lòng nhập số calo hợp lệ');
      return;
    }
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ move_goal_kcal: parseInt(newGoal) })
        .eq('id', user?.id);
      if (error) throw error;
      await refreshProfile();
      setIsModalVisible(false);
      setNewGoal('');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật mục tiêu');
    } finally {
      setIsUpdating(false);
    }
  };

  /* ── Formatted date ── */
  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());

  /* ── Weekly rings ── */
  const renderWeeklyRings = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Build Mon–Sun of current week
    const mondayOffset = (today.getDay() + 6) % 7; // days since Monday
    const currentWeekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - mondayOffset + i);
      const dateStr = d.toISOString().split('T')[0];
      const rec     = weekDayData.find(w => w.date === dateStr);
      return {
        label:   ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][i],
        steps:   rec?.steps ?? 0,
        isToday: dateStr === todayStr,
        isFuture: d > today,
      };
    });

    return (
      <View className="flex-row justify-between px-5 mb-8">
        {currentWeekDays.map((day, i) => {
          const goalMet  = day.steps >= STEP_GOAL;
          const hasSteps = day.steps > 0;
          const bgColor  = day.isToday ? '#EFFF3B'
            : goalMet    ? '#4ADE80'
            : hasSteps   ? '#FF914D'
            : 'transparent';
          const textColor = (day.isToday || goalMet || hasSteps) ? 'black' : '#666';

          return (
            <View key={i} className="items-center">
              <Text className="text-gray-500 text-[10px] mb-2">{day.label}</Text>
              <View
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{
                  backgroundColor: bgColor,
                  borderWidth: day.isFuture ? 1 : 0,
                  borderColor: '#333',
                }}
              >
                {day.isToday ? (
                  <MaterialCommunityIcons name="run" size={16} color="black" />
                ) : goalMet ? (
                  <MaterialCommunityIcons name="check" size={14} color="black" />
                ) : hasSteps ? (
                  <Text style={{ color: textColor, fontSize: 8, fontWeight: 'bold' }}>
                    {Math.round(day.steps / 1000)}k
                  </Text>
                ) : (
                  <View className="w-5 h-5 rounded-full border border-[#333]" />
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  /* ── 7-day bar chart ── */
  const renderStepsChart = () => {
    if (weekDayData.length === 0) return null;

    const maxSteps = Math.max(...weekDayData.map(d => d.steps), STEP_GOAL);
    const barWidth = Math.floor((width - 80) / weekDayData.length) - 6;
    const chartH   = 80;

    return (
      <View>
        <View style={{ height: chartH + 30 }} className="flex-row items-end justify-between px-1">
          {weekDayData.map((day, i) => {
            const barH  = day.steps > 0 ? Math.max(6, (day.steps / maxSteps) * chartH) : 4;
            const color = day.isToday  ? '#EFFF3B'
              : day.steps >= STEP_GOAL ? '#4ADE80'
              : day.steps > 0          ? '#FF914D'
              : '#2a2a2a';
            return (
              <View key={day.date} className="items-center">
                {day.isToday && day.steps > 0 && (
                  <Text style={{ color: '#EFFF3B', fontSize: 8, fontWeight: 'bold', marginBottom: 3 }}>
                    {day.steps.toLocaleString()}
                  </Text>
                )}
                <View
                  style={{
                    height: barH,
                    width: barWidth,
                    backgroundColor: color,
                    borderRadius: 4,
                    opacity: day.steps > 0 ? 1 : 0.3,
                  }}
                />
                <Text
                  style={{
                    color: day.isToday ? '#EFFF3B' : '#555',
                    fontSize: 9,
                    fontWeight: '600',
                    marginTop: 6,
                  }}
                >
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View className="flex-row mt-3" style={{ gap: 14 }}>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#4ADE80] mr-1.5" />
            <Text className="text-gray-600 text-[10px]">Đạt {STEP_GOAL.toLocaleString()}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-[#FF914D] mr-1.5" />
            <Text className="text-gray-600 text-[10px]">Chưa đạt</Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#EFFF3B" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#EFFF3B" />
        </TouchableOpacity>
        <Text className="text-white text-sm font-semibold">{formattedDate}</Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* Weekly rings (7 days, Mon–Sun) */}
        {renderWeeklyRings()}

        {/* Activity ring */}
        <View className="items-center justify-center mb-10">
          <View className="relative items-center justify-center">
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <G rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
                  stroke="#EFFF3B" strokeWidth={STROKE_WIDTH} strokeOpacity="0.1" fill="none"
                />
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
                  stroke="#EFFF3B" strokeWidth={STROKE_WIDTH}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                  strokeLinecap="round" fill="none"
                />
                {progress > 0 && (
                  <G rotation={progress * 360} origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
                    <Circle cx={RING_SIZE / 2 + RADIUS} cy={RING_SIZE / 2} r={STROKE_WIDTH / 2} fill="#EFFF3B" />
                    <Path
                      d={`M ${RING_SIZE / 2 + RADIUS - 8} ${RING_SIZE / 2 - 8} L ${RING_SIZE / 2 + RADIUS + 8} ${RING_SIZE / 2} L ${RING_SIZE / 2 + RADIUS - 8} ${RING_SIZE / 2 + 8}`}
                      stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </G>
                )}
              </G>
            </Svg>
            <View className="absolute items-center">
              <MaterialCommunityIcons name="run" size={48} color="#EFFF3B" />
              <Text className="text-white text-3xl font-bold mt-2">{Math.round(progress * 100)}%</Text>
            </View>
          </View>
        </View>

        {/* Calorie summary */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-between items-end mb-2">
            <View>
              <Text className="text-gray-400 text-base font-medium mb-1">Di chuyển</Text>
              <View className="flex-row items-baseline">
                <Text className="text-[#EFFF3B] text-4xl font-bold">{caloriesBurned.toFixed(0)}</Text>
                <Text className="text-[#EFFF3B] text-2xl font-bold ml-1">/{moveGoal} KCAL</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => { setNewGoal(moveGoal.toString()); setIsModalVisible(true); }}
              className="w-10 h-10 rounded-full bg-[#EFFF3B]/20 items-center justify-center"
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#EFFF3B" />
            </TouchableOpacity>
          </View>

          {/* 7-day bar chart */}
          <View className="mt-6 pb-2 border-b border-gray-800">
            {renderStepsChart()}
          </View>
          <Text className="text-[#EFFF3B] text-xs font-bold mt-4 uppercase tracking-wider">
            TỔNG CỘNG {caloriesBurned.toFixed(0)} KCAL HÔM NAY
          </Text>
        </View>

        {/* Bottom stats */}
        <View className="flex-row px-6 mb-6">
          <View className="flex-1">
            <Text className="text-white text-base font-medium mb-1">Bước chân</Text>
            <Text className="text-[#EFFF3B] text-3xl font-bold">{totalSteps.toLocaleString()}</Text>
            <Text className="text-gray-600 text-xs mt-1">Mục tiêu {STEP_GOAL.toLocaleString()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-medium mb-1">Quãng đường</Text>
            <Text className="text-[#EFFF3B] text-3xl font-bold">{distanceKm.toFixed(2)} km</Text>
          </View>
        </View>

        {isPedometerAvailable === 'false' && (
          <View className="px-6 mb-4">
            <View className="bg-yellow-900/30 rounded-2xl p-4 flex-row items-center">
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FACC15" />
              <Text className="text-yellow-400 text-xs ml-3 flex-1">
                Cảm biến đếm bước chân không khả dụng. Số liệu hiển thị từ dữ liệu đã lưu.
              </Text>
            </View>
          </View>
        )}

        {/* Update goal button */}
        <View className="px-6 mb-12">
          <TouchableOpacity
            onPress={() => { setNewGoal(moveGoal.toString()); setIsModalVisible(true); }}
            className="w-full bg-[#EFFF3B] py-4 rounded-2xl items-center justify-center shadow-lg"
          >
            <Text className="text-black font-bold text-lg">Cập nhật mục tiêu calo</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Goal modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#1c1c1c] rounded-t-3xl p-8 border-t border-[#333]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">Mục tiêu vận động</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-400 mb-4">Lượng calo muốn tiêu thụ mỗi ngày:</Text>

            <View className="bg-black/40 rounded-2xl p-4 mb-6 border border-[#333]">
              <TextInput
                className="text-[#EFFF3B] text-3xl font-bold text-center"
                value={newGoal}
                onChangeText={setNewGoal}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#333"
                autoFocus
              />
              <Text className="text-[#EFFF3B] text-center font-medium mt-1">KCAL</Text>
            </View>

            <TouchableOpacity
              onPress={handleUpdateGoal}
              disabled={isUpdating}
              className="w-full bg-[#EFFF3B] py-4 rounded-2xl items-center justify-center mb-4"
            >
              {isUpdating
                ? <ActivityIndicator color="black" />
                : <Text className="text-black font-bold text-lg">Lưu thay đổi</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
