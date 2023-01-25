import { BehaviorSubject } from 'rxjs'

import { ObsServer } from '@src/main/servers/ObsServer'
import { Client } from '@src/main/clients/Client'

import db from '@src/main/utils/db'

import type {
    VideoDeviceSettings,
    ObsAssetId,
    ObsScene,
    ObsSource,
} from '@src/types/protocol'

export class ObsClient extends Client {

    scenes$: BehaviorSubject<ObsScene[]>
    mainScene$: BehaviorSubject<ObsAssetId['scene']>

    private obs: ObsServer
    private containers: VideoDeviceSettings[]
    private mainScenes: ObsAssetId['scene'][]

    constructor() {
        super('obs')

        this.obs = new ObsServer()
        this.scenes$ = this.obs.scenes$
        this.mainScene$ = new BehaviorSubject('')
        this.mainScenes = []
        this.containers = []
    }

    init() {
        const containers = db.getSpecificAndDefault(['settings', 'containers'], true)
        this.containers = containers.defaultValue

        this.mainScenes = this.getMainScenes()

        this.addSubscription(
            containers.configPart$.subscribe(() => {
                if (this.isReachable) {
                    this.mainScenes = this.getMainScenes()
                }
            })
        )

        this.addSubscription(
            this.obs.reachable$.subscribe(r => {
                console.log("OBS Client - OBS server reachable sub", r)
                if (r !== this.isReachable){
                    console.log("OBS Client - update reachable")
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
        this.manageRecording()
        this.manageTransitions()
    }

    private manageRecording() {
        // DO NOT REMOVE - Catching 'start recording' event
        // DO NOT REMOVE - Catching 'stop recording' event
        // this.obs.websocket.on('RecordingStarted', () => {
        this.obs.websocket.on('RecordStateChanged', (data) => {
            console.log(data)
            this.logger.info('Recording State Changed.')

            // this.logger.info('Recording started.')
            // this.logger.info('Recording stopped.')
        })
    }

    private manageTransitions() {
        // this.obs.websocket.on('TransitionBegin', (data) => {
        this.obs.websocket.on('CurrentProgramSceneChanged', (data) => {
            // this.logger.info(`scene transition from '${data['from-scene']}' to '${data['to-scene']}'`)
            // this.sceneTransition(data['to-scene'])
            this.logger.info(`scene changed to '${data.sceneName}'`)
            this.sceneTransition(data.sceneName)
        })
    }

    private sceneTransition(scene: ObsAssetId['scene']) {
        if (this.mainScenes.indexOf(scene) !== -1) {
            this.mainScene$.next(scene)
        } else {
            this.logger.info('obs is on a non-config scene', scene)
        }
    }

    private onError(err: unknown) {
        this.logger.error(err)
        this.reachable$.next(false)
    }

    private getMainScenes(): ObsAssetId['scene'][] {
        return (this.containers.reduce((p, c) => p.concat([c.scene]), <ObsAssetId['scene'][]>[]))
    }

    private isValidScene(sceneId: ObsAssetId['scene']): boolean {
        const scenes = this.scenes$.getValue()
        return (scenes.find(s => s.id === sceneId)? true : false)
    }

    private getSourceFromScene(sceneId: string): ObsScene['sources'] {
        const scenes = this.scenes$.getValue()
        const scene = scenes.find(s => s.id === sceneId)

        return (scene? scene.sources : [])
    }

    shoot(containerId: ObsAssetId['scene'], shotName: ObsSource['name']) {
        if (!this.isReachable) {
            this.logger.error('Can\'t shoot, ObsWebsocket not connected')
        }

        if (!this.isValidScene(containerId)){
            this.logger.error('This container does not exist', { containerId } )
            return
        }

        const shots = this.getSourceFromScene(containerId)
        const shot = shots.find(s => s.name === shotName)

        if (!shot) {
            this.logger.error('This shot does not exist', { shotName } )
            return
        }

        this.obs.websocket
        // .call('SetSceneItemRender', {
        .call('SetSceneItemEnabled', {
            sceneName: containerId,
            sceneItemId: shot.id,
            sceneItemEnabled: true
        })
        .catch((err) => this.onError(err))

        for (const shot_ of shots) {
            if (shot_.name === shotName) continue

            this.obs.websocket
            .call('SetSceneItemEnabled', {
                sceneName: containerId,
                sceneItemId: shot_.id,
                sceneItemEnabled: false,
            })
            .catch((err) => this.onError(err))
        }
    }
}
