import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  containerClassName,
  className,
  ...props
}) => {
  return (
    <View className={cn('w-full', containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-secondary-700 mb-1.5">
          {label}
        </Text>
      )}
      <View
        className={cn(
          'flex-row items-center border border-secondary-300 rounded-xl bg-white px-4',
          error && 'border-red-500',
          props.editable === false && 'bg-secondary-100'
        )}
      >
        {icon && <View className="mr-3">{icon}</View>}
        <TextInput
          className={cn(
            'flex-1 py-3 text-secondary-900 text-base',
            className
          )}
          placeholderTextColor="#94a3b8"
          {...props}
        />
        {rightIcon && <View className="ml-3">{rightIcon}</View>}
      </View>
      {error && (
        <Text className="text-red-500 text-xs mt-1">{error}</Text>
      )}
    </View>
  );
};
