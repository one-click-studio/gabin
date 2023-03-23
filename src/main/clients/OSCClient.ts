import { BehaviorSubject, Subject } from 'rxjs'

import { Client } from '../../main/clients/Client'

// import type {} from '../../types/protocol'

import db from '../../main/utils/db'


export class OscClient extends Client {

    constructor() {
        super('osc-client')

    }

    init() {
        // const videoContainers = db.getSpecificAndDefault(['settings', 'containers'], true)
        // this.videoContainers = videoContainers.defaultValue

        // const audioDevices = db.getSpecificAndDefault(['settings', 'mics'], true)
        // this.audioDevices = audioDevices.defaultValue

        // this.addSubscription(
        //     videoContainers.configPart$.subscribe((containers: VideoDeviceSettings[]) => {
        //         this.videoContainers = containers
        //         this.sendPresets()
        //     })
        // )

        // this.addSubscription(
        //     audioDevices.configPart$.subscribe((devices: AudioDeviceSettings[]) => {
        //         this.audioDevices = devices
        //         this.sendPresets()
        //     })
        // )
    }

    override connect() {
        super.connect()
        this.init()
    }

    override clean() {
        this.reachable$.next(false)

        super.clean()
    }


}
