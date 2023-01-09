import { Subject, BehaviorSubject } from 'rxjs'
import { skip } from 'rxjs/operators'
import type { Subscription } from 'rxjs'

import { ObsClient } from '@src/main/clients/OBSClient'
import { AutocamClient } from '@src/main/clients/AutocamClient'
import { StreamdeckClient } from '@src/main/clients/StreamdeckClient'
import { TcpServer } from '@src/main/servers/TcpServer'

import db from '@src/main/utils/db'

import type { Logger } from '@src/main/utils/logger'
import { getLogger } from '@src/main/utils/logger'

import type {
    Shoot,
    AvailableMicsMap,
    ObsAssetId,
    MicId,
    AudioDeviceSettings,
} from '@src/types/protocol'

interface Connections {
    obs: boolean
    streamdeck: boolean
}

export class Gabin {
    isOn: boolean
    isReady: boolean

    obs: ObsClient | undefined
    streamdeck: StreamdeckClient | undefined
    autocam: AutocamClient | undefined
    tcpServer: TcpServer | undefined

    connections$: BehaviorSubject<Connections>

    shoot$: Subject<Shoot>
    autocam$: Subject<boolean>
    availableMics$: BehaviorSubject<AvailableMicsMap>
    triggeredShot$: BehaviorSubject<ObsAssetId['source']>

    private logger: Logger
    private subscriptions: Subscription[] = []

    constructor() {
        this.logger = getLogger('Gabin0 🤖')

        this.isOn = false
        this.isReady = false

        this.shoot$ = new Subject<Shoot>()
        this.autocam$ = new Subject<boolean>()
        this.triggeredShot$ = new BehaviorSubject({ id: -1, name: '' })
        this.availableMics$ = new BehaviorSubject<AvailableMicsMap>(new Map())

        this.connections$ = new BehaviorSubject<Connections>({
            obs: false,
            streamdeck: false
        })

        this.logger.info('is currently asleep 💤')
    }

    private connect() {
        this.obs = new ObsClient()
        this.autocam = new AutocamClient()
        this.streamdeck = new StreamdeckClient()
        this.tcpServer = new TcpServer([this.streamdeck])

        this.obs.reachable$.subscribe(r => {
            const c = this.connections$.getValue()
            c.obs = r
            this.connections$.next(c)
        })

        this.streamdeck.reachable$.subscribe(r => {
            const c = this.connections$.getValue()
            c.streamdeck = r
            this.connections$.next(c)
        })

        this.isReady = true
    }

    async power(on: boolean) {
        if (!this.isOn && on){
            await this.on()
        } else if (this.isOn && !on){
            this.off()
        }
        return on
    }

    private async on() {
        this.logger.info('is waking up 👋')

        if (!this.isReady) {
            this.connect()
        }

        this.initAvailableMics()

        this.obs?.connect()
        this.autocam?.connect()
        this.streamdeck?.connect()
        this.tcpServer?.listen()

        this.streamdeck?.setAvailableMics(this.availableMics$.getValue())
        this.manageEvents()
        this.isOn = true
    }

    private off() {
        this.logger.info('is going to sleep 💤')
        this.cleanSubscriptions()

        this.obs?.clean()
        this.autocam?.clean()
        this.streamdeck?.clean()
        this.tcpServer?.clean()

        this.isOn = false
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
        if (!this.autocam || !this.obs || !this.streamdeck) {
            return
        }

        // AUTOCAM EVT
        this.subscriptions.push(this.autocam.shoot$.subscribe(shot => {
            this.shoot$.next(shot)
        }))
        // STREAMDECK EVT
        this.subscriptions.push(this.streamdeck.autocam$.pipe(skip(1)).subscribe((autoCam) => {
            this.autocam$.next(autoCam)
        }))
        this.subscriptions.push(this.streamdeck.triggeredShot$.pipe(skip(1)).subscribe((shotId) => {
            if (shotId) {
                this.triggeredShot$.next(shotId)
            }
        }))
    }

    private manageEvents() {
        if (!this.autocam || !this.obs || !this.streamdeck) {
            return
        }

        this.selfEvents()

        // OBS EVT
        this.subscriptions.push(this.obs.mainScene$.pipe(skip(1)).subscribe(sceneId => {
            this.logger.debug(sceneId)
            if (sceneId) {
                this.logger.info('has received a new scene from obs 🎬')
                if (this.autocam?.isReachable) this.autocam.setCurrentScene(sceneId)
            }
        }))
        // STREAMDECK EVT
        this.subscriptions.push(this.streamdeck.toggleMicAvailability$.subscribe((micId) => {
            this.toggleAvailableMic(micId)
        }))

        this.subscriptions.push(this.shoot$.subscribe(shoot => {
            this.logger.info('has made magic shot change ✨', `${shoot.containerId} | ${shoot.shotId.name} | ${shoot.mode} mode`)

            if (this.obs?.isReachable) this.obs.shoot(shoot.containerId, shoot.shotId.name)
            if (this.streamdeck?.isReachable) this.streamdeck.setCurrentShot(shoot.shotId)
        }))
        this.subscriptions.push(this.autocam$.subscribe((autocam) => {
            this.logger.info('has to toggle autocam 🎚')
            this.autocam?.setEnabled(autocam)
            this.streamdeck?.setAutocam(autocam)
        }))
        this.subscriptions.push(this.availableMics$.subscribe((availableMics) => {
            this.logger.info('has new availability map 🗺', availableMics)
            this.autocam?.setAvailableMics(availableMics)
            this.streamdeck?.setAvailableMics(availableMics)
        }))
        this.subscriptions.push(this.triggeredShot$.subscribe((shotId) => {
            if (shotId.id < 0) return
            this.logger.info('has been ordered to shot 😣')
            this.autocam?.forcedShot$.next(shotId)
        }))
    }

    toggleAvailableMic(micId: MicId) {
        const micsMap = this.availableMics$.getValue()

        const mic = micsMap.get(micId)
        micsMap.set(micId, !mic)

        this.availableMics$.next(micsMap)
    }

}