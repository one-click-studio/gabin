import { createInterprocess } from 'interprocess'
import type {
    Connection,
    ObsScene,
    AudioDevice,
    Profile,
    ObsAssetId,
    MicId,
    Shoot,
    AvailableMicsMap
} from '@src/types/protocol'

export const { ipcMain, ipcRenderer, exposeApiToGlobalWindow } = createInterprocess({
    main: {        
        async openLink(_, link: string) {},

        async connectObs(_, c: Connection) {},
        async disconnectObs(_, data: void) {},

        async getAudioDevices(_, data: void) { return {} as Promise<AudioDevice[]>},
        
        async saveProfile(_, data: Profile) {},
        async deleteProfile(_, data: Profile['id']) {},
        async getProfiles(_, data: void) { return {} as Promise<Profile[]>},
        async setDefaultProfile(_, data: Profile['id']) {},
        async setIconProfile(_, data: {id: Profile['id'], icon: Profile['icon']}) {},
        async setProfileId(_, data: {old: Profile['id'], id: Profile['id']}) {},

        async triggerShot(_, data: ObsAssetId['source']) {},
        async toggleAvailableMic(_, data: MicId) {},
        async toggleAutocam(_, data: boolean) {},

        async togglePower(_, data: boolean) {},
    },

    renderer: {
        async simpleString(_, data: string) {},

        async handleObsConnected(_, data: boolean) {},
        async handleObsScenes(_, data: ObsScene[]) {},

        async handlePower(_, data: boolean) {},

        async handleNewShot(_, data: Shoot) {},
        async handleAutocam(_, data: boolean) {},
        async handleAvailableMics(_, data: AvailableMicsMap) {},
        async handleStreamdeckConnected(_, data: boolean) {},
    },
})