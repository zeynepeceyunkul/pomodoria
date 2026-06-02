import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const credPath = path.join(dir, '.credentials.json');
const backendDir = path.join(dir, '../../backend');

export default async function globalSetup() {
  try {
    const out = execSync('node scripts/e2e-seed.js', {
      cwd: backendDir,
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const jsonLine = out
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('{'))
      .pop();
    if (!jsonLine) {
      throw new Error('e2e-seed did not return JSON credentials');
    }
    const creds = JSON.parse(jsonLine);
    mkdirSync(dir, { recursive: true });
    writeFileSync(credPath, JSON.stringify(creds, null, 2));
  } catch (e) {
    if (existsSync(credPath)) {
      writeFileSync(credPath, '');
    }
    console.warn('[e2e] Seed skipped — auth tests will be skipped without MongoDB.');
    console.warn(e instanceof Error ? e.message : e);
  }
}
