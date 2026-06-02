export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string };
  VerifyEmail: { token?: string };
  CheckEmail: { email: string; devVerificationUrl?: string };
  MainTabs: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Focus: undefined;
  Tasks: undefined;
  Stats: undefined;
  History: undefined;
  Profile: undefined;
};
