import { Subject, BehaviorSubject } from 'rxjs'
import type { Subscription } from 'rxjs'

import { Client } from '../../main/clients/Client'
import db from '../../main/utils/db'
import type { Logger } from '../../main/utils/logger'
import { getLogger } from '../../main/utils/logger'

import { AudioActivity, getDevices } from '../../main/modules/audioActivity'
import type { RtAudioApi } from 'audify'

import type {
    AudioDevice,
    ObsAssetId,
    Durations,
    MicId,
    AutocamSource,
    AvailableMicsMap,
    AudioDeviceSettings,
    AutocamSettings,
    Shoot,
    Thresholds,
    SpeakingMic,
} from '../../types/protocol'

type ContainerMap = Map<ObsAssetId['scene'], Container>

type MicTrigger = { micId: MicId, shotId?: ObsAssetId['source'] }
type CurrentShotsMap = Map<ObsAssetId['scene'], ObsAssetId['source']>
type MicsMap = Map<ObsAssetId['source'], MicId[]>

type Channel = {
    id: MicId
    channelId: number
    onToggleSpeaking: (speaking: boolean, volume: number) => void
}
type AudioRecord = AudioDevice & { channels: Channel[] }

interface DeviceMic {
    id: MicId
    channelId: number
}

type Subscriptions = {
    timeline: Subscription | null,
    forcedShot: Subscription | null
}

export class AutocamClient extends Client {

    shoot$ = new Subject<Shoot>()
    forcedShot$ = new Subject<ObsAssetId['source']>()
    timeline$: BehaviorSubject<MicId>
    speakingMics$: BehaviorSubject<Map<string, BehaviorSubject<SpeakingMic>>>
    private currentShots$: BehaviorSubject<CurrentShotsMap>

    private enable = false
    private currentScene: ObsAssetId['scene'] = ''
    private containerMap: ContainerMap = new Map()
    private availableMics: AvailableMicsMap = new Map()
    private recorders: AudioActivity[] = []
    private micsSpeaking: Map<string, BehaviorSubject<SpeakingMic>>
    private subscriptions: Subscriptions = { timeline: null, forcedShot: null }

    private audioDevices: AudioDeviceSettings[] = []
    private autocamMapping: AutocamSettings[] = []
    private currentMapping: AutocamSettings[] = []


    constructor() {
        super('autocam')

        this.micsSpeaking = new Map()
        this.autocamMapping = []

        this.currentShots$ = new BehaviorSubject(new Map())
        this.timeline$ = new BehaviorSubject('')
        this.speakingMics$ = new BehaviorSubject(this.micsSpeaking)
    }

    init() {
        const audioDevices = db.getSpecificAndDefault(['settings', 'mics'], true)
        this.audioDevices = audioDevices.defaultValue
        this.micsSpeaking = this.getMicsMap(this.audioDevices)
        this.speakingMics$.next(this.micsSpeaking)

        const autocamMapping = db.getSpecificAndDefault(['settings', 'autocam'], true)
        this.autocamMapping = autocamMapping.defaultValue

        this.addSubscription(
            audioDevices.configPart$.subscribe((aDevices: AudioDeviceSettings[]) => {
                this.audioDevices = aDevices
                this.micsSpeaking = this.getMicsMap(this.audioDevices)
                this.speakingMics$.next(this.micsSpeaking)
            })
        )
            
        this.addSubscription(
            autocamMapping.configPart$.subscribe((mapping: AutocamSettings[]) => {
                this.autocamMapping = mapping
            })
        )
    }

    override async connect() {
        super.connect()
        this.init()
        
        this.enable = true

        const devicesData = this.getDevicesData()

        if (!this.audioDevices.length){
            this.logger.warn('no audio device configured')
        } else if (!devicesData.length){
            this.logger.warn('device[s] not found')
        }

        if (!devicesData.length) {
            this.logger.debug({ devices: getDevices().filter(d => d.data.inputChannels > 0) }, 'available devices list')
            return
        }

        this.recorders = []
        for (const i in devicesData){
            const recorder = new AudioActivity({
                deviceName: devicesData[i].name,
                apiId: devicesData[i].api as RtAudioApi,
                channels: devicesData[i].channels.map(c => c.channelId),
                framesPerBuffer: 960,
                onAudio: (speaking, channelId, volume) => {
                    devicesData[i].channels.find(c => c.channelId === channelId)?.onToggleSpeaking(speaking, volume)
                }
            })
            recorder.start()

            this.recorders.push(recorder)
        }

        this.setupMicRecorder()
        this.setupTimeline()

        this.reachable$.next(true)
    }


