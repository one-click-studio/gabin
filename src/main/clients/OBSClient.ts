import { BehaviorSubject } from 'rxjs'

import { ObsServer } from '../../main/servers/ObsServer'
import { Client } from '../../main/clients/Client'

import db from '../../main/utils/db'

import type {
    Asset,
} from '../../types/protocol'

export class ObsClient extends Client {

    scenes$: BehaviorSubject<Asset['scene'][]>
    mainScene$: BehaviorSubject<Asset['scene']|undefined>

    private obs: ObsServer
    private containers: Asset['scene'][]

    constructor() {
        super('obs')

        this.obs = new ObsServer()
        this.scenes$ = this.obs.scenes$
        this.mainScene$ = new BehaviorSubject<Asset['scene']|undefined>(undefined)
        this.containers = []
    }

    init() {
        const containers = db.getSpecificAndDefault(['settings', 'containers'], true)
        this.containers = containers.defaultValue
        
        this.addSubscription(
            containers.configPart$.subscribe((containers_) => {
                this.containers = containers_
            })
        )

        this.addSubscription(
            this.obs.reachable$.subscribe(r => {
                if (r !== this.isReachable){
                    this.reachable$.next(r)
                    if (r){
                        this.sceneTransition(this.obs.initScene)
                    }
                }
            })
        )

        this.scenes$.subscribe(scenes => {
            if (scenes.length > 0 && !this.isReachable){
                this.sceneTransition(this.obs.initScene)
            }
        })

        this.reachable$.subscribe(r => {
            if (r) {
                this.initWebsocket()
            }
        })
    }

    override async connect() {
        super.connect()
        this.init()

        this.obs.connect()
    }

    override clean() {
        this.obs.clean()
        this.reachable$.next(false)

        super.clean()
    }

    private initWebsocket() {
        this.manageTransitions()
    }

    private manageTransitions() {
        this.obs.websocket.on('CurrentProgramSceneChanged', (data) => {
            this.logger.info(`scene changed to '${data.sceneName}'`)
            this.sceneTransition(data.sceneName)
        })
    }

    private sceneTransition(sceneName: Asset['scene']['name']) {
        const scene = this.containers.find(c => c.name === sceneName)
        if (scene) {
            this.mainScene$.next(scene)
        } else {
            this.logger.info('obs is on a non-config scene', scene)
            this.mainScene$.next(undefined)
        }
    }

    private onError(err: unknown) {
        this.logger.error(err)
        this.reachable$.next(false)
    }

    private isValidContainer(container: Asset['container']): boolean {
        const found = this.mainScene$.getValue()?.containers.find(c => c.id === container.id)
        return (found? true : false)
    }

    private getSourcesFromContainer(container: Asset['container']): Asset['source'][] {
        const c = this.mainScene$.getValue()?.containers.find(c => c.id === container.id)
        return (c? c.sources : [])
    }

    shoot(container: Asset['container'], source: Asset['source']) {
        if (!this.isReachable) {
            this.logger.error('Can\'t shoot, ObsWebsocket not connected')
        }

        if (!this.isValidContainer(container)){
            this.logger.error('This container does not exist', { container: container.name } )
            return
        }

        const shots = this.getSourcesFromContainer(container)
        const shot = shots.find(s => s.name === source.name)

        if (!shot) {
            this.logger.error('This shot does not exist', { source: source.name } )
            return
        }

        this.obs.websocket
        .call('SetSceneItemEnabled', {
            sceneName: container.name,
            sceneItemId: shot.id,
            sceneItemEnabled: true
        })
        .catch((err) => this.onError(err))

        for (const shot_ of shots) {
            if (shot_.name === source.name) continue

            this.obs.websocket
            .call('SetSceneItemEnabled', {
                sceneName: container.name,
                sceneItemId: shot_.id,
                sceneItemEnabled: false,
            })
            .catch((err) => this.onError(err))
        }
    }
}
