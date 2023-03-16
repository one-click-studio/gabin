import dotenv from 'dotenv'
import * as path from 'path'
import http from "http"
import serveStatic from 'serve-static'
import finaleHandler from 'finalhandler'
import fs from 'fs'
import Systray from 'systray2'

import { Server } from "socket.io"

import { Gabin } from './modules/gabin'
import { ProfileSetup } from './modules/setup'
import db from './utils/db'
import { openUrl } from './utils/utils'
import { Profile, Connection, ObsSource, MicId } from '../types/protocol'
const PackageJson = require('../../package.json')

dotenv.config()

// get args
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  Usage: gabin [options]
  Options:
    -h, --help      Display this message
    -d, --debug     Enable debug mode
    -v, --version   Display version
    --no-auto-open  Disable auto open

  Environment variables:
    GABIN_HOST          Hostname to use (default: localhost)
    GABIN_PORT          Port to use (default: 1510)
    GABIN_BASE_URL      Base url to use (default: /)
    GABIN_LOGS_FOLDER   Folder to store logs (default: $appdata/gabin/gabin.log)
    GABIN_CONFIG_FOLDER Folder to store config (default: $appdata/gabin/database.json)
  `)
  process.exit(0)
}

if (args.includes('--debug') || args.includes('-d')) {
  process.env.DEBUG = 'true'
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('v' + PackageJson.version)
  process.exit(0)
}

const AUTO_OPEN = !args.includes('--no-auto-open')
const GABIN_BASE_URL = process.env.GABIN_BASE_URL || '/'

const HOST = process.env.GABIN_HOST || 'localhost'
const PORT = process.env.GABIN_PORT || 1510

let gabin: Gabin | undefined

function openApp() {
  const port = process.env.GABIN_CLIENT_PORT || PORT
  openUrl(`http://${HOST}:${port}${GABIN_BASE_URL}`)
}

const initGabin = (io: Server) => {
  gabin = new Gabin()
  gabin.shoot$.subscribe((shoot) => {
    io.emit('handleNewShot', shoot)
  })
  gabin.autocam$.subscribe((autocam) => {
    io.emit('handleAutocam', autocam)
  })
  gabin.timeline$.subscribe((micId) => {
    io.emit('handleTimeline', micId)
  })
  gabin.availableMics$.subscribe((availableMics) => {
    io.emit('handleAvailableMics', Object.fromEntries(availableMics))
  })
  gabin.connections$.subscribe((c) => {
    io.emit('handleObsConnected', c.obs)
    io.emit('handleStreamdeckConnected', c.streamdeck)
  })
}

function handler(io: Server) {
  const profileSetup = new ProfileSetup()

  io.on('connection', client => {
    // client.on('event', data => { console.log(data) })
    // io.emit('responseEvent', data)

    profileSetup.obs.reachable$.subscribe((reachable, ) => {
      io.emit('handleObsConnected', reachable)
    })

    profileSetup.obs.scenes$.subscribe((scenes) => {
      io.emit('handleObsScenes', scenes)
    })

    // ELECTRON
    client.on('openLink', (link: string, callback) => callback(openUrl(link)))

    // OBS
    client.on('connectObs', (c: Connection, callback) => {
      callback(profileSetup.connectObs(c))
    })
    client.on('disconnectObs', (_data, callback) => callback(profileSetup.disconnectObs()))

    // AUDIO
    client.on('getAudioDevices', (_data, callback) => callback(profileSetup.getAllAudioDevices()))

    // PROFILE
    client.on('saveProfile', (p: Profile, callback) => callback(profileSetup.setProfile(p)))

    client.on('getProfiles', (_data, callback) => {
      callback(profileSetup.getProfiles())
    })

    client.on('setDefaultProfile', (id: Profile['id'], callback) => callback(profileSetup.setDefault(id)))
    client.on('setProfileIcon', (p: {id: Profile['id'], icon: Profile['icon']}, callback) => callback(profileSetup.setIcon(p.id, p.icon)))
    client.on('setProfileName', (p: {id: Profile['id'], name: Profile['name']}, callback) => callback(profileSetup.setName(p.id, p.name)))
    client.on('setAutostart', (p: {id: Profile['id'], autostart: Profile['autostart']}, callback) => callback(profileSetup.setAutostart(p.id, p.autostart)))
    client.on('setStartMinimized', (p: {id: Profile['id'], minimized: Profile['startminimized']}, callback) => callback(profileSetup.setStartMinimized(p.id, p.minimized)))
    client.on('deleteProfile', (id: Profile['id'], callback) => {
      profileSetup.deleteProfile(id)
      gabin = undefined
      callback()
    })

    // SHOTS
    client.on('triggerShot', (s: ObsSource, callback) => callback(gabin?.triggeredShot$.next(s)))
    client.on('toggleAvailableMic', (m: MicId, callback) => callback(gabin?.toggleAvailableMic(m)))
    client.on('toggleAutocam', (a: boolean, callback) => callback(gabin?.autocam$.next(a)))

    // GABIN
    client.on('togglePower', (power: boolean, callback) => {
      // init Gabin
      if (!gabin && power) {
        initGabin(io)
      }
      if (gabin) {
        gabin.power(power)
      }

      io.emit('handlePower', power)
      callback()
    })

    // client.on('disconnect', () => {})
  })
}

function createTray(): Systray {
  const icon = fs.readFileSync(path.join(__dirname, `../resources/icons/icon.${process.platform === 'win32' ? 'ico' : 'png'}`))

  const systray = new Systray({
    menu: {
      icon: icon.toString('base64'),
      isTemplateIcon: process.platform === 'darwin',
      title: "",
      tooltip: "Gabin",
      items: [{
        title: "Open in browser",
        tooltip: "",
        checked: false,
        enabled: true
      }, {
        title: "Exit",
        tooltip: "bb",
        checked: false,
        enabled: true
      }]
    },
    debug: false,
    copyDir: true, // copy go tray binary to outside directory, useful for packing tool like pkg.
  })

  systray.onClick(action => {
    if (action.seq_id === 0) {
      openApp()
    } else if (action.seq_id === 1) {
      console.log('bye ❤️')
      systray.kill()
    }
  })

  return systray
}

async function main() {

  const serve = serveStatic(path.join(__dirname, '../render/dist'))
  const server = http.createServer((req, res) => {
    if (GABIN_BASE_URL !== '/') {
      if (req.url?.substring(0, GABIN_BASE_URL.length) !== GABIN_BASE_URL) {
        res.writeHead(404)
        res.end()
        return
      }

      req.url = req.url?.replace(GABIN_BASE_URL, '') || '/'
    }

    const s = serve(req, res, finaleHandler(req, res))
  })

  const ioOptions: any = {
    path: '/socket.io'
  }
  if (process.env.GABIN_CLIENT_PORT) {
    ioOptions.cors = {
      origin: `http://localhost:${process.env.GABIN_CLIENT_PORT}`,
      methods: ["GET", "POST"]
    }
  }

  if (GABIN_BASE_URL !== '/') {
    ioOptions.path = GABIN_BASE_URL + '/socket.io'
  }

  const io = new Server(server, ioOptions)

  // @ts-ignore
  server.listen(PORT, HOST)

  // init db
  await db.connect()

  // handler()
  handler(io)

  createTray()

  if (AUTO_OPEN) openApp()
}

main()