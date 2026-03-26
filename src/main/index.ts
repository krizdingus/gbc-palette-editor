import { app, BrowserWindow, shell, dialog, screen, nativeImage } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipcHandlers'
import { getWindowBounds, setWindowBounds } from './settingsPersistence'

const MIN_WIDTH = 640
const MIN_HEIGHT = 460
const DEFAULT_WIDTH = MIN_WIDTH
const DEFAULT_HEIGHT = MIN_HEIGHT

let mainWindow: BrowserWindow | null = null

function getSafeWindowBounds(): { width: number; height: number; x?: number; y?: number } {
  const saved = getWindowBounds()
  if (!saved) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }

  const w = Math.max(saved.width, MIN_WIDTH)
  const h = Math.max(saved.height, MIN_HEIGHT)

  // Verify the window position is visible on at least one display
  if (saved.x !== undefined && saved.y !== undefined) {
    const displays = screen.getAllDisplays()
    const visible = displays.some((d) => {
      const b = d.workArea
      return (
        saved.x! < b.x + b.width &&
        saved.x! + w > b.x &&
        saved.y! < b.y + b.height &&
        saved.y! + h > b.y
      )
    })
    if (visible) return { width: w, height: h, x: saved.x, y: saved.y }
  }

  return { width: w, height: h }
}

function createWindow(): void {
  const bounds = getSafeWindowBounds()

  const iconPath = process.platform === 'win32'
    ? join(__dirname, '../../build/icons/icon.ico')
    : join(__dirname, '../../build/icons/png/icon_512.png')

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    title: 'GBC Palette Editor',
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Persist window bounds on resize/move with a short debounce
  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  const saveBounds = (): void => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isMaximized() || mainWindow.isMinimized()) return
      const b = mainWindow.getBounds()
      setWindowBounds({ width: b.width, height: b.height, x: b.x, y: b.y })
    }, 400)
  }
  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // Open external links in the OS browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  /**
   * When the renderer sets window.onbeforeunload = () => false (while dirty),
   * Electron fires this event. We show a native dialog and either allow or
   * block the close. event.preventDefault() = allow the unload (discard changes).
   */
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    const win = mainWindow
    if (!win) return

    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      title: 'Unsaved Changes',
      message: 'You have unsaved palette changes.',
      detail: 'If you close now, your changes will be lost.',
      buttons: ['Discard Changes', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    })

    if (choice === 0) {
      // "Discard" — allow the close
      event.preventDefault()
    }
    // "Cancel" — do nothing; the close stays blocked
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

registerIpcHandlers(() => mainWindow)

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(join(__dirname, '../../build/icons/png/icon_512.png'))
    app.dock.setIcon(icon)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
