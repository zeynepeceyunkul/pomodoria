import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { validatePassword } from '../lib/authValidation';
import { AuthApiError, resetPasswordRequest } from '../services/auth';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { ThemeColors } from '../hooks/useThemeColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(createResetStyles);
  const [token, setToken] = useState(route.params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setSuccess(null);
    const passErr = validatePassword(password) ?? undefined;
    setPasswordError(passErr);
    if (passErr) return;
    if (password !== confirm) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (!token.trim()) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordRequest(token.trim(), password);
      setSuccess(res.message);
      setTimeout(() => navigation.replace('Login'), 1500);
    } catch (e) {
      setError(e instanceof AuthApiError || e instanceof Error ? e.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.sub}>Choose a new password for your account.</Text>

        {!route.params.token ? (
          <TextField
            label="Reset token"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            placeholder="Paste token from email link"
          />
        ) : null}

        <TextField
          label="New password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setPasswordError(undefined);
          }}
          secureTextEntry
          error={passwordError}
        />
        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        {error ? <Text style={styles.err}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <PrimaryButton
          label={loading ? 'Updating…' : 'Update password'}
          onPress={onSubmit}
          loading={loading}
        />

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.back}>
          <Text style={styles.backText}>Back to sign in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createResetStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    wrap: { flex: 1, padding: 24, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 8 },
    sub: { fontSize: 15, color: c.textMuted, marginBottom: 24, lineHeight: 22 },
    err: { marginBottom: 12, color: c.errorText, fontSize: 14 },
    success: { marginTop: 12, marginBottom: 12, color: c.successText, fontSize: 14 },
    back: { marginTop: 24, alignSelf: 'center' },
    backText: { color: c.link, fontWeight: '700', fontSize: 15 },
  });
