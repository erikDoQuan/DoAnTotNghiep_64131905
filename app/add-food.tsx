import { supabase } from '@/supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface FoodItem {
  id: number;
  food_name: string;
  calories_kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  unit_base: string;
}

export default function AddFoodScreen() {
  const router = useRouter();
  const { meal = 'Breakfast' } = useLocalSearchParams<{ meal: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('FOOD');

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const searchFoods = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFoods([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .ilike('food_name', `%${query}%`)
        .limit(20);

      if (error) throw error;
      setFoods(data || []);
    } catch (error) {
      console.error('Error searching foods:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchFoods(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFoods]);

  return (
    <SafeAreaView className="flex-1 bg-dashboard-bg">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-1">
          <TouchableOpacity className="flex-row items-center">
            <Text className="text-black text-2xl font-bold mr-1">{meal}</Text>
            <MaterialCommunityIcons name="menu-down" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-green-500 text-lg font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-gray-400 text-sm font-medium">{dateString}</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mt-4 border-b border-gray-100">
        {['COOK BOOK', 'FOOD', 'RECENTLY EATEN'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="flex-1 items-center py-4 relative"
          >
            <Text className={`text-[11px] font-bold tracking-wider ${activeTab === tab ? 'text-black' : 'text-gray-300'}`}>
              {tab}
            </Text>
            {activeTab === tab && (
              <View className="absolute bottom-0 w-2 h-1 bg-black rounded-t-full" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View className="px-6 py-4">
        <View className="flex-row items-center bg-white border border-gray-100 rounded-full px-4 py-3 shadow-sm">
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search for Food"
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-black text-base"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {isLoading && <ActivityIndicator size="small" color="#98E332" />}
        </View>
      </View>

      {/* Food List */}
      <ScrollView className="flex-1 px-6">
        {foods.length > 0 ? (
          foods.map((food) => (
            <TouchableOpacity
              key={food.id}
              onPress={() => router.push({
                pathname: '/food-detail',
                params: {
                  food: JSON.stringify(food)
                }
              })}
              className="flex-row items-center py-5 border-b border-gray-50"
            >
              <View className="flex-1">
                <Text className="text-black text-base font-medium">{food.food_name}</Text>
                <View className="flex-row items-center mt-1">
                  <Text className="text-green-800 text-xs font-bold mr-1">{food.unit_base || '100g'}</Text>
                  <Text className="text-gray-400 text-xs">
                    {food.calories_kcal} kcal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="arrow-top-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))
        ) : searchQuery.trim() && !isLoading ? (
          <View className="items-center mt-10">
            <Text className="text-gray-400 italic">No foods found</Text>
          </View>
        ) : !searchQuery.trim() ? (
          <View className="items-center mt-10">
            <Text className="text-gray-400 italic">Search for your favorite food</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
