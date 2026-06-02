/** Applies saved appearance theme to the document root (global CSS reads `html[data-theme]`). */

export function applyHtmlTheme(theme: string | undefined): void {
  const t = theme?.trim().toLowerCase() === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
}

export function readThemeCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function getChartPalette() {
  const accent = readThemeCssVar('--pom-primary', '#583d5a');
  const grid = readThemeCssVar('--pom-border', '#e5e7eb');
  const text = readThemeCssVar('--pom-text-muted', '#6b7280');
  return {
    accent,
    grid,
    text,
    fill: accent.startsWith('#')
      ? `${accent}38`
      : 'rgba(88, 61, 90, 0.22)',
  };
}
