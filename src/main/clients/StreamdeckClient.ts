import { BehaviorSubject, Subject } from 'rxjs'

import { Client } from '../../main/clients/Client'

import type {
    TcpClient,
    TcpRequest,
    AudioDeviceSettings,
    Asset,
    MicId,
    AvailableMicsMap
} from '../../types/protocol'

import db from '../../main/utils/db'

type AutoCamParams = {
    autocam: boolean
}

type TriggerShotParams = {
    shot: Asset['source']['name']
}

type AvailableMicParams = {
    mic: MicId
}

type ConnectionParams = {
    socketId: string
}

type Shot = Asset['source']['name'] | undefined

const TCP_CLIENT = 'gabin0.'

export class StreamdeckClient extends Client {
    types: TcpClient['types'] = ['new_tcp_client', 'lost_tcp_client', 'streamdeck.autocam', 'streamdeck.triggershot', 'streamdeck.availablemic']
    send$ = new Subject<TcpRequest>()
    autocam$: BehaviorSubject<boolean>
    toggleMicAvailability$: Subject<MicId>
    triggeredShot$: BehaviorSubject<Asset['source']['name']|undefined>
    sockets: string[] = []

    private emits = {
        autocam: 'autocam',
        shotlist: 'shotlist',
        miclist: 'miclist',
        availableMics: 'availablemics',
        currentShot: 'currentshot'
    }

    private currentShot: Shot
    private availableMics: MicId[] = []
    private autocam = true

    private videoContainers: Asset['scene'][] = []
    private audioDevices: AudioDeviceSettings[] = []

    constructor() {
        super('streamdeck')

        this.autocam$ = new BehaviorSubject(<boolean>true)
        this.triggeredShot$ = new BehaviorSubject(<Asset['source']['name']|undefined>undefined)
        this.toggleMicAvailability$ = new Subject()
    }

    init() {
        const videoContainers = db.getSpecificAndDefault(['settings', 'containers'], true)
        this.videoContainers = videoContainers.defaultValue

        const audioDevices = db.getSpecificAndDefault(['settings', 'mics'], true)
        this.audioDevices = audioDevices.defaultValue

        this.autocam$ = new BehaviorSubject(<boolean>true)
        this.triggeredShot$ = new BehaviorSubject(<Asset['source']['name']|undefined>undefined)
        this.toggleMicAvailability$ = new Subject()

        this.addSubscription(
            videoContainers.configPart$.subscribe((containers: Asset['scene'][]) => {
                this.videoContainers = containers
                this.sendPresets()
            })
        )

        this.addSubscription(
            audioDevices.configPart$.subscribe((devices: AudioDeviceSettings[]) => {
                this.audioDevices = devices
                this.sendPresets()
            })
        )
    }

    override connect() {
        super.connect()
        this.init()
    }

    override clean() {
        this.autocam = true
        this.currentShot = undefined
        this.availableMics = []
        this.sockets = []
        this.reachable$.next(false)

        super.clean()
    }

    handler(request: TcpRequest): void {
        this.logger.info('Received from streamdeck', request)

        switch (request.type) {
            case 'new_tcp_client':
                this.handleNewConnection(request.data as ConnectionParams)
                break
            case 'lost_tcp_client':
                this.handleLostConnection(request.data as ConnectionParams)
                break
            case 'streamdeck.autocam':
                this.handleAutoCam(request.data as AutoCamParams)
                break
            case 'streamdeck.triggershot':
                this.handleTriggerShot(request.data as TriggerShotParams)
                break
            case 'streamdeck.availablemic':
                this.handleAvailableMic(request.data as AvailableMicParams)
                break
        }
    }

    private handleNewConnection(params: ConnectionParams) {
        if (this.sockets.indexOf(params.socketId) === -1) {
            this.sockets.push(params.socketId)

            if (this.sockets.length === 1) {
                this.reachable$.next(true)
            }
        }

        this.sendPresets()
    }

    private handleLostConnection(params: ConnectionParams) {
        const index = this.sockets.indexOf(params.socketId)

        if (index !== -1) {
            this.sockets.splice(index, 1)

            if (this.sockets.length === 0) {
                this.reachable$.next(false)
            }
        }
    }

    private handleAutoCam(params: AutoCamParams) {
      this.autocam$.next(params.autocam)
    }

    private handleTriggerShot(params: TriggerShotParams) {
        this.triggeredShot$.next(params.shot)
    }

    private handleAvailableMic(params: AvailableMicParams) {
        this.toggleMicAvailability$.next(params.mic)
    }

    private sendPresets() {
        if (this.isReachable){
            this.sendAutocam()
            this.sendShotlist()
            this.sendMiclist()
            this.sendAvailableMics()
            this.sendCurrentShot()
        }
    }

    private getAllShots(scenes: Asset['scene'][]): Asset['source']['name'][] {
        const containers = scenes.reduce((p, scene) => p.concat(scene.containers), <Asset['container'][]>[])
        return containers.reduce((p, c) => p.concat(c.sources.map(s => s.name)), <Asset['source']['name'][]>[])
    }

    private getAllMics(devices: AudioDeviceSettings[]): string[] {
        return devices.reduce((p, d) => p.concat(d.micsName.filter(Boolean)), <string[]>[])
    }

    private sendShotlist() {
        this.send$.next({
            type: TCP_CLIENT + this.emits.shotlist,
            data: { shotlist: this.getAllShots(this.videoContainers) }
        })
    }

    private sendMiclist() {
        this.send$.next({
            type: TCP_CLIENT + this.emits.miclist,
            data: { miclist: this.getAllMics(this.audioDevices) }
        })
    }

    private sendAutocam() {
        this.send$.next({
            type: TCP_CLIENT + this.emits.autocam,
            data: { autocam: this.autocam }
        })
    }

    private sendAvailableMics() {
        this.send$.next({
            type: TCP_CLIENT + this.emits.availableMics,
            data: { availableMics: this.availableMics }
        })
    }

    private sendCurrentShot() {
        this.send$.next({
            type: TCP_CLIENT + this.emits.currentShot,
            data: { currentShot: this.currentShot }
        })
    }

    setAutocam(value: boolean) {
        this.autocam = value
        this.sendAutocam()
    }

    setAvailableMics(availableMics: AvailableMicsMap) {
        const micsId: MicId[] = []
        availableMics.forEach((value, micId) => {
            if (value) {
                micsId.push(micId)
            }
        })

        this.availableMics = micsId
        this.sendAvailableMics()
    }

    setCurrentShot(shot: Asset['source']) {
        this.currentShot = shot.name
        this.sendCurrentShot()
    }

}
