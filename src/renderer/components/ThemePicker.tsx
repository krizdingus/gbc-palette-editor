import React, { useState, useRef, useEffect } from 'react'
import { useThemeStore, type ThemeMode } from '../store/themeStore'

const ICONS: Record<ThemeMode, string> = {
  system: '◑',
  light: '☀',
  dark: '☾'
}

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

export function ThemePicker(): React.ReactElement {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div className="theme-menu" ref={ref}>
      <button
        className="theme-menu__toggle btn btn--sm"
        onClick={() => setOpen((v) => !v)}
        title={`Theme: ${OPTIONS.find((o) => o.value === mode)?.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {ICONS[mode]}
      </button>

      {open && (
        <div className="theme-menu__dropdown" role="menu">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="menuitem"
              className={`theme-menu__option ${mode === opt.value ? 'theme-menu__option--active' : ''}`}
              onClick={() => { setMode(opt.value); setOpen(false) }}
            >
              <span className="theme-menu__icon">{ICONS[opt.value]}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
