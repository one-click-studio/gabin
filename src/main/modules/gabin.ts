import { Subject, BehaviorSubject } from 'rxjs'
import { skip } from 'rxjs/operators'
import type { Subscription } from 'rxjs'

import { ObsClient } from '../clients/OBSClient'
import { OscClient } from '../clients/OSCClient'
import { VmixClient } from '../clients/VMIXClient'
import { AutocamClient } from '../clients/AutocamClient'

import db from '../utils/db'

import { getLogger } from '../utils/logger'

import type { Logger } from '../utils/logger'
import type { OscServer } from '../../main/servers/OscServer'
import type {
    Shoot,
    AvailableMicsMap,
    Asset,
    MicId,
    AudioDeviceSettings,
    ConnectionType
} from '../../types/protocol'

interface Connections {
    obs: boolean
    osc: boolean
    vmix: boolean
}

export class Gabin {
    isReady: boolean

    obs: ObsClient | undefined
    osc: OscClient | undefined
    vmix: VmixClient | undefined
    autocam: AutocamClient | undefined

    connections$: BehaviorSubject<Connections>

    power$: BehaviorSubject<boolean>
    shoot$: Subject<Shoot>
    autocam$: Subject<boolean>
    availableMics$: BehaviorSubject<AvailableMicsMap>
    triggeredShot$: BehaviorSubject<Asset['source']>
    timeline$: BehaviorSubject<MicId>
    volumeMics$: BehaviorSubject<Map<string, number>>

    private logger: Logger
    private subscriptions: Subscription[] = []
    private scenes: Asset['scene'][]
    private defaultConnection: ConnectionType | undefined

    private oscServer: OscServer

    constructor(oscServer: OscServer) {
        this.logger = getLogger('Gabin 🤖')

        this.oscServer = oscServer

        this.isReady = false

        this.power$ = new BehaviorSubject<boolean>(false)
        this.shoot$ = new Subject<Shoot>()
        this.autocam$ = new Subject<boolean>()
        this.triggeredShot$ = new BehaviorSubject({ name: '' })
        this.availableMics$ = new BehaviorSubject<AvailableMicsMap>(new Map())
        this.timeline$ = new BehaviorSubject('')
        this.volumeMics$ = new BehaviorSubject<Map<string, number>>(new Map())

        this.connections$ = new BehaviorSubject<Connections>({
            obs: false,
            osc: false,
            vmix: false
        })

        const containers = db.getSpecificAndDefault(['settings', 'containers'], true)
        this.scenes = containers.defaultValue

        this.init()
    }

    private connect() {
        const connections = db.getSpecificAndDefault(['connections'], true)
        this.logger.info('is connecting to', connections.defaultValue)

        this.defaultConnection = connections.defaultValue.type
        if (this.defaultConnection === 'obs') {
            this.obs = new ObsClient()
        } else if (this.defaultConnection === 'vmix') {
            this.vmix = new VmixClient()
        }
        this.osc = new OscClient(this.oscServer, this.defaultConnection === 'osc')
        this.autocam = new AutocamClient()

        if (this.obs) this.updateConnections(this.obs.reachable$, 'obs')
        if (this.osc) this.updateConnections(this.osc.reachable$, 'osc')
        if (this.vmix) this.updateConnections(this.vmix.reachable$, 'vmix')

        this.isReady = true
    }

    private updateConnections(observable: BehaviorSubject<boolean>, key: keyof Connections) {
        observable.subscribe(r => {
            const c = this.connections$.getValue()
            c[key] = r
            this.connections$.next(c)
        })
    }

    private async init() {
        this.logger.info('is waking up 👋')

        if (!this.isReady) {
            this.connect()
        }

        this.initAvailableMics()

        this.obs?.connect()
        this.osc?.connect()
        this.vmix?.connect()
        this.autocam?.connect()

        this.manageEvents()
        this.power$.next(true)
    }

    clean() {
        this.logger.info('is going to sleep 💤')
        this.cleanSubscriptions()

        this.obs?.clean()
        this.vmix?.clean()
        this.autocam?.clean()

        this.power$.next(false)
    }

    private cleanSubscriptions() {
        for (const s of this.subscriptions) {
            s.unsubscribe()
        }
    }

    private initAvailableMics() {
        const audioDevices = db.getSpecificAndDefault(['settings', 'mics'], true)
        const devices: AudioDeviceSettings[] = audioDevices.defaultValue
        const mics = devices.reduce((p, d) => p.concat(d.micsName.filter((_m,i) => d.mics[i])), <string[]>[])
        const micsMap: AvailableMicsMap = new Map(mics.map((v)=>([v, true])))

        this.availableMics$.next(micsMap)
    }

