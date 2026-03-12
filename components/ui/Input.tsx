import { View, TextInput, TextInputProps, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';

interface InputProps extends TextInputProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  isPassword?: boolean;
  error?: string;
}

export function AppTextInput({
  icon,
  isPassword = false,
  error,
  className = '',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-5">
      <View 
        className={`flex-row items-center border rounded-[20px] px-4 py-4
          ${isFocused ? 'border-border-focus bg-brand-tertiary' : 'border-border-default bg-transparent'}
          ${error ? 'border-status-danger' : ''}
          ${className}
        `}
      >
        {icon && (
          <MaterialCommunityIcons 
            name={icon} 
            size={22} 
            color={isFocused ? "#EFFF3B" : "#666666"} 
          />
        )}
        
        <TextInput
          placeholderTextColor="#666666"
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`flex-1 text-text-primary text-base ${icon ? 'ml-3' : ''}`}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            className="p-1"
          >
            <MaterialCommunityIcons 
              name={showPassword ? "eye-outline" : "eye-off-outline"} 
              size={20} 
              color="#666666" 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text className="text-status-danger text-xs mt-1 ml-2">{error}</Text>
      )}
    </View>
  );
}
