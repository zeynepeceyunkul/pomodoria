import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthApiError, forgotPasswordRequest } from '../api/auth';
import { validateEmail } from '../lib/authValidation';
import { DevVerificationLink } from '../components/DevVerificationLink';
import styles from './LoginPage.module.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setDevResetUrl(null);
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setLoading(true);
    try {
      const res = await forgotPasswordRequest(email.trim());
      setMessage(res.message);
      setDevResetUrl(res.devResetUrl ?? null);
    } catch (err) {
      setMessage(err instanceof AuthApiError || err instanceof Error ? err.message : 'Request failed.');
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
          <h2 className={styles.cardTitle}>Forgot password</h2>
          <p style={{ color: '#6b7280', marginBottom: 20, fontSize: '0.9375rem' }}>
            Enter your email and we&apos;ll send a reset link if the account exists.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                className={`${styles.input} ${emailError ? styles.inputInvalid : ''}`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                disabled={loading}
              />
              {emailError ? (
                <p className={styles.fieldError} role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          {message ? (
            <p
              className={styles.alert}
              style={{ marginTop: 16, color: '#166534', background: '#ecfdf5', borderColor: '#bbf7d0' }}
              role="status"
            >
              {message}
            </p>
          ) : null}
          {devResetUrl ? <DevVerificationLink url={devResetUrl} label="Dev reset link" /> : null}

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
