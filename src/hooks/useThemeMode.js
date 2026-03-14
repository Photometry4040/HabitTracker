import { useState, useEffect } from 'react'

export function useThemeMode() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme-mode', mode)
  }, [mode])

  const toggle = () => setMode(prev => prev === 'dark' ? 'light' : 'dark')

  return { mode, toggle, setMode }
}
