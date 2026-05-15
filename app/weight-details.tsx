import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

interface WeightGoal {
  id: number;
  start_weight: number;
  target_weight: number;
  goal_type: string;
  start_date: string;
  target_date: string;
  created_at: string;
}

export default function WeightDetailsScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [goal, setGoal] = useState<WeightGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weightLogs, setWeightLogs] = useState<{ date: string; weight: number }[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [logDate, setLogDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchWeightHistory = useCallback(async () => {
    if (!user) return;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      const { data } = await supabase
        .from('weight_records')
        .select('record_date, weight_kg')
        .eq('user_id', user.id)
        .gte('record_date', toLocalDateStr(thirtyDaysAgo))
        .order('record_date', { ascending: true });
      setWeightLogs((data || []).map(r => ({ date: r.record_date, weight: r.weight_kg })));
    } catch {
      // ignore
    }
  }, [user]);

  const saveWeightLog = async () => {
    const w = parseFloat(inputWeight);
    if (!user || isNaN(w) || w <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập cân nặng hợp lệ.');
      return;
    }
    setIsSavingWeight(true);
    try {
      const dateStr = toLocalDateStr(logDate);
      const isToday = dateStr === toLocalDateStr(new Date());
      await supabase
        .from('weight_records')
        .upsert(
          { user_id: user.id, record_date: dateStr, weight_kg: w },
          { onConflict: 'user_id,record_date' }
        );
      if (isToday) {
        await supabase.from('profiles').update({ weight_kg: w }).eq('id', user.id);
      }
      setShowLogModal(false);
      setInputWeight('');
      fetchWeightHistory();
      const label = isToday ? 'hôm nay' : logDate.toLocaleDateString('vi-VN');
      Alert.alert('Đã lưu', `Cân nặng ${label}: ${w} kg`);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu cân nặng.');
    } finally {
      setIsSavingWeight(false);
    }
  };

  useEffect(() => {
    async function fetchWeightGoal() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('weight_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setGoal(data);
      } catch (error) {
        console.error('Error fetching weight goal:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeightGoal();
    fetchWeightHistory();
  }, [user, fetchWeightHistory]);

  const currentWeight = profile?.weight_kg || 0;
  const height_m = (profile?.height_cm || 0) / 100;
  const bmi = height_m > 0 ? (currentWeight / (height_m * height_m)).toFixed(1) : '0.0';

  const getBMIStatus = (bmiValue: number) => {
    if (bmiValue === 0) return 'Chưa có dữ liệu';
    if (bmiValue < 16) return 'Thiếu cân nặng (Cấp III)';
    if (bmiValue < 17) return 'Thiếu cân (Cấp II)';
    if (bmiValue < 18.5) return 'Thiếu cân (Cấp I)';
    if (bmiValue < 25) return 'Cân nặng bình thường';
    if (bmiValue < 30) return 'Thừa cân';
    if (bmiValue < 35) return 'Béo phì độ I';
    if (bmiValue < 40) return 'Béo phì độ II';
    return 'Béo phì độ III';
  };

  const bmiStatus = getBMIStatus(Number(bmi));

  // Progress calculation
  const getProgress = () => {
    if (!goal || !currentWeight) return 0;
    const total = Math.abs(goal.target_weight - goal.start_weight);
    if (total === 0) return 0;
    const achieved = Math.abs(currentWeight - goal.start_weight);
    return Math.min(Math.max(achieved / total, 0), 1);
  };

  const progress = getProgress();
  const weightDiff = goal ? Math.abs(goal.target_weight - currentWeight).toFixed(1) : '0';
  // Dùng số liệu thực để xác định hướng, không dùng goal_type (có thể nhập sai)
  const effectiveIsLosing = goal ? goal.target_weight < goal.start_weight : false;
  const goalTypeLabel = !goal
    ? 'Chưa có mục tiêu'
    : goal.target_weight < goal.start_weight
    ? 'Giảm cân'
    : goal.target_weight > goal.start_weight
    ? 'Tăng cân'
    : 'Duy trì cân nặng';

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand-secondary items-center justify-center">
        <ActivityIndicator color="#EFFF3B" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-secondary">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-brand-tertiary items-center justify-center mr-4"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-text-primary text-xl font-bold">Tiến độ cân nặng</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* BMI Card */}
        <View className="bg-brand-tertiary rounded-3xl p-6 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-text-secondary text-sm font-medium">BMI hiện tại</Text>
            <View className="w-10 h-10 rounded-full bg-status-success/10 items-center justify-center">
              <MaterialCommunityIcons name="scale-bathroom" size={20} color="#4ADE80" />
            </View>
          </View>
          <View className="flex-row items-baseline mb-2">
            <Text className="text-text-primary text-4xl font-bold">{bmi}</Text>
            <Text className="text-brand-primary text-sm font-bold ml-2">{bmiStatus}</Text>
          </View>
          <Text className="text-text-muted text-xs">
            BMI được tính từ chiều cao ({profile?.height_cm} cm) và cân nặng hiện tại ({currentWeight} kg).
          </Text>
        </View>

        {/* Goal Card */}
        <View className="bg-brand-tertiary rounded-3xl p-6 mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-text-secondary text-sm font-medium mb-1">Loại mục tiêu</Text>
              <Text className="text-text-primary text-lg font-bold">{goalTypeLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/set-weight-goal')}
              className="w-12 h-12 rounded-2xl bg-brand-primary/10 items-center justify-center"
            >
              <MaterialCommunityIcons
                name={effectiveIsLosing ? "trending-down" : "trending-up"}
                size={24}
                color="#EFFF3B"
              />
            </TouchableOpacity>
          </View>

          {goal && (
            <>
              {/* Progress Bar */}
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-text-muted text-xs">Bắt đầu: {goal.start_weight} kg</Text>
                  <Text className="text-text-primary text-xs font-bold">Hiện tại: {currentWeight} kg</Text>
                  <Text className="text-text-muted text-xs">Mục tiêu: {goal.target_weight} kg</Text>
                </View>
                <View className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-brand-primary rounded-full" 
                    style={{ width: `${progress * 100}%` }} 
                  />
                </View>
              </View>

              {/* Status Text */}
              <View className="bg-brand-secondary/50 rounded-2xl p-4 flex-row items-center">
                <MaterialCommunityIcons name="information-outline" size={20} color="#EFFF3B" style={{ marginRight: 12 }} />
                <Text className="text-text-primary text-sm flex-1 leading-5">
                  {effectiveIsLosing ? 'Còn cần giảm ' : 'Còn cần tăng '}
                  <Text className="text-brand-primary font-bold">{weightDiff} kg</Text>
                  {' '}nữa để đạt mục tiêu. Cố lên!
                </Text>
              </View>

              {/* Timeline */}
              <View className="mt-6 flex-row justify-between border-t border-white/5 pt-4">
                <View>
                  <Text className="text-text-muted text-[10px] uppercase mb-1">Ngày bắt đầu</Text>
                  <Text className="text-text-primary text-sm font-medium">
                    {new Date(goal.start_date).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-text-muted text-[10px] uppercase mb-1">Ngày mục tiêu</Text>
                  <Text className="text-text-primary text-sm font-medium">
                    {new Date(goal.target_date).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>
            </>
          )}

          {!goal && (
            <TouchableOpacity
              className="bg-brand-primary py-4 rounded-2xl items-center"
              onPress={() => router.push('/set-weight-goal')}
            >
              <Text className="text-black font-bold">Đặt mục tiêu cân nặng</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Weight History Chart */}
        <View className="bg-brand-tertiary rounded-3xl p-6 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-text-secondary text-sm font-medium">Lịch sử cân nặng (30 ngày)</Text>
            <TouchableOpacity
              onPress={() => { setInputWeight(profile?.weight_kg?.toString() || ''); setLogDate(new Date()); setShowLogModal(true); }}
              className="flex-row items-center bg-brand-primary/10 px-3 py-1.5 rounded-full"
            >
              <MaterialCommunityIcons name="plus" size={14} color="#EFFF3B" />
              <Text className="text-brand-primary text-xs font-bold ml-1">Cập nhật</Text>
            </TouchableOpacity>
          </View>

          {weightLogs.length === 0 ? (
            <View className="items-center py-6">
              <MaterialCommunityIcons name="chart-line" size={36} color="#444" />
              <Text className="text-text-muted text-sm mt-2">Chưa có dữ liệu</Text>
              <Text className="text-text-muted text-xs mt-1">Nhấn "Cập nhật" để ghi cân nặng hôm nay</Text>
            </View>
          ) : (
            <>
              {/* Bar chart — luôn hiện 14 slot cố định */}
              {(() => {
                const today = new Date();
                const slots = Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(today);
                  d.setDate(today.getDate() - (13 - i));
                  const dateStr = toLocalDateStr(d);
                  const log = weightLogs.find(l => l.date === dateStr);
                  return { dateStr, weight: log?.weight ?? null };
                });
                const filledWeights = slots.map(s => s.weight).filter((w): w is number => w !== null);
                const minW = filledWeights.length ? Math.min(...filledWeights) : 60;
                const maxW = filledWeights.length ? Math.max(...filledWeights) : 100;
                const range = maxW - minW || 1;

                return (
                  <>
                    <View className="flex-row items-end justify-between" style={{ height: 80 }}>
                      {slots.map((slot, idx) => {
                        const isToday = idx === 13;
                        const hasData = slot.weight !== null;
                        const barH = hasData ? 16 + ((slot.weight! - minW) / range) * 56 : 6;
                        return (
                          <View key={slot.dateStr} className="items-center" style={{ flex: 1 }}>
                            {isToday && hasData && (
                              <Text className="text-brand-primary text-[8px] font-bold mb-0.5">
                                {slot.weight}kg
                              </Text>
                            )}
                            <View
                              style={{
                                height: barH,
                                backgroundColor: isToday && hasData ? '#EFFF3B' : hasData ? '#3a3a3a' : '#222',
                                borderRadius: 3,
                                width: 10,
                                opacity: hasData ? 1 : 0.4,
                              }}
                            />
                          </View>
                        );
                      })}
                    </View>

                    {filledWeights.length > 0 && (
                      <View className="flex-row justify-between mt-3">
                        <Text className="text-text-muted text-[10px]">
                          Thấp nhất: {Math.min(...filledWeights)} kg
                        </Text>
                        <Text className="text-text-muted text-[10px]">
                          Cao nhất: {Math.max(...filledWeights)} kg
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </View>

        {/* Info Section */}
        <View className="px-2">
          <Text className="text-text-secondary text-base font-bold mb-4">Lời khuyên sức khoẻ</Text>
          <View className="flex-row mb-4">
            <View className="w-10 h-10 rounded-xl bg-status-info/10 items-center justify-center mr-4">
              <MaterialCommunityIcons name="food-apple" size={20} color="#38BDF8" />
            </View>
            <View className="flex-1">
              <Text className="text-text-primary text-sm font-bold mb-1">Ăn đủ chất dinh dưỡng</Text>
              <Text className="text-text-muted text-xs leading-4">Đảm bảo bổ sung đủ protein và chất xơ để no lâu và duy trì cơ bắp.</Text>
            </View>
          </View>
          <View className="flex-row mb-8">
            <View className="w-10 h-10 rounded-xl bg-status-warning/10 items-center justify-center mr-4">
              <MaterialCommunityIcons name="water" size={20} color="#FACC15" />
            </View>
            <View className="flex-1">
              <Text className="text-text-primary text-sm font-bold mb-1">Uống đủ nước</Text>
              <Text className="text-text-muted text-xs leading-4">Uống đủ 2 lít nước mỗi ngày giúp trao đổi chất tốt hơn và hỗ trợ kiểm soát cân nặng.</Text>
            </View>
          </View>
        </View>

      </ScrollView>
      {/* Modal nhập cân nặng */}
      <Modal transparent animationType="slide" visible={showLogModal}>
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => { setShowLogModal(false); setShowDatePicker(false); }}
        >
          <View className="bg-brand-tertiary rounded-t-3xl p-6 pb-12">
            <View className="w-12 h-1 bg-white/10 rounded-full self-center mb-6" />
            <Text className="text-white text-lg font-bold mb-1">Ghi cân nặng</Text>
            <Text className="text-text-muted text-xs mb-5">Ghi lại cân nặng của bạn để theo dõi tiến trình</Text>

            {/* Date selector */}
            <TouchableOpacity
              onPress={() => setShowDatePicker(v => !v)}
              className="flex-row items-center bg-brand-secondary rounded-2xl px-4 py-3 mb-3"
            >
              <MaterialCommunityIcons name="calendar" size={22} color="#EFFF3B" />
              <View className="flex-1 ml-3">
                <Text className="text-text-muted text-xs">Ngày</Text>
                <Text className="text-white text-base font-bold">
                  {toLocalDateStr(logDate) === toLocalDateStr(new Date())
                    ? 'Hôm nay'
                    : logDate.toLocaleDateString('vi-VN')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#555" />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={logDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_: DateTimePickerEvent, selected?: Date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selected) setLogDate(selected);
                }}
                locale="vi-VN"
                style={{ marginBottom: 8 }}
              />
            )}

            {/* Weight input */}
            <View className="flex-row items-center bg-brand-secondary rounded-2xl px-4 py-3 mb-5">
              <MaterialCommunityIcons name="scale-bathroom" size={22} color="#EFFF3B" />
              <TextInput
                className="flex-1 text-white text-2xl font-bold ml-3"
                value={inputWeight}
                onChangeText={setInputWeight}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#444"
              />
              <Text className="text-text-muted text-base">kg</Text>
            </View>

            <TouchableOpacity
              onPress={saveWeightLog}
              disabled={isSavingWeight}
              className="bg-brand-primary py-4 rounded-2xl items-center"
            >
              {isSavingWeight
                ? <ActivityIndicator color="black" />
                : <Text className="text-black font-bold text-base">Lưu</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
