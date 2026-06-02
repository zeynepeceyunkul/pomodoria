import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthApiError, verifyEmailRequest } from '../services/auth';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { ThemeColors } from '../hooks/useThemeColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export function VerifyEmailScreen({ navigation, route }: Props) {
  const styles = useThemedStyles(createVerifyStyles);
  const token = route.params?.token ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    if (!token.trim()) {
      setStatus('error');
      setMessage('Missing verification token. Use the link from your email.');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await verifyEmailRequest(token.trim());
        if (cancelled) return;
        setStatus('success');
        setMessage(res.message ?? 'Email verified! You can sign in now.');
        setTimeout(() => {
          navigation.replace('Login');
        }, 1500);
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          e instanceof AuthApiError || e instanceof Error ? e.message : 'Verification failed.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Email verification</Text>
        <Text
          style={[
            styles.body,
            status === 'success' && styles.success,
            status === 'error' && styles.err,
          ]}
        >
          {status === 'success' ? 'Email verified! Redirecting to sign in…' : message}
        </Text>

        {status === 'error' ? (
          <>
            <PrimaryButton label="Back to sign in" onPress={() => navigation.navigate('Login')} />
            <Pressable onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>Go back</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createVerifyStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    wrap: { flex: 1, padding: 24, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 16 },
    body: { fontSize: 15, color: c.textMuted, lineHeight: 22, marginBottom: 24 },
    success: { color: c.successText },
    err: { color: c.errorText },
    back: { marginTop: 16, alignSelf: 'center' },
    backText: { color: c.link, fontWeight: '700', fontSize: 15 },
  });
