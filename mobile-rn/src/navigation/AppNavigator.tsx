import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ProfileScreen } from '../screens/dashboard/ProfileScreen';
import { AssetLoanScreen } from '../screens/menu/AssetLoanScreen';
import { ItHelpdeskScreen } from '../screens/menu/ItHelpdeskScreen';
import { ExitPermitScreen } from '../screens/menu/ExitPermitScreen';
import { InventoryRequestScreen } from '../screens/menu/InventoryRequestScreen';
import { SuratTugasScreen } from '../screens/menu/SuratTugasScreen';
import { MaintenanceReportScreen } from '../screens/menu/MaintenanceReportScreen';
import { ArchiveLoanScreen } from '../screens/menu/ArchiveLoanScreen';
import { PdttRequestScreen } from '../screens/menu/PdttRequestScreen';
import { NotificationScreen } from '../screens/dashboard/NotificationScreen';
import ActivityCalendarScreen from '../screens/dashboard/ActivityCalendarScreen';
import { RequestHistoryScreen } from '../screens/dashboard/RequestHistoryScreen';
import { ChangePasswordScreen } from '../screens/dashboard/ChangePasswordScreen';
import { AboutScreen } from '../screens/dashboard/AboutScreen';
import { ValidationListScreen } from '../screens/validator/ValidationListScreen';
import { ValidationDetailScreen } from '../screens/validator/ValidationDetailScreen';
import { useAuthStore } from '../store/authStore';
import { useNotificationPolling } from '../hooks/useNotificationPolling';
import { InAppNotificationPopup } from '../components/InAppNotificationPopup';
import { Toast } from '../components/Toast';
import { UpdateChecker } from '../components/UpdateChecker';
import { SplashScreen } from '../components/SplashScreen';
import { navigationRef } from './navigationUtils';

const RootStack = createStackNavigator();
const AuthStack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : (insets.bottom > 0 ? insets.bottom : 10),
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 60 + insets.bottom : (insets.bottom > 0 ? 60 + insets.bottom : 70),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: 'Beranda' }}
      />
      <Tab.Screen
        name="Calendar"
        component={ActivityCalendarScreen}
        options={{ title: 'Kalender' }}
      />
      <Tab.Screen
        name="History"
        component={RequestHistoryScreen}
        options={{ title: 'Riwayat' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
};

// Wrapper component untuk menambahkan global components di dalam navigator
const AuthenticatedStackWithGlobals: React.FC = () => {
  const { justLoggedIn, clearJustLoggedIn, user } = useAuthStore();
  const { activeNotification, clearNotification } = useNotificationPolling();
  
  const userName = user?.name || user?.employee?.name || 'Pengguna';
  
  return (
    <View style={{ flex: 1 }}>
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="MainTabs" component={MainTabs} />
        <AuthStack.Screen name="AssetLoan" component={AssetLoanScreen} />
        <AuthStack.Screen name="ItHelpdesk" component={ItHelpdeskScreen} />
        <AuthStack.Screen name="ExitPermit" component={ExitPermitScreen} />
        <AuthStack.Screen name="InventoryRequest" component={InventoryRequestScreen} />
        <AuthStack.Screen name="SuratTugas" component={SuratTugasScreen} />
        <AuthStack.Screen name="MaintenanceReport" component={MaintenanceReportScreen} />
        <AuthStack.Screen name="ArchiveLoan" component={ArchiveLoanScreen} />
        <AuthStack.Screen name="PdttRequest" component={PdttRequestScreen} />
        <AuthStack.Screen name="Notifications" component={NotificationScreen} />
        <AuthStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <AuthStack.Screen name="AboutApp" component={AboutScreen} />
        <AuthStack.Screen name="ValidationList" component={ValidationListScreen} />
        <AuthStack.Screen name="ValidationDetail" component={ValidationDetailScreen} />
      </AuthStack.Navigator>
      
      {/* Global Components - sekarang di dalam navigator context */}
      <Toast
        visible={justLoggedIn}
        message={`Selamat Datang ${userName} di SIPTU Mobile`}
        icon="checkmark-circle"
        duration={2500}
        onHide={clearJustLoggedIn}
      />
      <InAppNotificationPopup 
        notification={activeNotification} 
        onClose={clearNotification} 
      />
      <UpdateChecker />
    </View>
  );
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, loadAuthState } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadAuthState();
      setIsLoading(false);
    };
    init();
  }, []);

  // Tampilkan custom splash screen di awal
  // Tetap tampilkan selama animasi berlangsung ATAU saat data auth sedang diload
  if (!splashFinished || isLoading) {
    return <SplashScreen onAnimationFinish={() => setSplashFinished(true)} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Authenticated" component={AuthenticatedStackWithGlobals} />
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
