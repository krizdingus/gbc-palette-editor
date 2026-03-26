const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') return

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  console.log(`\nNotarizing: ${appPath}`)
  console.log('This may take a few minutes...\n')

  await notarize({
    tool: 'notarytool',
    appPath,
    keychainProfile: 'GBCPaletteEditorNotary'
  })

  console.log('Notarization complete.\n')
}
