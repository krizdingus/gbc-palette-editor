# Build and Distribution

This document covers how to go from source to something you can hand to another person.

---

## Development build

```bash
npm install
npm run dev
```

Starts the Electron app with Vite hot reload in the renderer. Main process changes require a restart. Renderer changes update live.

The build tool is `electron-vite`. It handles the three Electron entry points (main, preload, renderer) as separate Vite processes. Configuration lives in `electron.vite.config.ts`.

---

## Production compile

```bash
npm run build
```

Compiles TypeScript and bundles everything into `out/`. This does not produce an installable app — it produces the compiled source that the packager wraps.

To verify the production build runs correctly before packaging:

```bash
npx electron out/main/index.js
```

---

## macOS packaging

Packaging, signing, and notarization are all wired in. Run:

```bash
npm run package:mac
```

This does the following in order:
1. Compiles everything with `electron-vite`
2. Packages with `electron-builder` — produces a signed `.app`, a DMG, and a ZIP in `dist/`
3. Notarizes the `.app` via Apple's notarytool using the `GBCPaletteEditorNotary` keychain profile
4. Staples the notarization ticket to the app

Notarization connects to Apple's servers and typically takes 1–3 minutes. Normal.

### Output artifacts

All output lands in `dist/`:

| File | What it is |
|------|-----------|
| `GBC Palette Editor-1.0.0-mac-arm64.dmg` | Signed, notarized DMG |
| `GBC Palette Editor-1.0.0-mac-arm64.zip` | Signed, notarized ZIP (app only) |

No additional bundling or staging is automated. Release packaging is handled manually.

### Prerequisites

- macOS with Xcode Command Line Tools
- Developer ID Application certificate in the local keychain: `Kristopher Williams (2JX8GQ6Y4S)`
- Notarytool credentials stored under profile: `GBCPaletteEditorNotary`

To store notarytool credentials if they need to be set up again:
```bash
xcrun notarytool store-credentials GBCPaletteEditorNotary \
  --apple-id YOUR_APPLE_ID \
  --team-id 2JX8GQ6Y4S \
  --password YOUR_APP_SPECIFIC_PASSWORD
```

### Signing configuration

Configured in `package.json` under `build.mac`:
- Identity: `Kristopher Williams (2JX8GQ6Y4S)`
- Hardened runtime enabled
- Entitlements: `build/entitlements.mac.plist` (allows JIT for V8)
- Notarization hook: `build/notarize.js`

### Bundled resources

`resources/example.pal` is bundled into the app via `extraResources` and lands at `Contents/Resources/example.pal` inside the bundle.

---

## Versioning

Version is set in `package.json`. No automated versioning system is in use.

To cut a release:
1. Update the version in `package.json`
2. Commit and tag: `git tag v1.0.0`
3. Run `npm run package:mac`
4. Upload artifacts from `dist/` manually

---

## Settings and data

The app writes settings to the OS user data directory via Electron's `app.getPath('userData')`.

On macOS: `~/Library/Application Support/gbc-palette-editor/`

There is no installer to clean this up. If you need a clean slate, delete that directory.
