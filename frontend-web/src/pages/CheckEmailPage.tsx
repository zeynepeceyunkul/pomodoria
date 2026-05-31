import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthApiError, resendVerificationRequest } from '../api/auth';
import { DevVerificationLink } from '../components/DevVerificationLink';
import styles from './LoginPage.module.css';

type LocationState = { email?: string; devVerificationUrl?: string };

export function CheckEmailPage() {
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? {};
  const [email] = useState(state.email ?? '');
  const [devUrl, setDevUrl] = useState(state.devVerificationUrl ?? '');
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
        /* user can press resend manually */
      }
    })();
  }, [email, devUrl]);

  async function handleResend() {
    if (!email.trim()) {
      setError('No email address to resend to. Go back and register again.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await resendVerificationRequest(email.trim());
      setMessage(res.message);
      if (res.devVerificationUrl) setDevUrl(res.devVerificationUrl);
    } catch (e) {
      setError(e instanceof AuthApiError || e instanceof Error ? e.message : 'Could not resend email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.brand} aria-label="Branding">
        <h1 className={styles.brandTitle}>Pomodoria</h1>
        <p className={styles.brandTagline}>Focus. Grow. Level Up.</p>
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Check your email</h2>
          <p style={{ color: '#6b7280', lineHeight: 1.5, marginBottom: 16 }}>
            {devUrl ? (
              <>
                Your account was created for <strong>{email || 'your email'}</strong>. Because mail
                is not configured on this server yet, use the verification link below.
              </>
            ) : (
              <>
                We sent a verification link to <strong>{email || 'your email address'}</strong>.
                Open the link to activate your account, then sign in.
              </>
            )}
          </p>

          {devUrl ? <DevVerificationLink url={devUrl} /> : null}

          {message ? (
            <p
              className={styles.alert}
              style={{ color: '#166534', background: '#ecfdf5', borderColor: '#bbf7d0' }}
              role="status"
            >
              {message}
            </p>
          ) : null}
          {error ? (
            <p className={styles.alert} role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            className={styles.submit}
            onClick={() => void handleResend()}
            disabled={loading || !email}
          >
            {loading ? 'Generating…' : devUrl ? 'Generate new verification link' : 'Resend verification email'}
          </button>

          <p className={styles.footer}>
            <Link className={styles.signUpLink} to="/login">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
