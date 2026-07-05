import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MenuCardProps {
  title: string;
  description?: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color?: string;
  onPress: () => void;
  className?: string;
}

export const MenuCard: React.FC<MenuCardProps> = ({
  title,
  description,
  icon,
  color = '#2563eb',
  onPress,
  className,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={cn(
        'bg-white rounded-2xl p-4 shadow-sm border border-secondary-100 active:opacity-80',
        className
      )}
      style={{ elevation: 2 }}
    >
      <View
        className="w-12 h-12 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: `${color}15` }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-secondary-900 font-semibold text-sm mb-1">
        {title}
      </Text>
      {description && (
        <Text className="text-secondary-500 text-xs" numberOfLines={2}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
};
