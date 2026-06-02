import { parseTokenFromUrl } from './authLink';

/** @deprecated Use parseTokenFromUrl or parseAuthLink */
export function parseResetTokenFromUrl(url: string): string | null {
  return parseTokenFromUrl(url);
}
