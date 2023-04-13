import { BehaviorSubject } from 'rxjs'

import { ObsServer } from '../../main/servers/ObsServer'
import { Client } from '../../main/clients/Client'

import type {
    Asset,
} from '../../types/protocol'

export class ObsClient extends Client {

    scenes$: BehaviorSubject<Asset['scene'][]>
    mainScene$: BehaviorSubject<Asset['scene']['name']|undefined>

    private obs: ObsServer

    constructor() {
        super('obs')

        this.obs = new ObsServer()
        this.scenes$ = this.obs.scenes$
        this.mainScene$ = new BehaviorSubject<Asset['scene']['name']|undefined>(undefined)
    }

    init() {
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
        this.mainScene$.next(sceneName)
    }

    private onError(err: unknown) {
        this.logger.error(err)
        this.reachable$.next(false)
    }

    shoot(container: Asset['container'], source: Asset['source']) {
        if (!this.isReachable) {
            this.logger.error('Can\'t shoot, ObsWebsocket not connected')
        }

        const shots = container.sources
        const shot = shots.find(s => s.name === source.name)

        if (!shot) {
            this.logger.error('This shot does not exist', { source: source.name } )
            return
        }

        this.obs.websocket
        .call('SetSceneItemEnabled', {
            sceneName: container.name,
            sceneItemId: shot.options.id,
            sceneItemEnabled: true
        })
        .catch((err) => this.onError(err))

        for (const shot_ of shots) {
            if (shot_.name === source.name) continue

            this.obs.websocket
            .call('SetSceneItemEnabled', {
                sceneName: container.name,
                sceneItemId: shot_.options.id,
                sceneItemEnabled: false,
            })
            .catch((err) => this.onError(err))
        }
    }
}
