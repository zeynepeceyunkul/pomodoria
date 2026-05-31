export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  CheckEmail: { email: string; devVerificationUrl?: string };
  MainTabs: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Focus: undefined;
  Stats: undefined;
  History: undefined;
  Profile: undefined;
};
