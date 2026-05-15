import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pedometer } from 'expo-sensors';
import { testNotification } from '../../utils/notificationHelper';
import * as Haptics from 'expo-haptics';
import { Alert, ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCelebration from '../../components/ConfettiCelebration';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const generateWaterSchedule = (count: number) => {
  const START = 7, END = 21.5;
  const step  = count > 1 ? (END - START) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => {
    const h = START + i * step;
    return { hour: Math.floor(h), minute: Math.round((h % 1) * 60) };
  });
};

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
  const [sleepDuration, setSleepDuration] = useState<number | null>(null);
  const [showWaterReminder, setShowWaterReminder] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [confirmedGlasses, setConfirmedGlasses] = useState(0);
  const [waterReminderCount, setWaterReminderCount] = useState(8);
  const [waterMlPerGlass, setWaterMlPerGlass] = useState(250);
  const shownRemindersRef = useRef<Set<string>>(new Set());

  // Update current time every minute — needed to trigger WATER_SCHEDULE reminders
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load water settings + confirmed glasses from AsyncStorage
  useEffect(() => {
    const loadWaterData = async () => {
      try {
        const [confirmedRaw, countRaw, mlRaw] = await Promise.all([
          AsyncStorage.getItem('water_confirmed'),
          AsyncStorage.getItem('water_reminder_count'),
          AsyncStorage.getItem('water_ml_per_glass'),
        ]);
        const count = parseInt(countRaw || '8')   || 8;
        const ml    = parseInt(mlRaw   || '250') || 250;
        setWaterReminderCount(count);
        setWaterMlPerGlass(ml);

        const today = new Date().toISOString().split('T')[0];
        if (confirmedRaw) {
          const { date, count: c } = JSON.parse(confirmedRaw);
          if (date === today) setConfirmedGlasses(c);
          else await AsyncStorage.setItem('water_confirmed', JSON.stringify({ date: today, count: 0 }));
        }
      } catch {}
    };
    loadWaterData();
  }, []);

  // Show water reminder popup at each scheduled time (only if enabled in settings)
  useEffect(() => {
    if (confirmedGlasses >= waterReminderCount) return; // already done for today
    const h   = now.getHours();
    const m   = now.getMinutes();
    const key = `${h}:${String(m).padStart(2, '0')}`;
    const schedule    = generateWaterSchedule(waterReminderCount);
    const isScheduled = schedule.some(t => t.hour === h && t.minute === m);
    if (!isScheduled || shownRemindersRef.current.has(key) || showWaterReminder) return;

    AsyncStorage.getItem('water_reminders_enabled').then(val => {
      if (val === 'false') return;
      shownRemindersRef.current.add(key);
      setShowWaterReminder(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    });
  }, [now, waterReminderCount, confirmedGlasses]);

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
    let mounted = true;
    // Holds pedometer total at the moment watchStepCount subscription started,
    // so we can compute: liveTotal = baseSteps + result.steps (incremental)
    let baseStepsForWatch = 0;

    // Reads DB + pedometer snapshot — called once on mount and every 30s
    const pollSteps = async () => {
      if (!mounted) return;
      const isAvailable = await Pedometer.isAvailableAsync();

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
        if (dbData && mounted) {
          setStepsToday(prev => Math.max(prev, dbData.steps));
          setLastSyncedSteps(prev => Math.max(prev, dbData.steps));
        }
      }

      if (isAvailable) {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end   = new Date();
        try {
          const result = await Pedometer.getStepCountAsync(start, end);
          if (result && mounted) setStepsToday(prev => Math.max(prev, result.steps));
        } catch {}
      }
    };

    // Sets up the live subscription once — never recreated
    const setupSubscription = async () => {
      // Explicitly request permission before accessing Core Motion
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted || !mounted) return;

      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      // Snapshot current total so watchStepCount incremental offset is correct
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end   = new Date();
      try {
        const result = await Pedometer.getStepCountAsync(start, end);
        baseStepsForWatch = result?.steps ?? 0;
      } catch {}

      subscription = Pedometer.watchStepCount(result => {
        if (mounted) setStepsToday(prev => Math.max(prev, baseStepsForWatch + result.steps));
      });
    };

    pollSteps();
    setupSubscription();
    const stepInterval = setInterval(pollSteps, 30000);

    return () => {
      mounted = false;
      subscription?.remove();
      clearInterval(stepInterval);
    };
  }, [user]);

  // Trigger sync in Dashboard
  useEffect(() => {
    if (stepsToday > lastSyncedSteps + 5) {
      syncStepData(stepsToday);
    }
  }, [stepsToday, lastSyncedSteps, syncStepData]);

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

  const deleteMealItem = useCallback(async (mealId: number) => {
    try {
      await supabase.from('meals').delete().eq('id', mealId);
      setMeals(prev => prev.filter(m => m.id !== mealId));
    } catch {
      Alert.alert('Lỗi', 'Không thể xoá món ăn.');
    }
  }, []);

  const fetchTodaySleep = useCallback(async () => {
    if (!user) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from('sleep_records')
      .select('sleep_duration')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSleepDuration(data?.sleep_duration ?? null);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchMealsForDate(selectedDate);
      fetchTodaySleep();
    }, [fetchMealsForDate, selectedDate, fetchTodaySleep])
  );

  const today = new Date();

  const bmi = (profile?.height_cm && profile?.weight_kg)
    ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
    : '0.0';

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
  const currentMonthYear = currentWeekBase.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

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
              className="w-12 h-12 rounded-full bg-dashboard-accent-green mr-3 shadow-sm border-2 border-white items-center justify-center"
            >
              <Text className="text-black text-lg font-bold">
                {(profile?.full_name || 'U')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </TouchableOpacity>
            <View>
              <Text className="text-gray-400 text-xs font-medium">
                {now.getHours() < 12 ? 'Chào buổi sáng! ☀️' : now.getHours() < 18 ? 'Chào buổi chiều! 🌤️' : 'Chào buổi tối! 🌙'}
              </Text>
              <Text className="text-black text-lg font-bold">{profile?.full_name || 'Người dùng'}</Text>
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
              <Text className="text-black text-xs font-medium">Calo hôm nay</Text>
            </View>
            <Text className="text-black text-[24px] font-bold leading-tight">Tiến độ{"\n"}tuần này</Text>
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
              <Text className="text-black text-sm font-semibold">Bước{"\n"}chân</Text>
              <View className="w-10 h-10 rounded-full bg-dashboard-accent-orange/10 items-center justify-center">
                <MaterialCommunityIcons name="walk" size={20} color="#FF914D" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">{stepsToday.toLocaleString()}</Text>
              <Text className="text-text-secondary text-xs ml-1 font-medium">bước</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (confirmedGlasses >= waterReminderCount) return;
              setShowWaterReminder(true);
            }}
            className="w-[48%] bg-dashboard-card rounded-2xl p-4 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Uống{"\n"}nước</Text>
              <View className="w-10 h-10 rounded-full bg-dashboard-accent-blue/10 items-center justify-center">
                <MaterialCommunityIcons name="water" size={20} color="#38BDF8" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">
                {confirmedGlasses * waterMlPerGlass}
              </Text>
              <Text className="text-text-secondary text-xs ml-1 font-medium">
                / {waterReminderCount * waterMlPerGlass}ml
              </Text>
            </View>
            <Text className="text-text-muted text-[10px] mt-1">
              {confirmedGlasses}/{waterReminderCount} lần
            </Text>
          </TouchableOpacity>
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
              <Text className="text-black text-sm font-semibold">Chỉ số{"\n"}BMI</Text>
              <View className="w-10 h-10 rounded-full bg-status-success/10 items-center justify-center">
                <MaterialCommunityIcons name="scale-bathroom" size={20} color="#4ADE80" />
              </View>
            </View>
            <View>
              <Text className="text-black text-xl font-bold">{bmi}</Text>
              <Text className="text-text-secondary text-[10px] font-medium mt-1" numberOfLines={1}>{bmiStatus}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/sleep-details')}
            className="w-[48%] bg-dashboard-card rounded-2xl p-4 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Giấc{"\n"}ngủ</Text>
              <View className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 items-center justify-center">
                <MaterialCommunityIcons name="moon-waning-crescent" size={20} color="#8B5CF6" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">
                {sleepDuration != null
                  ? `${Math.floor(sleepDuration)}h ${Math.round((sleepDuration - Math.floor(sleepDuration)) * 60)}m`
                  : '--'}
              </Text>
              <Text className="text-text-secondary text-xs ml-1 font-medium">
                {sleepDuration != null ? 'hôm nay' : 'chạm để ghi'}
              </Text>
            </View>
          </TouchableOpacity>
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
          {(
            [
              { key: 'breakfast', label: 'Bữa sáng', param: 'Breakfast', summary: breakfastSummary },
              { key: 'lunch',     label: 'Bữa trưa', param: 'Lunch',     summary: lunchSummary    },
              { key: 'dinner',    label: 'Bữa tối',  param: 'Dinner',    summary: dinnerSummary   },
            ] as const
          ).map(({ key, label, param, summary }) => (
            <View key={key} className="bg-dashboard-card rounded-2xl p-4 mb-3 shadow-sm">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-black text-base font-bold mb-1">{label}</Text>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-md bg-dashboard-accent-orange/10 items-center justify-center mr-2">
                      <MaterialCommunityIcons name="fire" size={14} color="#FF914D" />
                    </View>
                    <Text className="text-text-secondary text-sm font-medium">
                      {isLoadingMeals ? '...' : summary.calories}{' '}
                      <Text className="text-text-muted text-xs">kcal</Text>
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-2 px-1">
                    <Text className="text-text-muted text-[10px] mr-3">Béo: {summary.fat}g</Text>
                    <Text className="text-text-muted text-[10px] mr-3">Tinh bột: {summary.carbs}g</Text>
                    <Text className="text-text-muted text-[10px]">Đạm: {summary.protein}g</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/add-food', params: { meal: param, date: selectedDate.toISOString() } })}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <MaterialCommunityIcons name="plus" size={20} color="black" />
                </TouchableOpacity>
              </View>

              {summary.items.length > 0 && (
                <View className="border-t border-gray-100 pt-2 mt-1">
                  {summary.items.map(item => (
                    <View key={item.id} className="flex-row justify-between items-center py-1.5">
                      <Text className="text-black text-xs flex-1 mr-2" numberOfLines={1}>
                        {item.foods?.food_name || 'Món ăn'}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-text-secondary text-xs mr-2">
                          {Number(item.calories).toFixed(0)} kcal
                        </Text>
                        <TouchableOpacity onPress={() => deleteMealItem(item.id)}>
                          <MaterialCommunityIcons name="close-circle-outline" size={18} color="#F87171" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <View className="mb-10" />
        </View>

      </ScrollView>

      {/* ── Popup nhắc uống nước ── */}
      <Modal transparent animationType="fade" visible={showWaterReminder}>
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="w-full rounded-3xl p-6" style={{ backgroundColor: '#fff' }}>
            {/* Icon */}
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center">
                <Text style={{ fontSize: 44 }}>💧</Text>
              </View>
            </View>

            <Text className="text-black text-xl font-bold text-center mb-2">
              Đến giờ uống nước rồi!
            </Text>

            {/* Progress */}
            <View className="items-center mb-3">
              <Text className="text-gray-500 text-sm">
                Hôm nay bạn đã uống{' '}
                <Text className="text-blue-500 font-bold">
                  {confirmedGlasses * waterMlPerGlass}ml
                </Text>
                {' '}({confirmedGlasses}/{waterReminderCount} lần)
              </Text>
            </View>

            {/* Progress bar */}
            <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <View
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${Math.min((confirmedGlasses / waterReminderCount) * 100, 100)}%` }}
              />
            </View>

            {/* 2L warning if total < 2000 */}
            {waterReminderCount * waterMlPerGlass < 2000 && (
              <Text className="text-orange-400 text-[10px] text-center mb-3">
                ⚠️ Tổng cài đặt chỉ {waterReminderCount * waterMlPerGlass}ml — chưa đủ 2L/ngày. Điều chỉnh trong Cài đặt.
              </Text>
            )}

            <Text className="text-gray-400 text-xs text-center leading-5 mb-5">
              Mỗi lần {waterMlPerGlass}ml — mục tiêu{' '}
              <Text className="text-blue-500 font-semibold">{waterReminderCount * waterMlPerGlass}ml hôm nay</Text>.{'\n'}
              Uống đủ nước giúp trao đổi chất tốt và duy trì năng lượng!
            </Text>

            <TouchableOpacity
              onPress={async () => {
                const newCount = Math.min(confirmedGlasses + 1, waterReminderCount);
                setConfirmedGlasses(newCount);
                setShowWaterReminder(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                try {
                  const today = new Date().toISOString().split('T')[0];
                  await AsyncStorage.setItem('water_confirmed', JSON.stringify({ date: today, count: newCount }));
                } catch {}

                // Celebrate khi vừa đạt đủ số lần (chỉ lần đầu)
                if (newCount === waterReminderCount && confirmedGlasses < waterReminderCount) {
                  setShowCelebration(true);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setTimeout(() => setShowCelebration(false), 5000);
                }
              }}
              className="py-3.5 rounded-2xl items-center"
              style={{ backgroundColor: '#38BDF8' }}
            >
              <Text className="text-white font-bold text-base">Đã uống rồi 👍</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowWaterReminder(false)}
              className="py-3 items-center mt-2"
            >
              <Text className="text-gray-400 text-sm">Bỏ qua</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Popup chúc mừng đủ 2L ── */}
      <Modal transparent animationType="fade" visible={showCelebration}>
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <ConfettiCelebration visible={showCelebration} />
          <View className="w-full rounded-3xl p-6 items-center" style={{ backgroundColor: '#1c1c1c' }}>
            <Text style={{ fontSize: 64, marginBottom: 8 }}>🎉</Text>

            <Text className="text-white text-2xl font-black text-center mb-2">
              Chúc mừng!
            </Text>
            <Text className="text-brand-primary text-base font-bold text-center mb-3">
              {waterReminderCount * waterMlPerGlass >= 2000
                ? 'Bạn đã hoàn thành 2 lít nước hôm nay!'
                : `Bạn đã uống đủ ${waterReminderCount * waterMlPerGlass}ml hôm nay!`}
            </Text>
            <Text className="text-gray-400 text-sm text-center leading-5 mb-6">
              Uống đủ nước mỗi ngày giúp cơ thể khoẻ mạnh,{'\n'}
              da dẻ sáng khoẻ và tinh thần minh mẫn. 💪
            </Text>

            {/* X/X pill */}
            <View className="flex-row items-center bg-white/10 px-5 py-2.5 rounded-full mb-6">
              <Text style={{ fontSize: 20 }}>💧</Text>
              <Text className="text-white font-bold text-lg ml-2">
                {waterReminderCount} / {waterReminderCount} lần
              </Text>
              <Text className="text-brand-primary ml-2 text-lg">✓</Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowCelebration(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              className="w-full py-4 rounded-2xl items-center bg-brand-primary"
            >
              <Text className="text-black font-black text-base">Tuyệt vời! ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
