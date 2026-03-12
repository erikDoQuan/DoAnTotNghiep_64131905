import { Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'transparent';
  isLoading?: boolean;
}

export function AppButton({ 
  title, 
  variant = 'primary', 
  isLoading = false,
  className = '',
  ...props 
}: ButtonProps) {
  
  let bgClass = '';
  let textClass = '';

  switch (variant) {
    case 'primary':
      bgClass = 'bg-brand-primary';
      textClass = 'text-black font-bold';
      break;
    case 'secondary':
      bgClass = 'bg-brand-secondary';
      textClass = 'text-text-primary font-medium';
      break;
    case 'outline':
      bgClass = 'bg-transparent border border-border-default';
      textClass = 'text-text-primary font-medium';
      break;
    case 'transparent':
      bgClass = 'bg-transparent';
      textClass = 'text-text-primary font-medium';
      break;
  }

  return (
    <TouchableOpacity
      className={`py-4 px-6 rounded-[24px] items-center justify-center flex-row ${bgClass} ${className}`}
      disabled={isLoading || props.disabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? 'black' : 'white'} />
      ) : (
        <Text className={`text-lg ${textClass}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
