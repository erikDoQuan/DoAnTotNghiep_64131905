import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIVACY_TEXT = `Chính sách bảo mật — LifeTrack

LifeTrack thu thập và lưu trữ dữ liệu sức khoẻ (bước chân, giấc ngủ, cân nặng, bữa ăn) chỉ để hiển thị cho chính bạn. Dữ liệu của bạn được lưu trên hệ thống Supabase được mã hoá và bảo vệ.

Chúng tôi KHÔNG chia sẻ dữ liệu cá nhân của bạn với bất kỳ bên thứ ba nào.

Bạn có toàn quyền xoá tài khoản và dữ liệu bất cứ lúc nào bằng cách liên hệ hỗ trợ.

Ứng dụng có thể yêu cầu quyền truy cập cảm biến vận động (đếm bước chân) và thông báo để hoạt động đúng chức năng.`;

export default function MenuScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView className="flex-1 bg-dashboard-bg">
      <StatusBar style="dark" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text className="text-black text-2xl font-black mb-6">Cài đặt</Text>

        {/* User info card */}
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          className="bg-white rounded-3xl p-5 shadow-sm mb-6 flex-row items-center"
        >
          <View className="w-16 h-16 rounded-full bg-[#98E332] items-center justify-center mr-4">
            <Text className="text-black text-2xl font-black">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-black text-lg font-bold" numberOfLines={1}>
              {profile?.full_name || 'Người dùng'}
            </Text>
            <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={1}>
              {profile?.email || ''}
            </Text>
            <Text className="text-[#98E332] text-xs font-semibold mt-1">
              Chỉnh sửa hồ sơ →
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#D1D5DB" />
        </TouchableOpacity>

        {/* Cài đặt section */}
        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 ml-1">
          Cài đặt
        </Text>
        <View className="bg-white rounded-3xl shadow-sm mb-6 overflow-hidden">
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            className="flex-row items-center px-5 py-4 border-b border-gray-50"
          >
            <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-4">
              <MaterialCommunityIcons name="bell-outline" size={22} color="#F59E0B" />
            </View>
            <Text className="text-black text-base font-medium flex-1">Nhắc nhở & Thông báo</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/profile')}
            className="flex-row items-center px-5 py-4"
          >
            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
              <MaterialCommunityIcons name="account-edit-outline" size={22} color="#3B82F6" />
            </View>
            <Text className="text-black text-base font-medium flex-1">Hồ sơ cá nhân</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Thông tin section */}
        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 ml-1">
          Thông tin
        </Text>
        <View className="bg-white rounded-3xl shadow-sm mb-6 overflow-hidden">
          <TouchableOpacity
            onPress={() => setShowPrivacy(true)}
            className="flex-row items-center px-5 py-4"
          >
            <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-4">
              <MaterialCommunityIcons name="shield-check-outline" size={22} color="#10B981" />
            </View>
            <Text className="text-black text-base font-medium flex-1">Chính sách bảo mật</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Đăng xuất */}
        <TouchableOpacity
          onPress={() => setShowLogoutConfirm(true)}
          className="bg-red-50 rounded-3xl p-5 shadow-sm flex-row items-center justify-center mb-4"
        >
          <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          <Text className="text-red-500 font-bold text-base ml-2">Đăng xuất</Text>
        </TouchableOpacity>

        <Text className="text-gray-400 text-center text-xs mb-10">LifeTrack Version 1.0.0</Text>

      </ScrollView>

      {/* Privacy Policy Modal */}
      <Modal transparent animationType="slide" visible={showPrivacy}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setShowPrivacy(false)}
        >
          <View className="bg-white rounded-t-3xl p-6 pb-12">
            <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-5" />
            <Text className="text-black text-xl font-bold mb-4">Chính sách bảo mật</Text>
            <Text className="text-gray-600 text-sm leading-6">{PRIVACY_TEXT}</Text>
            <TouchableOpacity
              onPress={() => setShowPrivacy(false)}
              className="mt-6 bg-black py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold">Đóng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirm Modal */}
      <Modal transparent animationType="fade" visible={showLogoutConfirm}>
        <View className="flex-1 bg-black/60 justify-center items-center px-8">
          <View className="bg-white rounded-3xl p-6 w-full">
            <Text className="text-black text-xl font-bold text-center mb-2">Đăng xuất?</Text>
            <Text className="text-gray-500 text-sm text-center mb-6 leading-5">
              Bạn có chắc muốn đăng xuất khỏi LifeTrack không?
            </Text>
            <TouchableOpacity
              onPress={async () => {
                setShowLogoutConfirm(false);
                await signOut();
              }}
              className="bg-red-500 py-4 rounded-2xl items-center mb-3"
            >
              <Text className="text-white font-bold text-base">Đăng xuất</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowLogoutConfirm(false)}
              className="bg-gray-100 py-4 rounded-2xl items-center"
            >
              <Text className="text-black font-semibold text-base">Huỷ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
