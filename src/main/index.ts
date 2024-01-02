import { App, openApp } from './app'
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

    const NMP = require('@hurdlegroup/node-mac-permissions')
    const status = NMP.getAuthStatus('microphone')
    logger.info('Microphone status: ' + status)

    // try {
    //     if (process.platform === 'darwin') {
    //         const NMP = require('@hurdlegroup/node-mac-permissions')
    //         if (NMP.getAuthStatus('microphone') !== 'authorized') {
    //             const resp = await NMP.askForMicrophoneAccess()
    //             if (resp === 'denied') {
    //                 console.log('Microphone access denied')
    //                 process.exit(1)
    //             }
    //         }
    //     }
    // } catch (e) {
    //     logger.error(e)
    //     process.exit(1)
    // }

    const app = new App()
    await app.init()

    if (AUTO_OPEN) openApp()
}

main()
