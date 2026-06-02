export type AuthLinkTarget =
  | { screen: 'ResetPassword'; params: { token: string } }
  | { screen: 'VerifyEmail'; params: { token: string } };

export function parseTokenFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get('token');
    if (fromQuery) return fromQuery;
  } catch {
    /* fall through */
  }
  const match = url.match(/[?&]token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Maps web or app scheme URLs to an auth stack screen + token. */
export function parseAuthLink(url: string): AuthLinkTarget | null {
  const token = parseTokenFromUrl(url);
  if (!token) return null;
  const lower = url.toLowerCase();
  if (lower.includes('reset-password')) {
    return { screen: 'ResetPassword', params: { token } };
  }
  if (lower.includes('verify-email')) {
    return { screen: 'VerifyEmail', params: { token } };
  }
  return null;
}
