import { FOOD_CATEGORIES } from '@/constants/categories';
import { supabase } from '@/supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

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
  const { meal = 'Breakfast', date } = useLocalSearchParams<{ meal: string; date?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('THỰC PHẨM');
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const { user } = useAuth();
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);

  const fetchRecentFoods = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('meals')
        .select('food_id, foods(id, food_name, calories_kcal, protein, carbs, fat, unit_base)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40);
      const seen = new Set<number>();
      const unique: FoodItem[] = [];
      (data || []).forEach((m: any) => {
        if (m.foods && !seen.has(m.food_id)) {
          seen.add(m.food_id);
          unique.push(m.foods as FoodItem);
        }
      });
      setRecentFoods(unique.slice(0, 15));
    } catch (e) {
      console.error('fetchRecentFoods error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const mealDate = date ? new Date(date) : new Date();
  const dateString = mealDate.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  const searchFoods = useCallback(async (query: string, categoryId: number | null) => {
    setIsLoading(true);
    try {
      let queryBuilder = supabase.from('foods').select('*');

      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('food_name', `%${query}%`);
      }
      
      if (categoryId !== null) {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      const { data, error } = await queryBuilder.limit(20);

      if (error) throw error;
      setFoods(data || []);
    } catch (error) {
      console.error('Error searching foods:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'THỰC PHẨM') return;
    const timer = setTimeout(() => {
      searchFoods(searchQuery, selectedCategory);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, searchFoods, activeTab]);

  useEffect(() => {
    if (activeTab === 'GẦN ĐÂY') fetchRecentFoods();
  }, [activeTab, fetchRecentFoods]);

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
            <Text className="text-green-500 text-lg font-medium">Huỷ</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-gray-400 text-sm font-medium">{dateString}</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mt-4 border-b border-gray-100">
        {['THỰC ĐƠN', 'FOOD', 'GẦN ĐÂY'].map((tab) => (
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

      {/* Search Bar — only on FOOD tab */}
      {activeTab === 'THỰC PHẨM' && (
        <View className="px-6 py-4">
          <View className="flex-row items-center bg-white border border-gray-100 rounded-full px-4 py-3 shadow-sm">
            <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Tìm kiếm thực phẩm"
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-black text-base"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isLoading && <ActivityIndicator size="small" color="#98E332" />}
          </View>
        </View>
      )}

      {/* Categories — only on FOOD tab */}
      {activeTab === 'THỰC PHẨM' && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8, gap: 10 }}
            className="mb-2"
          >
            {FOOD_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: selectedCategory === cat.id ? 'black' : '#E5E7EB',
                  backgroundColor: selectedCategory === cat.id ? 'black' : 'white',
                  marginRight: 10,
                  elevation: 2
                }}
              >
                <Text style={{
                  fontWeight: 'bold',
                  fontSize: 14,
                  color: selectedCategory === cat.id ? '#98E332' : '#6B7280'
                }}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Food List */}
      {activeTab === 'THỰC PHẨM' && (
        <ScrollView className="flex-1 px-6">
          {foods.length > 0 ? (
            foods.map((food) => (
              <TouchableOpacity
                key={food.id}
                onPress={() => router.push({
                  pathname: '/food-detail',
                  params: { food: JSON.stringify(food), meal, date: date ?? new Date().toISOString() }
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
              <MaterialCommunityIcons name="food-off" size={36} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-2">Không tìm thấy món ăn</Text>
            </View>
          ) : !searchQuery.trim() ? (
            <View className="items-center mt-10">
              <MaterialCommunityIcons name="magnify" size={36} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-2">Tìm kiếm món ăn yêu thích</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Recently Eaten */}
      {activeTab === 'GẦN ĐÂY' && (
        <ScrollView className="flex-1 px-6">
          {isLoading ? (
            <View className="items-center mt-10">
              <ActivityIndicator size="large" color="#98E332" />
            </View>
          ) : recentFoods.length === 0 ? (
            <View className="items-center mt-10">
              <MaterialCommunityIcons name="history" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">Chưa có lịch sử ăn uống</Text>
              <Text className="text-gray-300 text-xs mt-1">Hãy ghi lại bữa ăn đầu tiên!</Text>
            </View>
          ) : (
            <>
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-4 mb-2">
                Đã ăn gần đây
              </Text>
              {recentFoods.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  onPress={() => router.push({
                    pathname: '/food-detail',
                    params: { food: JSON.stringify(food), meal, date: date ?? new Date().toISOString() }
                  })}
                  className="flex-row items-center py-5 border-b border-gray-50"
                >
                  <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="history" size={16} color="#98E332" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-black text-base font-medium">{food.food_name}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      {food.calories_kcal} kcal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#98E332" />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Cook Book placeholder */}
      {activeTab === 'THỰC ĐƠN' && (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialCommunityIcons name="book-open-outline" size={56} color="#D1D5DB" />
          <Text className="text-gray-400 text-base font-semibold mt-4">Tính năng đang phát triển</Text>
          <Text className="text-gray-300 text-sm text-center mt-2">Cook Book sẽ cho phép lưu công thức nấu ăn yêu thích.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
