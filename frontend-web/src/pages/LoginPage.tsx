import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthApiError, loginRequest, resendVerificationRequest } from '../api/auth';
import { setStoredTokens } from '../auth/token';
import { validateEmail } from '../lib/authValidation';
import { DevVerificationLink } from '../components/DevVerificationLink';
import styles from './LoginPage.module.css';

type LoginLocationState = {
  verified?: boolean;
  email?: string;
  notice?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginState = (location.state as LoginLocationState | null) ?? {};
  const [email, setEmail] = useState(loginState.email ?? '');
  const [verifiedNotice, setVerifiedNotice] = useState<string | null>(
    loginState.verified ? (loginState.notice ?? 'Email verified. Please sign in.') : null,
  );
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!loginState.verified) return;
    navigate(location.pathname, { replace: true, state: {} });
  }, [loginState.verified, location.pathname, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifiedNotice(null);
    setNeedsVerification(false);
    setResendMsg(null);
    setDevVerifyUrl(null);
    setEmailError(null);
    setPasswordError(null);

    const emailErr = validateEmail(email);
    const passErr = password ? null : 'Password is required.';
    setEmailError(emailErr);
    setPasswordError(passErr);
    if (emailErr || passErr) return;

    setLoading(true);
    try {
      const res = await loginRequest(email.trim(), password);
      setStoredTokens(res.token, res.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AuthApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
      }
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setResendMsg(null);
    setDevVerifyUrl(null);
    try {
      const res = await resendVerificationRequest(email.trim());
      setResendMsg(res.message);
      setDevVerifyUrl(res.devVerificationUrl ?? null);
    } catch (e) {
      setResendMsg(e instanceof Error ? e.message : 'Could not resend email.');
    } finally {
      setResendLoading(false);
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
          <h2 className={styles.cardTitle}>Welcome back</h2>

          <form onSubmit={handleSubmit} noValidate>
            {verifiedNotice ? (
              <p
                className={styles.alert}
                style={{ color: '#166534', background: '#ecfdf5', borderColor: '#bbf7d0' }}
                role="status"
              >
                {verifiedNotice}
              </p>
            ) : null}

            {error ? (
              <p className={styles.alert} role="alert">
                {error}
              </p>
            ) : null}

            {needsVerification ? (
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className={styles.submit}
                  style={{ marginBottom: 8, background: '#4a3350' }}
                  onClick={() => void handleResendVerification()}
                  disabled={resendLoading || !email.trim()}
                >
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
                {resendMsg ? (
                  <p style={{ fontSize: '0.875rem', color: '#166534' }} role="status">
                    {resendMsg}
                  </p>
                ) : null}
                {devVerifyUrl ? <DevVerificationLink url={devVerifyUrl} /> : null}
              </div>
            ) : null}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className={`${styles.input} ${emailError ? styles.inputInvalid : ''}`}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(ev) => {
                  setEmail(ev.target.value);
                  setEmailError(null);
                }}
                disabled={loading}
                aria-invalid={Boolean(emailError)}
              />
              {emailError ? (
                <p className={styles.fieldError} role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className={styles.label} htmlFor="login-password">
                  Password
                </label>
                <Link className={styles.signUpLink} to="/forgot-password" style={{ fontSize: '0.8125rem' }}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                className={`${styles.input} ${passwordError ? styles.inputInvalid : ''}`}
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(ev) => {
                  setPassword(ev.target.value);
                  setPasswordError(null);
                }}
                disabled={loading}
                aria-invalid={Boolean(passwordError)}
              />
              {passwordError ? (
                <p className={styles.fieldError} role="alert">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className={styles.footer}>
            Don&apos;t have an account?{' '}
            <Link className={styles.signUpLink} to="/register">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
