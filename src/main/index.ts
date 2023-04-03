import dotenv from 'dotenv'
import * as path from 'path'
import http from "http"
import serveStatic from 'serve-static'
import finaleHandler from 'finalhandler'
import fs from 'fs'
import Systray from 'systray2'
import { auditTime } from 'rxjs/operators'

import { Server, Socket } from "socket.io"

import { getLogger } from './utils/logger'
import type { Logger } from './utils/logger'

import { Gabin } from './modules/gabin'
import { Profiles } from './modules/profiles'
import { Setup, getAllAudioDevices } from './modules/setup'
import { OscServer } from './servers/OscServer'

import db from './utils/db'
import { openUrl } from './utils/utils'
import { 
    Profile,
    Connection,
    ConnectionsConfig,
    Asset,
    MicId,
    Thresholds,
    AudioDevice
} from '../types/protocol'
const PackageJson = require('../../package.json')

type IoRequest = { id: Profile['id'] }
interface IoRequests {
    thresholds : IoRequest & {
        deviceName: AudioDevice['name']
        thresholds: Thresholds
    }
    icon : IoRequest & {
        icon: Profile['icon']
    }
    name : IoRequest & {
        name: Profile['name']
    }
    autostart : IoRequest & {
        autostart: Profile['autostart']
    }
}

dotenv.config()

const DEFAULT = {
    HOST: 'localhost',
    HTTP_PORT: 1510,
    OSC_PORT: 32123,
    BASE_URL: '/'
}

const IO_ROOMS = {
    SETUP: 'setup',
    GABIN: 'gabin'
}

// get args
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
    Usage: gabin [options]
    Options:
      -h, --help        Display this message
      -d, --debug     Enable debug mode
      -v, --version    Display version
      --no-auto-open  Disable auto open

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

if (args.includes('--debug') || args.includes('-d')) {
    process.env.DEBUG = 'true'
}

if (args.includes('--version') || args.includes('-v')) {
    console.log('v' + PackageJson.version)
    process.exit(0)
}

const AUTO_OPEN = !args.includes('--no-auto-open')
const GABIN_BASE_URL = process.env.GABIN_BASE_URL || DEFAULT.BASE_URL

const HOST = process.env.GABIN_HOST || DEFAULT.HOST
const HTTP_PORT = process.env.GABIN_HTTP_PORT? parseInt(process.env.GABIN_HTTP_PORT) : DEFAULT.HTTP_PORT
const OSC_PORT = process.env.GABIN_OSC_PORT? parseInt(process.env.GABIN_OSC_PORT) : DEFAULT.OSC_PORT

const openApp = () => {
    const port = process.env.GABIN_CLIENT_PORT || HTTP_PORT
    openUrl(`http://${HOST}:${port}${GABIN_BASE_URL}`)
}

class App {
    private gabin: Gabin | undefined

    private logger: Logger
    private profiles: Profiles

    private http: http.Server | undefined
    private io: Server | undefined
    private osc: OscServer | undefined
    private systray: Systray | undefined

    private setup: Setup | undefined

    private ioClients: Map<string, Socket>

    constructor() {
        this.logger = getLogger('Gabin - main process 🤖')

        this.profiles = new Profiles()
        this.ioClients = new Map()
    }

    // INIT

    private initError() {
        const exit = (error: string|undefined) => {
            this.logger.error(error)
            this.clean()
            process.exit(1)
        }

        process.on('unhandledRejection', (err: Error) => exit(err.stack))
               .on('uncaughtException', (err: Error) => exit(err.stack))
    }

