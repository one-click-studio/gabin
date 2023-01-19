import { BehaviorSubject, Subject } from 'rxjs'

import { Client } from '@src/main/clients/Client'

import type {
    TcpClient,
    TcpRequest,
    VideoDeviceSettings,
    AudioDeviceSettings,
    ObsAssetId,
    MicId,
    AvailableMicsMap
} from '@src/types/protocol'

import db from '@src/main/utils/db'

type AutoCamParams = {
    autocam: boolean
}

type TriggerShotParams = {
    shot: ObsAssetId['source']
}

type AvailableMicParams = {
    mic: MicId
}

type ConnectionParams = {
    socketId: string
}

const TCP_CLIENT = 'gabin0.'

export class StreamdeckClient extends Client {
    types: TcpClient['types'] = ['new_tcp_client', 'lost_tcp_client', 'streamdeck.autocam', 'streamdeck.triggershot', 'streamdeck.availablemic']
    send$ = new Subject<TcpRequest>()
    autocam$: BehaviorSubject<boolean>
    toggleMicAvailability$: Subject<MicId>
    triggeredShot$: BehaviorSubject<ObsAssetId['source'] | undefined>
    sockets: string[] = []

    private emits = {
        autocam: 'autocam',
        shotlist: 'shotlist',
        miclist: 'miclist',
        availableMics: 'availablemics',
        currentShot: 'currentshot'
    }

    private currentShot: ObsAssetId['source'] | undefined
    private availableMics: MicId[] = []
    private autocam = true

    private videoContainers: VideoDeviceSettings[] = []
    private audioDevices: AudioDeviceSettings[] = []

    constructor() {
        super('streamdeck')

        const videoContainers = db.getSpecificAndDefault(['settings', 'containers'], true)
        this.videoContainers = videoContainers.defaultValue

        const audioDevices = db.getSpecificAndDefault(['settings', 'mics'], true)
        this.audioDevices = audioDevices.defaultValue

        this.autocam$ = new BehaviorSubject(<boolean>true)
        this.triggeredShot$ = new BehaviorSubject(<ObsAssetId['source'] | undefined>undefined)
        this.toggleMicAvailability$ = new Subject()

        this.addSubscription(
            videoContainers.configPart$.subscribe((containers: VideoDeviceSettings[]) => {
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
        // this.toggleAvailableMic(params.mic)
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

    private getAllShots(containers: VideoDeviceSettings[]): ObsAssetId['source'][] {
        return containers.reduce((p, c) => p.concat(c.cams), <ObsAssetId['source'][]>[])
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

    setCurrentShot(shotId: ObsAssetId['source']) {
        this.currentShot = shotId
        this.sendCurrentShot()
    }

}
