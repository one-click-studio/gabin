import { BehaviorSubject, Subject } from 'rxjs'

import { OscServer } from '../../main/servers/OscServer'
import { Client } from '../../main/clients/Client'

import type {
    Asset,
    MicId,
    ConnectionsConfig
} from '../../types/protocol'

import db from '../../main/utils/db'


export class OscClient extends Client {

    mainScene$: BehaviorSubject<Asset['scene']['name']|undefined>
    triggeredShot$: BehaviorSubject<Asset['source']['name']|undefined>
    micAvailability$: Subject<{mic: MicId, available: boolean}>
    autocam$: BehaviorSubject<boolean>

    private osc: OscServer
    private scenes: Asset['scene'][]

    constructor(fromProfile = true) {
        super('osc-client')

        this.osc = new OscServer(fromProfile)
        this.mainScene$ = new BehaviorSubject<Asset['scene']['name']|undefined>(undefined)
        this.triggeredShot$ = new BehaviorSubject(<Asset['source']['name']|undefined>undefined)
        this.micAvailability$ = new Subject()
        this.autocam$ = new BehaviorSubject(<boolean>true)

        this.scenes = []
    }

    init(connections?: ConnectionsConfig['osc']) {
        const scenes = db.getSpecificAndDefault(['settings', 'containers'], true)
        this.scenes = scenes.defaultValue

        this.addSubscription(
            scenes.configPart$.subscribe((scenes_) => {
                this.scenes = scenes_
            })
        )

        this.addSubscription(
            this.osc.reachable$.subscribe(r => {
                if (r !== this.isReachable){
                    this.reachable$.next(r)
                }
            })
        )

        this.reachable$.subscribe(r => {
            if (r) {
                this.osc.on('/scene/*', (message: any) => {
                    const scene = message.address.split('/').pop()
                    this.sceneTransition(scene)
                })
                this.osc.on('/source/*', (message: any) => {
                    const source = message.address.split('/').pop()
                    this.sourceTrigger(source)
                })
                this.osc.on('/mic/*', (message: any) => {
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
        })

        this.osc.listen(connections)
    }

    override connect(connections?: ConnectionsConfig['osc']) {
        super.connect()
        this.init(connections)
    }

    override clean() {
        this.reachable$.next(false)

        this.osc.clean()
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

    send(path: string){
        if (!this.isReachable || !this.osc.isReachable) {
            this.logger.error('Can\'t send, osc not connected')
        }

        this.osc.send(path)
    }

}
