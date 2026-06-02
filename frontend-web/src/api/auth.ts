const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  streak: number;
  emailVerified?: boolean;
};

export type AuthSuccessResponse = {
  token: string;
  refreshToken: string;
  user: AuthUser;
};

export type RegisterResponse = {
  requiresEmailVerification: true;
  email: string;
  message: string;
  emailDelivered?: boolean;
  devVerificationUrl?: string;
};

export type ResendVerificationResponse = {
  message: string;
  email?: string;
  emailDelivered?: boolean;
  devVerificationUrl?: string;
};

export type VerifyEmailResponse = {
  verified: boolean;
  email: string;
  message?: string;
};

export type ForgotPasswordResponse = {
  message: string;
  devResetUrl?: string;
  devVerificationUrl?: string;
};

export type ResetPasswordResponse = {
  message: string;
  email: string;
};

/** @deprecated Use AuthSuccessResponse */
export type LoginResponse = AuthSuccessResponse;

function getErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof (data as { message: unknown }).message === 'string'
  ) {
    return (data as { message: string }).message;
  }
  return fallback;
}

function getErrorCode(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

async function postJson<T>(path: string, body: unknown): Promise<{ res: Response; data: T }> {
  const url = `${apiBase().replace(/\/$/, '')}/api/auth${path}`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Request timed out. Is the backend running on port 5000?');
    }
    throw new Error('Cannot reach the server. Is the API running?');
  } finally {
    window.clearTimeout(timeoutId);
  }

  let data = {} as T;
  try {
    data = (await res.json()) as T;
  } catch {
    /* non-JSON */
  }

  return { res, data };
}

export class AuthApiError extends Error {
  status: number;
  code?: string;
  email?: string;

  constructor(message: string, status: number, code?: string, email?: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
    this.email = email;
  }
}

export async function loginRequest(email: string, password: string): Promise<AuthSuccessResponse> {
  const { res, data } = await postJson<AuthSuccessResponse & { code?: string; email?: string }>(
    '/login',
    { email, password },
  );

  if (!res.ok) {
    throw new AuthApiError(
      getErrorMessage(data, `Something went wrong (${res.status})`),
      res.status,
      getErrorCode(data),
      typeof (data as { email?: string }).email === 'string'
        ? (data as { email: string }).email
        : undefined,
    );
  }

  if (typeof data.token !== 'string' || typeof data.refreshToken !== 'string') {
    throw new Error('Invalid response from server.');
  }

  return data;
}

export async function registerRequest(
  username: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const { res, data } = await postJson<RegisterResponse>('/register', {
    username,
    email,
    password,
  });

  if (!res.ok) {
    throw new AuthApiError(
      getErrorMessage(data, `Something went wrong (${res.status})`),
      res.status,
    );
  }

  if (!data.requiresEmailVerification) {
    throw new Error('Invalid response from server.');
  }

  return data;
}

export async function verifyEmailRequest(token: string): Promise<VerifyEmailResponse> {
  const { res, data } = await postJson<VerifyEmailResponse>('/verify-email', {
    token,
  });

  if (!res.ok) {
    throw new AuthApiError(getErrorMessage(data, 'Verification failed.'), res.status);
  }

  if (!data.verified || typeof data.email !== 'string') {
    throw new Error('Invalid response from server.');
  }

  return data;
}

export async function resendVerificationRequest(
  email: string,
): Promise<ResendVerificationResponse> {
  const { res, data } = await postJson<ResendVerificationResponse>('/resend-verification', {
    email,
  });

  if (!res.ok) {
    throw new AuthApiError(getErrorMessage(data, 'Could not resend verification email.'), res.status);
  }

  return {
    message: data.message || 'Verification email sent.',
    email: data.email,
    emailDelivered: data.emailDelivered,
    devVerificationUrl: data.devVerificationUrl,
  };
}

export async function refreshTokenRequest(refreshToken: string): Promise<AuthSuccessResponse> {
  const { res, data } = await postJson<AuthSuccessResponse>('/refresh', { refreshToken });

  if (!res.ok) {
    throw new AuthApiError(getErrorMessage(data, 'Session expired.'), res.status);
  }

  if (typeof data.token !== 'string' || typeof data.refreshToken !== 'string') {
    throw new Error('Invalid response from server.');
  }

  return data;
}

export async function logoutRequest(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  try {
    await postJson('/logout', { refreshToken });
  } catch {
    /* best-effort */
  }
}

export async function forgotPasswordRequest(email: string): Promise<ForgotPasswordResponse> {
  const { res, data } = await postJson<
    ForgotPasswordResponse & { devVerificationUrl?: string }
  >('/forgot-password', { email });

  if (!res.ok) {
    throw new AuthApiError(getErrorMessage(data, 'Could not send reset link.'), res.status);
  }

  return {
    message: data.message || 'If that email is registered, a password reset link was sent.',
    devResetUrl: data.devResetUrl ?? data.devVerificationUrl,
  };
}

export async function resetPasswordRequest(
  token: string,
  password: string,
): Promise<ResetPasswordResponse> {
  const { res, data } = await postJson<ResetPasswordResponse & { code?: string }>(
    '/reset-password',
    { token, password },
  );

  if (!res.ok) {
    throw new AuthApiError(getErrorMessage(data, 'Password reset failed.'), res.status);
  }

  if (typeof data.email !== 'string') {
    throw new Error('Invalid response from server.');
  }

  return data;
}
