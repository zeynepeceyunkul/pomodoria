/**
 * Pomodoria palette — Coolors "Pomodriaaaaaaa"
 * #5B3256 #6F5268 #827179 #96918B #A9B19D #BDD0AE #D0F0C0
 */
export const palette = {
  plum: '#5B3256',
  mauve: '#6F5268',
  taupe: '#827179',
  greige: '#96918B',
  sage: '#A9B19D',
  sageLight: '#BDD0AE',
  mint: '#D0F0C0',
} as const;

export const lightColors = {
  background: '#f8f9fa',
  surface: '#ffffff',
  primary: palette.plum,
  primaryHover: '#483048',
  primaryMid: '#7c5f82',
  onPrimary: '#ffffff',
  text: '#1f2937',
  textSecondary: '#374151',
  textMuted: '#6b7280',
  textSoft: '#9ca3af',
  highlight: palette.plum,
  link: palette.plum,
  placeholder: '#d1d5db',
  border: '#e5e7eb',
  track: '#ede9fe',
  miniBg: '#fafafa',
  miniBorder: '#f3f4f6',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#991b1b',
  flame: '#ea580c',
  insightText: '#4b5563',
  tabInactive: '#94a3b8',
  focusBg: '#e6f4ea',
  focusBgDeep: '#d1eadd',
  focusBadgeText: '#047857',
  focusBadgeBg: '#d1fae5',
  breakBadgeBg: '#dbeafe',
  breakBadgeText: '#1d4ed8',
  successText: '#166534',
  devBoxBg: '#fffbeb',
  devBoxBorder: '#fde68a',
  devBoxTitle: '#92400e',
};

export const darkColors = {
  background: palette.plum,
  surface: palette.mauve,
  primary: palette.sageLight,
  primaryHover: palette.sage,
  primaryMid: palette.sage,
  onPrimary: palette.plum,
  text: '#F5F2EF',
  textSecondary: '#E3DED9',
  textMuted: '#B8B0AA',
  textSoft: palette.greige,
  highlight: '#F5F2EF',
  link: '#EDE8E4',
  placeholder: palette.greige,
  border: palette.taupe,
  track: palette.taupe,
  miniBg: palette.taupe,
  miniBorder: palette.greige,
  errorBg: '#4a2038',
  errorBorder: '#8b3a5a',
  errorText: '#fecaca',
  flame: '#fb923c',
  insightText: '#E3DED9',
  tabInactive: '#C9C3BD',
  focusBg: palette.mauve,
  focusBgDeep: palette.plum,
  focusBadgeText: '#483048',
  focusBadgeBg: palette.sage,
  breakBadgeBg: palette.taupe,
  breakBadgeText: '#F5F2EF',
  successText: '#E3DED9',
  devBoxBg: '#4a3828',
  devBoxBorder: palette.taupe,
  devBoxTitle: '#E3DED9',
};

/** @deprecated use getThemeColors(settings.theme) */
export const colors = lightColors;

export function getThemeColors(theme?: string | null) {
  return theme === 'dark' ? darkColors : lightColors;
}

export const radii = {
  card: 14,
  sm: 8,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};