    override clean () {
        this.clearTimeoutsContainers()
        this.cleanSubscriptions()

        this.recorders.forEach(r => {
            r.stop()
        })

        this.reachable$.next(false)
        super.clean()
    }

    // HELPERS

    private getMicsMap(devices: AudioDeviceSettings[]): Map<string, BehaviorSubject<SpeakingMic>> {
        const micIds = devices.reduce((p, d) => p.concat(d.micsName.filter((_m,i) => d.mics[i])), <string[]>[])
        return new Map(micIds.map((m) => [m, new BehaviorSubject(<SpeakingMic>{
            speaking: false,
            volume: 0
        })]))
    }

    private getDevicesData(): AudioRecord[] {
        const devices: AudioRecord[] = []

        for (const i in this.audioDevices){
            const device = this.getDevice(this.audioDevices[i])
            if (device){
                devices.push(device)
            }
        }

        return devices
    }

    private getDevice(device: AudioDeviceSettings): AudioRecord | null {

        const deviceMics: DeviceMic[] = []
        for (const i in device.mics) {
            if (device.mics[i]) {
                deviceMics.push({
                    id: device.micsName[i],
                    channelId: parseInt(i)
                })
            }
        }

        this.logger.debug(deviceMics)

        return {
            id: device.id,
            api: device.api,
            apiName: device.apiName,
            name: device.name,
            sampleRate: device.sampleRate,
            nChannels: device.nChannels,
            channels: this.getChannels(deviceMics),
            thresholds: device.thresholds
        }
    }

    private getChannels(mics: DeviceMic[]): Channel[] {
        const channels: Channel[] = [];

        for (const i in mics){
            channels.push({
                ...mics[i],
                onToggleSpeaking: (speaking, volume) => {
                    this.micsSpeaking.get(mics[i].id)?.next({speaking, volume})
                    this.speakingMics$.next(this.micsSpeaking)
                }
            })
        }

        return channels
    }

    private micIsAvailable(micId: MicId): boolean {
        if (this.availableMics.get(micId)) {
            return true
        }

        return false
    }

    private getFocusedContainer(): Container | null {
        let container: Container | null = null
        this.containerMap.forEach(c => {
            if (c.focus) {
                container = c
            }
        })

        return container
    }

    private getShowingContainer(micId: MicId): Container | null {
        let container: Container | null = null
        this.containerMap.forEach(c => {
            if (c.isShowing(micId)) {
                container = c
            }
        })

        return container
    }

    private getRandomContainerByMic(micId: MicId): Container | null {
        const containers: Container[] = []
        this.containerMap.forEach(c => {
            if (c.hasShotForMic(micId)) {
                containers.push(c)
            }
        })

        if (containers.length > 0) {
            return containers[Math.floor(Math.random() * containers.length)]
        }

        return null
    }

    private getRandomContainerByShot(shotId: ObsAssetId['source'], forced: boolean = false): Container | null {
        const containers: Container[] = []
        this.containerMap.forEach(c => {
            if (c.hasShot(shotId, forced)) {
                containers.push(c)
            }
        })

        if (containers.length > 0) {
            return containers[Math.floor(Math.random() * containers.length)]
        }

        return null
    }

    private cleanSubscriptions() {
        if (this.subscriptions.timeline){
            this.subscriptions.timeline.unsubscribe()
        }
        if (this.subscriptions.forcedShot){
            this.subscriptions.forcedShot.unsubscribe()
        }
    }

    private otherSpeaker(): MicId {
        let speaker = ''
        this.micsSpeaking.forEach((speaking$, micId) => {
            if (speaking$.getValue()) {
                speaker = micId
            }
        })

        return speaker
    }

    // MAIN

    private manageContainers() {
        if (!this.isReachable) {
            return
        }

        this.currentShots$ = new BehaviorSubject(new Map())

        this.clearTimeoutsContainers()
        this.cleanSubscriptions()

        this.containerMap = new Map();

        for (const mContainer of this.currentMapping) {
            const container = new Container(mContainer, this.shoot$, this.currentShots$)
            this.containerMap.set(container.id, container)
        }

        this.enableContainers()
        this.filterShotMapContainers()
        this.currentMicContainers()
        this.setupTimeline()
    }

