import OSC from 'osc-js'
import { Subject } from 'rxjs'

import { Server } from '../../main/servers/Server'

const CMD_TYPES = ['on', 'off', 'config', 'profile'] as const
type CmdType = typeof CMD_TYPES[number]

const REQUEST_TYPES = ['profiles', 'devices'] as const
type RequestType = typeof REQUEST_TYPES[number]

const REGISTER_TYPES = [...REQUEST_TYPES, 'shot', 'autocam'] as const
type RegisterType = typeof REGISTER_TYPES[number]

export class OscServer extends Server {
    command$: Subject<{type: CmdType, data: any}>
    request$: Subject<{type: RequestType, data: any}>
    register$: Subject<{type: RegisterType, data: any}>

    private config: {host: string, port: number}
    private server: OSC | undefined
    private registerMap: Map<RegisterType, {host: string, port: number, path: string, once?:boolean}>

    constructor(host: string, port: number) {
        super('osc-server')

        this.command$ = new Subject()
        this.request$ = new Subject()
        this.register$ = new Subject()
        this.registerMap = new Map()
        this.config = { host, port }
    }

    override listen() {
        super.listen()

        const options = { 
            type: 'udp4',
            open: { host: this.config.host, port: this.config.port },
        }

        this.server = new OSC({plugin: new OSC.DatagramPlugin(options)})

        this.server.on('open', () => {
            this.reachable$.next(true)
            this.logger.debug("connection was established")
        })

        this.server.on('close', () => {
            this.reachable$.next(false)
            this.logger.debug("connection was closed")
        })

        this.server.on('error', (err: Error) => {
            this.reachable$.next(false)
            this.logger.error("an error occurred", err.stack)
        })

        this.addCommands()

        this.server.open()

        this.register$.subscribe(({type, data}) => {
            this.sendRegister(type, data)
        })

        this.logger.debug('listening on', this.config)
    }

    private addCommands() {
        if (!this.server) return

        // COMMANDS
        this.server.on('/gabin/on', () => {
            this.command('on', {})
        })
        this.server.on('/gabin/off', () => {
            this.command('off', {})
        })
        this.server.on('/gabin/config', (message: any) => {
            if (!message.args.length) return
            this.command('config', message.args[0], true)
        })
        this.server.on('/gabin/profile', (message: any) => {
            if (!message.args.length) return
            this.command('profile', message.args[0])
        })

        this.server.on('/gabin/profiles', (message: any) => {
            if (!message.args.length) return
            this.request('profiles', message.args[0], message.args[1], message.args[2])
        })
        this.server.on('/gabin/devices', (message: any) => {
            if (!message.args.length) return
            this.request('devices', message.args[0], message.args[1], message.args[2])
        })

        this.server.on('/register/*', (message: any) => {
            if (!message.args.length) return
            const type = message.address.split('/').pop()
            this.register(type, message.args[0], message.args[1], message.args[2])
        })
        this.server.on('/unregister/*', (message: any) => {
            const type = message.address.split('/').pop()
            this.unregister(type)
        })
    }

    private command(type: CmdType, data: any, toJson?: boolean) {
        this.logger.debug('command', {type, data})
        if (CMD_TYPES.indexOf(type) === -1) return

        if (data && toJson) {
            try {
                data = JSON.stringify(data)
            } catch (e) {
                this.logger.error('Can\'t stringify data', data)
                return
            }
        }
        this.command$.next({ type, data })
    }

    private request(type: RequestType, host: string, port: number, path: string, data?: any) {
        this.logger.debug('request', {type, host, port, path})
        if (REQUEST_TYPES.indexOf(type) === -1) return

        if (!this.register(type, host, port, path, true)) return

        this.request$.next({ type, data })
    }

    private register(type: RegisterType, host: string, port: number, path: string, once:boolean =false): boolean {
        this.logger.debug('register', {type, host, port, path, once})
        if (REGISTER_TYPES.indexOf(type) === -1) return false
        if (!host || !parseInt(port.toString()) || !path) return false

        this.registerMap.set(type, { host, port, path, once })
        return true
    }

    private unregister(type: RegisterType) {
        this.logger.debug('unregister', {type})
        if (REGISTER_TYPES.indexOf(type) === -1) return

        this.registerMap.delete(type)
    }

    private sendRegister(type: RegisterType, data: string) {
        if (!this.server || !this.isReachable || !this.config) return

        const register = this.registerMap.get(type)
        if (!register) return

        data = typeof data === 'string' ? data : JSON.stringify(data)

        const message = new OSC.Message(register.path, data)
        this.logger.debug(`sending message: ${message.address}`)
        this.server.send(message, { port: register.port, host: register.host })

        if (register.once) this.unregister(type)
    }

    override async clean() {
        this.reachable$.next(false)

        this.server?.close()
        this.server = undefined

        super.clean()
    }

    on(path: string, callback: (message: any) => void) {
        if (!this.server) return

        this.server.on(path, callback)
    }

    send(path: string, port: number) {
        if (!this.server || !this.isReachable || !this.config) return

        const message = new OSC.Message(path)
        this.logger.debug(`sending message: ${message.address}`)
        this.server.send(message, { port })
    }

    getConfig(): {host: string, port: number} {
        return this.config
    }
}
