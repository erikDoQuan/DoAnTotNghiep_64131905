import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function DashboardScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [currentWeekBase, setCurrentWeekBase] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday of current week
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const today = new Date();

  const bmi = (profile?.height_cm && profile?.weight_kg)
    ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
    : '0.0';

  // Calculate the current week based on currentWeekBase
  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(currentWeekBase);
      day.setDate(currentWeekBase.getDate() + i);
      return {
        day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
        date: day.getDate().toString().padStart(2, '0'),
        fullDate: day.toDateString(),
        active: day.toDateString() === today.toDateString()
      };
    });
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
              <Text className="text-black text-lg font-bold">{profile?.full_name || 'Sajibur Rahman'}</Text>
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
                <Text className="text-black text-2xl font-bold">6</Text>
                <Text className="text-black/60 text-[10px]">days</Text>
              </View>
            </View>
            {/* Simple representation of the progress arc */}
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

        {/* August 2025 Calendar */}
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
                <View key={index} className="items-center px-2">
                  <Text className="text-gray-400 text-xs font-medium mb-2">{item.day}</Text>
                  <View className={`w-10 h-12 rounded-2xl items-center justify-center ${item.active ? 'bg-dashboard-accent-green' : ''}`}>
                    <Text className={`text-base font-bold text-black`}>{item.date}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Meal Sections */}
        <View className="mb-2">
          <View className="bg-white rounded-[24px] p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-black text-base font-bold mb-1">Breakfast</Text>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-md bg-[#FFFBEB] items-center justify-center mr-2">
                    <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                  </View>
                  <Text className="text-gray-500 text-sm font-medium">456 - 512 <Text className="text-gray-400 text-xs">kcal</Text></Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <View className="flex-row -space-x-3 mr-3">
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=100&auto=format&fit=crop' }}
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=100&auto=format&fit=crop' }}
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/add-food', params: { meal: 'Breakfast' } })}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <MaterialCommunityIcons name="plus" size={20} color="black" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-[24px] p-4 mb-8 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-black text-base font-bold mb-1">Lunch time</Text>
                <View className="flex-row items-center">
                  <View className="w-6 h-6 rounded-md bg-[#FFFBEB] items-center justify-center mr-2">
                    <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                  </View>
                  <Text className="text-gray-500 text-sm font-medium">456 - 512 <Text className="text-gray-400 text-xs">kcal</Text></Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <View className="flex-row -space-x-3 mr-3">
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100&auto=format&fit=crop' }}
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=100&auto=format&fit=crop' }}
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/add-food', params: { meal: 'Lunch' } })}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <MaterialCommunityIcons name="plus" size={20} color="black" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Logout for testing */}
          <TouchableOpacity onPress={() => signOut()} className="mb-10 items-center">
            <Text className="text-gray-400 text-xs italic">Logout Account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
