import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const credPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.credentials.json');

function loadCredentials(): { email: string; password: string } | null {
  if (!existsSync(credPath)) return null;
  const raw = readFileSync(credPath, 'utf8').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { email?: string; password?: string };
    if (typeof parsed.email === 'string' && typeof parsed.password === 'string') {
      return { email: parsed.email, password: parsed.password };
    }
  } catch {
    return null;
  }
  return null;
}

const creds = loadCredentials();

test.describe('Authenticated flows', () => {
  test.skip(!creds, 'Requires MongoDB seed (run CI or start mongo + global setup)');

  test('login reaches dashboard', async ({ page }) => {
    if (!creds) return;

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(creds.email);
    await page.getByLabel(/^password/i).fill(creds.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /your progress/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /primary/i })).toBeVisible();
  });
});
