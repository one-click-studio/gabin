import { ObsServer } from '@src/main/servers/ObsServer'
import { Connections } from '@src/main/servers/Connections';

import { getDevices } from '@src/main/modules/audioActivity'

import db from '@src/main/utils/db'
import type { SpecificAndDefault } from '@src/main/utils/db'

import type {
    Connection,
    AudioDevice,
    Profile,
} from '@src/types/protocol'

export class ProfileSetup {

    obs: ObsServer
    connections: Connections

    private profiles: SpecificAndDefault

    constructor() {
        this.obs = new ObsServer(false)
        this.connections = new Connections()

        this.profiles = db.getSpecificAndDefault(['profiles'], false)

        this.profiles.configPart$.subscribe(v => {
            this.profiles.defaultValue = v
        })
    }

    connectObs(connection: Connection) {
        if (!this.obs.isReachable) {
            this.obs.connect(connection)
        }
    }

    disconnectObs() {
        if (this.obs.isReachable) {
            this.obs.clean()
        }
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

    setIcon(id: Profile['id'], icon: Profile['icon']) {
        const profiles: Profile[] = this.profiles.defaultValue

        const ids = profiles.map(p => p.id)
        const index = ids.indexOf(id)

        if (index > -1) {
            profiles[index].icon = icon
        }

        this.profiles.edit(profiles)
    }

    editId(oldId: Profile['id'], id: Profile['id']) {
        const profiles: Profile[] = this.profiles.defaultValue

        const ids = profiles.map(p => p.id)
        const index = ids.indexOf(oldId)

        if (index > -1) {
            profiles[index].id = id
        }

        this.profiles.edit(profiles)
    }
}
