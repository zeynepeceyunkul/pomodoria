import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radii, shadows } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthApiError, resendVerificationRequest } from '../services/auth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckEmail'>;

export function CheckEmailScreen({ navigation, route }: Props) {
  const email = route.params.email;
  const [devUrl, setDevUrl] = useState(route.params.devVerificationUrl ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (devUrl || !email.trim()) return;
    void (async () => {
      try {
        const res = await resendVerificationRequest(email.trim());
        if (res.devVerificationUrl) setDevUrl(res.devVerificationUrl);
      } catch {
        /* manual resend */
      }
    })();
  }, [email, devUrl]);

  async function onResend() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await resendVerificationRequest(email);
      setMessage(res.message);
      if (res.devVerificationUrl) setDevUrl(res.devVerificationUrl);
    } catch (e) {
      setError(e instanceof AuthApiError || e instanceof Error ? e.message : 'Could not resend.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            {devUrl
              ? `Account created for ${email}. Mail is not configured on the server — open the link below in your browser.`
              : `We sent a verification link to ${email}. Open it, then sign in.`}
          </Text>

          {devUrl ? (
            <View style={styles.devBox}>
              <Text style={styles.devTitle}>Development verification link</Text>
              <Pressable onPress={() => void Linking.openURL(devUrl)}>
                <Text style={styles.devLink}>{devUrl}</Text>
              </Pressable>
            </View>
          ) : null}

          {message ? <Text style={styles.ok}>{message}</Text> : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}

          <PrimaryButton
            label={loading ? 'Generating…' : devUrl ? 'Generate new link' : 'Resend verification email'}
            onPress={onResend}
            loading={loading}
          />

          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSoft,
    marginBottom: 18,
  },
  devBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 8,
  },
  devLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  ok: { color: '#166534', marginBottom: 12, fontSize: 14 },
  err: { color: colors.errorText, marginBottom: 12, fontSize: 14 },
  linkRow: { marginTop: 20, alignSelf: 'center', padding: 8 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
