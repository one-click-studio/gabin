/*************** UTILITARY ***************/

export type Callback = (() => void) | undefined

export type ObsSceneId = string
export type ObsSourceId = string
export type MicId = string

export type Durations = {
    min: number
    max: number
}

export type ObsAssetId = {
    scene: ObsSceneId
    source: ObsSource
}

export type ObsSource = {
    id: number,
    name: string
}

export type ObsScene = {
    id: ObsAssetId['scene']
    sources: ObsAssetId['source'][]
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
    source: ObsAssetId['source']
    weight: number
}

export interface AudioDevice {
    id: number
    name: string
    sampleRate: number
    nChannels: number
    api: unknown
    apiName: string
}

export interface Shoot {
    containerId: ObsAssetId['scene']
    shotId: ObsAssetId['source']
    mode: 'focus' | 'illustration'
}

export interface SpeakingMic {
    name: string
    speaking: boolean
}

export type AvailableMicsMap = Map<MicId, boolean>


/*************** SERVER CONFIG ***************/

export interface ServerConfig {
    profiles: Profile[]
    connections: ConnectionsConfig
}


/********** CONNECTIONS **********/
export type ConnectionType = 'obs' | 'tcp'
export interface ConnectionsConfig {
    tcp: Connection
    obs?: Connection
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
}
export interface ProfileSettings {
    mics: AudioDeviceSettings[]
    containers: VideoDeviceSettings[]
    autocam: AutocamSettings[]
}

/***** PROFILE SETTINGS *****/
export interface AudioDeviceSettings extends AudioDevice {
    mics: boolean[]
    micsName: string[]
}
export interface VideoDeviceSettings {
    scene: ObsAssetId['scene']
    source: ObsAssetId['source']
    cams: ObsAssetId['source'][]
}
export interface AutocamSettings {
    scene: ObsAssetId['scene']
    source: ObsAssetId['source']
    mics: AutocamMic[]
    durations: Durations
}
export interface AutocamMic {
    id: string
    cams: AutocamSource[]
}


/*************** STORE ***************/

type Icon = 'ArrowLeft' | 'ArrowRight' | 'Cross' | undefined
export interface NavBtn {
    url?: string
    label?: string
    icon?: Icon
    disable: boolean
    callback: Callback
    trigger: Callback
}


/*************** TCP SERVER ***************/

export type TcpRequest = {
    type: string
    data: unknown
}
export type TcpClient = {
    types: string[]
    handler: (request: TcpRequest) => void,
    sockets?: string[]
    send$?: any
    // listen?: () => void
}
