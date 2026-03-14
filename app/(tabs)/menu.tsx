import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MenuScreen() {
    const { profile, signOut } = useAuth();

    return (
        <SafeAreaView className="flex-1 bg-dashboard-bg">
            <StatusBar style="dark" />
            <ScrollView className="flex-1 px-6 pt-6">
                <Text className="text-black text-2xl font-bold mb-8">Menu</Text>

                <View className="bg-white rounded-[24px] p-4 shadow-sm mb-6">
                    <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-100">
                        <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
                            <MaterialCommunityIcons name="account-outline" size={24} color="#3B82F6" />
                        </View>
                        <Text className="text-black text-base font-medium flex-1">My Account</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-100">
                        <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-4">
                            <MaterialCommunityIcons name="shield-check-outline" size={24} color="#10B981" />
                        </View>
                        <Text className="text-black text-base font-medium flex-1">Privacy Policy</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center py-4">
                        <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-4">
                            <MaterialCommunityIcons name="bell-outline" size={24} color="#F59E0B" />
                        </View>
                        <Text className="text-black text-base font-medium flex-1">Notifications</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#D1D5DB" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => signOut()}
                    className="bg-white rounded-[24px] p-5 shadow-sm items-center flex-row justify-center"
                >
                    <MaterialCommunityIcons name="logout" size={20} color="#EF4444" className="mr-2" />
                    <Text className="text-red-500 font-bold text-lg">Sign Out</Text>
                </TouchableOpacity>

                <Text className="text-gray-400 text-center mt-10 text-xs">LifeTrack Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}
