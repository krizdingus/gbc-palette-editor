import React from 'react'
import { useEditorStore } from '../store/editorStore'

export function WorkspaceActions(): React.ReactElement {
  const filePath = useEditorStore((s) => s.filePath)
  const selectedPaletteIndex = useEditorStore((s) => s.selectedPaletteIndex)
  const dirtyPalettes = useEditorStore((s) => s.dirtyPalettes)
  const undoStack = useEditorStore((s) => s.undoStack)
  const redoStack = useEditorStore((s) => s.redoStack)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const copyDbHex = useEditorStore((s) => s.copyDbHex)
  const importFromImage = useEditorStore((s) => s.importFromImage)
  const importFromClipboard = useEditorStore((s) => s.importFromClipboard)
  const revertCurrentPalette = useEditorStore((s) => s.revertCurrentPalette)

  const canRevert = filePath !== null && dirtyPalettes.has(selectedPaletteIndex)

  return (
    <div className="workspace-actions">
      <div className="workspace-actions__group">
        <button
          className="btn btn--sm"
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo last edit (⌘Z)"
        >
          Undo
        </button>
        <button
          className="btn btn--sm"
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (⌘⇧Z)"
        >
          Redo
        </button>
      </div>
      <div className="workspace-actions__group">
        <button
          className="btn btn--sm"
          onClick={copyDbHex}
          disabled={!filePath}
          title="Copy current palette block as hex to clipboard"
        >
          Copy .db
        </button>
        <button
          className="btn btn--sm"
          onClick={importFromImage}
          disabled={!filePath}
          title="Import 32 colors from image file"
        >
          Import Image
        </button>
        <button
          className="btn btn--sm"
          onClick={importFromClipboard}
          disabled={!filePath}
          title="Import 32 colors from clipboard image"
        >
          Paste Image
        </button>
        <button
          className="btn btn--sm"
          onClick={revertCurrentPalette}
          disabled={!canRevert}
          title="Revert current palette to original"
        >
          Revert Palette
        </button>
      </div>
    </div>
  )
}
