import { useState } from 'react';
import { View, Text, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { AppTextInput } from '@/components/ui/Input';
import { AppButton } from '@/components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/supabaseClient';

export default function OnboardingScreen() {
  const { session, refreshProfile } = useAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFinishSetup = async () => {
    setErrorMsg('');
    
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (isNaN(heightNum) || isNaN(weightNum)) {
      setErrorMsg('Please enter valid numbers for Height and Weight');
      return;
    }

    if (!session?.user?.id) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          height: heightNum,
          weight: weightNum,
        })
        .eq('id', session.user.id);

      if (error) {
        setErrorMsg(error.message);
      } else {
        // Refresh the profile in AuthContext
        // This will trigger the global routing logic and send the user to /(tabs)
        await refreshProfile();
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-secondary">
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-6 py-12">
          
          <View className="mb-10 items-center">
            <Text className="text-brand-primary text-4xl font-bold mb-2">Welcome!</Text>
            <Text className="text-text-secondary text-center text-lg">
              Let's set up your profile so we can track your biological stats and calculate your BMI.
            </Text>
          </View>

          <View className="mb-8">
            <Text className="text-text-primary text-base font-medium mb-2 ml-1">Height (cm)</Text>
            <AppTextInput
              icon="human-male-height"
              placeholder="e.g. 175"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
              editable={!isLoading}
            />

            <Text className="text-text-primary text-base font-medium mb-2 ml-1 mt-2">Weight (kg)</Text>
            <AppTextInput
              icon="weight-kilogram"
              placeholder="e.g. 70"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              editable={!isLoading}
            />

            {errorMsg ? (
              <Text className="text-status-danger text-center mt-2">{errorMsg}</Text>
            ) : null}
          </View>

          <AppButton 
            title="Finish Setup" 
            onPress={handleFinishSetup} 
            isLoading={isLoading}
            className="mt-4"
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