    private setupMicRecorder() {
        this.micsSpeaking.forEach((speaking$, micId) => {
            speaking$.subscribe((speakingMic: SpeakingMic) => {
                const currentMic = this.timeline$.getValue()
                if (speakingMic.speaking) {
                    if (!this.enable) {
                        return
                    }

                    if (micId === currentMic) {
                        this.logger.debug('same mic speaking')
                        return
                    }

                    if (!this.micIsAvailable(micId)) {
                        this.logger.debug('mic is not available', micId)
                        return
                    }

                    this.logger.debug(`${micId} started speaking`)
                    this.timeline$.next(micId)
                } else if (micId === currentMic) {
                    let nextMicId = micId
                    this.logger.debug(`${nextMicId} stopped speaking`)

                    nextMicId = this.otherSpeaker()
                    if (nextMicId) {
                        this.logger.debug(`${nextMicId} is still speaking`)
                    }
                    this.timeline$.next(nextMicId)
                }
            })
        })
    }

    private setupTimeline() {

        this.subscriptions.timeline = this.timeline$.subscribe(micId => {
            if (!this.enable){
                return
            }

            if (!micId) {
                this.unfocusContainers()
                return
            }

            this.currentMicContainers()

            const showing = this.getShowingContainer(micId)
            if (showing) {
                this.logger.debug('One container is already showing this mic')
                showing.trigger$.next({ micId })
                this.unfocusContainers(showing.id)
                return
            }

            const random = this.getRandomContainerByMic(micId)
            if (random) {
                this.logger.debug('Get a random container')
                random.trigger$.next({ micId })
                this.unfocusContainers(random.id)
                return
            }

            this.logger.error('Cannot find a container for this mic on this scene', { micId, scene: this.currentScene })
        })

        this.subscriptions.forcedShot = this.forcedShot$.subscribe(shotId => {
            const currentMic = this.timeline$.getValue()
            const focused = this.getFocusedContainer()
            if (focused && focused.hasShot(shotId, true)){
                this.logger.debug('Focus container has been forced to shoot', shotId)
                focused.trigger$.next({ micId: currentMic, shotId: shotId })
                return
            }

            const random = this.getRandomContainerByShot(shotId, true)
            if (random) {
                this.logger.debug('Get a random container')
                random.trigger$.next({ micId: currentMic, shotId: shotId })
                this.unfocusContainers(random.id)
                return
            }

            this.logger.error('Cannot find a container for this shot on this scene', { shotId, scene: this.currentScene })
        })

    }


    // ACTIONS ON CONTAINERS

    private clearTimeoutsContainers() {
        this.containerMap.forEach(container => {
            container.clearTimeouts()
        })
    }

    private enableContainers() {
        this.containerMap.forEach(container => {
            container.enable = this.enable
            if (this.enable) {
                container.init()
            }
        })
    }

    private filterShotMapContainers() {
        this.containerMap.forEach(container => {
            container.filterShotMaps(this.availableMics)
        })
    }

    private currentMicContainers() {
        const currentMic = this.timeline$.getValue()
        this.containerMap.forEach(container => {
            container.setCurrentMic(currentMic)
        })
    }

    private unfocusContainers(containerId?: Container['id']) {
        this.containerMap.forEach(container => {
            if (container.id !== containerId){
                container.unfocus()
            }
        })
    }

    // PUBLIC METHODS

    setEnabled(autocam: boolean) {
        this.enable = autocam
        this.enableContainers()
    }

    setAvailableMics(availableMics: AvailableMicsMap) {
        this.availableMics = availableMics
        this.filterShotMapContainers()
    }

    setCurrentScene(sceneId: ObsAssetId['scene']) {
        this.currentScene = sceneId
        this.currentMapping = this.autocamMapping.filter(c => c.scene === sceneId)

        if (!this.currentMapping.length) {
            this.logger.info('This scene does not exist in config or has no containers', sceneId)
            return
        }

        this.manageContainers()
    }

    setThresholds(deviceName: AudioDevice['name'], thresholds: Thresholds) {
        for (const i in this.recorders) {
            if (this.recorders[i].getName() !== deviceName) continue

            this.recorders[i].setThresholds(thresholds)
            break
        }
    }

}

class Container {

    enable = false
    focus = false
    lock = false
    trigger$ = new Subject<MicTrigger>()

    id: ObsAssetId['scene'] = ''
    private shots: ObsAssetId['source'][] = []
    private allShots: ObsAssetId['source'][] = []

    private shotsMap: AutocamSettings['mics'] = []
    private filteredShotsMap: AutocamSettings['mics'] = []
    private micsMap: MicsMap = new Map()

    private durations: Durations = { min: 0, max: 0 }
    private shoot$: Subject<Shoot>
    private currentShots$: BehaviorSubject<CurrentShotsMap>
    private logger: Logger

