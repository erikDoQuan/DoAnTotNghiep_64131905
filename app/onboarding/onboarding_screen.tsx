import { AppButton } from '@/components/ui/Button';
import { AppTextInput } from '@/components/ui/Input';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/supabaseClient';

export default function OnboardingScreen() {
  const { session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(session?.user?.user_metadata?.name || '');
  const [gender, setGender] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFinishSetup = async () => {
    setErrorMsg('');

    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên');
      return;
    }

    if (!gender) {
      setErrorMsg('Vui lòng chọn giới tính');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setErrorMsg('Nhập ngày sinh theo định dạng YYYY-MM-DD');
      return;
    }

    if (isNaN(heightNum) || isNaN(weightNum) || heightNum <= 0 || weightNum <= 0) {
      setErrorMsg('Vui lòng nhập chiều cao và cân nặng hợp lệ');
      return;
    }

    if (!session?.user?.id) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          full_name: fullName.trim(),
          gender: gender,
          birth_date: birthDate,
          height_cm: heightNum,
          weight_kg: weightNum,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        setErrorMsg(error.message);
      } else {
        // Refresh the profile in AuthContext
        await refreshProfile();
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const GenderOption = ({ label, value }: { label: string, value: string }) => (
    <TouchableOpacity
      onPress={() => setGender(value)}
      className={`flex-1 py-4 rounded-[20px] items-center justify-center border ${gender === value ? 'bg-brand-primary border-brand-primary' : 'bg-brand-tertiary border-border-default'}`}
    >
      <Text className={`font-medium ${gender === value ? 'text-black' : 'text-text-secondary'}`}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-brand-secondary">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-12">

          <View className="mb-10 items-center">
            <Text className="text-brand-primary text-4xl font-bold mb-2">Chào mừng!</Text>
            <Text className="text-text-secondary text-center text-lg">
              Hãy hoàn thiện hồ sơ để chúng tôi cá nhân hoá trải nghiệm của bạn.
            </Text>
          </View>

          <View className="mb-8">
            <Text className="text-text-primary text-base font-medium mb-3 ml-1">Họ và tên</Text>
            <AppTextInput
              icon="account-outline"
              placeholder="Nhập họ và tên của bạn"
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
              className="mb-6"
            />

            <View className="mb-8">
              <Text className="text-text-primary text-base font-medium mb-4 ml-1">Giới tính</Text>
              <View className="flex-row" style={{ gap: 16 }}>
                <GenderOption label="Nam" value="Male" />
                <GenderOption label="Nữ" value="Female" />
                <GenderOption label="Khác" value="Other" />
              </View>
            </View>

            <View className="mb-8">
              <Text className="text-text-primary text-base font-medium mb-3 ml-1">Ngày sinh</Text>
              <AppTextInput
                icon="calendar-outline"
                placeholder="YYYY-MM-DD"
                value={birthDate}
                onChangeText={setBirthDate}
                editable={!isLoading}
              />
            </View>

            <View className="flex-row mb-4" style={{ gap: 16 }}>
              <View className="flex-1">
                <Text className="text-text-primary text-base font-medium mb-3 ml-1">Chiều cao (cm)</Text>
                <AppTextInput
                  icon="human-male-height"
                  placeholder="VD: 175"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                  editable={!isLoading}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-base font-medium mb-3 ml-1">Cân nặng (kg)</Text>
                <AppTextInput
                  icon="weight-kilogram"
                  placeholder="VD: 70"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  editable={!isLoading}
                />
              </View>
            </View>

            {errorMsg ? (
              <Text className="text-status-danger text-center mt-2 mb-4">{errorMsg}</Text>
            ) : null}
          </View>

          <AppButton
            title="Hoàn tất thiết lập"
            onPress={handleFinishSetup}
            isLoading={isLoading}
            className="mt-2 mb-10"
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
