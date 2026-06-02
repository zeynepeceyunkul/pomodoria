import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

const appScheme = 'pomodoria';

export const linkingPrefixes = [
  Linking.createURL('/'),
  `${appScheme}://`,
  process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:5173',
].filter(Boolean);

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: linkingPrefixes,
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResetPassword: {
        path: 'reset-password',
        parse: {
          token: (value: string) => decodeURIComponent(value),
        },
      },
      VerifyEmail: {
        path: 'verify-email',
        parse: {
          token: (value: string) => decodeURIComponent(value),
        },
      },
      CheckEmail: 'check-email',
      MainTabs: {
        screens: {
          Home: 'home',
          Focus: 'focus',
          Tasks: 'tasks',
          Stats: 'stats',
          History: 'history',
          Profile: 'profile',
        },
      },
      Settings: 'settings',
    },
  },
};
