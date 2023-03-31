import OSC from 'osc-js'
import { Subject } from 'rxjs'

import { Server } from '../../main/servers/Server'

const CMD_TYPES = ['on', 'off', 'config', 'profile'] as const
type CmdType = typeof CMD_TYPES[number]

export class OscServer extends Server {
    command$: Subject<{type: CmdType, data: any}>

    private config: {host: string, port: number}
    private server: OSC | undefined

    constructor(host: string, port: number) {
        super('osc-server')

        this.command$ = new Subject()
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
            if (!message.args.length || [0,1].indexOf(message.args[0]) === -1) return
            this.command('config', message.args[0], true)
        })
        this.server.on('/gabin/profile', (message: any) => {
            if (!message.args.length || [0,1].indexOf(message.args[0]) === -1) return
            this.command('profile', message.args[0])
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
