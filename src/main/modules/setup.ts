
import { ObsServer } from '../../main/servers/ObsServer'
import { OscClient } from '../../main/clients/OSCClient'
import { VmixClient } from '../../main/clients/VMIXClient'
import { Connections } from '../../main/servers/Connections'

import { getDevices } from '../../main/modules/audioActivity'

import db from '../../main/utils/db'

import type { OscServer } from '../../main/servers/OscServer'
import type { SpecificAndDefault } from '../../main/utils/db'
import type {
    Connection,
    AudioDevice,
} from '../../types/protocol'

export class Setup {

    obs: ObsServer
    osc: OscClient
    vmix: VmixClient
    connections: Connections

    private profiles: SpecificAndDefault

    constructor(oscServer: OscServer) {
        this.osc = new OscClient(oscServer, false)
        this.obs = new ObsServer(false)
        this.vmix = new VmixClient(true)
        this.connections = new Connections()

        this.profiles = db.getSpecificAndDefault(['profiles'], false)

        this.profiles.configPart$.subscribe(v => {
            this.profiles.defaultValue = v
        })
    }

    clean() {
        this.disconnectObs()
        this.disconnectOsc()
        this.disconnectVmix()

        this.obs.clean()
        this.osc.clean()
        this.vmix.clean()
    }

    connectObs(connection: Connection) {
        if (!this.obs.isReachable) {
            this.obs.connect(connection, true)
        }
    }

    disconnectObs() {
        if (this.obs.isReachable) {
            this.obs.clean()
        }
    }

    connectOsc(connection: Connection) {
        if (!this.osc.isReachable) {
            this.osc.connect(connection)
        }
    }

    disconnectOsc() {
        if (this.osc.isReachable) {
            this.osc.clean()
        }
    }

    sendOsc(path: string) {
        if (!this.osc.isReachable) return
        this.osc.send(path)
    }

    connectVmix(connection: Connection) {
        if (!this.vmix.isReachable) {
            this.vmix.connect(connection)
        }
    }

    disconnectVmix() {
        if (this.vmix.isReachable) {
            this.vmix.clean()
        }
    }

}

export const getAllAudioDevices = (): AudioDevice[] => {
    const aDevices: AudioDevice[] = []

    const devices = getDevices()
    for (const d of devices) {
        if (!d.data.inputChannels) continue

        aDevices.push({
            id: d.id,
            name: d.data.name,
            nChannels: d.data.inputChannels,
        })
    }

    return aDevices
}
