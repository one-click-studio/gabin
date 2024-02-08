import { Server as ServerOsc, Client as ClientOsc, Message as MessageOsc } from 'node-osc';

import { Subject } from 'rxjs'
import { Server } from '../../main/servers/Server'

const CMD_TYPES = ['on', 'off', 'config', 'profile'] as const
type CmdType = typeof CMD_TYPES[number]

const REQUEST_TYPES = ['profiles', 'devices', 'isReady', 'register'] as const
type RequestType = typeof REQUEST_TYPES[number]

const REGISTER_TYPES = [...REQUEST_TYPES, 'shot', 'autocam', 'defaultProfile', 'mics'] as const
export type RegisterType = typeof REGISTER_TYPES[number]

export class OscServer extends Server {
    command$: Subject<{type: CmdType, data: any}>
    request$: Subject<{type: RequestType, data: any}>
    register$: Subject<{type: RegisterType, data: any}>

    private commands: Map<string, (msg:any)=>void>

    private config: {host: string, port: number}
    private serverOsc: ServerOsc | undefined
    private registerMap: Map<RegisterType, {host: string, port: number, path: string, once?:boolean}>

    constructor(host: string, port: number) {
        super('osc-server')

        this.command$ = new Subject()
        this.request$ = new Subject()
        this.register$ = new Subject()
        this.registerMap = new Map()
        this.commands = new Map()
        this.config = { host, port }
    }

    override listen() {
        super.listen()

        this.serverOsc = new ServerOsc(this.config.port, this.config.host, () => {
            this.reachable$.next(true)
            this.logger.info("connection was established")
        })

        const onMessage = (msg: any) => {
            this.logger.info(`Message`, {msg})
            
            const message = {
                address: msg[0],
                args: msg.slice(1)
            }

            let callback
            for (const [entry, cb] of this.commands.entries()) {
                const re = new RegExp('^'+entry+'$')
                const res = re.exec(message.address)
                if (res) {
                    callback = cb
                    break
                }
            }
            if (callback) callback(message)
        }

        this.serverOsc.on('message', (msg) => {
            onMessage(msg)
        })

        this.serverOsc.on('bundle', (bundle) => {
            bundle.elements.forEach((msg) => {
                onMessage(msg)
            })
        })

        this.addCommands()

        this.register$.subscribe(({type, data}) => {
            this.sendRegister(type, data)
        })

        this.logger.info('listening on', this.config)
    }

    private addCommands() {

        this.commands.set('/gabin/on', () => {
            this.command('on', {})
        })
        this.commands.set('/gabin/off', () => {
            this.command('off', {})
        })
        this.commands.set('/gabin/config', (message: any) => {
            if (!message.args.length) return
            this.command('config', message.args[0], true)
        })
        this.commands.set('/gabin/profile', (message: any) => {
            if (!message.args.length) return
            this.command('profile', message.args[0])
        })

        this.commands.set('/gabin/is-ready', (message: any) => {
            if (!message.args.length || !message.args[0] || !message.args[1]|| !message.args[2]) return
            this.request('isReady', message.args[0], message.args[1], message.args[2])
        })
        this.commands.set('/gabin/profiles', (message: any) => {
            if (!message.args.length || !message.args[0] || !message.args[1]|| !message.args[2]) return
            this.request('profiles', message.args[0], message.args[1], message.args[2])
        })
        this.commands.set('/gabin/devices', (message: any) => {
            if (!message.args.length || !message.args[0] || !message.args[1]|| !message.args[2]) return
            this.request('devices', message.args[0], message.args[1], message.args[2])
        })


        this.commands.set('/register/.*', (message: any) => {
            if (!message.args.length || !message.args[0] || !message.args[1]|| !message.args[2]) return
            const type = message.address.split('/').pop()
            this.register(type, message.args[0], message.args[1], message.args[2])
        })
        this.commands.set('/unregister/.*', (message: any) => {
            const type = message.address.split('/').pop()
            this.unregister(type)
        })
    }

    private command(type: CmdType, data: any, fromJson?: boolean) {
        this.logger.info('command', {type, data})
        if (CMD_TYPES.indexOf(type) === -1) return

        if (data && fromJson) {
            try {
                data = JSON.parse(data)
            } catch (e) {
                this.logger.error('Can\'t parse data', data)
                return
            }
        }
        this.command$.next({ type, data })
    }

    private request(type: RequestType, host: string, port: number, path: string, data?: any) {
        this.logger.info('request', {type, host, port, path})
        if (REQUEST_TYPES.indexOf(type) === -1) return

        if (!this.register(type, host, port, path, true)) return

        this.request$.next({ type, data })
    }

    private register(type: RegisterType, host: string, port: number, path: string, once:boolean =false): boolean {
        this.logger.info('register', {type, host, port, path, once})
        if (REGISTER_TYPES.indexOf(type) === -1) return false
        this.logger.info('register type found')
        if (!host || !parseInt(port.toString()) || !path) return false
        this.logger.info('host, port and path are valid')

        this.registerMap.set(type, { host, port, path, once })
        this.request$.next({ type: 'register', data: type })
        return true
    }

    private unregister(type: RegisterType) {
        this.logger.info('unregister', {type})
        if (REGISTER_TYPES.indexOf(type) === -1) return

        this.registerMap.delete(type)
    }

    private sendRegister(type: RegisterType, data: string) {
        if (!this.isReachable || !this.config) return

        const register = this.registerMap.get(type)
        if (!register) return

        data = typeof data === 'string' ? data : JSON.stringify(data)

        this.logger.info(`sending message: ${register.path}`)

        const client = new ClientOsc(register.host, register.port)
        const msg = new MessageOsc(register.path, data)
        client.send(msg)

        if (register.once) this.unregister(type)
    }

    override async clean() {
        this.reachable$.next(false)

        this.serverOsc?.close()
        this.serverOsc = undefined

        // this.server?.close()
        // this.server = undefined

        super.clean()
    }

    on(path: string, callback: (message: any) => void) {
        this.commands.set(path, callback)
        // if (!this.server) return

        // this.server.on(path, callback)
    }

    send(path: string, port: number, host: string) {
        if (!this.isReachable || !this.config) return
        // if (!this.server || !this.isReachable || !this.config) return

        const client = new ClientOsc(host, port)
        const msg = new MessageOsc(path)
        this.logger.info(`sending '${path}' to '${host}:${port}'`)
        client.send(msg)

        // const osc = new OSC({ plugin: new OSC.DatagramPlugin() })
        // osc.open({ host, port })

        // const message = new OSC.Message(path)
        // osc.send(message)

        // const message = new OSC.Message(path)
        // this.logger.info('sending', {message, port, host})
        // // this.logger.info(`sending message: ${message.address}`)
        // this.server.send(message, { host, port })
    }

    getConfig(): {host: string, port: number} {
        return this.config
    }
}
