import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pedometer } from 'expo-sensors';
import { testNotification } from '../../utils/notificationHelper';
import { Alert, ActivityIndicator, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MealRecord {
  id: number;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food_id: number;
  portion_grams: number;
  created_at: string;
  foods?: {
    food_name: string;
    unit_base: string;
  };
}

const WATER_SCHEDULE = [
  { hour: 7, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 11, minute: 30 },
  { hour: 13, minute: 30 },
  { hour: 15, minute: 50 },
  { hour: 17, minute: 30 },
  { hour: 19, minute: 30 },
  { hour: 21, minute: 30 },
];

export default function DashboardScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stepsToday, setStepsToday] = useState(0);
  const [lastSyncedSteps, setLastSyncedSteps] = useState(0);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);

  // Update current time every minute to refresh water intake
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const syncStepData = useCallback(async (steps: number) => {
    if (!user || steps <= lastSyncedSteps) return;
    
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Data calculations
      const height = profile?.height_cm || 170;
      const weight = profile?.weight_kg || 70;
      const gender = profile?.gender?.toLowerCase() || 'male';
      const stepLengthCm = gender === 'male' ? height * 0.415 : height * 0.413;
      const distanceKm = (steps * stepLengthCm) / 100000;
      const caloriesBurned = weight * distanceKm * 0.75;

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
            steps: steps,
            distance_km: parseFloat(distanceKm.toFixed(2)),
            calories_burned: Math.round(caloriesBurned),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('step_records')
          .insert({
            user_id: user.id,
            steps: steps,
            distance_km: parseFloat(distanceKm.toFixed(2)),
            calories_burned: Math.round(caloriesBurned),
            created_at: new Date().toISOString()
          });
      }
      setLastSyncedSteps(steps);
    } catch (e) {
      console.error('Dashboard: Sync error:', e);
    }
  }, [user, profile, lastSyncedSteps]);

  // Sync steps in real-time
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const subscribeSteps = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (isAvailable) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        
        try {
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
              setStepsToday(dbData.steps);
              setLastSyncedSteps(dbData.steps);
            }
          }

          const pastResult = await Pedometer.getStepCountAsync(start, end);
          if (pastResult) {
            setStepsToday(prev => Math.max(prev, pastResult.steps));
          }
        } catch (e) {
          console.error('Error getting past steps:', e);
        }

        subscription = Pedometer.watchStepCount((result) => {
          // Re-fetch total when count changes significantly
          // For Dashboard we mostly rely on the interval and initial fetch
        });
      }
    };

    subscribeSteps();
    const stepInterval = setInterval(subscribeSteps, 30000);

    return () => {
      if (subscription) subscription.remove();
      clearInterval(stepInterval);
    };
  }, [user]);

  // Trigger sync in Dashboard
  useEffect(() => {
    if (stepsToday > lastSyncedSteps + 0) {
      syncStepData(stepsToday);
    }
  }, [stepsToday, lastSyncedSteps, syncStepData]);

  const calculateWaterIntake = () => {
    const todayMoment = new Date();
    todayMoment.setHours(0, 0, 0, 0);
    
    const selectedMoment = new Date(selectedDate);
    selectedMoment.setHours(0, 0, 0, 0);
    
    if (selectedMoment.getTime() < todayMoment.getTime()) return 8; 
    if (selectedMoment.getTime() > todayMoment.getTime()) return 0;

    // Ngày hiện tại: tính theo giờ thực tế
    const currentTime = now.getHours() * 60 + now.getMinutes();
    return WATER_SCHEDULE.filter(t => (t.hour * 60 + t.minute) <= currentTime).length;
  };
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [currentWeekBase, setCurrentWeekBase] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday of current week
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchMealsForDate = useCallback(async (date: Date) => {
    if (!user) return;
    
    setIsLoadingMeals(true);
    try {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate);
      nextDay.setDate(searchDate.getDate() + 1);

      const { data, error } = await supabase
        .from('meals')
        .select('*, foods(food_name, unit_base)')
        .eq('user_id', user.id)
        .gte('created_at', searchDate.toISOString())
        .lt('created_at', nextDay.toISOString());

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setIsLoadingMeals(false);
    }
  }, [user]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMealsForDate(selectedDate);
    }, [fetchMealsForDate, selectedDate])
  );

  const today = new Date();

  const bmi = (profile?.height_cm && profile?.weight_kg)
    ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
    : '0.0';

  const getBMIStatus = (bmiValue: number) => {
    if (bmiValue === 0) return 'No Data';
    if (bmiValue < 16) return 'Severe Thinness (Grade III)';
    if (bmiValue < 17) return 'Moderate Thinness (Grade II)';
    if (bmiValue < 18.5) return 'Mild Thinness (Grade I)';
    if (bmiValue < 25) return 'Normal Weight';
    if (bmiValue < 30) return 'Overweight';
    if (bmiValue < 35) return 'Obesity Class I';
    if (bmiValue < 40) return 'Obesity Class II';
    return 'Obesity Class III';
  };

  const bmiStatus = getBMIStatus(Number(bmi));

  // Group meals and calculate totals
  const getMealSummary = (type: string) => {
    const typeMeals = meals.filter(m => m.meal_type === type.toLowerCase());
    const totals = typeMeals.reduce((acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      items: typeMeals,
      calories: totals.calories.toFixed(0),
      protein: totals.protein.toFixed(1),
      carbs: totals.carbs.toFixed(1),
      fat: totals.fat.toFixed(1)
    };
  };

  const breakfastSummary = getMealSummary('breakfast');
  const lunchSummary = getMealSummary('lunch');
  const dinnerSummary = getMealSummary('dinner');

  const totalCaloriesToday = (meals || []).reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const totalFatToday = (meals || []).reduce((sum, m) => sum + (Number(m.fat) || 0), 0);
  const totalCarbsToday = (meals || []).reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
  const totalProteinToday = (meals || []).reduce((sum, m) => sum + (Number(m.protein) || 0), 0);

  // Calculate the current week based on currentWeekBase
  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(currentWeekBase);
      day.setDate(currentWeekBase.getDate() + i);
      return {
        day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
        date: day.getDate().toString().padStart(2, '0'),
        fullDate: day.toDateString(),
        active: day.toDateString() === selectedDate.toDateString(),
        isToday: day.toDateString() === today.toDateString()
      };
    });
  };

  const handleDateSelect = (dateStr: string) => {
    const newDate = new Date(dateStr);
    setSelectedDate(newDate);
  };

  const weekDays = getWeekDays();
  const currentMonthYear = currentWeekBase.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevWeek = () => {
    const newBase = new Date(currentWeekBase);
    newBase.setDate(newBase.getDate() - 7);
    setCurrentWeekBase(newBase);
  };

  const handleNextWeek = () => {
    const newBase = new Date(currentWeekBase);
    newBase.setDate(newBase.getDate() + 7);
    setCurrentWeekBase(newBase);
  };

  if (!isMounted) {
    return (
      <View className="flex-1 bg-dashboard-bg items-center justify-center">
        <ActivityIndicator color="#98E332" />
      </View>
    );
  }

  const handleAvatarPress = () => {
    setIsAvatarModalVisible(true);
  };

  const handleLogout = async () => {
    setIsAvatarModalVisible(false);
    await signOut();
    router.replace('/auth/auth_screen');
  };

  const handleViewProfile = () => {
    setIsAvatarModalVisible(false);
    router.push('/profile');
  };

  return (
    <SafeAreaView className="flex-1 bg-dashboard-bg">
      <StatusBar style="dark" />
      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleAvatarPress}
              className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-3 shadow-sm border-2 border-white"
            >
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?u=sajibur' }}
                className="w-full h-full"
              />
            </TouchableOpacity>
            <View>
              <Text className="text-gray-400 text-xs font-medium">Good morning!</Text>
              <Text className="text-black text-lg font-bold">{profile?.full_name || 'User'}</Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => testNotification()}
              className="w-10 h-10 rounded-xl bg-status-info/10 items-center justify-center shadow-sm mr-2"
            >
              <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#38BDF8" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 rounded-xl bg-dashboard-card items-center justify-center shadow-sm mr-2">
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="black" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 rounded-xl bg-dashboard-card items-center justify-center shadow-sm relative">
              <MaterialCommunityIcons name="bell-outline" size={20} color="black" />
              <View className="absolute top-2 right-2 w-2 h-2 bg-status-success rounded-full border-2 border-white" />
            </TouchableOpacity>
          </View>
        </View>


        {/* Weekly Progress Card */}
        <TouchableOpacity className="bg-dashboard-accent-green rounded-3xl p-6 mb-4 flex-row justify-between items-center">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-white/40 items-center justify-center mr-2">
                <MaterialCommunityIcons name="flash" size={14} color="black" />
              </View>
              <Text className="text-black text-xs font-medium">Daily intake</Text>
            </View>
            <Text className="text-black text-[24px] font-bold leading-tight">Your Weekly{"\n"}Progress</Text>
          </View>

          <View className="relative items-center justify-center">
            <View className="w-24 h-24 rounded-full border-[8px] border-white/30 items-center justify-center">
              <View className="items-center">
                <Text className="text-black text-2xl font-bold">{(totalCaloriesToday || 0).toFixed(0)}</Text>
                <Text className="text-black/60 text-[10px]">kcal</Text>
              </View>
            </View>
            <View className="absolute w-24 h-24 rounded-full border-[8px] border-transparent border-t-dashboard-accent-progress border-r-dashboard-accent-progress rotate-[45deg]" />
          </View>
        </TouchableOpacity>

        {/* Status Grid */}
        <View className="flex-row justify-between mb-6">
          <TouchableOpacity 
            onPress={() => router.push('/steps-details')}
            className="w-[48%] bg-dashboard-card rounded-2xl p-4 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Step to{"\n"}walk</Text>
              <View className="w-10 h-10 rounded-full bg-dashboard-accent-orange/10 items-center justify-center">
                <MaterialCommunityIcons name="walk" size={20} color="#FF914D" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">{stepsToday.toLocaleString()}</Text>
              <Text className="text-text-secondary text-xs ml-1 font-medium">steps</Text>
            </View>
          </TouchableOpacity>

          <View className="w-[48%] bg-dashboard-card rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Drink{"\n"}Water</Text>
              <View className="w-10 h-10 rounded-full bg-dashboard-accent-blue/10 items-center justify-center">
                <MaterialCommunityIcons name="water" size={20} color="#38BDF8" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">{calculateWaterIntake()}/8</Text>
              <Text className="text-text-secondary text-xs ml-1 font-medium">glass</Text>
            </View>
          </View>
        </View>

        {/* Avatar Options Modal */}
        <Modal
          visible={isAvatarModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsAvatarModalVisible(false)}
        >
          <TouchableOpacity 
            className="flex-1 bg-black/60 justify-end"
            activeOpacity={1}
            onPress={() => setIsAvatarModalVisible(false)}
          >
            <View className="bg-brand-tertiary rounded-t-3xl p-6 pb-12 border-t border-white/5">
              <View className="w-12 h-1 bg-white/10 rounded-full self-center mb-6" />
              
              <Text className="text-white text-xl font-bold mb-6 px-2">Tài khoản</Text>

              <TouchableOpacity 
                onPress={handleViewProfile}
                className="flex-row items-center bg-white/5 p-4 rounded-2xl mb-3"
              >
                <View className="w-10 h-10 rounded-full bg-brand-primary/10 items-center justify-center mr-4">
                  <MaterialCommunityIcons name="account-circle-outline" size={24} color="#EFFF3B" />
                </View>
                <Text className="text-white text-lg font-medium">Xem hồ sơ</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666" className="ml-auto" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleLogout}
                className="flex-row items-center bg-status-danger/10 p-4 rounded-2xl"
              >
                <View className="w-10 h-10 rounded-full bg-status-danger/20 items-center justify-center mr-4">
                  <MaterialCommunityIcons name="logout" size={22} color="#F87171" />
                </View>
                <Text className="text-status-danger text-lg font-medium">Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Second Row of Status Grid */}
        <View className="flex-row justify-between mb-6">
          <TouchableOpacity 
            onPress={() => router.push('/weight-details')}
            className="w-[48%] bg-dashboard-card rounded-2xl p-4 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Current{"\n"}BMI</Text>
              <View className="w-10 h-10 rounded-full bg-status-success/10 items-center justify-center">
                <MaterialCommunityIcons name="scale-bathroom" size={20} color="#4ADE80" />
              </View>
            </View>
            <View>
              <Text className="text-black text-xl font-bold">{bmi}</Text>
              <Text className="text-text-secondary text-[10px] font-medium mt-1" numberOfLines={1}>{bmiStatus}</Text>
            </View>
          </TouchableOpacity>

          <View
            className="w-[48%] bg-dashboard-card rounded-2xl p-4 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Sleep{"\n"}Time</Text>
              <View className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 items-center justify-center">
                <MaterialCommunityIcons name="sleep" size={20} color="#8B5CF6" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">7h 35m</Text>
              <Text className="text-text-secondary text-xs ml-1 font-medium">total</Text>
            </View>
          </View>
        </View>

        {/* Calendar Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4 px-1">
            <Text className="text-black text-lg font-bold">{currentMonthYear}</Text>
            <View className="flex-row">
              <TouchableOpacity
                onPress={handlePrevWeek}
                className="w-8 h-8 items-center justify-center"
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color="#D1D5DB" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextWeek}
                className="w-8 h-8 items-center justify-center"
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          </View>
          <View className="bg-dashboard-card rounded-2xl py-4 shadow-sm overflow-hidden">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 8, justifyContent: 'space-between', flexGrow: 1 }}
            >
              {weekDays.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => handleDateSelect(item.fullDate)}
                  className="items-center px-2"
                >
                  <Text className={`text-xs font-medium mb-2 ${item.isToday ? 'text-dashboard-accent-green' : 'text-text-secondary'}`}>
                    {item.day}
                  </Text>
                  <View className={`w-10 h-12 rounded-2xl items-center justify-center ${item.active ? 'bg-dashboard-accent-green' : ''}`}>
                    <Text className={`text-base font-bold ${item.active ? 'text-black' : 'text-gray-600'}`}>
                      {item.date}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Nutritional Summary Row (Daily Totals) */}
        <View className="flex-row justify-between items-center bg-white/10 rounded-2xl py-4 px-6 mb-6 border border-gray-100/50" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
          <View className="items-center">
            <Text className="text-text-secondary text-[10px] mb-1">Fat</Text>
            <Text className="text-black font-bold">{(totalFatToday || 0).toFixed(1)}</Text>
          </View>
          <View className="items-center">
            <Text className="text-text-secondary text-[10px] mb-1">Carbs</Text>
            <Text className="text-black font-bold">{(totalCarbsToday || 0).toFixed(1)}</Text>
          </View>
          <View className="items-center">
            <Text className="text-text-secondary text-[10px] mb-1">Prot</Text>
            <Text className="text-black font-bold">{(totalProteinToday || 0).toFixed(1)}</Text>
          </View>
          <View className="items-center border-l border-gray-200 pl-4">
            <Text className="text-text-secondary text-[10px] mb-1">Calories</Text>
            <Text className="text-black text-xl font-black">{(totalCaloriesToday || 0).toFixed(0)}</Text>
          </View>
        </View>

        {/* Meal Sections */}
        <View className="mb-2">
          {/* Breakfast */}
          <View className="bg-dashboard-card rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-black text-base font-bold mb-1">Breakfast</Text>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-md bg-dashboard-accent-orange/10 items-center justify-center mr-2">
                    <MaterialCommunityIcons name="fire" size={14} color="#FF914D" />
                  </View>
                  <Text className="text-text-secondary text-sm font-medium">
                    {isLoadingMeals ? '...' : breakfastSummary.calories} <Text className="text-text-muted text-xs">kcal</Text>
                  </Text>
                </View>
                <View className="flex-row items-center mt-2 px-1">
                  <Text className="text-text-muted text-[10px] mr-3">Fat: {breakfastSummary.fat}g</Text>
                  <Text className="text-text-muted text-[10px] mr-3">Carbs: {breakfastSummary.carbs}g</Text>
                  <Text className="text-text-muted text-[10px]">Prot: {breakfastSummary.protein}g</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/add-food', params: { meal: 'Breakfast' } })}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <MaterialCommunityIcons name="plus" size={20} color="black" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Lunch */}
          <View className="bg-dashboard-card rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-black text-base font-bold mb-1">Lunch time</Text>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-md bg-dashboard-accent-orange/10 items-center justify-center mr-2">
                    <MaterialCommunityIcons name="fire" size={14} color="#FF914D" />
                  </View>
                  <Text className="text-text-secondary text-sm font-medium">
                    {isLoadingMeals ? '...' : lunchSummary.calories} <Text className="text-text-muted text-xs">kcal</Text>
                  </Text>
                </View>
                <View className="flex-row items-center mt-2 px-1">
                  <Text className="text-text-muted text-[10px] mr-3">Fat: {lunchSummary.fat}g</Text>
                  <Text className="text-text-muted text-[10px] mr-3">Carbs: {lunchSummary.carbs}g</Text>
                  <Text className="text-text-muted text-[10px]">Prot: {lunchSummary.protein}g</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/add-food', params: { meal: 'Lunch' } })}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <MaterialCommunityIcons name="plus" size={20} color="black" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Dinner */}
          <View className="bg-dashboard-card rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-black text-base font-bold mb-1">Dinner</Text>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-md bg-dashboard-accent-orange/10 items-center justify-center mr-2">
                    <MaterialCommunityIcons name="fire" size={14} color="#FF914D" />
                  </View>
                  <Text className="text-text-secondary text-sm font-medium">
                    {isLoadingMeals ? '...' : dinnerSummary.calories} <Text className="text-text-muted text-xs">kcal</Text>
                  </Text>
                </View>
                <View className="flex-row items-center mt-2 px-1">
                  <Text className="text-text-muted text-[10px] mr-3">Fat: {dinnerSummary.fat}g</Text>
                  <Text className="text-text-muted text-[10px] mr-3">Carbs: {dinnerSummary.carbs}g</Text>
                  <Text className="text-text-muted text-[10px]">Prot: {dinnerSummary.protein}g</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/add-food', params: { meal: 'Dinner' } })}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <MaterialCommunityIcons name="plus" size={20} color="black" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Logout for testing */}
          <TouchableOpacity onPress={() => signOut()} className="mt-6 mb-10 items-center">
            <Text className="text-gray-400 text-xs italic">Logout Account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
