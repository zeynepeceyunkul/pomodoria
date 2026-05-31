import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radii, shadows } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../lib/authValidation';
import { AuthApiError, resendVerificationRequest } from '../services/auth';
import { SecondaryButton } from '../components/SecondaryButton';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setNeedsVerification(false);
    setResendMsg(null);
    setDevVerifyUrl(null);
    const nextEmailError = validateEmail(email) ?? undefined;
    const nextPasswordError = password ? undefined : 'Password is required.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      if (e instanceof AuthApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
      }
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setResendLoading(true);
    setResendMsg(null);
    setDevVerifyUrl(null);
    try {
      const res = await resendVerificationRequest(email.trim());
      setResendMsg(res.message);
      setDevVerifyUrl(res.devVerificationUrl ?? null);
    } catch (e) {
      setResendMsg(e instanceof Error ? e.message : 'Could not resend email.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>Pomodoria</Text>
            <Text style={styles.brandTag}>Focus. Grow. Level Up.</Text>
          </View>

          <View style={[styles.card, shadows.card]}>
            <Text style={styles.cardTitle}>Welcome back</Text>

            {error ? (
              <View style={styles.alert}>
                <Text style={styles.alertText}>{error}</Text>
              </View>
            ) : null}

            <TextField
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setEmailError(undefined);
              }}
              placeholder="Enter your email"
              keyboardType="email-address"
              error={emailError}
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setPasswordError(undefined);
              }}
              placeholder="Enter your password"
              secureTextEntry
              error={passwordError}
            />

            {needsVerification ? (
              <>
                <SecondaryButton
                  label={resendLoading ? 'Sending…' : 'Resend verification email'}
                  onPress={onResend}
                  disabled={resendLoading || !email.trim()}
                />
                {resendMsg ? <Text style={styles.resendOk}>{resendMsg}</Text> : null}
                {devVerifyUrl ? (
                  <Pressable
                    style={styles.devBox}
                    onPress={() => void Linking.openURL(devVerifyUrl)}
                  >
                    <Text style={styles.devTitle}>Tap to open verification link (dev)</Text>
                    <Text style={styles.devLink} numberOfLines={3}>
                      {devVerifyUrl}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            <PrimaryButton label={loading ? 'Signing in…' : 'Sign In'} onPress={onSubmit} loading={loading} />

            <View style={styles.footerRow}>
              <Text style={styles.footer}>Don&apos;t have an account? </Text>
              <Pressable onPress={() => navigation.navigate('Register')}>
                <Text style={styles.link}>Sign up</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  brand: {
    backgroundColor: colors.primary,
    borderRadius: radii.card,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  brandTag: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.95,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 28,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 22,
    letterSpacing: -0.3,
  },
  alert: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
  },
  alertText: {
    color: colors.errorText,
    fontSize: 14,
  },
  footerRow: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    color: colors.textSoft,
    fontSize: 15,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  resendOk: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
  },
  devBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radii.sm,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 6,
  },
  devLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
