import React, { useState, useEffect, useCallback } from 'react';
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

  // Profile data
  const weight = profile?.weight_kg || 70;
  const height = profile?.height_cm || 170;
  const gender = profile?.gender?.toLowerCase() || 'male';
  const moveGoal = profile?.move_goal_kcal || 400;

  // Công thức tính toán
  const totalSteps = pastStepCount + currentStepCount;
  const stepLengthCm = gender === 'male' ? height * 0.415 : height * 0.413;
  const distanceKm = (totalSteps * stepLengthCm) / 100000;
  const caloriesBurned = weight * distanceKm * 0.75;
  const progress = Math.min(caloriesBurned / moveGoal, 1);

  // Sync logic
  const syncStepData = useCallback(async (steps: number, dist: number, cal: number) => {
    if (!user) return;
    
    console.log('Syncing steps:', steps, dist, cal);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Explicitly check for today's record
      const { data: existing, error: fetchError } = await supabase
        .from('step_records')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing record:', fetchError);
      }

      if (existing) {
        console.log('Updating existing record:', existing.id);
        const { error: updateError } = await supabase
          .from('step_records')
          .update({
            steps: steps,
            distance_km: parseFloat(dist.toFixed(2)),
            calories_burned: Math.round(cal),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (updateError) console.error('Update error:', updateError);
      } else {
        console.log('Inserting new record for today');
        const { error: insertError } = await supabase
          .from('step_records')
          .insert({
            user_id: user.id,
            steps: steps,
            distance_km: parseFloat(dist.toFixed(2)),
            calories_burned: Math.round(cal),
            created_at: new Date().toISOString()
          });
        
        if (insertError) console.error('Insert error:', insertError);
      }
      setLastSyncedSteps(steps);
    } catch (e) {
      console.error('Unexpected error in syncStepData:', e);
    }
  }, [user]);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));

      // Fetch initial data from DB for today
      if (user) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

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
          console.log('Loaded steps from DB:', dbData.steps);
          setPastStepCount(dbData.steps);
          setLastSyncedSteps(dbData.steps);
        }
      }

      if (isAvailable) {
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const pastStepsResult = await Pedometer.getStepCountAsync(start, end);
        if (pastStepsResult) {
          setPastStepCount(prev => Math.max(pastStepsResult.steps, prev));
        }

        subscription = Pedometer.watchStepCount((result) => {
          setCurrentStepCount(result.steps);
        });
      }
      setIsLoading(false);
    };

    subscribe();

    return () => {
      if (subscription) subscription.remove();
      // Final sync when leaving (using latest values via state/refs would be better but this is fine for basic sync)
    };
  }, []);

  // Sync on departure (using a separate effect to avoid stale closures in cleanup)
  useEffect(() => {
    return () => {
      if (totalSteps > 0) {
        syncStepData(totalSteps, distanceKm, caloriesBurned);
      }
    };
  }, [totalSteps, distanceKm, caloriesBurned, syncStepData]);

  // Periodic sync
  useEffect(() => {
    if (totalSteps > lastSyncedSteps + 0) { // Sync every step
      syncStepData(totalSteps, distanceKm, caloriesBurned);
    }
  }, [totalSteps, lastSyncedSteps, distanceKm, caloriesBurned, syncStepData]);

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
      Alert.alert('Thành công', 'Đã cập nhật mục tiêu vận động');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật mục tiêu');
    } finally {
      setIsUpdating(false);
    }
  };


  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  
  // Mock data for chart
  const hourlyData = [
    2, 4, 1, 0, 0, 0, 8, 15, 12, 5, 8, 4, 6, 2, 7, 5, 9, 3, 0, 0, 0, 0, 0, 0
  ];
  const maxVal = Math.max(...hourlyData);

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#EFFF3B" />
        </TouchableOpacity>
        <Text className="text-white text-base font-semibold">{formattedDate}</Text>
        <View className="flex-row">
          <TouchableOpacity className="mr-4">
            <MaterialCommunityIcons name="calendar-month" size={24} color="#EFFF3B" />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialCommunityIcons name="share-variant" size={24} color="#EFFF3B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Weekly Mini Rings */}
        <View className="flex-row justify-between px-5 mb-8">
          {weekDays.map((day, i) => (
            <View key={i} className="items-center">
              <Text className="text-gray-500 text-[10px] mb-2">{day}</Text>
              <View className="w-8 h-8 rounded-full border-2 border-[#EFFF3B]/20 items-center justify-center">
                {i === 6 ? ( // Chủ Nhật (hôm nay)
                   <View className="w-6 h-6 rounded-full bg-[#EFFF3B] items-center justify-center">
                      <Text className="text-black text-[10px] font-bold">CN</Text>
                   </View>
                ) : (
                  <View className="w-6 h-6 rounded-full border border-[#EFFF3B]/40" />
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Main Activity Ring */}
        <View className="items-center justify-center mb-10">
          <View className="relative items-center justify-center">
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <G rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
                {/* Background Ring */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="#EFFF3B"
                  strokeWidth={STROKE_WIDTH}
                  strokeOpacity="0.1"
                  fill="none"
                />
                {/* Progress Ring */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="#EFFF3B"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Arrow Icon at the end of progress */}
                {progress > 0 && (
                  <G 
                    rotation={progress * 360} 
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  >
                    <Circle
                      cx={RING_SIZE / 2 + RADIUS}
                      cy={RING_SIZE / 2}
                      r={STROKE_WIDTH / 2}
                      fill="#EFFF3B"
                    />
                    <Path
                      d={`M ${RING_SIZE / 2 + RADIUS - 8} ${RING_SIZE / 2 - 8} L ${RING_SIZE / 2 + RADIUS + 8} ${RING_SIZE / 2} L ${RING_SIZE / 2 + RADIUS - 8} ${RING_SIZE / 2 + 8}`}
                      stroke="black"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </G>
                )}
              </G>
            </Svg>
            {/* Center Content */}
            <View className="absolute items-center">
              <MaterialCommunityIcons name="run" size={48} color="#EFFF3B" />
              <Text className="text-white text-3xl font-bold mt-2">{Math.round(progress * 100)}%</Text>
            </View>
          </View>
        </View>

        {/* Calories Stats */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-between items-end mb-2">
            <View>
              <Text className="text-gray-400 text-base font-medium mb-1">Di chuyển</Text>
              <View className="flex-row items-baseline">
                <Text className="text-[#EFFF3B] text-4xl font-bold">{caloriesBurned.toFixed(0)}</Text>
                <Text className="text-[#EFFF3B] text-2xl font-bold ml-1">/{moveGoal}KCAL</Text>
              </View>
            </View>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-[#EFFF3B]/20 items-center justify-center">
              <MaterialCommunityIcons name="trending-up" size={24} color="#EFFF3B" />
            </TouchableOpacity>
          </View>

          {/* Bar Chart */}
          <View className="h-32 flex-row items-end justify-between mt-6 px-1 border-b border-gray-800 pb-2">
            {hourlyData.map((val, i) => (
              <View 
                key={i} 
                className="bg-[#EFFF3B] rounded-t"
                style={{ 
                  width: (width - 60) / 28, 
                  height: val > 0 ? (val / maxVal) * 80 : 2,
                  opacity: val > 0 ? 1 : 0.2
                }}
              />
            ))}
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-gray-600 text-[10px]">00:00</Text>
            <Text className="text-gray-600 text-[10px]">06:00</Text>
            <Text className="text-gray-600 text-[10px]">12:00</Text>
            <Text className="text-gray-600 text-[10px]">18:00</Text>
          </View>
          <Text className="text-[#EFFF3B] text-xs font-bold mt-4 uppercase tracking-wider">TỔNG CỘNG {caloriesBurned.toFixed(0)} KCAL</Text>
        </View>

        {/* Bottom Stats */}
        <View className="flex-row px-6 mb-10">
          <View className="flex-1">
            <Text className="text-white text-lg font-medium mb-1">Bước</Text>
            <Text className="text-[#EFFF3B] text-3xl font-bold">{totalSteps.toLocaleString()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-lg font-medium mb-1">Quãng đường</Text>
            <Text className="text-[#EFFF3B] text-3xl font-bold">{distanceKm.toFixed(2)}KM</Text>
          </View>
        </View>

        {/* Update Goal Button */}
        <View className="px-6 mb-10">
          <TouchableOpacity 
            onPress={() => {
              setNewGoal(moveGoal.toString());
              setIsModalVisible(true);
            }}
            className="w-full bg-[#EFFF3B] py-4 rounded-2xl items-center justify-center shadow-lg"
          >
            <Text className="text-black font-bold text-lg">Cập nhật mục tiêu</Text>
          </TouchableOpacity>
        </View>

        {isPedometerAvailable === 'false' && (
          <View className="px-6 mb-10">
            <Text className="text-yellow-500 text-center text-xs">
              Cảm biến đếm bước chân không khả dụng trên thiết bị này.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Goal Update Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#1c1c1c] rounded-t-3xl p-8 border-t border-[#333333]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">Mục tiêu vận động</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-400 mb-4">Nhập lượng calo bạn muốn tiêu thụ mỗi ngày:</Text>
            
            <View className="bg-black/40 rounded-2xl p-4 mb-6 border border-[#333333]">
              <TextInput
                className="text-[#EFFF3B] text-3xl font-bold text-center"
                value={newGoal}
                onChangeText={setNewGoal}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#333"
                autoFocus={true}
              />
              <Text className="text-[#EFFF3B] text-center font-medium mt-1">KCAL</Text>
            </View>

            <TouchableOpacity 
              onPress={handleUpdateGoal}
              disabled={isUpdating}
              className="w-full bg-[#EFFF3B] py-4 rounded-2xl items-center justify-center mb-4"
            >
              {isUpdating ? (
                <ActivityIndicator color="black" />
              ) : (
                <Text className="text-black font-bold text-lg">Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
