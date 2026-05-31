import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthApiError, verifyEmailRequest } from '../api/auth';
import styles from './LoginPage.module.css';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Use the link from your email.');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await verifyEmailRequest(token);
        if (cancelled) return;
        setStatus('success');
        setMessage(res.message);
        window.setTimeout(
          () =>
            navigate('/login', {
              replace: true,
              state: {
                verified: true,
                email: res.email,
                notice: res.message,
              },
            }),
          1500,
        );
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          e instanceof AuthApiError || e instanceof Error
            ? e.message
            : 'Verification failed.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className={styles.page}>
      <aside className={styles.brand} aria-label="Branding">
        <h1 className={styles.brandTitle}>Pomodoria</h1>
        <p className={styles.brandTagline}>Focus. Grow. Level Up.</p>
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Email verification</h2>
          <p
            className={status === 'error' ? styles.alert : undefined}
            role={status === 'error' ? 'alert' : 'status'}
            style={
              status === 'success'
                ? {
                    color: '#166534',
                    background: '#ecfdf5',
                    border: '1px solid #bbf7d0',
                    padding: 12,
                    borderRadius: 8,
                  }
                : status === 'loading'
                  ? { color: '#6b7280' }
                  : undefined
            }
          >
            {status === 'success' ? 'Email verified! Redirecting to sign in…' : message}
          </p>

          {status === 'error' ? (
            <p className={styles.footer}>
              <Link className={styles.signUpLink} to="/check-email">
                Resend verification
              </Link>
              {' · '}
              <Link className={styles.signUpLink} to="/login">
                Sign in
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
