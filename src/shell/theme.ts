import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

export type Mode = Theme | 'system'

export const opposite = (t: Theme): Theme => (t === 'light' ? 'dark' : 'light')

export const THEME_SCRIPT = [
  "var t=null;try{t=localStorage.getItem('theme')}catch(e){}",
  "document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';",
  "history.scrollRestoration='manual'",
].join('')

const KEY = 'theme'

const listeners = new Set<() => void>()

const savedMode = (): Mode => {
  try {
    const t = localStorage.getItem(KEY)

    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

const systemDark = () => matchMedia('(prefers-color-scheme: dark)')

let current: { mode: Mode; theme: Theme } | null = null

const snapshot = () => {
  const mode = savedMode()
  const theme = mode === 'system' ? (systemDark().matches ? 'dark' : 'light') : mode

  if (current?.mode !== mode || current.theme !== theme) current = { mode, theme }

  return current
}

const subscribe = (fn: () => void) => {
  const media = systemDark()

  listeners.add(fn)
  media.addEventListener('change', fn)

  return () => {
    listeners.delete(fn)
    media.removeEventListener('change', fn)
  }
}

const setMode = (mode: Mode) => {
  try {
    if (mode === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, mode)
  } catch {
    return
  }

  for (const fn of listeners) fn()
}

export type ThemeState = { theme: Theme | null; mode: Mode; setMode: (mode: Mode) => void }

export function useTheme(): ThemeState {
  const state = useSyncExternalStore(subscribe, snapshot, () => null)

  return { theme: state?.theme ?? null, mode: state?.mode ?? 'system', setMode }
}
