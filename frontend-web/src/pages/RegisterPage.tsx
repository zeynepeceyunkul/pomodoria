import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthApiError, registerRequest } from '../api/auth';
import {
  PASSWORD_REQUIREMENTS_HINT,
  validateRegisterFields,
} from '../lib/authValidation';
import styles from './RegisterPage.module.css';

type FieldKey = 'username' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldKey, string>>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nextErrors = validateRegisterFields(username, email, password, confirmPassword);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const res = await registerRequest(username.trim(), email.trim(), password);
      navigate('/check-email', {
        replace: true,
        state: { email: res.email, devVerificationUrl: res.devVerificationUrl },
      });
    } catch (err) {
      setFormError(
        err instanceof AuthApiError || err instanceof Error
          ? err.message
          : 'Registration failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  function clearFieldError(key: FieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return (
    <div className={styles.page}>
      <aside className={styles.brand} aria-label="Branding">
        <h1 className={styles.brandTitle}>Pomodoria</h1>
        <p className={styles.brandTagline}>Focus. Grow. Level Up.</p>
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Create account</h2>

          <form onSubmit={handleSubmit} noValidate>
            {formError ? (
              <p className={styles.alert} role="alert">
                {formError}
              </p>
            ) : null}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-username">
                Username
              </label>
              <input
                id="register-username"
                className={`${styles.input} ${fieldErrors.username ? styles.inputInvalid : ''}`}
                type="text"
                name="username"
                autoComplete="username"
                placeholder="Choose a username"
                value={username}
                onChange={(ev) => {
                  setUsername(ev.target.value);
                  clearFieldError('username');
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? 'register-username-err' : undefined}
              />
              {fieldErrors.username ? (
                <p id="register-username-err" className={styles.fieldError}>
                  {fieldErrors.username}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
                className={`${styles.input} ${fieldErrors.email ? styles.inputInvalid : ''}`}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(ev) => {
                  setEmail(ev.target.value);
                  clearFieldError('email');
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'register-email-err' : undefined}
              />
              {fieldErrors.email ? (
                <p id="register-email-err" className={styles.fieldError}>
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                className={`${styles.input} ${fieldErrors.password ? styles.inputInvalid : ''}`}
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="Create a password"
                value={password}
                onChange={(ev) => {
                  setPassword(ev.target.value);
                  clearFieldError('password');
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby="register-password-hint"
              />
              <p id="register-password-hint" className={styles.fieldHint}>
                {PASSWORD_REQUIREMENTS_HINT}
              </p>
              {fieldErrors.password ? (
                <p className={styles.fieldError}>{fieldErrors.password}</p>
              ) : null}
            </div>

            <div className={styles.fieldTight}>
              <label className={styles.label} htmlFor="register-confirm">
                Confirm Password
              </label>
              <input
                id="register-confirm"
                className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputInvalid : ''}`}
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(ev) => {
                  setConfirmPassword(ev.target.value);
                  clearFieldError('confirmPassword');
                }}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword ? 'register-confirm-err' : undefined
                }
              />
              {fieldErrors.confirmPassword ? (
                <p id="register-confirm-err" className={styles.fieldError}>
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className={styles.footer}>
            Already have an account?{' '}
            <Link className={styles.signInLink} to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
