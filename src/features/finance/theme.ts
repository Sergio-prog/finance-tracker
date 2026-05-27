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
