/** Applies saved appearance theme to the document root (global CSS reads `html[data-theme]`). */

export function applyHtmlTheme(theme: string | undefined): void {
  const t = theme?.trim().toLowerCase() === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
}
