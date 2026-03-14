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

export default function ProfileScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [gender, setGender] = useState<string | null>(profile?.gender || null);
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '');
  const [height, setHeight] = useState(profile?.height_cm?.toString() || '');
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() || '');

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state when profile data becomes available
  useEffect(() => {
    if (profile) {
      if (!fullName) setFullName(profile.full_name || '');
      if (!gender) setGender(profile.gender || null);
      if (!birthDate) setBirthDate(profile.birth_date || '');
      if (!height) setHeight(profile?.height_cm?.toString() || '');
      if (!weight) setWeight(profile?.weight_kg?.toString() || '');
    }
  }, [profile]);

  const handleUpdate = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }

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
          full_name: fullName.trim(),
          gender: gender,
          birth_date: birthDate,
          height_cm: heightNum,
          weight_kg: weightNum,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        setErrorMsg(error.message);
      } else {
        await refreshProfile();
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
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
      className={`flex-1 py-3 rounded-2xl items-center justify-center border ${gender === value ? 'bg-dashboard-accent-green border-dashboard-accent-green' : 'bg-white border-gray-100'}`}
    >
      <Text className={`font-bold ${gender === value ? 'text-black' : 'text-gray-400'}`}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-dashboard-bg">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-sm"
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-black text-xl font-bold">Edit Profile</Text>
          <View className="w-10" />
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6" showsVerticalScrollIndicator={false}>

          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-sm overflow-hidden mb-3">
              <MaterialCommunityIcons name="account" size={60} color="#999" style={{ alignSelf: 'center', marginTop: 10 }} />
            </View>
            <Text className="text-gray-400 text-sm font-medium">Update your photo</Text>
          </View>

          <View className="mb-6">
            <Text className="text-black text-sm font-bold mb-2 ml-1">Full Name</Text>
            <AppTextInput
              icon="account-outline"
              placeholder="Your Full Name"
              placeholderTextColor="#999"
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
              style={{ color: 'black' }}
              className="bg-white border-gray-100"
            />
          </View>

          <View className="mb-6">
            <Text className="text-black text-sm font-bold mb-3 ml-1">Gender</Text>
            <View className="flex-row" style={{ gap: 12 }}>
              <GenderOption label="Male" value="Male" />
              <GenderOption label="Female" value="Female" />
              <GenderOption label="Other" value="Other" />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-black text-sm font-bold mb-2 ml-1">Birth Date</Text>
            <AppTextInput
              icon="calendar-outline"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={birthDate}
              onChangeText={setBirthDate}
              editable={!isLoading}
              style={{ color: 'black' }}
              className="bg-white border-gray-100"
            />
          </View>

          <View className="flex-row mb-6" style={{ gap: 16 }}>
            <View className="flex-1">
              <Text className="text-black text-sm font-bold mb-2 ml-1">Height (cm)</Text>
              <AppTextInput
                icon="human-male-height"
                placeholder="e.g. 175"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
                editable={!isLoading}
                style={{ color: 'black' }}
                className="bg-white border-gray-100"
              />
            </View>
            <View className="flex-1">
              <Text className="text-black text-sm font-bold mb-2 ml-1">Weight (kg)</Text>
              <AppTextInput
                icon="weight-kilogram"
                placeholder="e.g. 70"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                editable={!isLoading}
                style={{ color: 'black' }}
                className="bg-white border-gray-100"
              />
            </View>
          </View>

          {errorMsg ? (
            <Text className="text-red-500 text-center mb-4 font-medium">{errorMsg}</Text>
          ) : null}

          {successMsg ? (
            <Text className="text-green-500 text-center mb-4 font-medium">{successMsg}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleUpdate}
            disabled={isLoading}
            className={`w-full py-4 rounded-[24px] items-center justify-center shadow-md mb-10 ${isLoading ? 'bg-gray-300' : 'bg-dashboard-accent-green'}`}
          >
            {isLoading ? (
              <ActivityIndicator color="black" />
            ) : (
              <Text className="text-black text-lg font-bold">Save Changes</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
