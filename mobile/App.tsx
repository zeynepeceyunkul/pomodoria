import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getThemeColors } from './constants/theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { linking } from './navigation/linking';
import { RootNavigator } from './navigation/RootNavigator';

function AppNavigation() {
  const { settings } = useAuth();
  const isDark = settings?.theme === 'dark';
  const c = getThemeColors(settings?.theme);
  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: c.background,
        primary: c.primary,
        card: c.surface,
        text: c.text,
        border: c.miniBorder,
      },
    }),
    [isDark, c],
  );

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

import { initNotificationHandler } from './lib/notifications';

initNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
