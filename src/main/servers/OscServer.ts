import OSC from 'osc-js'

import { Server } from '../../main/servers/Server'

import type {
    Connection,
    ConnectionsConfig,
} from '../../types/protocol'

import db from '../../main/utils/db'

export class OscServer extends Server {
    private oscConfig: {
        client: Connection
        server: Connection
    } | undefined
    private server: OSC | undefined

    constructor(fromProfile = true) {
        super('osc-server')

        if (fromProfile) {
            this.getConfigFromProfile()
        }
    }

    private getConfigFromProfile() {
        const oscConfig = db.getSpecificAndDefault(['connections', 'osc'], true)
        this.oscConfig = oscConfig.defaultValue
    }

    override listen(connections?: ConnectionsConfig['osc']) {
        if (connections) {
            this.oscConfig = connections
        }

        if (!this.oscConfig || !this.oscConfig.server || !this.oscConfig.client) return
        super.listen()

        const serverIp = this.splitIp(this.oscConfig.server.ip)
        const clientIp = this.splitIp(this.oscConfig.client.ip)
        const options = { 
            type: 'udp4',
            open: { host: serverIp.host, port: serverIp.port },
            send: { host: clientIp.host, port: clientIp.port }
        }

        this.server = new OSC({plugin: new OSC.DatagramPlugin(options)})

        this.server.on('open', () => {
            this.reachable$.next(true)
            this.logger.info("connection was established")
        })

        this.server.on('close', () => {
            this.reachable$.next(false)
            this.logger.info("connection was closed")
        })

        this.server.on('error', (err: Error) => {
            this.reachable$.next(false)
            this.logger.error("an error occurred", err.stack)
        })

        this.server.open()
    }

    override async clean() {
        this.reachable$.next(false)

        this.server?.close()
        this.server = undefined

        super.clean()
    }

    private splitIp(ip: string) {
        const c = ip.split(':')
        return {
            host: c[0],
            port: parseInt(c[1])
        }
    }

    on(path: string, callback: (message: any) => void) {
        if (!this.server) return

        this.server.on(path, callback)
    }

    send(path: string) {
        if (!this.server || !this.isReachable) return

        const message = new OSC.Message(path)
        this.logger.debug(`sending message: ${message.address}`)
        this.server.send(message)
    }

}