    private currentMic: MicId = ''
    private currentShot: ObsAssetId['source'] = { id: -1, name: '' }
    private timeouts: NodeJS.Timeout[] = []

    constructor(container: AutocamSettings, shoot$: Subject<Shoot>, currentShots$: BehaviorSubject<CurrentShotsMap>) {
        this.logger = getLogger('Autocam Container (' + container.source.name + ')')

        this.parseContainer(container)
        this.shoot$ = shoot$
        this.currentShots$ = currentShots$

        this.trigger$.subscribe(params => {
            if (!this.focus) this.focus = true
            this.focusMode(params.micId, params.shotId)
        })

    }

    private parseContainer(container: AutocamSettings) {
        this.id = container.source.name
        this.shotsMap = container.mics
        this.filteredShotsMap = container.mics
        this.durations = container.durations
        this.shots = this.getShotsFromMap(container.mics)
        this.micsMap = this.getMicsMapFromShotMap(container.mics)
    }

    private getShotsFromMap(mics: AutocamSettings['mics'], noWeight?: boolean): ObsAssetId['source'][] {
        let shots: ObsAssetId['source'][] = []

        const minW = noWeight? -1 : 0

        mics.forEach(m =>
            shots = shots.concat(m.cams.reduce((p,c) => 
               p.concat(c.weight>minW? [c.source] : [])
            , <ObsAssetId['source'][]>[]))
        )

        return shots.filter((s, i) => shots.indexOf(s) === i)
    }

    private getMicsMapFromShotMap(mics: AutocamSettings['mics']): MicsMap {
        const micsMap: MicsMap = new Map()

        mics.forEach(m => {
            m.cams.forEach(c => {
                if (c.weight > 0) {
                    const micdId: MicId[] = micsMap.get(c.source) || []
                    micsMap.set(c.source, micdId.concat([m.id]))
                }
            })
        })

        return micsMap
    }

    // SHOOT

    private shoot(shotId: ObsAssetId['source']) {
        this.currentShot = shotId

        const currentShots = new Map([...this.currentShots$.getValue()])
        currentShots.set(this.id, shotId)
        this.currentShots$.next(currentShots)

        if (!shotId) {
            this.logger.error('No shotId selected')
            return
        }

        this.shoot$.next({
            mode: this.focus? 'focus' : 'illustration',
            containerId: this.id,
            shotId: shotId
        })
    }

    // HELPERS

    private getShotsForMic(micId: MicId): AutocamSource[] {
        const map = this.filteredShotsMap.find(m => m.id === micId)

        if (map && map.cams.length > 0) {
            return map.cams
        }
        return []
    }

    private getRandomShot(shots: ObsAssetId['source'][]): ObsAssetId['source']|undefined {
        const index = Math.floor(Math.random() * shots.length)

        return shots[index]
    }

    private pickShot(shots: AutocamSource[]): ObsAssetId['source'] | undefined {
        const totalWeight = shots.reduce((res, shot) => res + shot.weight, 0)
        const rand = Math.random() * totalWeight
        let sum = 0
        for (const shot of shots) {
            sum += shot.weight
            if (rand <= sum) return shot.source
        }

        return undefined
    }

    private getUnallowedShots(): ObsAssetId['source'][] {
        // GET ALL CURRENTS SHOTS
        const currentShots = this.currentShots$.getValue()

        // FILTER ONLY OTHER CONTAINERS SHOTS
        const otherShots: ObsAssetId['source'][] = [...currentShots]
        .filter(([key]) => key !== this.id)
        .map(row => row[1])

        // GET MICS SHOWED BY THESE SHOTS
        let micsId: MicId[] = []
        otherShots.forEach(shot => {
            const mIds = this.micsMap.get(shot) || []
            micsId = micsId.concat(
                mIds.filter(s => micsId.indexOf(s) < 0)
            )
        })

        // GET ALL SHOTS SHOWING THESE MICS
        let unallowedShots: ObsAssetId['source'][] = []
        micsId.forEach(micId => {
            const shotMap = this.filteredShotsMap.find(m => m.id === micId)
            const shots = shotMap?.cams.map(c => c.source) || []

            unallowedShots = unallowedShots.concat(
                shots.filter(s => unallowedShots.indexOf(s) < 0)
            )
        })

        return unallowedShots
    }

    private getAllowedShots(shots: ObsAssetId['source'][]): ObsAssetId['source'][] {
        const unallowedShots = this.getUnallowedShots()

        return shots.filter(s => unallowedShots.indexOf(s) < 0)
    }

