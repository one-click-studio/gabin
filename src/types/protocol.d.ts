/*************** UTILITARY ***************/

export type Callback = (() => void) | undefined

export type ObsSceneId = string
export type ObsSourceId = string
export type MicId = string

export type Durations = {
    min: number
    max: number
}

export type Thresholds = {
    speaking: number
    silence: number
    vad: number
}

export type SpeakingMic = {
    name: string
    speaking: boolean
    volume: number
    device: string
}


export type AssetId = number
export type AssetName = string

export type AssetScene = {
    name: AssetName
    containers: AssetContainer[]
}

export type AssetContainer = {
    name: AssetName
    sources: AssetSource[]
}

export type AssetSource = {
    name: AssetName
    options?: any
}

export type Asset = {
    id: AssetId
    name: AssetName
    scene: AssetScene
    container: AssetContainer
    source: AssetSource
}

export interface OscSource extends AssetSource {
    path: string
}

export type ResponseObsScene = {
    sceneIndex: number
    sceneName: string
}
export type ResponseObsItem = {
    inputKind: null
    isGroup: boolean
    sceneItemBlendMode: string
    sceneItemEnabled: boolean
    sceneItemId: number
    sceneItemIndex: number
    sceneItemLocked: boolean
    sceneItemTransform: any
    sourceName: string
    sourceType: string
}

export interface AutocamSource {
    source: AssetSource
    weight: number
}

export interface AudioDevice {
    id: number
    name: string
    sampleRate: number
    nChannels: number
    api: unknown
    apiName: string
    thresholds?: Thresholds
}

export interface Shoot {
    container: AssetContainer
    shot: AssetSource
    mode: 'focus' | 'illustration'
}

export interface SpeakingMic {
    name: string
    speaking: boolean
    volume?: number
}

export type AvailableMicsMap = Map<MicId, boolean>

export interface Toast {
    title: string
    description: string
    type: 'success' | 'error' | 'info' | ''
    duration?: number
}


/*************** SERVER CONFIG ***************/

export interface ServerConfig {
    profiles: Profile[]
}


/********** CONNECTIONS **********/
export type ConnectionType = 'obs' | 'osc'
export interface ConnectionsConfig {
    type?: 'obs' | 'osc'
    obs?: Connection
    osc?: Connection
}
export interface Connection {
    ip: string
    password?: string
}


/********** PROFILE **********/
export type IconName = 'folder' | 'pizza' | 'rocket' | 'smile' | 'paperclip' | 'sandwich'
export interface Profile {
    id: number
    name: string
    icon: IconName
    active?: boolean
    settings: ProfileSettings
    connections: ConnectionsConfig
    autostart?: boolean
    record?: string
}
export interface ProfileSettings {
    mics: AudioDeviceSettings[]
    containers: AssetScene[]
    autocam: AutocamSettings[]
}

/***** PROFILE SETTINGS *****/
export interface AudioDeviceSettings extends AudioDevice {
    mics: boolean[]
    micsName: string[]
}

// VideoDeviceSettings == AssetScene
// export type AssetScene = {
//     id: AssetId
//     name: AssetName
//     containers: AssetContainer[]
// }
// export type AssetContainer = {
//     id: AssetId
//     name: AssetName
//     sources: AssetSource[]
// }
// export type AssetSource = {
//     id: AssetId
//     name: AssetName
// }
// export interface AutocamSource {
//     source: AssetSource
//     weight: number
// }
// export interface OscScene extends AssetScene {
// export interface VideoDeviceSettings {
//     scene: AssetScene
//     source: AssetSource
//     cams: AssetSource[]
// }

export interface AutocamContainer extends AssetContainer {
    mics: AutocamMic[]
    durations: Durations
}

export interface AutocamSettings extends AssetScene {
    containers: AutocamContainer[]
}
// export interface AutocamSettings {
//     scene: AssetScene
//     source: AssetSource
//     mics: AutocamMic[]
//     durations: Durations
// }
export interface AutocamMic {
    id: string
    cams: AutocamSource[]
}


/*************** STORE ***************/

type Icon = 'ArrowLeft' | 'ArrowRight' | 'Cross' | 'Check' | 'Return' | undefined
export interface NavBtn {
    url?: string
    label?: string
    icon?: Icon
    disable: boolean
    callback: Callback
    trigger: Callback
}