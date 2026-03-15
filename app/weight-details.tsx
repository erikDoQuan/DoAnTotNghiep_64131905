import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  }, [user]);

  const currentWeight = profile?.weight_kg || 0;
  const height_m = (profile?.height_cm || 0) / 100;
  const bmi = height_m > 0 ? (currentWeight / (height_m * height_m)).toFixed(1) : '0.0';

  const getBMIStatus = (bmiValue: number) => {
    if (bmiValue === 0) return 'No Data';
    if (bmiValue < 16) return 'Severe Thinness';
    if (bmiValue < 17) return 'Moderate Thinness';
    if (bmiValue < 18.5) return 'Mild Thinness';
    if (bmiValue < 25) return 'Normal Weight';
    if (bmiValue < 30) return 'Overweight';
    if (bmiValue < 35) return 'Obesity Class I';
    if (bmiValue < 40) return 'Obesity Class II';
    return 'Obesity Class III';
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
  const weightDiff = goal ? (goal.target_weight - currentWeight).toFixed(1) : '0';
  const isLosing = goal?.goal_type === 'lose';

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
        <Text className="text-text-primary text-xl font-bold">Weight Progress</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* BMI Card */}
        <View className="bg-brand-tertiary rounded-3xl p-6 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-text-secondary text-sm font-medium">Current BMI</Text>
            <View className="w-10 h-10 rounded-full bg-status-success/10 items-center justify-center">
              <MaterialCommunityIcons name="scale-bathroom" size={20} color="#4ADE80" />
            </View>
          </View>
          <View className="flex-row items-baseline mb-2">
            <Text className="text-text-primary text-4xl font-bold">{bmi}</Text>
            <Text className="text-brand-primary text-sm font-bold ml-2">{bmiStatus}</Text>
          </View>
          <Text className="text-text-muted text-xs">
            Your BMI is calculated based on your height ({profile?.height_cm}cm) and current weight ({currentWeight}kg).
          </Text>
        </View>

        {/* Goal Card */}
        <View className="bg-brand-tertiary rounded-3xl p-6 mb-6">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-text-secondary text-sm font-medium mb-1">Goal Type</Text>
              <Text className="text-text-primary text-lg font-bold capitalize">{goal?.goal_type || 'Set a goal'}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/set-weight-goal')}
              className="w-12 h-12 rounded-2xl bg-brand-primary/10 items-center justify-center"
            >
              <MaterialCommunityIcons 
                name={isLosing ? "trending-down" : "trending-up"} 
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
                  <Text className="text-text-muted text-xs">Start: {goal.start_weight}kg</Text>
                  <Text className="text-text-primary text-xs font-bold">Current: {currentWeight}kg</Text>
                  <Text className="text-text-muted text-xs">Target: {goal.target_weight}kg</Text>
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
                <MaterialCommunityIcons name="information-outline" size={20} color="#EFFF3B" className="mr-3" />
                <Text className="text-text-primary text-sm flex-1 leading-5">
                  You are <Text className="text-brand-primary font-bold">{Math.abs(Number(weightDiff))} kg</Text> away from your target. 
                  Keep going!
                </Text>
              </View>
              
              {/* Timeline */}
              <View className="mt-6 flex-row justify-between border-t border-white/5 pt-4">
                <View>
                  <Text className="text-text-muted text-[10px] uppercase mb-1">Start Date</Text>
                  <Text className="text-text-primary text-sm font-medium">
                    {new Date(goal.start_date).toLocaleDateString()}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-text-muted text-[10px] uppercase mb-1">Target Date</Text>
                  <Text className="text-text-primary text-sm font-medium">
                    {new Date(goal.target_date).toLocaleDateString()}
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
              <Text className="text-black font-bold">Set Weight Goal</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Section */}
        <View className="px-2">
          <Text className="text-text-secondary text-base font-bold mb-4">Healthy Tips</Text>
          <View className="flex-row mb-4">
            <View className="w-10 h-10 rounded-xl bg-status-info/10 items-center justify-center mr-4">
              <MaterialCommunityIcons name="food-apple" size={20} color="#38BDF8" />
            </View>
            <View className="flex-1">
              <Text className="text-text-primary text-sm font-bold mb-1">Eat balanced meals</Text>
              <Text className="text-text-muted text-xs leading-4">Ensure you get enough protein and fiber to stay full longer.</Text>
            </View>
          </View>
          <View className="flex-row mb-8">
            <View className="w-10 h-10 rounded-xl bg-status-warning/10 items-center justify-center mr-4">
              <MaterialCommunityIcons name="water" size={20} color="#FACC15" />
            </View>
            <View className="flex-1">
              <Text className="text-text-primary text-sm font-bold mb-1">Stay hydrated</Text>
              <Text className="text-text-muted text-xs leading-4">Drinking water can boost your metabolism and help with weight management.</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