    private getHttpServer(): http.Server {
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

          serve(req, res, finaleHandler(req, res))
        })

        return server
    }

    private getIoServer(http: http.Server): Server {
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

          const io = new Server(http, ioOptions)
          return io
    }

    private getOscServer(): OscServer {
        const osc = new OscServer(HOST, OSC_PORT)
        return osc
    }

    private initServer() {
        this.http = this.getHttpServer()
        this.io = this.getIoServer(this.http)
        this.osc = this.getOscServer()

        // @ts-ignore
        this.http.listen(HTTP_PORT, HOST)
    }

    private async initDatabase() {
        await db.connect()
    }

    private initTray() {
        const icon = fs.readFileSync(path.join(__dirname, `../resources/icons/icon.${process.platform === 'win32' ? 'ico' : 'png'}`))

        this.systray = new Systray({
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

        const this_ = this
        this.systray.onClick(action => {
            if (action.seq_id === 0) {
                openApp()
            } else if (action.seq_id === 1) {
                console.log('bye ❤️')
                this_.systray?.kill()
            }
        })

        return
    }

    private initGabin() {
        if (this.gabin || !this.osc) return
        this.gabin = new Gabin(this.osc)
    }

    private initSetup() {
        if (this.setup || !this.osc) return
        this.setup = new Setup(this.osc)
    }

    async init() {

        this.initError()
        this.initServer()
        await this.initDatabase()
        this.initTray()

        this.handle()
    }

    // CLEAN

    async clean() {
        this.logger.info('Cleaning...')

        this.systray?.kill()
        this.io?.close()
        this.http?.close()
        this.osc?.clean()
    }

    // HANDLERS

    private handle() {
        this.handleOsc()
        this.handleIo()
    }

    private handleOsc = () => {
        if (!this.osc) return

        this.osc.listen()

        this.osc?.command$.subscribe((command) => {
            if (command.type === 'on') {
                this.toggleGabin(true)
            } else if (command.type === 'off') {
                this.toggleGabin(false)
            } else if (command.type === 'config') {
                this.profiles.set(command.data)
            } else if (command.type === 'profile') {
                this.setDefaultProfileByName(command.data)
            }
        })

        this.osc?.request$.subscribe((request) => {
            if (request.type === 'profiles') {
                this.osc?.register$.next({type: request.type, data: this.profiles.getAll()})
            } else if (request.type === 'devices') {
                this.osc?.register$.next({type: request.type, data: getAllAudioDevices()})
            }
        })

    }

    private handleIo() {
        if (!this.io) return

        this.io.of("/").adapter.on("join-room", (room, id) => {
            const socket = this.ioClients.get(id)
            if (!socket) return

            if (room === IO_ROOMS.SETUP) {
                this.joinSetup(socket)
            } else if (room === IO_ROOMS.GABIN) {
                this.joinGabin(socket)
            }
        })

        this.io.on('connection', socket => {
            this.logger.debug('Client connected', socket.id)
            this.ioClients.set(socket.id, socket)

            // PROFILE
            socket.on('getProfiles', (_data, callback) => callback(this.profiles.getAll()))
            socket.on('saveProfile', (p: Profile, callback) => callback(this.profiles.set(p)))
            socket.on('deleteProfile', (id: Profile['id'], callback) => callback(this.deleteProfile(id)))
            socket.on('setDefaultProfile', (id: Profile['id'], callback) => callback(this.setDefaultProfile(id)))
            socket.on('setProfileIcon', (p: IoRequests['icon'], callback) => callback(this.profiles.setIcon(p.id, p.icon)))
            socket.on('setProfileName', (p: IoRequests['name'], callback) => callback(this.profiles.setName(p.id, p.name)))
            socket.on('setAutostart', (p: IoRequests['autostart'], callback) => callback(this.profiles.setAutostart(p.id, p.autostart)))
            socket.on('setThresholds', (p: IoRequests['thresholds'], callback) => callback(this.profiles.setThresholds(p.id, p.deviceName, p.thresholds)))

            // SETUP
            socket.on('setup', (p: boolean, callback) => {
                callback(this.toggleSetup(p, socket))
            })

            // GABIN
            socket.on('togglePower', (power: boolean, callback) => {
                callback(this.toggleGabin(power, socket))
            })

            this.sendAppState()

            socket.on('disconnect', () => {
                this.logger.debug('Client disconnected', socket.id)
                this.ioClients.delete(socket.id)
            })
        })
    }

    private handleSetup() {
        if (!this.setup || !this.io) return

        this.setup.obs.reachable$.subscribe((reachable) => {
            this.io?.to(IO_ROOMS.SETUP).emit('handleObsConnected', reachable)
        })

        this.setup.obs.scenes$.subscribe((scenes) => {
            this.io?.to(IO_ROOMS.SETUP).emit('handleObsScenes', scenes)
        })

        this.setup.osc.reachable$.subscribe((reachable) => {
            this.io?.to(IO_ROOMS.SETUP).emit('handleOscConnected', reachable)
        })

        this.setup.osc.mainScene$.subscribe((scene) => {
            this.io?.to(IO_ROOMS.SETUP).emit('handleMainScene', scene)
        })

        this.setup.osc.triggeredShot$.subscribe((source) => {
            this.io?.to(IO_ROOMS.SETUP).emit('handleTriggerSource', source)
        })

        this.setup.osc.autocam$.subscribe((autocam) => {
            this.io?.emit('handleAutocam', autocam)
        })

        this.setup.osc.micAvailability$.subscribe((data) => {
            this.io?.to(IO_ROOMS.SETUP).emit('handleMicAvailability', data)
        })
    }

    private joinSetup(socket: Socket) {
        this.logger.debug('New setup client connected', socket.id)

        // OBS
        socket.on('connectObs', (c: Connection, callback) => callback(this.setup?.connectObs(c)))
        socket.on('disconnectObs', (_data, callback) => callback(this.setup?.disconnectObs()))

        // OSC
        socket.on('connectOsc', (c: Connection, callback) => callback(this.setup?.connectOsc(c)))
        socket.on('disconnectOsc', (_data, callback) => callback(this.setup?.disconnectOsc()))
        socket.on('sendOsc', (path: string, callback) => callback(this.setup?.sendOsc(path)))

        // AUDIO
        socket.on('getAudioDevices', (_data, callback) => callback(getAllAudioDevices()))
    }

    private handleGabin() {
        if (!this.gabin || !this.io) return

        this.gabin.power$.subscribe((p) => {
            this.io?.emit('handlePower', p)
        })
        this.gabin.shoot$.subscribe((shoot) => {
            this.io?.to(IO_ROOMS.GABIN).emit('handleNewShot', shoot)
            this.osc?.register$.next({ type: 'shot', data: shoot.shot.name })
        })
        this.gabin.autocam$.subscribe((autocam) => {
            this.io?.to(IO_ROOMS.GABIN).emit('handleAutocam', autocam)
            this.osc?.register$.next({ type: 'autocam', data: JSON.stringify(autocam) })
        })
        this.gabin.timeline$.subscribe((micId) => {
            this.io?.to(IO_ROOMS.GABIN).emit('handleTimeline', micId)
        })
        this.gabin.volumeMics$.pipe(auditTime(100)).subscribe((vm) => {
            this.io?.to(IO_ROOMS.GABIN).emit('handleVolumeMics', Object.fromEntries(vm))
        })
        this.gabin.availableMics$.subscribe((availableMics) => {
            this.io?.to(IO_ROOMS.GABIN).emit('handleAvailableMics', Object.fromEntries(availableMics))
        })
        this.gabin.connections$.subscribe((c) => {
            this.io?.to(IO_ROOMS.GABIN).emit('handleObsConnected', c.obs)
            this.io?.to(IO_ROOMS.GABIN).emit('handleStreamdeckConnected', c.streamdeck)
            this.io?.to(IO_ROOMS.GABIN).emit('handleOscConnected', c.osc)
        })
    }

    private joinGabin(socket: Socket) {
        this.logger.debug('New gabin client connected')

        // SHOTS
        socket.on('triggerShot', (s: Asset['source'], callback) => callback(this.gabin?.triggeredShot$.next(s)))
        socket.on('toggleAvailableMic', (m: MicId, callback) => callback(this.gabin?.toggleAvailableMic(m)))
        socket.on('toggleAutocam', (a: boolean, callback) => callback(this.gabin?.autocam$.next(a)))
    }

    private sendAppState() {
        if (!this.io) return

        this.io.emit('handleTimeline', this.gabin? this.gabin.timeline$.getValue() : '')
        this.io.emit('handleVolumeMics', this.gabin? Object.fromEntries(this.gabin.volumeMics$.getValue()) : {})
        this.io.emit('handleAvailableMics', this.gabin? Object.fromEntries(this.gabin.availableMics$.getValue()) : {})

        this.io.emit('handlePower', this.gabin? true : false)
        this.io.emit('handleObsConnected', this.gabin?.connections$.getValue().obs || this.setup?.obs.isReachable)
        this.io.emit('handleOscConnected', this.gabin?.connections$.getValue().osc || this.setup?.osc.isReachable)
        this.io.emit('handleStreamdeckConnected', this.gabin?.connections$.getValue().streamdeck)

        this.io.emit('handleOscConfig', this.osc?.getConfig())
    }

    private toggleSetup = (power: boolean, socket?: Socket) => {
        if (!this.setup && power) {
            this.toggleGabin(false)
            this.initSetup()
            this.handleSetup()
        } else if (this.setup && !power) {
            this.setup.clean()
            this.setup = undefined
        }

        if (power) socket?.join(IO_ROOMS.SETUP)
        else this.ioClients.forEach((c) => c.leave(IO_ROOMS.SETUP))
    }

    private toggleGabin = (power: boolean, socket?: Socket) => {
        if (!this.gabin && power) {
            this.toggleSetup(false)
            this.initGabin()
            this.handleGabin()
        } else if (this.gabin && !power) {
            this.gabin.clean()
            this.gabin = undefined
        }

        if (power) socket?.join(IO_ROOMS.GABIN)
        else this.ioClients.forEach((c) => c.leave(IO_ROOMS.GABIN))
    }

    private setDefaultProfile = (id: Profile['id']) => {
        if (this.gabin) this.toggleGabin(false)

        // SET DEFAULT PROFILE
        return this.profiles.setDefault(id)
    }

    private setDefaultProfileByName = (name: Profile['name']) => {
        if (this.gabin) this.toggleGabin(false)

        // SET DEFAULT PROFILE
        return this.profiles.setDefaultByName(name)
    }

    private deleteProfile = (id: Profile['id']) => {
        this.gabin = undefined
        return this.profiles.delete(id)
    }
}

const main = async () => {
    const app = new App()
    await app.init()

    if (AUTO_OPEN) openApp()
}

main()
