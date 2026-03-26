# Development Notes

For contributors, or for the author six months from now when things are inevitably confusing.

---

## Project structure

```
src/
  main/           Electron main process
  preload/        Context bridge between main and renderer
  renderer/       React UI
    components/   Individual UI components
    store/        Zustand state
  core/           Pure logic with no Electron or React dependencies
resources/        Static assets bundled into packaged builds
out/              Compiled output (generated, not committed)
tests/            Vitest unit tests (core logic only)
```

The `core/` directory is intentionally isolated. Palette parsing, encoding, hex formatting, and color math belong there. Nothing in `core/` should import from Electron or React. This makes it testable without spinning up a window.

---

## Electron: main vs renderer

**Main process** (`src/main/`) handles:
- Creating and managing the BrowserWindow
- All file system access (open, save, read)
- Clipboard reads and writes
- App settings persistence (theme, recent files, window bounds)
- IPC handler registration

**Renderer process** (`src/renderer/`) handles:
- The entire visible UI
- Reacting to state changes
- Sending user intent to main via IPC

**Preload** (`src/preload/`) is the bridge. It exposes a controlled `window.electronAPI` surface via `contextBridge`. The renderer talks to main only through this surface. This is not optional — `nodeIntegration` is off and `contextIsolation` is on.

If you need to add a new capability that touches the file system or native OS features, the path is: main handler → preload exposure → renderer call. Do not shortcut this.

---

## Palette file format

See [FILE_FORMAT.md](./FILE_FORMAT.md) for the full breakdown.

Short version: `.pal` files are flat binary. Each palette block is 64 bytes. Each block contains 32 colors encoded as 15-bit RGB in little-endian 16-bit words. The number of palette blocks is inferred from the file size.

---

## State management

The renderer uses Zustand for all application state. There are two stores:

**`editorStore`** — everything related to the open file: palette data, selected palette index, selected color, dirty state, notes, undo/redo history, status messages, recent files.

**`themeStore`** — current theme mode (`light`, `dark`, `system`). Theme is applied synchronously from localStorage at module load time to prevent a flash of wrong theme on startup.

State mutations happen through store actions. Components should not reach into the store and set raw values directly — go through the defined action functions.

---

## Undo / redo design

Undo and redo are scoped to palette color edits within a single session. The history is not persisted.

The relevant state lives in `editorStore`:
- `undoStack` and `redoStack` are arrays of `{ paletteIndex, colors }` snapshots
- `lastEditKey` tracks the most recent `paletteIndex:colorIndex` to coalesce consecutive edits to the same color into a single history entry

When `updateColor` is called:
1. If the edit key has changed since the last push, snapshot the current palette colors onto `undoStack` and clear `redoStack`
2. Apply the change

When `undo` is called, the current palette state is pushed to `redoStack` and the top of `undoStack` is restored. Redo works in reverse.

History is cleared when a new file is opened. It is intentionally not cleared on save, so you can undo a change even after saving if you immediately realize you made a mistake.

Image imports and palette reverts also push to the undo stack.

The maximum history depth is 50 entries per stack. This is not a hard technical limit — it is a practical one.

---

## UI layout

The window is divided into a left column and a right column.

**Left column** (fixed width, 182px):
- Palette selector (dropdown, shows dirty indicator per palette)
- Swatch grid (32 swatches, 4 × 8 layout, 40px per swatch)

**Right column** (flexible):
- Upper workspace: raw hex bytes view (fixed 220px) + color editor (flex, min 220px) side by side
- Workspace actions row: Undo, Redo, Copy .db, Import Image, Paste Image, Revert Palette
- Notes textarea
- Status / notification bar

The left column content is fixed-height. The minimum window size is set to ensure the swatch grid is fully visible without clipping or scrolling. If the window sizing constants in `src/main/index.ts` are changed, verify the swatch grid still renders fully at the new minimum.

Status messages are transient. They appear in the status bar and dismiss automatically or on manual close.

---

## Platform notes

This app targets macOS. A few things worth knowing if you touch platform-adjacent code:

**File paths** — Do not hardcode path separators. Use Node's `path` module everywhere.

**Clipboard images** — `nativeImage` from Electron handles this. The clipboard read goes through IPC (main process only). Do not attempt clipboard access from the renderer directly.

**Window sizing** — The sizing constants in `src/main/index.ts` have been tuned for macOS. The titlebar is factored into the window height.

**`BOUNDS_VERSION`** in `src/main/settingsPersistence.ts` — bump this integer whenever the default window size changes. It invalidates stale saved window bounds and forces the new defaults to apply. Without this, users who already have saved bounds will not see your size change.

---

## Simplicity preference

This codebase tries to stay simple. Some specific choices that reflect that:

- No Redux. Zustand is enough.
- No component library. CSS custom properties and hand-rolled styles.
- No ORM or database. Palette state is kept in memory and written to file directly.
- No i18n infrastructure. English only, not apologizing for it.
- Core logic has no framework dependencies. A plain function that takes bytes and returns colors is easier to test and reason about than one wrapped in hooks and observables.

Before adding an abstraction, ask whether the code is actually hard to understand without it. Usually it is not.
