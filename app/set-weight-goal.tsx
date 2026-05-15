import { AppTextInput } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SetWeightGoalScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [targetWeight, setTargetWeight] = useState('');
  const [goalType, setGoalType] = useState<'lose' | 'gain' | 'maintain'>('lose');
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tự động chọn loại mục tiêu dựa trên cân nặng nhập vào
  useEffect(() => {
    const w = parseFloat(targetWeight);
    const current = profile?.weight_kg;
    if (isNaN(w) || !current) return;
    if (w < current) setGoalType('lose');
    else if (w > current) setGoalType('gain');
    else setGoalType('maintain');
  }, [targetWeight, profile?.weight_kg]);

  const handleSaveGoal = async () => {
    setErrorMsg('');
    const weight = parseFloat(targetWeight);

    if (isNaN(weight) || weight <= 0) {
      setErrorMsg('Vui lòng nhập cân nặng mục tiêu hợp lệ');
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('weight_goals')
        .insert({
          user_id: user.id,
          start_weight: profile?.weight_kg || 0,
          target_weight: weight,
          goal_type: goalType,
          start_date: new Date().toISOString().split('T')[0],
          target_date: targetDate.toISOString().split('T')[0],
        });

      if (error) throw error;

      await refreshProfile();
      router.back();
    } catch (error: any) {
      setErrorMsg(error.message || 'Đã có lỗi xảy ra khi lưu mục tiêu');
    } finally {
      setIsLoading(false);
    }
  };

  const GoalTypeOption = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: 'lose' | 'gain' | 'maintain';
    icon: any;
  }) => (
    <TouchableOpacity
      onPress={() => setGoalType(value)}
      className={`flex-1 py-4 rounded-2xl items-center justify-center border ${
        goalType === value
          ? 'bg-brand-primary border-brand-primary'
          : 'bg-brand-tertiary border-white/5'
      }`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={goalType === value ? 'black' : '#666666'}
        style={{ marginBottom: 6 }}
      />
      <Text
        className={`text-xs font-bold ${
          goalType === value ? 'text-black' : 'text-text-secondary'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-brand-secondary">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-6 py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-brand-tertiary items-center justify-center mr-4"
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-text-primary text-xl font-bold">Đặt mục tiêu cân nặng</Text>
        </View>

        <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>

          <Text className="text-text-secondary text-sm font-medium mb-6">
            Xác định mục tiêu và thời gian để theo dõi tiến trình hiệu quả hơn.
          </Text>

          {/* Cân nặng hiện tại */}
          <View className="bg-brand-tertiary/50 rounded-2xl p-4 mb-8 flex-row items-center border border-white/5">
            <View className="w-10 h-10 rounded-full bg-brand-primary/10 items-center justify-center mr-4">
              <MaterialCommunityIcons name="weight-kilogram" size={20} color="#EFFF3B" />
            </View>
            <View>
              <Text className="text-text-muted text-[10px] uppercase font-bold">Cân nặng hiện tại</Text>
              <Text className="text-text-primary text-lg font-bold">{profile?.weight_kg || '0'} kg</Text>
            </View>
          </View>

          {/* Cân nặng mục tiêu */}
          <View className="mb-8">
            <Text className="text-text-primary text-sm font-bold mb-3 ml-1">Cân nặng mục tiêu (kg)</Text>
            <AppTextInput
              icon="target"
              placeholder="Vd: 75"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
              editable={!isLoading}
              className="bg-brand-tertiary border-white/5"
              style={{ color: 'white' }}
            />
          </View>

          {/* Loại mục tiêu */}
          <View className="mb-8">
            <Text className="text-text-primary text-sm font-bold mb-1 ml-1">Mục tiêu của bạn</Text>
            <Text className="text-text-muted text-xs mb-4 ml-1">
              Tự động chọn dựa trên cân nặng bạn nhập
            </Text>
            <View className="flex-row" style={{ gap: 12 }}>
              <GoalTypeOption label="Giảm cân"   value="lose"     icon="trending-down" />
              <GoalTypeOption label="Tăng cân"   value="gain"     icon="trending-up"   />
              <GoalTypeOption label="Duy trì"    value="maintain" icon="equal"          />
            </View>
          </View>

          {/* Ngày mục tiêu */}
          <View className="mb-10">
            <Text className="text-text-primary text-sm font-bold mb-3 ml-1">Ngày mục tiêu</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center bg-brand-tertiary border border-white/5 rounded-2xl px-4 py-4"
            >
              <MaterialCommunityIcons
                name="calendar-clock"
                size={20}
                color="#666666"
                style={{ marginRight: 12 }}
              />
              <Text className="text-text-primary font-medium flex-1">
                {targetDate.toLocaleDateString('vi-VN')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={targetDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor="white"
                onChange={(_event: any, selectedDate?: Date) => {
                  setShowDatePicker(false);
                  if (selectedDate) setTargetDate(selectedDate);
                }}
                minimumDate={new Date()}
              />
            )}
          </View>

          {errorMsg ? (
            <Text className="text-status-danger text-center mb-6 font-medium">{errorMsg}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleSaveGoal}
            disabled={isLoading}
            className={`w-full py-5 rounded-3xl items-center justify-center shadow-lg mb-12 ${
              isLoading ? 'bg-gray-800' : 'bg-brand-primary'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text className="text-black text-lg font-bold">Bắt đầu hành trình 🚀</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
