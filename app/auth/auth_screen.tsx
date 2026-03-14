import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { AppTextInput } from '@/components/ui/Input';
import { AppButton } from '@/components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error, data } = await signIn(email, password);
        if (error) setErrorMsg(error.message);
      } else {
        if (!name) {
          setErrorMsg('Please enter your name');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match');
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          setErrorMsg(error.message);
        } else {
          Alert.alert("Success", "Account created successfully! You can now log in.");
          setIsLogin(true); // Switch to login tab
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An unexpected error occurred');
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 pt-12 pb-8">
          
          {/* Header Text */}
          <View className="mb-8 items-center">
            <Text className="text-text-primary text-3xl font-bold text-center">
              {isLogin ? 'Sign Up or Log in to\nBuild Habits' : 'Sign Up, Track Your\nProgress Daily!'}
            </Text>
          </View>

          {/* Toggle Tab */}
          <View className="flex-row bg-brand-tertiary rounded-full p-1 mb-8">
            <TouchableOpacity 
              className={`flex-1 py-3 rounded-full ${isLogin ? 'bg-border-default' : 'bg-transparent'}`}
              onPress={() => {
                setIsLogin(true);
                setErrorMsg('');
              }}
            >
              <Text className={`text-center font-medium ${isLogin ? 'text-text-primary' : 'text-text-secondary'}`}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 py-3 rounded-full ${!isLogin ? 'bg-border-default' : 'bg-transparent'}`}
              onPress={() => {
                setIsLogin(false);
                setErrorMsg('');
              }}
            >
              <Text className={`text-center font-medium ${!isLogin ? 'text-text-primary' : 'text-text-secondary'}`}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View className="mb-2">
            {!isLogin && (
              <AppTextInput
                icon="account-outline"
                placeholder="Name"
                value={name}
                onChangeText={setName}
                editable={!isLoading}
              />
            )}

            <AppTextInput
              icon="email-outline"
              placeholder="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />

            <AppTextInput
              icon="lock-outline"
              placeholder="Password"
              isPassword
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />

            {!isLogin && (
              <AppTextInput
                icon="lock-outline"
                placeholder="Confirm Password"
                isPassword
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />
            )}

            {errorMsg ? (
              <Text className="text-status-danger text-center mb-4">{errorMsg}</Text>
            ) : null}
          </View>

          {/* Options Row */}
          <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
            >
              <View className={`w-5 h-5 border rounded flex items-center justify-center mr-2 ${rememberMe ? 'bg-text-muted border-text-muted' : 'border-text-secondary'}`}>
                {rememberMe && <MaterialCommunityIcons name="check" size={14} color="#0a0a0a" />}
              </View>
              <Text className="text-text-muted">Remember me</Text>
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity disabled={isLoading}>
                <Text className="text-text-muted">Forgot password</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Primary Action Button */}
          <AppButton 
            title={isLogin ? 'Login' : 'Sign up'} 
            onPress={handleAuth} 
            isLoading={isLoading}
            className="mb-8"
          />

          {/* Social Logins */}
          <View className="mb-8">
            <View className="flex-row items-center justify-center mb-6">
              <View className="h-[1px] bg-border-default flex-1" />
              <Text className="text-text-secondary px-4 font-medium">Or login with</Text>
              <View className="h-[1px] bg-border-default flex-1" />
            </View>

            <View className="flex-row space-x-4">
              <TouchableOpacity disabled={isLoading} className="flex-1 flex-row items-center justify-center border border-border-default py-4 rounded-3xl px-2 mb-4 mx-2">
                <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
                <Text className="text-text-primary ml-2 font-medium">Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity disabled={isLoading} className="flex-1 flex-row items-center justify-center border border-border-default py-4 rounded-3xl px-2 mb-4 mx-2">
                <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
                <Text className="text-text-primary ml-2 font-medium">Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Link */}
          <View className="flex-row justify-center mt-auto">
            <Text className="text-text-secondary">
              {isLogin ? "Dont have an account ? " : "Already have an account? "}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              disabled={isLoading}
            >
              <Text className="text-brand-primary font-bold">
                {isLogin ? "Create an account" : "Log in"}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
