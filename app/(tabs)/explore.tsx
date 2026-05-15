import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type Period = '7' | '30';

interface DayData {
  shortLabel: string;
  date: string;
  steps: number;
  calories: number;
  sleep: number;
}

interface WeightPoint {
  date: string;
  label: string;
  weight: number;
  bmi: number;
}

function getBMIColor(bmi: number) {
  if (bmi < 18.5) return '#60A5FA';
  if (bmi < 25)   return '#4ADE80';
  if (bmi < 30)   return '#FACC15';
  return '#F87171';
}

const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function getBMILabel(bmi: number) {
  if (bmi < 18.5) return 'Thiếu cân';
  if (bmi < 25)   return 'Bình thường';
  if (bmi < 30)   return 'Thừa cân';
  return 'Béo phì';
}

export default function StatsScreen() {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7');
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [weightPoints, setWeightPoints] = useState<WeightPoint[]>([]);
  const [selectedWeightIdx, setSelectedWeightIdx] = useState<number | null>(null);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [selectedCalIdx, setSelectedCalIdx] = useState<number | null>(null);
  const [selectedSleepIdx, setSelectedSleepIdx] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const numDays = period === '7' ? 7 : 30;
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (numDays - 1));
      startDate.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      const startDateStr = toLocalDateStr(startDate);
      const todayStr     = toLocalDateStr(today);

      const days: DayData[] = Array.from({ length: numDays }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const showLabel = period === '7'
          ? true
          : i % 7 === 0 || i === numDays - 1;
        return {
          shortLabel: showLabel
            ? (period === '7' ? DAY_LABELS[d.getDay()] : `${d.getDate()}`)
            : '',
          date: toLocalDateStr(d),
          steps: 0,
          calories: 0,
          sleep: 0,
        };
      });

      const [stepRes, mealRes, sleepRes, weightRes] = await Promise.all([
        supabase
          .from('step_records')
          .select('steps, created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endOfToday.toISOString()),
        supabase
          .from('meals')
          .select('calories, created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endOfToday.toISOString()),
        supabase
          .from('sleep_records')
          .select('sleep_duration, created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endOfToday.toISOString()),
        supabase
          .from('weight_records')
          .select('record_date, weight_kg')
          .eq('user_id', user.id)
          .gte('record_date', startDateStr)
          .lte('record_date', todayStr)
          .order('record_date', { ascending: true }),
      ]);

      (stepRes.data || []).forEach(r => {
        const ds = toLocalDateStr(new Date(r.created_at));
        const d  = days.find(x => x.date === ds);
        if (d) d.steps = Math.max(d.steps, r.steps || 0);
      });

      (mealRes.data || []).forEach(r => {
        const ds = toLocalDateStr(new Date(r.created_at));
        const d  = days.find(x => x.date === ds);
        if (d) d.calories += r.calories || 0;
      });

      (sleepRes.data || []).forEach(r => {
        const ds = toLocalDateStr(new Date(r.created_at));
        const d  = days.find(x => x.date === ds);
        if (d && (r.sleep_duration || 0) > d.sleep) d.sleep = r.sleep_duration;
      });

      setDayData(days);

      const heightM = (profile?.height_cm || 170) / 100;
      setSelectedWeightIdx(null);
      setSelectedStepIdx(null);
      setSelectedCalIdx(null);
      setSelectedSleepIdx(null);
      setWeightPoints(
        (weightRes.data || []).map(r => {
          const d   = new Date(r.record_date);
          const bmi = parseFloat((r.weight_kg / (heightM * heightM)).toFixed(1));
          return {
            date:   r.record_date,
            label:  `${d.getDate()}/${d.getMonth() + 1}`,
            weight: r.weight_kg,
            bmi,
          };
        }),
      );
    } catch (e) {
      console.error('Stats fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user, period, profile?.height_cm]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  /* ── derived stats ── */
  const numDays          = period === '7' ? 7 : 30;
  const barWidth         = period === '7' ? 18 : 8;
  const daysWithSteps    = dayData.filter(d => d.steps > 0);
  const daysWithCalories = dayData.filter(d => d.calories > 0);
  const daysWithSleep    = dayData.filter(d => d.sleep > 0);
  const totalSteps       = dayData.reduce((s, d) => s + d.steps, 0);
  const avgCalories      = daysWithCalories.length
    ? Math.round(daysWithCalories.reduce((s, d) => s + d.calories, 0) / daysWithCalories.length)
    : 0;
  const avgSleep = daysWithSleep.length
    ? daysWithSleep.reduce((s, d) => s + d.sleep, 0) / daysWithSleep.length
    : 0;
  const stepGoal = profile?.step_goal || 10000;

  /* ── bar chart helper ── */
  const renderBarChart = (
    values: number[],
    labels: string[],
    maxOverride: number | undefined,
    colorFn: (v: number) => string,
    labelFn: (v: number) => string,
    selectedIdx: number | null,
    onSelect: (idx: number) => void,
  ) => {
    const maxVal    = maxOverride ?? Math.max(...values, 1);
    const activeIdx = selectedIdx !== null ? selectedIdx : values.length - 1;
    return (
      <View className="flex-row items-end justify-between" style={{ height: 96 }}>
        {values.map((val, idx) => {
          const barH     = val > 0 ? Math.max(8, (val / maxVal) * 74) : 5;
          const isActive = idx === activeIdx;
          const color    = colorFn(val);
          return (
            <TouchableOpacity
              key={idx}
              className="items-center"
              style={{ flex: 1 }}
              activeOpacity={0.7}
              onPress={() => onSelect(idx)}
            >
              <Text style={{
                color,
                fontSize: 7,
                fontWeight: 'bold',
                marginBottom: 2,
                opacity: isActive && val > 0 ? 1 : 0,
              }}>
                {val > 0 ? labelFn(val) : ' '}
              </Text>
              <View
                style={{
                  height: barH,
                  backgroundColor: color,
                  borderRadius: 4,
                  width: barWidth,
                  opacity: isActive ? 1 : val > 0 ? 0.35 : 0.15,
                }}
              />
              <Text
                style={{
                  fontSize: 8,
                  marginTop: 5,
                  fontWeight: '600',
                  color: isActive ? '#EFFF3B' : '#3a3a3a',
                }}
              >
                {labels[idx]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  /* ── weight chart ── */
  const renderWeightChart = () => {
    if (weightPoints.length === 0) {
      return (
        <View className="items-center py-8">
          <MaterialCommunityIcons name="scale-off" size={32} color="#333" />
          <Text className="text-gray-600 text-sm mt-2">Chưa có dữ liệu trong kỳ này</Text>
        </View>
      );
    }
    const weights  = weightPoints.map(p => p.weight);
    const minW     = Math.min(...weights);
    const maxW     = Math.max(...weights);
    const range    = maxW - minW || 1;
    const wBarW    = Math.max(barWidth, 8);
    const activeIdx = selectedWeightIdx !== null ? selectedWeightIdx : weightPoints.length - 1;

    return (
      <>
        <View style={{ height: 96 }} className="flex-row items-end">
          {weightPoints.map((pt, idx) => {
            const barH    = Math.max(10, ((pt.weight - minW) / range) * 72 + 10);
            const isActive = idx === activeIdx;
            return (
              <TouchableOpacity
                key={pt.date}
                className="items-center"
                style={{ flex: 1 }}
                activeOpacity={0.7}
                onPress={() => setSelectedWeightIdx(idx)}
              >
                <Text style={{
                  color: '#60A5FA',
                  fontSize: 7,
                  fontWeight: 'bold',
                  marginBottom: 2,
                  opacity: isActive ? 1 : 0,
                }}>
                  {pt.weight}kg
                </Text>
                <View
                  style={{
                    height: barH,
                    backgroundColor: isActive ? '#60A5FA' : '#2563EB',
                    borderRadius: 4,
                    width: wBarW,
                    opacity: isActive ? 1 : 0.6,
                  }}
                />
                <Text style={{ fontSize: 7, marginTop: 5, color: isActive ? '#EFFF3B' : '#3a3a3a', fontWeight: '600' }}>
                  {pt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-row justify-between mt-3 pt-3 border-t border-[#2a2a2a]">
          <View>
            <Text className="text-gray-500 text-[10px]">Thấp nhất</Text>
            <Text className="text-white text-xs font-bold">{minW} kg</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-[10px]">Hiện tại</Text>
            <Text className="text-blue-400 text-xs font-bold">{weights[weights.length - 1]} kg</Text>
          </View>
          <View className="items-end">
            <Text className="text-gray-500 text-[10px]">Cao nhất</Text>
            <Text className="text-white text-xs font-bold">{maxW} kg</Text>
          </View>
        </View>
      </>
    );
  };

  /* ── BMI chart ── */
  const renderBMIChart = () => {
    if (weightPoints.length === 0) {
      return (
        <View className="items-center py-6">
          <Text className="text-gray-600 text-sm">Chưa có dữ liệu BMI</Text>
        </View>
      );
    }

    const latestBMI  = weightPoints[weightPoints.length - 1].bmi;
    const bmiColor   = getBMIColor(latestBMI);
    const bmiBarW    = Math.max(barWidth, 8);

    return (
      <>
        {/* Current BMI highlight */}
        <View className="flex-row items-center mb-5">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mr-4"
            style={{ backgroundColor: bmiColor + '22' }}
          >
            <Text style={{ color: bmiColor, fontSize: 19, fontWeight: '900' }}>
              {latestBMI}
            </Text>
          </View>
          <View>
            <Text className="text-white text-lg font-black">{getBMILabel(latestBMI)}</Text>
            <Text className="text-gray-500 text-xs mt-0.5">BMI mới nhất của bạn</Text>
          </View>
        </View>

        {/* Trend bars (only if > 1 record) */}
        {weightPoints.length > 1 && (
          <View style={{ height: 80 }} className="flex-row items-end mb-4">
            {weightPoints.map((pt, idx) => {
              const barH   = Math.max(8, (pt.bmi / 40) * 64);
              const isLast = idx === weightPoints.length - 1;
              const c      = getBMIColor(pt.bmi);
              return (
                <View key={pt.date} className="items-center" style={{ flex: 1 }}>
                  <View
                    style={{
                      height: barH,
                      backgroundColor: c,
                      borderRadius: 4,
                      width: bmiBarW,
                      opacity: isLast ? 1 : 0.4,
                    }}
                  />
                  <Text style={{ fontSize: 7, marginTop: 5, color: isLast ? '#EFFF3B' : '#3a3a3a', fontWeight: '600' }}>
                    {pt.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Scale reference */}
        <View className="flex-row pt-3 border-t border-[#2a2a2a]" style={{ gap: 6 }}>
          {[
            { range: '< 18.5', text: 'Thiếu cân',    color: '#60A5FA' },
            { range: '18.5–25', text: 'Bình thường', color: '#4ADE80' },
            { range: '25–30',   text: 'Thừa cân',    color: '#FACC15' },
            { range: '> 30',    text: 'Béo phì',     color: '#F87171' },
          ].map(item => (
            <View key={item.range} className="flex-1 items-center">
              <View className="w-full h-1 rounded-full mb-1.5" style={{ backgroundColor: item.color }} />
              <Text style={{ color: item.color, fontSize: 7, fontWeight: 'bold' }}>{item.range}</Text>
              <Text className="text-gray-600 text-[7px] text-center mt-0.5">{item.text}</Text>
            </View>
          ))}
        </View>
      </>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#EFFF3B" size="large" />
        <Text className="text-gray-600 text-sm mt-3">Đang tải dữ liệu…</Text>
      </View>
    );
  }

  const labels = dayData.map(d => d.shortLabel);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-sm font-medium">Tổng quan</Text>
            <Text className="text-white text-2xl font-black">Thống kê</Text>
          </View>

          {/* Period toggle */}
          <View
            className="flex-row rounded-xl p-1"
            style={{ backgroundColor: '#1c1c1c' }}
          >
            {(['7', '30'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                className="px-4 py-1.5 rounded-lg"
                style={{ backgroundColor: period === p ? '#EFFF3B' : 'transparent' }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: period === p ? 'black' : '#555',
                  }}
                >
                  {p} ngày
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary pills */}
        <View className="flex-row px-5 mt-4 mb-5" style={{ gap: 10 }}>
          <View className="flex-1 bg-[#1c1c1c] rounded-2xl p-4">
            <MaterialCommunityIcons name="walk" size={20} color="#FF914D" />
            <Text className="text-white text-xl font-black mt-2">
              {totalSteps > 0 ? totalSteps.toLocaleString() : '--'}
            </Text>
            <Text className="text-gray-500 text-[10px] mt-0.5">bước / {numDays} ngày</Text>
          </View>
          <View className="flex-1 bg-[#1c1c1c] rounded-2xl p-4">
            <MaterialCommunityIcons name="moon-waning-crescent" size={20} color="#8B5CF6" />
            <Text className="text-white text-xl font-black mt-2">
              {avgSleep > 0
                ? `${Math.floor(avgSleep)}h${Math.round((avgSleep % 1) * 60) > 0 ? Math.round((avgSleep % 1) * 60) + 'm' : ''}`
                : '--'}
            </Text>
            <Text className="text-gray-500 text-[10px] mt-0.5">ngủ TB / ngày</Text>
          </View>
          <View className="flex-1 bg-[#1c1c1c] rounded-2xl p-4">
            <MaterialCommunityIcons name="fire" size={20} color="#EFFF3B" />
            <Text className="text-white text-xl font-black mt-2">
              {avgCalories > 0 ? avgCalories.toLocaleString() : '--'}
            </Text>
            <Text className="text-gray-500 text-[10px] mt-0.5">kcal TB / ngày</Text>
          </View>
        </View>

        {/* Steps chart */}
        <View className="mx-5 bg-[#1c1c1c] rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-gray-400 text-xs mb-0.5">Bước chân</Text>
              <Text className="text-white text-base font-bold">{numDays} ngày qua</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-500 text-[10px]">Mục tiêu</Text>
              <Text className="text-[#FF914D] text-xs font-bold">{stepGoal.toLocaleString()} bước</Text>
            </View>
          </View>

          {renderBarChart(
            dayData.map(d => d.steps),
            labels,
            Math.max(...dayData.map(d => d.steps), stepGoal),
            v => v >= stepGoal ? '#4ADE80' : v > 0 ? '#FF914D' : '#2a2a2a',
            v => v.toLocaleString(),
            selectedStepIdx,
            setSelectedStepIdx,
          )}

          <View className="flex-row mt-3" style={{ gap: 12 }}>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-[#4ADE80] mr-1.5" />
              <Text className="text-gray-500 text-[10px]">Đạt mục tiêu</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-[#FF914D] mr-1.5" />
              <Text className="text-gray-500 text-[10px]">Chưa đạt</Text>
            </View>
          </View>
        </View>

        {/* Calories chart */}
        <View className="mx-5 bg-[#1c1c1c] rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-gray-400 text-xs mb-0.5">Calo nạp vào</Text>
              <Text className="text-white text-base font-bold">{numDays} ngày qua</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-500 text-[10px]">Trung bình</Text>
              <Text className="text-[#EFFF3B] text-xs font-bold">
                {avgCalories > 0 ? `${avgCalories} kcal` : '--'}
              </Text>
            </View>
          </View>

          {renderBarChart(
            dayData.map(d => d.calories),
            labels,
            undefined,
            v => v > 0 ? '#EFFF3B' : '#2a2a2a',
            v => `${Math.round(v)} kcal`,
            selectedCalIdx,
            setSelectedCalIdx,
          )}
        </View>

        {/* Sleep chart */}
        <View className="mx-5 bg-[#1c1c1c] rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-gray-400 text-xs mb-0.5">Giấc ngủ</Text>
              <Text className="text-white text-base font-bold">{numDays} ngày qua</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-500 text-[10px]">Mục tiêu</Text>
              <Text className="text-[#8B5CF6] text-xs font-bold">8 giờ / đêm</Text>
            </View>
          </View>

          {renderBarChart(
            dayData.map(d => d.sleep),
            labels,
            10,
            v => v >= 8 ? '#4ADE80' : v >= 6 ? '#FACC15' : v > 0 ? '#F87171' : '#2a2a2a',
            v => {
              const h = Math.floor(v);
              const m = Math.round((v - h) * 60);
              return m > 0 ? `${h}h${m}m` : `${h}h`;
            },
            selectedSleepIdx,
            setSelectedSleepIdx,
          )}

          <View className="flex-row mt-3" style={{ gap: 12 }}>
            {[
              { color: '#4ADE80', label: '≥ 8h' },
              { color: '#FACC15', label: '6–8h' },
              { color: '#F87171', label: '< 6h' },
            ].map(item => (
              <View key={item.label} className="flex-row items-center">
                <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: item.color }} />
                <Text className="text-gray-500 text-[10px]">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weight chart */}
        <View className="mx-5 bg-[#1c1c1c] rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-400 text-xs mb-0.5">Cân nặng</Text>
              <Text className="text-white text-base font-bold">{numDays} ngày qua</Text>
            </View>
            <MaterialCommunityIcons name="scale-bathroom" size={22} color="#60A5FA" />
          </View>
          {renderWeightChart()}
        </View>

        {/* BMI card */}
        <View className="mx-5 bg-[#1c1c1c] rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-400 text-xs mb-0.5">Chỉ số BMI</Text>
              <Text className="text-white text-base font-bold">Xu hướng</Text>
            </View>
            <MaterialCommunityIcons name="human-male-height" size={22} color="#4ADE80" />
          </View>
          {renderBMIChart()}
        </View>

        {/* Achievements */}
        <View className="mx-5 bg-[#1c1c1c] rounded-3xl p-5">
          <Text className="text-white text-base font-bold mb-4">Thành tích {numDays} ngày</Text>
          <View style={{ gap: 10 }}>
            {[
              {
                emoji: '🏃',
                title: `${daysWithSteps.filter(d => d.steps >= stepGoal).length} ngày đạt bước`,
                sub:   `mục tiêu ${stepGoal.toLocaleString()}`,
                active: daysWithSteps.filter(d => d.steps >= stepGoal).length > 0,
                color: '#4ADE80',
              },
              {
                emoji: '😴',
                title: `${daysWithSleep.filter(d => d.sleep >= 8).length} đêm ngủ đủ giấc`,
                sub:   'mục tiêu 8 giờ / đêm',
                active: daysWithSleep.filter(d => d.sleep >= 8).length > 0,
                color: '#8B5CF6',
              },
              {
                emoji: '🍽️',
                title: `${daysWithCalories.length} ngày ghi bữa ăn`,
                sub:   `trong ${numDays} ngày qua`,
                active: daysWithCalories.length > 0,
                color: '#EFFF3B',
              },
            ].map(item => (
              <View
                key={item.title}
                className="flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: item.active ? item.color + '18' : '#222' }}
              >
                <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                <View className="ml-3 flex-1">
                  <Text className="text-white text-sm font-bold">{item.title}</Text>
                  <Text className="text-gray-500 text-[11px] mt-0.5">{item.sub}</Text>
                </View>
                {item.active && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={item.color} />
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
