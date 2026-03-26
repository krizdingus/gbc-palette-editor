import React, { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { ThemePicker } from './ThemePicker'

export function FileBar(): React.ReactElement {
  const openFile = useEditorStore((s) => s.openFile)
  const openFileByPath = useEditorStore((s) => s.openFileByPath)
  const saveFile = useEditorStore((s) => s.saveFile)
  const loadRecentFiles = useEditorStore((s) => s.loadRecentFiles)
  const fileName = useEditorStore((s) => s.fileName)
  const dirtyPalettes = useEditorStore((s) => s.dirtyPalettes)
  const filePath = useEditorStore((s) => s.filePath)
  const recentFiles = useEditorStore((s) => s.recentFiles)

  const [recentOpen, setRecentOpen] = useState(false)
  const recentRef = useRef<HTMLDivElement>(null)

  const isDirty = dirtyPalettes.size > 0
  const title = filePath
    ? `GBC Palette Editor — ${fileName}${isDirty ? ' ●' : ''}`
    : 'GBC Palette Editor'

  useEffect(() => {
    document.title = title
  }, [title])

  // Load recent files on mount
  useEffect(() => {
    loadRecentFiles()
  }, [loadRecentFiles])

  // Close recent dropdown when clicking outside
  useEffect(() => {
    if (!recentOpen) return
    function handleOutside(e: MouseEvent): void {
      if (recentRef.current && !recentRef.current.contains(e.target as Node)) {
        setRecentOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [recentOpen])

  function handleRecentOpen(path: string): void {
    setRecentOpen(false)
    openFileByPath(path)
  }

  return (
    <div className="file-bar">
      <div className="file-bar__left">
        <button className="btn btn--primary" onClick={openFile}>
          Open .pal
        </button>

        {/* Recent files dropdown */}
        <div className="recent-dropdown" ref={recentRef}>
          <button
            className="btn btn--sm"
            onClick={() => setRecentOpen((v) => !v)}
            disabled={recentFiles.length === 0}
            title="Recent files"
            aria-expanded={recentOpen}
            aria-haspopup="listbox"
          >
            Recent ▾
          </button>
          {recentOpen && recentFiles.length > 0 && (
            <ul className="recent-dropdown__list" role="listbox">
              {recentFiles.map((p) => {
                const name = p.split(/[\\/]/).pop() ?? p
                return (
                  <li key={p} role="option">
                    <button
                      className="recent-dropdown__item"
                      onClick={() => handleRecentOpen(p)}
                      title={p}
                    >
                      <span className="recent-dropdown__name">{name}</span>
                      <span className="recent-dropdown__path">{p}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <button
          className="btn"
          onClick={saveFile}
          disabled={!filePath || !isDirty}
          title={!filePath ? 'No file open' : !isDirty ? 'No unsaved changes' : 'Save all changes'}
        >
          Save
        </button>

        <ThemePicker />
      </div>

      <div className="file-bar__right">
        {fileName ? (
          <span className="file-name" title={filePath ?? ''}>
            {fileName}
            {isDirty && <span className="dirty-indicator" title="Unsaved changes"> ●</span>}
          </span>
        ) : (
          <span className="file-name file-name--empty">No file open</span>
        )}
      </div>
    </div>
  )
}
