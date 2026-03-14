import { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert, 
  TouchableOpacity 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { AppTextInput } from '@/components/ui/Input';
import { AppButton } from '@/components/ui/Button';
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
      setErrorMsg('Please enter your full name');
      return;
    }

    if (!gender) {
      setErrorMsg('Please select your gender');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setErrorMsg('Please enter birth date in YYYY-MM-DD format');
      return;
    }

    if (isNaN(heightNum) || isNaN(weightNum)) {
      setErrorMsg('Please enter valid numbers for Height and Weight');
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
      setErrorMsg(error.message || 'An unexpected error occurred');
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
            <Text className="text-brand-primary text-4xl font-bold mb-2">Welcome!</Text>
            <Text className="text-text-secondary text-center text-lg">
              Let's complete your profile to give you the best experience.
            </Text>
          </View>

          <View className="mb-8">
            <Text className="text-text-primary text-base font-medium mb-3 ml-1">Full Name</Text>
            <AppTextInput
              icon="account-outline"
              placeholder="Your Full Name"
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
              className="mb-6"
            />

            <View className="mb-8">
              <Text className="text-text-primary text-base font-medium mb-4 ml-1">Gender</Text>
              <View className="flex-row" style={{ gap: 16 }}>
                <GenderOption label="Male" value="Male" />
                <GenderOption label="Female" value="Female" />
                <GenderOption label="Other" value="Other" />
              </View>
            </View>

            <View className="mb-8">
              <Text className="text-text-primary text-base font-medium mb-3 ml-1">Birth Date</Text>
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
                <Text className="text-text-primary text-base font-medium mb-3 ml-1">Height (cm)</Text>
                <AppTextInput
                  icon="human-male-height"
                  placeholder="e.g. 175"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                  editable={!isLoading}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-base font-medium mb-3 ml-1">Weight (kg)</Text>
                <AppTextInput
                  icon="weight-kilogram"
                  placeholder="e.g. 70"
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
            title="Finish Setup" 
            onPress={handleFinishSetup} 
            isLoading={isLoading}
            className="mt-2 mb-10"
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
