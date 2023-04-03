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
    Asset,
    Durations,
    MicId,
    AutocamSource,
    AvailableMicsMap,
    AudioDeviceSettings,
    AutocamSettings,
    Shoot,
    Thresholds,
    AutocamContainer,
} from '../../types/protocol'

type ContainerMap = Map<Asset['container']['name'], Container>

type MicTrigger = { micId: MicId, shotName?: Asset['source']['name'] }
type CurrentShotsMap = Map<Asset['container']['name'], Asset['source']['name']>
type MicsMap = Map<Asset['source']['name'], MicId[]>

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
    forcedShot$ = new Subject<Asset['source']>()
    timeline$: BehaviorSubject<MicId>
    volumeMics$: BehaviorSubject<Map<string, number>>
    private currentShots$: BehaviorSubject<CurrentShotsMap>

    private enable = false
    private currentScene: Asset['scene']['name'] = ''
    private containerMap: ContainerMap = new Map()
    private availableMics: AvailableMicsMap = new Map()
    private recorders: AudioActivity[] = []
    private micsSpeaking: Map<string, BehaviorSubject<boolean>>
    private micsVolume: Map<string, number>
    private subscriptions: Subscriptions = { timeline: null, forcedShot: null }

    private audioDevices: AudioDeviceSettings[] = []
    private autocamMapping: AutocamSettings[] = []
    private currentMapping: AutocamContainer[] = []


    constructor() {
        super('autocam')

        this.micsSpeaking = new Map()
        this.micsVolume = new Map()
        this.autocamMapping = []

        this.currentShots$ = new BehaviorSubject(new Map())
        this.timeline$ = new BehaviorSubject('')
        this.volumeMics$ = new BehaviorSubject(this.micsVolume)
    }

    init() {
        const audioDevices = db.getSpecificAndDefault(['settings', 'mics'], true)
        this.audioDevices = audioDevices.defaultValue
        this.micsSpeaking = this.getMicsMap(this.audioDevices)
        this.micsVolume = this.getMicsVolumeMap(this.audioDevices)
        this.volumeMics$.next(this.micsVolume)

        const autocamMapping = db.getSpecificAndDefault(['settings', 'autocam'], true)
        this.autocamMapping = autocamMapping.defaultValue

        this.addSubscription(
            audioDevices.configPart$.subscribe((aDevices: AudioDeviceSettings[]) => {
                this.updateAudioDevices(aDevices)
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

    private updateAudioDevices(devices: AudioDeviceSettings[]) {
        if (this.recorders.length){

            for (const i in this.recorders){
                const recorder = this.recorders[i]
                const rname = recorder.getName()

                const device = devices.find(d => d.name === rname)
                if (!device || !device.thresholds) continue

                this.recorders[i].setThresholds(device.thresholds)
            }

            return
        }

        this.audioDevices = devices

        this.micsSpeaking = this.getMicsMap(this.audioDevices)
        this.micsVolume = this.getMicsVolumeMap(this.audioDevices)
        this.volumeMics$.next(this.micsVolume)
    }

    private getMicsMap(devices: AudioDeviceSettings[]): Map<string, BehaviorSubject<boolean>> {
        const micIds = devices.reduce((p, d) => p.concat(d.micsName.filter((_m,i) => d.mics[i])), <string[]>[])
        return new Map(micIds.map((m) => [m, new BehaviorSubject(<boolean>false)]))
    }

    private getMicsVolumeMap(devices: AudioDeviceSettings[]): Map<string, number> {
        const micIds = devices.reduce((p, d) => p.concat(d.micsName.filter((_m,i) => d.mics[i])), <string[]>[])
        return new Map(micIds.map((m) => [m, 0]))
    }

    private setMicVolume(micId: MicId, volume: number) {
        if (!this.micsVolume.has(micId)) return
        this.micsVolume.set(micId, volume)
        this.volumeMics$.next(this.micsVolume)
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
                    this.micsSpeaking.get(mics[i].id)?.next(speaking)
                    this.setMicVolume(mics[i].id, volume)
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

    private getRandomContainerByShot(source: Asset['source'], forced: boolean = false): Container | null {
        const containers: Container[] = []
        this.containerMap.forEach(c => {
            if (c.hasShot(source, forced)) {
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
            this.containerMap.set(container.name, container)
        }

        this.enableContainers()
        this.filterShotMapContainers()
        this.currentMicContainers()
        this.setupTimeline()
    }

    private setupMicRecorder() {
        this.micsSpeaking.forEach((speaking$, micId) => {
            speaking$.subscribe((speaking) => {
                const currentMic = this.timeline$.getValue()
                if (speaking) {
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
                this.unfocusContainers(showing.name)
                return
            }

            const random = this.getRandomContainerByMic(micId)
            if (random) {
                this.logger.debug('Get a random container')
                random.trigger$.next({ micId })
                this.unfocusContainers(random.name)
                return
            }

            this.logger.error('Cannot find a container for this mic on this scene', { micId, scene: this.currentScene })
        })

        this.subscriptions.forcedShot = this.forcedShot$.subscribe(source => {
            const currentMic = this.timeline$.getValue()
            const focused = this.getFocusedContainer()
            if (focused && focused.hasShot(source, true)){
                this.logger.debug('Focus container has been forced to shoot', source)
                focused.trigger$.next({ micId: currentMic, shotName: source.name })
                return
            }

            const random = this.getRandomContainerByShot(source, true)
            if (random) {
                this.logger.debug('Get a random container')
                random.trigger$.next({ micId: currentMic, shotName: source.name })
                this.unfocusContainers(random.name)
                return
            }

            this.logger.error('Cannot find a container for this shot on this scene', { source, scene: this.currentScene })
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

    private unfocusContainers(containerId?: Container['name']) {
        this.containerMap.forEach(container => {
            if (container.name !== containerId){
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

    setCurrentScene(sceneName: Asset['scene']['name']) {
        this.currentScene = sceneName
        this.currentMapping = this.autocamMapping.find(c => c.name === sceneName)?.containers || []

        if (!this.currentMapping.length) {
            this.logger.info('This scene does not exist in config or has no containers', sceneName)
            return
        }

        this.manageContainers()
    }
}

class Container {

    enable = false
    focus = false
    lock = false
    trigger$ = new Subject<MicTrigger>()

    name: Asset['container']['name'] = ''
    private container: Asset['container']
    private shots: Asset['source']['name'][] = []
    private allShots: Asset['source']['name'][] = []

    private shotsMap: AutocamContainer['mics'] = []
    private filteredShotsMap: AutocamContainer['mics'] = []
    private micsMap: MicsMap = new Map()

    private durations: Durations = { min: 0, max: 0 }
    private shoot$: Subject<Shoot>
    private currentShots$: BehaviorSubject<CurrentShotsMap>
    private logger: Logger

    private currentMic: MicId = ''
    private currentShot: Asset['source'] = { name: '' }
    private timeouts: NodeJS.Timeout[] = []

    constructor(container: AutocamContainer, shoot$: Subject<Shoot>, currentShots$: BehaviorSubject<CurrentShotsMap>) {
        this.logger = getLogger('Autocam Container (' + container.name + ')')

        this.container = container
        this.parseContainer(container)
        this.shoot$ = shoot$
        this.currentShots$ = currentShots$

        this.trigger$.subscribe(params => {
            if (!this.focus) this.focus = true
            this.focusMode(params.micId, params.shotName)
        })
    }

    private parseContainer(container: AutocamContainer) {
        this.name = container.name
        this.shotsMap = container.mics
        this.filteredShotsMap = container.mics
        this.durations = container.durations
        this.shots = this.getShotsFromMap(container.mics)
        this.micsMap = this.getMicsMapFromShotMap(container.mics)
    }

    private getShotsFromMap(mics: AutocamContainer['mics'], noWeight?: boolean): Asset['source']['name'][] {
        let shots: Asset['source']['name'][] = []

        const minW = noWeight? -1 : 0

        mics.forEach(m =>
            shots = shots.concat(m.cams.reduce((p,c) => 
               p.concat(c.weight>minW? [c.source.name] : [])
            , <Asset['source']['name'][]>[]))
        )

        return shots.filter((s, i) => shots.indexOf(s) === i)
    }

    private getMicsMapFromShotMap(mics: AutocamContainer['mics']): MicsMap {
        const micsMap: MicsMap = new Map()

        mics.forEach(m => {
            m.cams.forEach(c => {
                if (c.weight > 0) {
                    const micdId: MicId[] = micsMap.get(c.source.name) || []
                    micsMap.set(c.source.name, micdId.concat([m.id]))
                }
            })
        })

        return micsMap
    }

    // SHOOT

    private shoot(shot: Asset['source']) {
        this.currentShot = shot

        const currentShots = new Map([...this.currentShots$.getValue()])
        currentShots.set(this.name, shot.name)
        this.currentShots$.next(currentShots)

        if (!shot || !shot.name) {
            this.logger.error('No shot selected')
            return
        }

        this.shoot$.next({
            mode: this.focus? 'focus' : 'illustration',
            container: this.container,
            shot: shot
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

    private getRandomShot(shots: Asset['source']['name'][]): Asset['source']['name']|undefined {
        const index = Math.floor(Math.random() * shots.length)

        return shots[index]
    }

    private pickShot(shots: AutocamSource[]): Asset['source']['name'] | undefined {
        const totalWeight = shots.reduce((res, shot) => res + shot.weight, 0)
        const rand = Math.random() * totalWeight
        let sum = 0
        for (const shot of shots) {
            sum += shot.weight
            if (rand <= sum) return shot.source.name
        }

        return undefined
    }

    private getUnallowedShots(): Asset['source']['name'][] {
        // GET ALL CURRENTS SHOTS
        const currentShots = this.currentShots$.getValue()

        // FILTER ONLY OTHER CONTAINERS SHOTS
        const otherShots: Asset['source']['name'][] = [...currentShots]
        .filter(([key]) => key !== this.name)
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
        let unallowedShots: Asset['source']['name'][] = []
        micsId.forEach(micId => {
            const shotMap = this.filteredShotsMap.find(m => m.id === micId)
            const shots = shotMap?.cams.map(c => c.source.name) || []

            unallowedShots = unallowedShots.concat(
                shots.filter(s => unallowedShots.indexOf(s) < 0)
            )
        })

        return unallowedShots
    }

    private getAllowedShots(shots: Asset['source']['name'][]): Asset['source']['name'][] {
        const unallowedShots = this.getUnallowedShots()

        return shots.filter(s => unallowedShots.indexOf(s) < 0)
    }

    // ILLUSTRATION MODE

    private getIllustrationDuration(): number {
        return (this.durations.max + this.durations.min) / 2
    }

    private getIllustrationShot(micId?: MicId): Asset['source']['name']|undefined {
        if (micId) {
            return this.getFocusShot(micId)
        }

        const allowedShots = this.getAllowedShots(this.shots)
        let shotName = this.getRandomShot(allowedShots)

        if (!shotName) {
            this.logger.error('problem with allowedShots probably')
            shotName = this.getRandomShot(this.shots)
        }

        return shotName
    }

    private getShotFromName(shotName: Asset['source']['name']): Asset['source']|undefined {
        return this.container.sources.find(s => s.name === shotName)
    }

    private illustrationMode(micId?: MicId, shotName?: Asset['source']['name']) {
        if (!this.enable){
            return
        }

        this.clearTimeouts()
        const duration = this.getIllustrationDuration()

        shotName = shotName? shotName : this.getIllustrationShot(micId)

        if (!shotName) {
            this.logger.error('problem with getIllustrationShot : no shot can be found')
            return
        }

        this.lock = true
        const shot = this.getShotFromName(shotName)
        if (!shot) {
            this.logger.error('problem with getShotFromName : no shot can be found')
            return
        }
        this.shoot(shot)

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

    private getFocusShot(micId: MicId): Asset['source']['name'] | undefined {
        const shots = this.getShotsForMic(micId)

        const unallowedShots = this.getUnallowedShots()
        const allowedShots = shots.filter(s => unallowedShots.indexOf(s.source.name) < 0)

        let shotName = this.pickShot(allowedShots)

        if (!shotName) {
            this.logger.error('problem with pickShot and this mic\'s shots', micId)
            let allowedShotsId = this.getAllowedShots(shots.map(s => s.source.name))
            shotName = this.getRandomShot(allowedShotsId)

            if (!shotName) {
                this.logger.error('problem with randomShot and this mic\'s shots', micId)
                allowedShotsId = this.getAllowedShots(this.shots)
                shotName = this.getRandomShot(allowedShotsId)
            }
        }

        return shotName
    }

    private focusMode(micId: MicId, shotName?: Asset['source']['name']) {
        if ((!this.enable || this.lock) && !shotName) {
            return
        }
        const forced = shotName? true : false
        const duration = forced? this.getIllustrationDuration() : this.durations.min

        this.clearTimeouts()

        shotName = shotName? shotName : this.getFocusShot(micId)
        if (!shotName) {
            this.logger.error('problem with getFocusShot : no shot can be found')
            return
        }

        this.lock = true

        const shot = this.getShotFromName(shotName)
        if (!shot) {
            this.logger.error('problem with getShotFromName : no shot can be found')
            return
        }
        this.shoot(shot)

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

    hasShot(source: Asset['source'], forced?: boolean): boolean {
        const list = forced? this.allShots : this.shots
        return (list.indexOf(source.name) !== -1)
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