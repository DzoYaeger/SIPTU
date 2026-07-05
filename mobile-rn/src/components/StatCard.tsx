import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ComponentProps<typeof Ionicons>['name'];
  color?: string;
  trend?: string;
  trendUp?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#2563eb',
  trend,
  trendUp,
}) => {
  return (
    <Card className="flex-1 min-w-[140px]" padding="md">
      <View className="flex-row items-start justify-between">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {trend && (
          <View className="flex-row items-center">
            <Ionicons
              name={trendUp ? 'trending-up' : 'trending-down'}
              size={14}
              color={trendUp ? '#22c55e' : '#ef4444'}
            />
            <Text
              className={`text-xs ml-1 ${
                trendUp ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {trend}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-2xl font-bold text-secondary-900 mt-3">
        {value}
      </Text>
      <Text className="text-secondary-500 text-sm mt-0.5">{title}</Text>
    </Card>
  );
};
