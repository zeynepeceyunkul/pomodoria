import { useState } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { parseAuthLink } from '../lib/authLink';

import { SafeAreaView } from 'react-native-safe-area-context';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton } from '../components/PrimaryButton';

import { TextField } from '../components/TextField';

import { validateEmail } from '../lib/authValidation';

import { AuthApiError, forgotPasswordRequest } from '../services/auth';

import { useThemedStyles } from '../hooks/useThemedStyles';

import type { ThemeColors } from '../hooks/useThemeColors';

import type { RootStackParamList } from '../navigation/types';



type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;



export function ForgotPasswordScreen({ navigation }: Props) {

  const styles = useThemedStyles(createForgotStyles);

  const [email, setEmail] = useState('');

  const [emailError, setEmailError] = useState<string | undefined>();

  const [message, setMessage] = useState<string | null>(null);

  const [devUrl, setDevUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);



  async function onSubmit() {

    setMessage(null);

    setDevUrl(null);

    const err = validateEmail(email) ?? undefined;

    setEmailError(err);

    if (err) return;



    setLoading(true);

    try {

      const res = await forgotPasswordRequest(email.trim());

      setMessage(res.message);

      setDevUrl(res.devResetUrl ?? null);

    } catch (e) {

      setMessage(e instanceof AuthApiError || e instanceof Error ? e.message : 'Request failed.');

    } finally {

      setLoading(false);

    }

  }



  return (

    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      <View style={styles.wrap}>

        <Text style={styles.title}>Forgot password</Text>

        <Text style={styles.sub}>

          Enter your email. If an account exists, we&apos;ll send a reset link.

        </Text>



        <TextField

          label="Email"

          value={email}

          onChangeText={(v) => {

            setEmail(v);

            setEmailError(undefined);

          }}

          keyboardType="email-address"

          autoCapitalize="none"

          error={emailError}

        />



        <PrimaryButton label={loading ? 'Sending…' : 'Send reset link'} onPress={onSubmit} loading={loading} />



        {message ? <Text style={styles.success}>{message}</Text> : null}

        {devUrl ? (
          <Pressable
            onPress={() => {
              const target = parseAuthLink(devUrl);
              if (target?.screen === 'ResetPassword') {
                navigation.navigate('ResetPassword', target.params);
              }
            }}
          >
            <Text style={styles.devLink}>Continue to reset password</Text>
          </Pressable>
        ) : null}



        <Pressable onPress={() => navigation.navigate('Login')} style={styles.back}>

          <Text style={styles.backText}>Back to sign in</Text>

        </Pressable>

      </View>

    </SafeAreaView>

  );

}



const createForgotStyles = (c: ThemeColors) =>

  StyleSheet.create({

    safe: { flex: 1, backgroundColor: c.background },

    wrap: { flex: 1, padding: 24, justifyContent: 'center' },

    title: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 8 },

    sub: { fontSize: 15, color: c.textMuted, marginBottom: 24, lineHeight: 22 },

    success: { marginTop: 16, color: c.successText, fontSize: 14, lineHeight: 20 },

    devLink: { marginTop: 12, color: c.link, fontWeight: '700', fontSize: 14 },

    back: { marginTop: 24, alignSelf: 'center' },

    backText: { color: c.link, fontWeight: '700', fontSize: 15 },

  });

