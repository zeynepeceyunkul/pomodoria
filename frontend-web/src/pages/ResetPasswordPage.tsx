import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthApiError, resetPasswordRequest } from '../api/auth';
import { validatePassword } from '../lib/authValidation';
import styles from './LoginPage.module.css';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const passErr = validatePassword(password);
    if (passErr) {
      setPasswordError(passErr);
      return;
    }
    if (password !== confirm) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError(null);

    if (!token) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordRequest(token, password);
      setSuccess(res.message);
      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { email: res.email, notice: res.message },
        });
      }, 1500);
    } catch (err) {
      setError(err instanceof AuthApiError || err instanceof Error ? err.message : 'Reset failed.');
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
          <h2 className={styles.cardTitle}>Reset password</h2>

          {success ? (
            <p
              role="status"
              style={{
                color: '#166534',
                background: '#ecfdf5',
                border: '1px solid #bbf7d0',
                padding: 12,
                borderRadius: 8,
              }}
            >
              {success} Redirecting to sign in…
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error ? (
                <p className={styles.alert} role="alert">
                  {error}
                </p>
              ) : null}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="reset-password">
                  New password
                </label>
                <input
                  id="reset-password"
                  className={`${styles.input} ${passwordError ? styles.inputInvalid : ''}`}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="reset-confirm">
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  className={`${styles.input} ${passwordError ? styles.inputInvalid : ''}`}
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setPasswordError(null);
                  }}
                  disabled={loading}
                />
                {passwordError ? (
                  <p className={styles.fieldError} role="alert">
                    {passwordError}
                  </p>
                ) : null}
              </div>

              <button className={styles.submit} type="submit" disabled={loading || !token}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

          <p className={styles.footer}>
            <Link className={styles.signUpLink} to="/login">
              Back to sign in
            </Link>
            {' · '}
            <Link className={styles.signUpLink} to="/forgot-password">
              Request new link
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
