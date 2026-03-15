import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FoodItem {
  id: number;
  food_name: string;
  calories_kcal: number;
  energy_kj: number;
  protein: number;
  carbs: number;
  fat: number;
  unit_base: string;
}

export default function FoodDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { food: foodParam, meal } = useLocalSearchParams<{ food: string; meal: string }>();

  const food: FoodItem = useMemo(() => {
    try {
      return JSON.parse(foodParam);
    } catch (e) {
      return {
        id: 0,
        food_name: 'Unknown',
        calories_kcal: 0,
        energy_kj: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unit_base: '100g'
      };
    }
  }, [foodParam]);

  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');
  const [isSaving, setIsSaving] = useState(false);

  const qNum = parseFloat(quantity) || 0;
  const baseNum = parseFloat(food.unit_base) || 100;
  const ratio = qNum / baseNum;

  const calculated = {
    calories: (food.calories_kcal * ratio).toFixed(1),
    energy_kj: (food.energy_kj * ratio).toFixed(0),
    protein: (food.protein * ratio).toFixed(1),
    carbs: (food.carbs * ratio).toFixed(1),
    fat: (food.fat * ratio).toFixed(1),
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save meals.');
      return;
    }

    if (qNum <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('meals').insert({
        user_id: user.id,
        food_id: food.id,
        meal_type: meal?.toLowerCase() || 'breakfast',
        portion_grams: qNum,
        calories: parseFloat(calculated.calories),
        protein: parseFloat(calculated.protein),
        carbs: parseFloat(calculated.carbs),
        fat: parseFloat(calculated.fat),
      });

      if (error) throw error;

      Alert.alert('Success', 'Meal recorded successfully!');
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', error.message || 'Failed to save meal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#101828]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <MaterialCommunityIcons name="chevron-left" size={32} color="#4ADE80" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1 text-center mr-8">{food.food_name}</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Quantity Inputs */}
        <View className="px-6 pt-6 gap-y-4">
          <View className="flex-row items-center bg-[#1D2939] rounded-xl px-4 py-3 border border-gray-800">
            <MaterialCommunityIcons name="plus-minus" size={24} color="#98A2B3" />
            <TextInput
              className="flex-1 text-white text-lg font-bold ml-3"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholderTextColor="#475467"
            />
          </View>

          <View className="flex-row items-center bg-[#1D2939] rounded-xl px-4 py-3 border border-gray-800">
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color="#98A2B3" />
            <Text className="flex-1 text-white text-lg font-medium ml-3">{unit}</Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className={`bg-[#22C55E] rounded-xl py-4 mt-2 ${isSaving ? 'opacity-50' : ''}`}
          >
            <Text className="text-black text-center text-lg font-bold">
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nutritional Overview Grid */}
        <View className="flex-row flex-wrap border-t border-b border-gray-800 mt-8">
          <View className="w-1/2 p-4 border-r border-b border-gray-800 items-center">
            <Text className="text-gray-400 text-sm">Calories</Text>
            <Text className="text-white text-lg font-bold">{calculated.calories} (3%)</Text>
          </View>
          <View className="w-1/2 p-4 border-b border-gray-800 items-center">
            <Text className="text-gray-400 text-sm">Fat</Text>
            <Text className="text-white text-lg font-bold">{calculated.fat}g</Text>
          </View>
          <View className="w-1/2 p-4 border-r border-gray-800 items-center">
            <Text className="text-gray-400 text-sm">Carbs</Text>
            <Text className="text-white text-lg font-bold">{calculated.carbs}g</Text>
          </View>
          <View className="w-1/2 p-4 items-center">
            <Text className="text-gray-400 text-sm">Protein</Text>
            <Text className="text-white text-lg font-bold">{calculated.protein}g</Text>
          </View>
        </View>

        {/* Nutritional Information Detail Section */}
        <View className="p-6">
          <Text className="text-white text-3xl font-black mb-6">Nutritional Information</Text>

          <View className="flex-row justify-between mb-2">
            <Text className="text-white text-lg font-bold">Serving Size</Text>
            <Text className="text-white text-lg font-bold">{quantity} {unit}</Text>
          </View>
          <View className="h-[8px] bg-gray-800 rounded-full mb-6">
            <View className="h-full bg-gray-600 rounded-full w-full" />
          </View>

          <View className="items-end mb-4">
            <Text className="text-white font-bold">Per serve</Text>
          </View>

          <View className="border-t border-gray-800 pt-4 gap-y-4">
            <View>
              <View className="flex-row justify-between border-b border-gray-800 pb-2">
                <Text className="text-white text-lg font-bold">Energy</Text>
                <Text className="text-white text-lg font-bold">{calculated.energy_kj} kJ</Text>
              </View>
              <Text className="text-gray-400 text-right mt-1">{calculated.calories} cal</Text>
            </View>

            <View>
              <View className="flex-row justify-between border-b border-gray-800 pb-2">
                <Text className="text-white text-lg font-bold">Fat</Text>
                <Text className="text-white text-lg font-bold">{calculated.fat}g</Text>
              </View>
              <View className="flex-row justify-between pt-1 opacity-60">
                <Text className="text-white ml-4">Saturated Fat</Text>
                <Text className="text-white">{(parseFloat(calculated.fat) * 0.3).toFixed(1)}g</Text>
              </View>
            </View>

            <View>
              <View className="flex-row justify-between border-b border-gray-800 pb-2">
                <Text className="text-white text-lg font-bold">Carbohydrates</Text>
                <Text className="text-white text-lg font-bold">{calculated.carbs}g</Text>
              </View>
              <View className="flex-row justify-between pt-1 opacity-60">
                <Text className="text-white ml-4">Sugar</Text>
                <Text className="text-white">{(parseFloat(calculated.carbs) * 0.5).toFixed(0)}g</Text>
              </View>
              <View className="flex-row justify-between pt-1 opacity-60">
                <Text className="text-white ml-4">Fiber</Text>
                <Text className="text-white">{(parseFloat(calculated.carbs) * 0.1).toFixed(1)}g</Text>
              </View>
            </View>

            <View className="flex-row justify-between border-b border-gray-800 pb-2">
              <Text className="text-white text-lg font-bold">Protein</Text>
              <Text className="text-white text-lg font-bold">{calculated.protein}g</Text>
            </View>

            <View className="flex-row justify-between border-b border-gray-800 pb-2">
              <Text className="text-white text-lg font-bold">Sodium</Text>
              <Text className="text-white">1mg</Text>
            </View>

            <View className="flex-row justify-between border-b border-gray-800 pb-2">
              <Text className="text-white text-lg font-bold">Potassium</Text>
              <Text className="text-white">{(parseFloat(calculated.carbs) * 15).toFixed(0)}mg</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
