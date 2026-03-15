import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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

export default function DashboardScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
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

  return (
    <SafeAreaView className="flex-1 bg-dashboard-bg">
      <StatusBar style="dark" />
      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.push('/profile')}
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
            <TouchableOpacity className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-sm mr-2">
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="black" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-sm relative">
              <MaterialCommunityIcons name="bell-outline" size={20} color="black" />
              <View className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
            </TouchableOpacity>
          </View>
        </View>


        {/* Weekly Progress Card */}
        <TouchableOpacity className="bg-dashboard-accent-green rounded-[32px] p-6 mb-4 flex-row justify-between items-center">
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
          <View className="w-[48%] bg-white rounded-[24px] p-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Step to{"\n"}walk</Text>
              <View className="w-10 h-10 rounded-full bg-[#FFF1E6] items-center justify-center">
                <MaterialCommunityIcons name="walk" size={20} color="#FF914D" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">5,500</Text>
              <Text className="text-gray-400 text-xs ml-1 font-medium">steps</Text>
            </View>
          </View>

          <View className="w-[48%] bg-white rounded-[24px] p-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Drink{"\n"}Water</Text>
              <View className="w-10 h-10 rounded-full bg-[#E0F2FE] items-center justify-center">
                <MaterialCommunityIcons name="water" size={20} color="#38BDF8" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">12</Text>
              <Text className="text-gray-400 text-xs ml-1 font-medium">glass</Text>
            </View>
          </View>
        </View>

        {/* Second Row of Status Grid */}
        <View className="flex-row justify-between mb-6">
          <View className="w-[48%] bg-white rounded-[24px] p-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Current{"\n"}BMI</Text>
              <View className="w-10 h-10 rounded-full bg-[#F0FDF4] items-center justify-center">
                <MaterialCommunityIcons name="scale-bathroom" size={20} color="#4ADE80" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">{bmi}</Text>
              <Text className="text-gray-400 text-xs ml-1 font-medium">score</Text>
            </View>
          </View>

          <View
            className="w-[48%] bg-white rounded-[24px] p-4 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black text-sm font-semibold">Sleep{"\n"}Time</Text>
              <View className="w-10 h-10 rounded-full bg-[#F5F3FF] items-center justify-center">
                <MaterialCommunityIcons name="sleep" size={20} color="#8B5CF6" />
              </View>
            </View>
            <View className="flex-row items-baseline">
              <Text className="text-black text-xl font-bold">7h 35m</Text>
              <Text className="text-gray-400 text-xs ml-1 font-medium">total</Text>
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
          <View className="bg-white rounded-[24px] py-4 shadow-sm overflow-hidden">
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
                  <Text className={`text-xs font-medium mb-2 ${item.isToday ? 'text-dashboard-accent-green' : 'text-gray-400'}`}>
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
            <Text className="text-gray-500 text-[10px] mb-1">Fat</Text>
            <Text className="text-black font-bold">{(totalFatToday || 0).toFixed(1)}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-[10px] mb-1">Carbs</Text>
            <Text className="text-black font-bold">{(totalCarbsToday || 0).toFixed(1)}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-[10px] mb-1">Prot</Text>
            <Text className="text-black font-bold">{(totalProteinToday || 0).toFixed(1)}</Text>
          </View>
          <View className="items-center border-l border-gray-200 pl-4">
            <Text className="text-gray-500 text-[10px] mb-1">Calories</Text>
            <Text className="text-black text-xl font-black">{(totalCaloriesToday || 0).toFixed(0)}</Text>
          </View>
        </View>

        {/* Meal Sections */}
        <View className="mb-2">
          {/* Breakfast */}
          <View className="bg-white rounded-[24px] p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-black text-base font-bold mb-1">Breakfast</Text>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-md bg-[#FFFBEB] items-center justify-center mr-2">
                    <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                  </View>
                  <Text className="text-gray-500 text-sm font-medium">
                    {isLoadingMeals ? '...' : breakfastSummary.calories} <Text className="text-gray-400 text-xs">kcal</Text>
                  </Text>
                </View>
                <View className="flex-row items-center mt-2 px-1">
                  <Text className="text-gray-400 text-[10px] mr-3">Fat: {breakfastSummary.fat}g</Text>
                  <Text className="text-gray-400 text-[10px] mr-3">Carbs: {breakfastSummary.carbs}g</Text>
                  <Text className="text-gray-400 text-[10px]">Prot: {breakfastSummary.protein}g</Text>
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
          <View className="bg-white rounded-[24px] p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-black text-base font-bold mb-1">Lunch time</Text>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-md bg-[#FFFBEB] items-center justify-center mr-2">
                    <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                  </View>
                  <Text className="text-gray-500 text-sm font-medium">
                    {isLoadingMeals ? '...' : lunchSummary.calories} <Text className="text-gray-400 text-xs">kcal</Text>
                  </Text>
                </View>
                <View className="flex-row items-center mt-2 px-1">
                  <Text className="text-gray-400 text-[10px] mr-3">Fat: {lunchSummary.fat}g</Text>
                  <Text className="text-gray-400 text-[10px] mr-3">Carbs: {lunchSummary.carbs}g</Text>
                  <Text className="text-gray-400 text-[10px]">Prot: {lunchSummary.protein}g</Text>
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
          <View className="bg-white rounded-[24px] p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-black text-base font-bold mb-1">Dinner</Text>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-md bg-[#FFFBEB] items-center justify-center mr-2">
                    <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                  </View>
                  <Text className="text-gray-500 text-sm font-medium">
                    {isLoadingMeals ? '...' : dinnerSummary.calories} <Text className="text-gray-400 text-xs">kcal</Text>
                  </Text>
                </View>
                <View className="flex-row items-center mt-2 px-1">
                  <Text className="text-gray-400 text-[10px] mr-3">Fat: {dinnerSummary.fat}g</Text>
                  <Text className="text-gray-400 text-[10px] mr-3">Carbs: {dinnerSummary.carbs}g</Text>
                  <Text className="text-gray-400 text-[10px]">Prot: {dinnerSummary.protein}g</Text>
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
