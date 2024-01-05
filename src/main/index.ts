import { App, openApp } from './app'
import { app as electronApp, systemPreferences, dialog } from 'electron'
import { getLogger } from './utils/logger'
const PackageJson = require('../../package.json')
const DEFAULT = require('../resources/json/config.json')

const logger = getLogger('main')

// get args
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
    Usage: gabin [options]
    Options:
      -h, --help        Display this message
      -d, --debug       Enable debug mode
      -v, --version     Display version
      -s, --silent      Hide logs (except errors & logs from plugins)
      --no-auto-open    Disable auto open

    Environment variables:
      GABIN_HOST              Hostname to use (default: ${DEFAULT.HOST})
      GABIN_HTTP_PORT              Port to use (default: ${DEFAULT.HTTP_PORT})
      GABIN_OSC_PORT          Port to use (default: ${DEFAULT.OSC_PORT})
      GABIN_BASE_URL          Base url to use (default: ${DEFAULT.BASE_URL})
      GABIN_LOGS_FOLDER       Folder to store logs (default: $appdata/gabin/gabin.log)
      GABIN_CONFIG_FOLDER     Folder to store config (default: $appdata/gabin/database.json)
    `)
  process.exit(0)
}

if (args.includes('--silent') || args.includes('-s')) {
  process.env.SILENT = 'true'
}

if (args.includes('--debug') || args.includes('-d')) {
  process.env.DEBUG = 'true'
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('v' + PackageJson.version)
  process.exit(0)
}

const AUTO_OPEN = !args.includes('--no-auto-open')

const main = async () => {
  logger.info('Starting Gabin v' + PackageJson.version)

  electronApp.whenReady().then(async () => {
    if (process.platform === 'darwin') {
        electronApp.dock.hide()
        
        const hasAccess = await systemPreferences.askForMediaAccess('microphone');
        if (!hasAccess) {
            await dialog.showMessageBox({
                type: 'error',
                title: 'Microphone Access Denied',
                message: 'This application requires microphone access to function.'
            })
            electronApp.quit()
            return
        }
    }

    const app = new App()
    await app.init()

    if (AUTO_OPEN) openApp()
  })
}

main()
