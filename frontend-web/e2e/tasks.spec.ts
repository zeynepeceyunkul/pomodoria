import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const credPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.credentials.json');

function loadCredentials(): { email: string; password: string } | null {
  if (!existsSync(credPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(credPath, 'utf8')) as {
      email?: string;
      password?: string;
    };
    if (typeof parsed.email === 'string' && typeof parsed.password === 'string') {
      return { email: parsed.email, password: parsed.password };
    }
  } catch {
    return null;
  }
  return null;
}

const creds = loadCredentials();

test.describe('Authenticated tasks', () => {
  test.skip(!creds, 'Requires MongoDB seed');

  test.beforeEach(async ({ page }) => {
    if (!creds) return;
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(creds.email);
    await page.getByLabel(/^password/i).fill(creds.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test('tasks page loads', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible();
    await expect(page.getByText(/new task/i)).toBeVisible();
  });
});
