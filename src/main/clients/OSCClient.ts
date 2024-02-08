import { BehaviorSubject, Subject } from 'rxjs'

import { Client } from '../../main/clients/Client'

import db from '../../main/utils/db'

import type { OscServer } from '../../main/servers/OscServer'
import type {
    Asset,
    MicId,
    Connection
} from '../../types/protocol'

export class OscClient extends Client {

    mainScene$: BehaviorSubject<Asset['scene']['name']|undefined>
    triggeredShot$: BehaviorSubject<Asset['source']['name']|undefined>
    autocam$: BehaviorSubject<boolean>
    micAvailability$: Subject<{mic: MicId, available: boolean}>

    private osc: OscServer
    private config: Connection | undefined

    constructor(osc: OscServer, fromProfile = true) {
        super('osc-client')

        this.osc = osc

        this.mainScene$ = new BehaviorSubject(<Asset['scene']['name']|undefined>undefined)
        this.triggeredShot$ = new BehaviorSubject(<Asset['source']['name']|undefined>undefined)
        this.autocam$ = new BehaviorSubject(<boolean>true)
        this.micAvailability$ = new Subject()

        if (fromProfile) this.getConfigFromProfile()

    }

    private getConfigFromProfile() {
        const config = db.getSpecificAndDefault(['connections', 'osc'], true)
        this.config = config.defaultValue
    }

    private splitIp(ip: string) {
        const c = ip.split(':')
        return {
            host: c[0],
            port: parseInt(c[1])
        }
    }

    private init(connection?: Connection) {
        if (connection) {
            this.config = connection
        }

        this.addCommands()

        this.reachable$.next(true)
    }

    private addCommands() {
        this.osc.on('/scene/.*', (message: any) => {
            const scene = message.address.split('/').pop()
            this.sceneTransition(scene)
        })
        this.osc.on('/source/.*', (message: any) => {
            const source = message.address.split('/').pop()
            this.sourceTrigger(source)
        })
        this.osc.on('/mic/.*', (message: any) => {
            if (!message.args.length || [0,1].indexOf(message.args[0]) === -1) return
            
            const mic = message.address.split('/').pop()
            const available = (message.args[0]===1)
            this.availableMic(mic, available)
        })
        this.osc.on('/autocam', (message: any) => {
            if (!message.args.length || [0,1].indexOf(message.args[0]) === -1) return
            const autocam = (message.args[0]===1)
            this.autocam(autocam)
        })
    }

    override connect(connection?: Connection) {
        super.connect()
        this.init(connection)
    }

    send(path: string) {
        if (!this.config) return

        const clientIp = this.splitIp(this.config.ip)
        this.osc.send(path, clientIp.port, clientIp.host)
    }

    override clean() {
        this.reachable$.next(false)

        super.clean()
    }

    private sceneTransition(sceneName: Asset['scene']['name']) {
        this.mainScene$.next(sceneName)
    }

    private availableMic(mic: MicId, available: boolean) {
        this.micAvailability$.next({mic, available})
    }

    private autocam(autocam: boolean) {
        this.autocam$.next(autocam)
    }

    private sourceTrigger(sourceName: Asset['source']['name']) {
        this.triggeredShot$.next(sourceName)
    }

    shoot(container: Asset['container'], source: Asset['source']) {
        if (!this.isReachable || !this.osc.isReachable) {
            this.logger.error('Can\'t shoot, osc not connected')
        }

        const scene_ = this.mainScene$.getValue()
        if (!scene_) {
            this.logger.error('Can\'t shoot, no scene selected')
            return
        }

        const shot = container.sources.find(s => s.name === source.name)
        if (!shot) {
            this.logger.error('This shot does not exist', { scene: this.mainScene$.getValue(), container: container.name, source: source.name } )
            return
        }

        this.send(shot.options.path)
    }

}
