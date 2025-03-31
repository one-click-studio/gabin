import ObsWebSocket from 'obs-websocket-js'
import type { OBSResponseTypes } from 'obs-websocket-js'
import { BehaviorSubject } from 'rxjs'
import deepEqual from 'deep-eql'

import { Server } from '../../main/servers/Server'

import type {
    Connection,
    Asset,
    ResponseObsScene,
    ResponseObsItem,
} from '../../types/protocol'

import db from '../../main/utils/db'

import { expoAttempt } from '../../main/utils/utils'

export class ObsServer extends Server {
    websocket: ObsWebSocket
    scenes$: BehaviorSubject<Asset['scene'][]>
    initScene: Asset['scene']['name'] = ''

    private obsConfig: Connection | undefined
    private _expo = new expoAttempt()
    private isTryingToConnect = false
    private tryToConnectOnce = false

    constructor(fromProfile = true) {
        super('obs-server')

        if (fromProfile) {
            this.getConfigFromProfile()
        }

        this.websocket = new ObsWebSocket()
        this.scenes$ = new BehaviorSubject<Asset['scene'][]>([])
    }

    async connect(connection?: Connection, once: boolean = false) {
        if (this._expo.getAttempts() === -1) {
            this._expo.reset()
        }

        if (connection) {
            this.obsConfig = connection
        }

        this.isTryingToConnect = true
        this.tryToConnectOnce = once
        this.websocketConnection()
    }

    override async clean() {
        this._expo.stop()

        if (this.websocket){
            this.websocket.removeAllListeners()
            this.websocket.disconnect()
        }

        this.reachable$.next(false)

        super.clean()
    }

    private getConfigFromProfile() {
        const obsConfig = db.getSpecificAndDefault(['connections', 'obs'], true)
        this.obsConfig = obsConfig.defaultValue

        this.addSubscription(
            obsConfig.configPart$.subscribe((config: Connection) => {
                this.obsConfig = config

                this.clean()
                if (this.isTryingToConnect || this.isReachable){
                    this.connect()
                }
            })
        )
    }

    private async websocketConnection() {
        this.websocket.removeAllListeners()

        let retryTimeout: NodeJS.Timeout

        const retryConnection = () => {
            clearTimeout(retryTimeout)
            retryTimeout = setTimeout(() => {
                this.logger.info(`reconnection try in ${this._expo.humanTimeout()}`)
                this._expo.reconnectAfterError(() => { this.connect() })
            }, 2000)
        }

        this.websocket.once('ConnectionError', (err) => this.logger.error('ConnectionError', err))

        this.websocket.once('ConnectionClosed', () => {
            this.logger.error('ConnectionClosed')

            if (!this.tryToConnectOnce) {
                retryConnection()
            }
            this.reachable$.next(false)
        })

        try {
            await this.websocket.connect('ws://'+this.obsConfig?.ip, this.obsConfig?.password, { rpcVersion:1 })

            await this.initWebsocket()
            this.isTryingToConnect = false
            this.reachable$.next(true)
        } catch (err) {
            this.logger.error('obs connect error', err)

            if (!this.tryToConnectOnce) {
                retryConnection()
            }
        }

    }

    private async initWebsocket() {
        await this.manageSceneList()
    }

    private async manageSceneList() {

        const getSceneList = async () => {
            return await this.websocket.call('GetSceneList')
        }

        const getParsedSceneList = async () => {
            const data = await getSceneList()
            return this.parseScenes(data.scenes)
        }

        const updateSceneList = (scenes: Asset['scene'][]) => {
            const oldScenes = this.scenes$.getValue()
            if (!deepEqual(oldScenes, scenes)) {
                this.scenes$.next(scenes)
            }
        }

        this.websocket.on('SceneCollectionListChanged', async () => {
            this.logger.info('scene collection changed')
            const scenes = await getParsedSceneList()
            updateSceneList(scenes)
        })
        this.websocket.on('SceneItemCreated', async () => {
            this.logger.info('source added')
            const scenes = await getParsedSceneList()
            updateSceneList(scenes)
        })
        this.websocket.on('SceneItemRemoved', async () => {
            this.logger.info('source added')
            const scenes = await getParsedSceneList()
            updateSceneList(scenes)
        })
        this.websocket.on('SceneListChanged', async (data) => {
            this.logger.info('scenes changed')
            const scenes = await this.parseScenes(data.scenes)
            updateSceneList(scenes)
        })

        const data = await getSceneList()
        this.initScene = data['currentProgramSceneName']
        const scenes = await this.parseScenes(data.scenes)
        updateSceneList(scenes)
    }

    private async getSceneItemList(sceneName: Asset['scene']['name']) {
        return await this.websocket.call('GetSceneItemList', { sceneName })
    }

    private async parseScenes(scenes: OBSResponseTypes['GetSceneList']['scenes']): Promise<Asset['scene'][]> {
        const data: Asset['scene'][] = []

        for (const scene of scenes as ResponseObsScene[]){
            const items = await this.getSceneItemList(scene.sceneName)
            const sceneItems = items.sceneItems as ResponseObsItem[]
            data.push({
                name: scene.sceneName,
                containers: [{
                    name: 'root',
                    sources: sceneItems.map(si => ({
                        name: si.sourceName,
                        options: {
                            id: si.sceneItemId,
                        }
                    }))
                }]
            })
        }

        // this.logger.info('scenes', data)

        return data
    }
}
