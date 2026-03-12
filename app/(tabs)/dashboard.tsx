import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function DashboardScreen() {
  const { profile, user, signOut } = useAuth();

  // Mock data for display based on design reference
  const stats = [
    { label: 'Steps', value: '8,430', goal: '10,000', icon: 'walk', color: '#EFFF3B' },
    { label: 'Sleep', value: '7h 35m', goal: '8h', icon: 'sleep', color: '#38BDF8' },
    { label: 'Hydration', value: '1.6L', goal: '2.5L', icon: 'water', color: '#60A5FA' },
  ];

  const bmi = 22.1; // Calculated from mock profile height/weight

  return (
    <SafeAreaView className="flex-1 bg-brand-secondary">
      <StatusBar style="light" />
      <ScrollView className="flex-1 px-6 pt-4">
        
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-text-muted text-sm">Good Morning,</Text>
            <Text className="text-text-primary text-2xl font-bold">{profile?.name || 'User'}</Text>
          </View>
          <TouchableOpacity className="bg-brand-tertiary p-2 rounded-full border border-border-default">
            <MaterialCommunityIcons name="cog-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* BMI Card */}
        <View className="bg-brand-tertiary rounded-3xl p-6 mb-6 border border-border-default">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-text-muted text-sm font-medium mb-1">HEALTH SCORE</Text>
              <Text className="text-text-primary text-3xl font-bold">BMI: {bmi}</Text>
            </View>
            <View className="bg-brand-primary px-3 py-1 rounded-full">
              <Text className="text-brand-secondary text-xs font-bold">NORMAL</Text>
            </View>
          </View>
          <View className="h-2 bg-brand-secondary rounded-full overflow-hidden">
            <View className="h-full bg-brand-primary w-[70%]" />
          </View>
          <View className="flex-row justify-between mt-4">
            <View>
              <Text className="text-text-muted text-xs">Height</Text>
              <Text className="text-text-primary font-bold">{profile?.height || 0} cm</Text>
            </View>
            <View>
              <Text className="text-text-muted text-xs">Weight</Text>
              <Text className="text-text-primary font-bold">{profile?.weight || 0} kg</Text>
            </View>
            <TouchableOpacity onPress={() => signOut()}>
               <Text className="text-status-danger text-xs italic">Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Stats Grid */}
        <Text className="text-text-primary text-lg font-bold mb-4">Daily Activity</Text>
        <View className="flex-row flex-wrap justify-between">
          {stats.map((stat, index) => (
            <View key={index} className="w-[48%] bg-brand-tertiary rounded-2xl p-4 mb-4 border border-border-default">
              <View className="flex-row items-center mb-3">
                <View style={{ backgroundColor: stat.color + '20' }} className="p-2 rounded-lg">
                  <MaterialCommunityIcons name={stat.icon as any} size={20} color={stat.color} />
                </View>
                <Text className="text-text-muted text-xs font-medium ml-2">{stat.label}</Text>
              </View>
              <Text className="text-text-primary text-xl font-bold mb-1">{stat.value}</Text>
              <Text className="text-text-muted text-[10px]">Goal: {stat.goal}</Text>
            </View>
          ))}

          {/* Activity Placeholder */}
          <TouchableOpacity className="w-[48%] bg-brand-tertiary rounded-2xl p-4 mb-4 border border-border-default items-center justify-center border-dashed border-text-muted">
            <MaterialCommunityIcons name="plus" size={24} color="#999999" />
            <Text className="text-text-muted text-xs mt-1">Add Metric</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity Card */}
        <View className="bg-brand-tertiary rounded-3xl p-6 mb-10 border border-border-default">
           <Text className="text-text-primary font-bold mb-4">Recent Progress</Text>
           <View className="space-y-4">
              {[1, 2].map((_, i) => (
                <View key={i} className="flex-row items-center justify-between border-b border-border-default pb-3 mb-3">
                   <View className="flex-row items-center">
                      <View className="bg-brand-secondary p-2 rounded-xl mr-3">
                         <MaterialCommunityIcons name="fire" size={18} color="#F87171" />
                      </View>
                      <View>
                         <Text className="text-text-primary text-sm font-medium">Cardio Session</Text>
                         <Text className="text-text-muted text-[10px]">March 12, 08:30 AM</Text>
                      </View>
                   </View>
                   <Text className="text-brand-primary font-bold">+350 kcal</Text>
                </View>
              ))}
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
