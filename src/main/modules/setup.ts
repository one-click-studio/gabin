import { ObsServer } from '../../main/servers/ObsServer'
import { OscServer } from '../../main/servers/OscServer'
import { Connections } from '../../main/servers/Connections'

import { getDevices } from '../../main/modules/audioActivity'

import db from '../../main/utils/db'
import type { SpecificAndDefault } from '../../main/utils/db'

import type {
    Connection,
    ConnectionsConfig,
    AudioDevice,
    Profile,
    Thresholds,  
} from '../../types/protocol'

export class ProfileSetup {

    obs: ObsServer
    osc: OscServer
    connections: Connections

    private profiles: SpecificAndDefault

    constructor() {
        this.obs = new ObsServer(false)
        this.osc = new OscServer(false)
        this.connections = new Connections()

        this.profiles = db.getSpecificAndDefault(['profiles'], false)

        this.profiles.configPart$.subscribe(v => {
            this.profiles.defaultValue = v
        })
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

    connectOsc(connections: ConnectionsConfig['osc']) {
        if (!this.osc.isReachable) {
            this.osc.listen(connections)
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

    getAllAudioDevices(): AudioDevice[] {
        const aDevices: AudioDevice[] = []

        const devices = getDevices()
        for (const d of devices) {
            if (!d.data.inputChannels) continue

            aDevices.push({
                id: d.id,
                name: d.data.name,
                sampleRate: d.data.preferredSampleRate,
                nChannels: d.data.inputChannels,
                api: d.apiId,
                apiName: d.apiName,
            })
        }

        return aDevices
    }

    getProfiles(): Profile[] {
        return this.profiles.defaultValue
    }

    setProfile(profile: Profile) {

        const profiles: Profile[] = this.profiles.defaultValue
        const ids = profiles.map(p => p.id)

        // new profile
        const index = ids.indexOf(profile.id)
        if (index === -1) {
            profiles.push(profile)
        } else {
            profiles[index] = profile
        }

        this.profiles.edit(profiles)
        this.setDefault(profile.id)
    }

    deleteProfile(id: Profile['id']) {

        const profiles: Profile[] = this.profiles.defaultValue
        const ids = profiles.map(p => p.id)

        const index = ids.indexOf(id)
        if (index > -1) {
            profiles.splice(index, 1)
        }

        this.profiles.edit(profiles)
        if (profiles.length > 0){
            this.setDefault(profiles[0].id)
        }
    }

    setDefault(id: Profile['id']) {
        const profiles: Profile[] = this.profiles.defaultValue

        for (const i in profiles) {
            profiles[i].active = (profiles[i].id === id)
        }

        this.profiles.edit(profiles)
    }

    setName(id: Profile['id'], name: Profile['name']) {
        const profiles: Profile[] = this.profiles.defaultValue

        const ids = profiles.map(p => p.id)
        const index = ids.indexOf(id)

        if (index > -1) {
            profiles[index].name = name
        }

        this.profiles.edit(profiles)
    }

    setIcon(id: Profile['id'], icon: Profile['icon']) {
        const profiles: Profile[] = this.profiles.defaultValue

        const ids = profiles.map(p => p.id)
        const index = ids.indexOf(id)

        if (index > -1) {
            profiles[index].icon = icon
        }

        this.profiles.edit(profiles)
    }

    setAutostart(id: Profile['id'], autostart: Profile['autostart']) {
        const profiles: Profile[] = this.profiles.defaultValue

        const ids = profiles.map(p => p.id)
        const index = ids.indexOf(id)

        if (index > -1) {
            profiles[index].autostart = autostart
        }

        this.profiles.edit(profiles)
    }

    setThresholds(id: Profile['id'], deviceName: AudioDevice['name'], thresholds: Thresholds) {
        const profiles: Profile[] = this.profiles.defaultValue

        const ids = profiles.map(p => p.id)
        const index = ids.indexOf(id)

        if (index > -1) {
            for (const i in profiles[index].settings.mics) {
                if (profiles[index].settings.mics[i].name === deviceName) {
                    profiles[index].settings.mics[i].thresholds = thresholds
                    break
                }
            }
        }

        this.profiles.edit(profiles)
    }
}
