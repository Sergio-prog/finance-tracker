export const themeModes = ['dark', 'light', 'system'] as const

export type ThemeMode = (typeof themeModes)[number]

export function isThemeMode(value: string | null): value is ThemeMode {
  return themeModes.includes(value as ThemeMode)
}

export function resolveThemeMode(themeMode: ThemeMode) {
  if (themeMode !== 'system') return themeMode

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export const accents = ['default', 'emerald', 'sky', 'violet', 'rose', 'teal', 'indigo', 'coral', 'lime'] as const
export type Accent = (typeof accents)[number]

export function isAccent(value: string | null): value is Accent {
  return accents.includes(value as Accent)
}

export function getInitialAccent(): Accent {
  if (typeof window === 'undefined') return 'default'
  const stored = window.localStorage.getItem('accent')
  return isAccent(stored) ? stored : 'default'
}

export const accentLabels: Record<Accent, string> = {
  default: 'Amber',
  emerald: 'Emerald',
  sky: 'Sky',
  violet: 'Violet',
  rose: 'Rose',
  teal: 'Teal',
  indigo: 'Indigo',
  coral: 'Coral',
  lime: 'Lime',
}

export const backgrounds = ['default', 'subtle', 'warm', 'cool'] as const
export type Background = (typeof backgrounds)[number]

export function isBackground(value: string | null): value is Background {
  return backgrounds.includes(value as Background)
}

export function getInitialBackground(): Background {
  if (typeof window === 'undefined') return 'default'
  const stored = window.localStorage.getItem('background')
  return isBackground(stored) ? stored : 'default'
}

export const backgroundLabels: Record<Background, string> = {
  default: 'Gradient',
  subtle: 'Subtle',
  warm: 'Warm glow',
  cool: 'Cool tones',
}

export function getInitialBgAnimation(): boolean {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem('bgAnimation')
  return stored !== 'false'
}
