import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RedirectHandler() {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key || (segments as any).length === 0) return;

    const inAuthGroup = segments[0] === 'auth';
    const isSplashScreen = segments[0] === 'splash_screen';
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (isSplashScreen) return;

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/auth/auth_screen');
      }
    } else {
      const isProfileComplete = profile?.height_cm && profile?.weight_kg;

      if (!isProfileComplete && !inOnboardingGroup) {
        router.replace('/onboarding/onboarding_screen');
      } else if (isProfileComplete && (inAuthGroup || inOnboardingGroup)) {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [session, profile, isLoading, segments, rootNavigationState?.key]);

  return null;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RedirectHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splash_screen" />
        <Stack.Screen name="auth/auth_screen" />
        <Stack.Screen name="onboarding/onboarding_screen" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="add-food" />
        <Stack.Screen name="food-detail" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