    private selfEvents() {
        if (!this.autocam) return

        // AUTOCAM EVT
        this.subscriptions.push(this.autocam.shoot$.subscribe(shot => {
            this.shoot$.next(shot)
        }))
        this.autocam.timeline$.subscribe(micId => {
            this.timeline$.next(micId)
        })
        this.autocam.volumeMics$.subscribe(vm => {
            this.volumeMics$.next(vm)
        })

        // OSC EVT
        if (this.osc) {
            this.subscriptions.push(this.osc.triggeredShot$.pipe(skip(1)).subscribe((shotName) => {
                this.triggerShot(shotName)
            }))
            this.subscriptions.push(this.osc.autocam$.pipe(skip(1)).subscribe((autocam) => {
                this.autocam$.next(autocam)
            }))
        }
    }

    private manageEvents() {
        if (!this.autocam) return

        this.selfEvents()

        // OBS EVT
        if (this.obs) {
            this.subscriptions.push(this.obs.mainScene$.pipe(skip(1)).subscribe(this.setNewScene.bind(this)))
        }

        // VMIX EVT
        if (this.vmix) {
            this.subscriptions.push(this.vmix.mainScene$.pipe(skip(1)).subscribe(this.setNewScene.bind(this)))
        }

        // OSC EVT
        if (this.osc) {
            this.subscriptions.push(this.osc.mainScene$.pipe(skip(1)).subscribe(this.setNewScene.bind(this)))
            this.subscriptions.push(this.osc.micAvailability$.subscribe(({mic, available}) => {
                this.toggleAvailableMic(mic, available)
            }))
        }

        this.subscriptions.push(this.shoot$.subscribe(shoot => {
            if (shoot.mode === 'unhandled') return
            
            this.logger.info('has made magic shot change ✨', `${shoot.container.name} | ${shoot.shot.name} | ${shoot.mode} mode`)

            if (this.osc?.isReachable && this.defaultConnection === 'osc') this.osc.shoot(shoot.container, shoot.shot)
            if (this.obs?.isReachable) this.obs.shoot(shoot.container, shoot.shot)
            if (this.vmix?.isReachable) this.vmix.shoot(shoot.container, shoot.shot)
        }))

        this.subscriptions.push(this.autocam$.subscribe((autocam) => {
            this.logger.info('has to toggle autocam 🎚')
            this.autocam?.setEnabled(autocam)
        }))

        this.subscriptions.push(this.availableMics$.subscribe((availableMics) => {
            this.logger.info('has new availability map 🗺', availableMics)
            this.autocam?.setAvailableMics(availableMics)
        }))

        this.subscriptions.push(this.triggeredShot$.subscribe((source) => {
            if (!source.name) return
            this.logger.info('has been ordered to shot 😣')
            this.autocam?.forcedShot$.next(source)
        }))
    }

    toggleAvailableMic(micId: MicId, available: boolean|undefined=undefined) {
        const micsMap = this.availableMics$.getValue()

        const mic = micsMap.get(micId)
        if (mic === available) return
        micsMap.set(micId, !mic)

        this.availableMics$.next(micsMap)
    }

    private triggerShot(sourceName: Asset['source']['name']|undefined) {
        if (!sourceName) return

        for (const scene of this.scenes) {
            for (const container of scene.containers) {
                for (const source of container.sources) {
                    if (source.name === sourceName) {
                        this.triggeredShot$.next(source)
                        return
                    }
                }
            }
        }

        this.logger.error('cannot find source 🤷‍♂️', sourceName)
    }

    private setNewScene(sceneName: Asset['scene']['name']|undefined) {
        const scene = this.getScene(sceneName)

        this.logger.info('has received a new scene 🎬', scene?.name)
        if (this.autocam?.isReachable) this.autocam.setCurrentScene(scene?.name)

        if (!scene && sceneName) {
            this.shoot$.next({
                sceneName,
                container: { name: '', sources: [] },
                shot: { name: '' },
                mode: 'unhandled'
            })
        }
    }

    private getScene(sceneName: Asset['scene']['name']|undefined): Asset['scene']|undefined {
        if (!sceneName) return
        return this.scenes.find(s => s.name === sceneName)
    }

    updateDeviceOptions(devices: AudioDeviceSettings[]) {
        this.autocam?.updateAudioDevices(devices)
    }

}