    // ILLUSTRATION MODE

    private getIllustrationDuration(): number {
        return (this.durations.max + this.durations.min) / 2
    }

    private getIllustrationShot(micId?: MicId): ObsAssetId['source']|undefined {
        if (micId) {
            return this.getFocusShot(micId)
        }

        const allowedShots = this.getAllowedShots(this.shots)
        let shotId = this.getRandomShot(allowedShots)

        if (!shotId) {
            this.logger.error('problem with allowedShots probably')
            shotId = this.getRandomShot(this.shots)
        }

        return shotId
    }

    private illustrationMode(micId?: MicId, shotId?: ObsAssetId['source']) {
        if (!this.enable){
            return
        }

        this.clearTimeouts()
        const duration = this.getIllustrationDuration()

        shotId = shotId? shotId : this.getIllustrationShot(micId)

        if (!shotId) {
            this.logger.error('problem with getIllustrationShot : no shot can be found')
            return
        }

        this.lock = true
        this.shoot(shotId)

        this.timeouts.push(setTimeout(() => {
            this.lock = false

            if (this.focus){
                this.focusMode(this.currentMic)
            }
        }, this.durations.min * 1000))

        this.timeouts.push(setTimeout(() => {
            this.illustrationMode()
        }, duration * 1000))
    }

    // FOCUS MODE

    private getFocusShot(micId: MicId): ObsAssetId['source'] | undefined {
        const shots = this.getShotsForMic(micId)

        const unallowedShots = this.getUnallowedShots()
        const allowedShots = shots.filter(s => unallowedShots.indexOf(s.source) < 0)

        let shotId = this.pickShot(allowedShots)

        if (!shotId) {
            this.logger.error('problem with pickShot and this mic\'s shots', micId)
            let allowedShotsId = this.getAllowedShots(shots.map(s => s.source))
            shotId = this.getRandomShot(allowedShotsId)

            if (!shotId) {
                this.logger.error('problem with randomShot and this mic\'s shots', micId)
                allowedShotsId = this.getAllowedShots(this.shots)
                shotId = this.getRandomShot(allowedShotsId)
            }
        }

        return shotId
    }

    private focusMode(micId: MicId, shotId?: ObsAssetId['source']) {
        if ((!this.enable || this.lock) && !shotId) {
            return
        }
        const forced = shotId? true : false
        const duration = forced? this.getIllustrationDuration() : this.durations.min

        this.clearTimeouts()

        shotId = shotId? shotId : this.getFocusShot(micId)
        if (!shotId) {
            this.logger.error('problem with getFocusShot : no shot can be found')
            return
        }

        this.lock = true

        this.shoot(shotId)

        this.timeouts.push(setTimeout(() => {
            this.lock = false

            if (this.currentMic && this.currentMic !== micId) {
                this.focusMode(this.currentMic)
            } else if (forced) {
                this.unfocus()
                this.illustrationMode()
            } else if (!this.focus) {
                this.illustrationMode(this.currentMic)
            }
        }, duration * 1000))

        this.timeouts.push(setTimeout(() => {
            this.focusMode(this.currentMic)
        }, this.durations.max * 1000))
    }

    // PUBLIC METHODS

    init() {
        this.illustrationMode()
        return
    }

    clearTimeouts() {
        this.timeouts.forEach(t => {
            clearTimeout(t)
        })
    }

    isShowing(micId: MicId): boolean {
        const shots = this.getShotsForMic(micId)
        const shotsId = shots.filter(shot => shot.weight).map(shot => shot.source.name)

        if (shotsId.indexOf(this.currentShot.name) !== -1) {
            return true
        }

        return false
    }

    hasShot(shotId: ObsAssetId['source'], forced?: boolean): boolean {
        const list = forced? this.allShots : this.shots
        return (list.map(s => s.id).indexOf(shotId.id) !== -1)
    }

    hasShotForMic(micId: MicId): boolean {
        const shots = this.getShotsForMic(micId)

        if (shots.length > 0) {
            return true
        }
        return false
    }

    setCurrentMic(micId: MicId) {
        this.currentMic = micId
    }

    filterShotMaps(availableMicsMap: AvailableMicsMap) {
        this.filteredShotsMap = this.shotsMap
        .filter(m => availableMicsMap.get(m.id))

        this.allShots = this.getShotsFromMap(this.filteredShotsMap, true)
        this.shots = this.getShotsFromMap(this.filteredShotsMap)
        this.micsMap = this.getMicsMapFromShotMap(this.filteredShotsMap)
    }

    unfocus() {
        this.focus = false
    }
}