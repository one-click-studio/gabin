import { BehaviorSubject } from 'rxjs'

import { OscServer } from '../../main/servers/OscServer'
import { Client } from '../../main/clients/Client'

import type {
    Asset,
} from '../../types/protocol'

import db from '../../main/utils/db'


export class OscClient extends Client {

    mainScene$: BehaviorSubject<Asset['scene']|undefined>

    private osc: OscServer
    private scenes: Asset['scene'][]

    constructor() {
        super('osc-client')

        this.osc = new OscServer()
        this.mainScene$ = new BehaviorSubject<Asset['scene']|undefined>(undefined)
        this.scenes = []

    }

    init() {
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
            }
        })

        this.osc.listen()
    }

    override connect() {
        super.connect()
        this.init()
    }

    override clean() {
        this.reachable$.next(false)

        this.osc.clean()
        super.clean()
    }

    private sceneTransition(sceneName: Asset['scene']['name']) {
        const scene = this.scenes.find(s => s.name === sceneName)
        if (scene) {
            this.mainScene$.next(scene)
        } else {
            this.logger.info('video mixer is on a non-config scene', scene)
            this.mainScene$.next(undefined)
        }
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

        const container_ = this.mainScene$.getValue()?.containers.find(c => c.name === container.name)
        if (!container_){
            this.logger.error('This container does not exist', { scene: scene_.name, container: container.name } )
            return
        }

        const shot = container_.sources.find(s => s.name === source.name)
        if (!shot) {
            this.logger.error('This shot does not exist', { scene: scene_.name, container: container_.name, source: source.name } )
            return
        }

        this.osc.send(shot.options.path)
    }

}
