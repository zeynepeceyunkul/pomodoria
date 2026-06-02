import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radii, shadows } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { AuthApiError } from '../services/auth';
import {
  PASSWORD_REQUIREMENTS_HINT,
  validateRegisterFields,
} from '../lib/authValidation';
import { registerRequest } from '../services/auth';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { ThemeColors } from '../hooks/useThemeColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type FieldKey = 'username' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldKey, string>>;

export function RegisterScreen({ navigation }: Props) {
  const styles = useThemedStyles(createRegisterStyles);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function clearField(key: FieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onSubmit() {
    setFormError(null);
    const next = validateRegisterFields(username, email, password, confirmPassword);
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await registerRequest(username.trim(), email.trim(), password);
      navigation.replace('CheckEmail', {
        email: res.email,
        devVerificationUrl: res.devVerificationUrl,
      });
    } catch (e) {
      setFormError(
        e instanceof AuthApiError || e instanceof Error ? e.message : 'Registration failed.',
      );
    } finally {
      setLoading(false);
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
            <Text style={styles.cardTitle}>Create account</Text>

            {formError ? (
              <View style={styles.alert}>
                <Text style={styles.alertText}>{formError}</Text>
              </View>
            ) : null}

            <TextField
              label="Username"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                clearField('username');
              }}
              placeholder="Choose a username"
              autoCapitalize="sentences"
              error={fieldErrors.username}
            />
            <TextField
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearField('email');
              }}
              placeholder="Enter your email"
              keyboardType="email-address"
              error={fieldErrors.email}
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearField('password');
              }}
              placeholder="Create a password"
              secureTextEntry
              error={fieldErrors.password}
            />
            <Text style={styles.hint}>{PASSWORD_REQUIREMENTS_HINT}</Text>
            <TextField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                clearField('confirmPassword');
              }}
              placeholder="Confirm your password"
              secureTextEntry
              error={fieldErrors.confirmPassword}
            />

            <PrimaryButton
              label={loading ? 'Creating account…' : 'Create account'}
              onPress={onSubmit}
              loading={loading}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footer}>Already have an account? </Text>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createRegisterStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 28 },
    brand: {
      backgroundColor: c.primary,
      borderRadius: radii.card,
      paddingVertical: 36,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginBottom: 20,
    },
    brandTitle: {
      color: c.onPrimary,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    brandTag: {
      marginTop: 10,
      color: c.onPrimary,
      fontSize: 16,
      fontWeight: '500',
      opacity: 0.95,
      textAlign: 'center',
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radii.card,
      padding: 28,
    },
    cardTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: c.text,
      marginBottom: 22,
      letterSpacing: -0.3,
    },
    hint: {
      marginTop: -6,
      marginBottom: 14,
      fontSize: 13,
      lineHeight: 18,
      color: c.textSoft,
    },
    alert: {
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: radii.sm,
      padding: 12,
      marginBottom: 14,
    },
    alertText: { color: c.errorText, fontSize: 14 },
    footerRow: {
      marginTop: 22,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: { color: c.textSoft, fontSize: 15 },
    link: { color: c.link, fontWeight: '700', fontSize: 15 },
  });
