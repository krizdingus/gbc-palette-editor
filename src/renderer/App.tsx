import React, { useState, useCallback, useEffect } from 'react'
import { FileBar } from './components/FileBar'
import { PaletteSelector } from './components/PaletteSelector'
import { SwatchGrid } from './components/SwatchGrid'
import { ColorEditor } from './components/ColorEditor'
import { HexPreview } from './components/HexPreview'
import { WorkspaceActions } from './components/WorkspaceActions'
import { NotesEditor } from './components/NotesEditor'
import { StatusBar } from './components/StatusBar'
import { useEditorStore } from './store/editorStore'
import './App.css'

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|bmp|webp)$/i

export function App(): React.ReactElement {
  const openFileByPath = useEditorStore((s) => s.openFileByPath)
  const importFromImagePath = useEditorStore((s) => s.importFromImagePath)
  const dirtyPalettes = useEditorStore((s) => s.dirtyPalettes)

  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = React.useRef(0)

  // Block window close when there are unsaved changes.
  // Electron fires 'will-prevent-unload' on the webContents, which we handle
  // in main/index.ts to show a native confirmation dialog.
  useEffect(() => {
    const isDirty = dirtyPalettes.size > 0
    window.onbeforeunload = isDirty ? () => false : null
    return () => { window.onbeforeunload = null }
  }, [dirtyPalettes])

  // Keyboard shortcuts: Undo (⌘Z / Ctrl+Z) and Redo (⌘⇧Z / Ctrl+⇧Z)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'z') return
      e.preventDefault()
      if (e.shiftKey) {
        useEditorStore.getState().redo()
      } else {
        useEditorStore.getState().undo()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Drag-and-drop ────────────────────────────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragOver(false)

      const file = e.dataTransfer.files[0]
      if (!file) return

      // Electron exposes the native file path on File objects in the renderer
      const filePath = (file as File & { path: string }).path
      if (!filePath) return

      const name = filePath.toLowerCase()
      if (name.endsWith('.pal')) {
        openFileByPath(filePath)
      } else if (IMAGE_EXTENSIONS.test(name)) {
        importFromImagePath(filePath)
      }
    },
    [openFileByPath, importFromImagePath]
  )

  return (
    <div
      className="app"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="drop-overlay" aria-hidden>
          <div className="drop-overlay__inner">
            <span className="drop-overlay__icon">⬇</span>
            <span className="drop-overlay__text">Drop .pal to open · Drop image to import</span>
          </div>
        </div>
      )}

      <FileBar />

      <main className="app__main">
        <section className="app__left">
          <PaletteSelector />
          <SwatchGrid />
        </section>

        <section className="app__right">
          <div className="app__right-top">
            <HexPreview />
            <ColorEditor />
          </div>
          <WorkspaceActions />
          <NotesEditor />
          <StatusBar />
        </section>
      </main>
    </div>
  )
}
