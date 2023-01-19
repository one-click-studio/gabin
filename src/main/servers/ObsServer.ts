import ObsWebSocket from 'obs-websocket-js'
import type { OBSResponseTypes } from 'obs-websocket-js'
import { BehaviorSubject } from 'rxjs'
import deepEqual from 'deep-equal'

import { Server } from '@src/main/servers/Server'

import type {
    Connection,
    ObsAssetId,
    ObsScene,
    ResponseObsScene,
    ResponseObsItem,
} from '@src/types/protocol'

import db from '@src/main/utils/db'

import { expoAttempt } from '@src/main/utils/utils'

export class ObsServer extends Server {
    websocket: ObsWebSocket
    scenes$: BehaviorSubject<ObsScene[]>
    initScene: ObsAssetId['scene'] = ''

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
        this.scenes$ = new BehaviorSubject<ObsScene[]>([])
    }

    async connect(connection?: Connection, once: boolean = false) {
        if (connection) {
            this.obsConfig = connection
        }

        this.isTryingToConnect = true
        this.tryToConnectOnce = once
        this.websocketConnection()
    }

    override async clean() {
        this._expo.stop()
        this._expo.reset()

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

        this.websocket.once('ConnectionError', (err) => this.logger.error('socket error', err))

        this.websocket.once('ConnectionClosed', () => {
            if (!this.tryToConnectOnce) {
                this._expo.reconnectAfterError(() => { this.connect() })
            }
            this.reachable$.next(false)
        })

        try {
            await this.websocket.connect('ws://'+this.obsConfig?.ip, this.obsConfig?.password, { rpcVersion:1 })

            this._expo.reset()
            await this.initWebsocket()
            this.isTryingToConnect = false
            this.reachable$.next(true)
        } catch (err) {
            this.logger.error('obs connect error', err)
            this.logger.error(JSON.stringify(err))
            if (!this.tryToConnectOnce) {
                this.logger.info(`reconnection try in ${this._expo.humanTimeout()}`)
                this._expo.reconnectAfterError(() => { this.connect() })
            }
        }

    }

    private async initWebsocket() {
        await this.manageSceneList()
    }

    private async manageSceneList() {

        const getSceneList = async () => {
            // return await this.websocket.send('GetSceneList')
            return await this.websocket.call('GetSceneList')
        }

        const getParsedSceneList = async () => {
            const data = await getSceneList()
            return this.parseScenes(data.scenes)
        }

        const updateSceneList = (scenes: ObsScene[]) => {
            const oldScenes = this.scenes$.getValue()
            if (!deepEqual(oldScenes, scenes)) {
                this.scenes$.next(scenes)
            }
        }

        // this.websocket.on('SceneCollectionChanged', async () => {
        this.websocket.on('SceneCollectionListChanged', async () => {
            this.logger.info('scene collection changed')
            const scenes = await getParsedSceneList()
            updateSceneList(scenes)
        })
        // this.websocket.on('SceneItemAdded', async () => {
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
        // this.websocket.on('ScenesChanged', async (data) => {
        this.websocket.on('SceneListChanged', async (data) => {
            this.logger.info('scenes changed')
            const scenes = await this.parseScenes(data.scenes)
            updateSceneList(scenes)
        })

        const data = await getSceneList()
        // this.initScene = data['current-scene']
        this.initScene = data['currentProgramSceneName']
        const scenes = await this.parseScenes(data.scenes)
        updateSceneList(scenes)
    }

    private async getSceneItemList(sceneName: ObsAssetId['scene']) {
        return await this.websocket.call('GetSceneItemList', { sceneName })
    }

    private async parseScenes(scenes: OBSResponseTypes['GetSceneList']['scenes']): Promise<ObsScene[]> {
        const data: ObsScene[] = []

        for (const scene of scenes as ResponseObsScene[]){
            scene.sceneIndex
            const items = await this.getSceneItemList(scene.sceneName)
            const sceneItems = items.sceneItems as ResponseObsItem[]
            data.push({
                id: scene.sceneName,
                sources: sceneItems.map(si => ({
                    id: si.sceneItemId,
                    name: si.sourceName
                }))
            })
        }

        return data
    }
}
