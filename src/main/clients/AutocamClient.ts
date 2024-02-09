import { Subject, BehaviorSubject } from 'rxjs'
import type { Subscription } from 'rxjs'
import audioManager, { HostApi } from 'audio-manager-node'

import { Client } from '../../main/clients/Client'
import db from '../../main/utils/db'
import { getLogger, type Logger } from '../../main/utils/logger'
import { random, deepCopy } from '../../main/utils/utils'

import { AudioActivity, getDevices } from '../../main/modules/audioActivity'

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

type MicTrigger = { micId: MicId, shotName?: Asset['source']['name'], lastSpeakers?: MicId[]}
type CurrentShotsMap = Map<Asset['container']['name'], {source: Asset['source']['name'], mics: MicId[]}>
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

type MatchingShots = {
    matching: Asset['source']['name'][]
    unmatching: Asset['source']['name'][]
}

type speakerEvent = {
    micId: MicId
    time: number
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

    private lockShot: Asset['source'] = { name:'' }
    private lastSpeaker: MicId = ''
    private speakersEvents: speakerEvent[] = []

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
            this.logger.info({ devices: getDevices().filter(d => d.inputChannels > 0) }, 'available devices list')
            return
        }

        const record = db.getDefaultValue(['record'], true)

        this.recorders = []

        for (const i in devicesData){
            const recorder = new AudioActivity({
                deviceName: devicesData[i].name,
                host: devicesData[i].host as unknown as HostApi,
                channels: devicesData[i].channels.map(c => c.channelId),
                onAudio: (speaking, channelId, volume) => {
                    devicesData[i].channels.find(c => c.channelId === channelId)?.onToggleSpeaking(speaking, volume)
                },
                record,
                gain: devicesData[i].gain,
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

    updateAudioDevices(devices: AudioDeviceSettings[]) {
        if (this.recorders.length){
            
            for (const i in this.recorders){
                const recorder = this.recorders[i]
                const rname = recorder.getName()
                
                const device = devices.find(d => d.name === rname)
                if (!device) continue

                if (device.thresholds) this.recorders[i].setThresholds(device.thresholds)
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
        return new Map(micIds.map((m) => [m, -60]))
    }

    private setMicVolume(micId: MicId, volume: number) {
        if (volume < -60) volume = -60
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

        this.logger.info(deviceMics)

        return {
            name: device.name,
            gain: device.gain,
            nChannels: device.nChannels,
            host: device.host,
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

    private getShowingShotContainer(shot: Asset['source']['name']): Container | null {
        let container: Container | null = null
        this.containerMap.forEach(c => {
            if (c.isShowingShot(shot)) container = c
        })

        return container
    }

    private getShowingMicContainer(micId: MicId): Container | null {
        let container: Container | null = null
        this.containerMap.forEach(c => {
            if (c.isShowingMic(micId)) container = c
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
            return containers[Math.floor(random() * containers.length)]
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
            return containers[Math.floor(random() * containers.length)]
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

    private pingPongSpeakers(): MicId[] {
        const limit = Date.now() - 12000

        let micIds = this.speakersEvents
        .filter(e => e.time > limit)
        .map(e => e.micId)

        micIds = micIds
        .filter((m, i) => micIds.indexOf(m) === i)
        .reverse()
        
        micIds.shift()
        return micIds
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
            const container = new Container(mContainer, this.shoot$, this.currentShots$, this.currentScene)
            this.containerMap.set(container.name, container)
        }

        this.filterShotMapContainers()
        this.enableContainers()
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

                    if (micId === currentMic) return

                    if (micId !== this.lastSpeaker) {
                        this.speakersEvents.push({ micId, time: Date.now() })
                    }

                    if (!this.micIsAvailable(micId)) {
                        this.logger.info('mic is not available', micId)
                        return
                    }

                    this.logger.info(`${micId} started speaking`)
                    this.timeline$.next(micId)
                } else if (micId === currentMic) {
                    this.lastSpeaker = micId
                    let nextMicId = micId
                    this.logger.info(`${nextMicId} stopped speaking`)

                    nextMicId = this.otherSpeaker()
                    if (nextMicId) {
                        this.logger.info(`${nextMicId} is still speaking`)
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
            const lastSpeakers = this.pingPongSpeakers()

            const showing = this.getShowingMicContainer(micId)
            if (showing) {
                if (this.lastSpeaker === micId && showing.toUnfocus) return showing.focus_()
                
                this.logger.info('One container is already showing this mic')
                showing.trigger$.next({ micId, lastSpeakers })
                this.unfocusContainers(showing.name)
                return
            }

            const random = this.getRandomContainerByMic(micId)
            if (random) {
                this.logger.info('Get a random container')
                random.trigger$.next({ micId, lastSpeakers })
                this.unfocusContainers(random.name)
                return
            }

            this.logger.error('Cannot find a container for this mic on this scene', { micId, scene: this.currentScene })
        })

        this.subscriptions.forcedShot = this.forcedShot$.subscribe(source => {
            const currentMic = this.timeline$.getValue()
            this.lockShot = source

            const isShowing = this.getShowingShotContainer(source.name)
            if (isShowing && isShowing.focus) {
                this.logger.warn('A container is already showing this shot', isShowing.name)
                return
            }

            const focused = this.getFocusedContainer()
            if (focused && focused.hasShot(source, true)){
                this.logger.info('Focus container has been forced to shoot', source)
                focused.trigger$.next({ micId: currentMic, shotName: source.name })
                return
            }

            const random = this.getRandomContainerByShot(source, true)
            if (random) {
                this.logger.info('Get a random container')
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
        let init = false
        const length = this.containerMap.size
        const currentMic = this.timeline$.getValue() || this.lastSpeaker
        let index = 0

        this.containerMap.forEach((container) => {
            if (container.focus && !this.lockShot.name && !this.enable) {
                this.lockShot = container.getCurrentShot()
                init = true
            }

            container.enable = this.enable
            if (this.enable) {
                if ((container.hasShotForMic(currentMic) || index === length - 1) && !init) {
                    container.init(currentMic)
                    init = true
                } else {
                    container.init()
                }
            } else if ((container.hasShot(this.lockShot) || index === length - 1) && !init) {
                container.disabledInit(this.lockShot)
                init = true
            }
            index++
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
                container.unfocus_()
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

    setCurrentScene(sceneName: Asset['scene']['name']='') {
        if (this.currentScene === sceneName) return

        this.currentScene = sceneName
        this.currentMapping = this.autocamMapping.find(c => c.name === sceneName)?.containers || []

        if (!this.currentMapping.length) {
            this.logger.info('This scene does not exist in config or has no containers', sceneName)

            this.currentShots$ = new BehaviorSubject(new Map())
            this.clearTimeoutsContainers()
            this.cleanSubscriptions()
            this.containerMap = new Map()
            return
        }

        this.manageContainers()
    }
}

class Container {

    enable = false
    focus = false
    toUnfocus = false
    lock = false
    trigger$ = new Subject<MicTrigger>()

    name: Asset['container']['name'] = ''
    private container: Asset['container']
    private shots: Asset['source']['name'][] = []
    private allShots: Asset['source']['name'][] = []

    private shotsMap: AutocamContainer['mics'] = []
    private filteredShotsMap: AutocamContainer['mics'] = []
    private micsMap: MicsMap = new Map()
    private noIllu: Asset['source']['name'][] = []

    private durations: Durations = { min: 0, max: 0 }
    private shoot$: Subject<Shoot>
    private currentShots$: BehaviorSubject<CurrentShotsMap>
    private logger: Logger

    private currentMic: MicId = ''
    private currentShot: Asset['source'] = { name: '' }
    private timeouts: NodeJS.Timeout[] = []

    private currentScene: Asset['scene']['name']

    constructor(container: AutocamContainer, shoot$: Subject<Shoot>, currentShots$: BehaviorSubject<CurrentShotsMap>, scene: Asset['scene']['name']) {
        this.logger = getLogger('Autocam Container (' + container.name + ')')

        this.container = container
        this.parseContainer(container)
        this.shoot$ = shoot$
        this.currentShots$ = currentShots$
        this.currentScene = scene

        this.trigger$.subscribe(params => {
            this.focus = true
            this.toUnfocus = false

            if (!this.isShowingMic(params.micId)){
                this.logger.warn('FOCUS MODE (triggered)', params)
                this.focusMode(params.micId, params.shotName, params.lastSpeakers)
            }
        })
    }

    private parseContainer(container: AutocamContainer) {
        this.name = container.name
        this.shotsMap = container.mics
        this.filteredShotsMap = container.mics
        this.durations = container.durations
        this.shots = this.getShotsFromMap(container.mics)
        this.micsMap = this.getMicsMapFromShotMap(container.mics)
        this.noIllu = this.getNoIlluFromShotMap(container.mics)
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

    private getNoIlluFromShotMap(mics: AutocamContainer['mics']): Asset['source']['name'][] {
        let shots: Asset['source']['name'][] = []

        for (let mic of mics){
            for (let cam of mic.cams){
                if (cam.source.options?.noIllu && shots.indexOf(cam.source.name) === -1){
                    shots.push(cam.source.name)
                }
            }
        }

        return shots
    }

    // SHOOT

    private shoot(shot: Asset['source']) {
        this.currentShot = shot

        const currentShots = new Map([...this.currentShots$.getValue()])
        currentShots.set(this.name, {source: shot.name, mics: this.micsMap.get(shot.name) || []})
        this.currentShots$.next(currentShots)

        if (!shot || !shot.name) {
            this.logger.error('No shot selected')
            return
        }

        this.shoot$.next({
            mode: this.focus? 'focus' : 'illustration',
            container: this.container,
            shot: shot,
            sceneName: this.currentScene
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
        const index = Math.floor(random() * shots.length)

        return shots[index]
    }

    private pickShot(shots: AutocamSource[]): Asset['source']['name'] | undefined {
        const totalWeight = shots.reduce((res, shot) => res + shot.weight, 0)
        const rand = random() * totalWeight
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
        const otherShots: {source: Asset['source']['name'], mics: MicId[]}[] = [...currentShots]
        .filter(([key]) => key !== this.name)
        .map(row => row[1])

        // GET MICS SHOWED BY THESE SHOTS
        let micsId: MicId[] = []
        otherShots.forEach(shot => {
            const mIds: string[] = shot.mics
            micsId = micsId.concat(
                mIds.filter(s => micsId.indexOf(s) < 0)
            )
        })

        // GET ALL SHOTS SHOWING THESE MICS
        let unallowedShots: Asset['source']['name'][] = []
        micsId.forEach(micId => {
            const shotMap = this.filteredShotsMap.find(m => m.id === micId)
            const shots = shotMap?.cams.filter(c => c.weight > 0).map(c => c.source.name) || []

            unallowedShots = unallowedShots.concat(
                shots.filter(s => unallowedShots.indexOf(s) < 0)
            )
        })

        return unallowedShots
    }

    private getAllowedShots(shots: Asset['source']['name'][]): Asset['source']['name'][] {
        const unallowedShots = this.getUnallowedShots()

        return shots.filter(s => unallowedShots.indexOf(s) < 0 && this.noIllu.indexOf(s) < 0)
    }

    // ILLUSTRATION MODE

    private getIllustrationDuration(): number {
        return (this.durations.max + this.durations.min) / 2
    }

    private getIllustrationShot(micId?: MicId): Asset['source']['name']|undefined {
        if (micId) return this.getFocusShot(micId)
        
        
        const allowedShots = this.getAllowedShots(this.shots)
        let shotName = this.getRandomShot(allowedShots)
        
        if (!shotName) shotName = this.getRandomShot(this.shots)

        return shotName
    }

    private getShotFromName(shotName: Asset['source']['name']): Asset['source']|undefined {
        return this.container.sources.find(s => s.name === shotName)
    }

    private illustrationMode(micId?: MicId, shotName?: Asset['source']['name']) {
        // if (!this.enable){
        //     return
        // }

        this.clearTimeouts()
        const duration = this.getIllustrationDuration()

        shotName = shotName? shotName : this.getIllustrationShot(micId)

        if (!shotName) {
            this.logger.error('problem with getIllustrationShot : no shot can be found')
            return
        }

        const shot = this.getShotFromName(shotName)
        if (!shot) {
            this.logger.error('problem with getShotFromName : no shot can be found')
            return
        }
        if (this.currentShot !== shot) this.lock = true
        this.shoot(shot)

        this.timeouts.push(setTimeout(() => {
            this.lock = false

            if (this.focus && !this.isShowingMic(this.currentMic)){
                this.focusMode(this.currentMic)
            }
        }, this.durations.min * 1000))

        this.timeouts.push(setTimeout(() => {
            if (this.focus){
                return this.focusMode(this.currentMic)
            }
            this.illustrationMode()
        }, duration * 1000))
    }

    // FOCUS MODE

    private filterShotsByLastSpeakers(shots: AutocamSource[], lastSpeakers: MicId[]): AutocamSource[] {
        const shotsMap: Map<Asset['source']['name'], number> = new Map()
        for (let map of this.filteredShotsMap){
            if (lastSpeakers.indexOf(map.id) > -1){
                map.cams.forEach(cam => {
                    if (cam.weight > 0){
                        shotsMap.set(cam.source.name, (shotsMap.get(cam.source.name) || 0) + 1)
                    }
                })
            }
        }
        const shotsNames = Array.from(shotsMap).filter(s => s[1] === lastSpeakers.length).map(s => s[0])
        return shots.filter(s => shotsNames.indexOf(s.source.name) > -1 && s.weight > 0)
    }

    private getFocusShot(micId: MicId, lastSpeakers?: MicId[]): Asset['source']['name'] | undefined {
        const shots = this.getShotsForMic(micId)

        const unallowedShots = this.getUnallowedShots()
        let allowedShots = shots.filter(s => unallowedShots.indexOf(s.source.name) < 0)

        while (lastSpeakers && lastSpeakers.length > 0){
            const lastShots = this.filterShotsByLastSpeakers(allowedShots, lastSpeakers)
            if (lastShots.length > 0) {
                allowedShots = lastShots
                break
            }
            lastSpeakers.pop()
        }

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

    private focusMode(micId: MicId, shotName?: Asset['source']['name'], lastSpeakers?: MicId[]) {
        if (this.lock && !shotName) return

        const forced = shotName? true : false
        const duration = forced? this.getIllustrationDuration() : this.durations.min

        this.clearTimeouts()

        shotName = shotName? shotName : this.getFocusShot(micId, lastSpeakers)
        if (!shotName) {
            this.logger.error('problem with getFocusShot : no shot can be found')
            return
        }

        
        const shot = this.getShotFromName(shotName)
        if (!shot) {
            this.logger.error('problem with getShotFromName : no shot can be found')
            return
        }

        if (this.currentShot !== shot) this.lock = true
        this.toUnfocus = false
        this.shoot(shot)

        this.timeouts.push(setTimeout(() => {
            this.logger.warn('unlock (focus)')
            this.lock = false

            if (!this.enable) return

            if (this.currentMic && this.currentMic !== micId) {
                this.logger.warn('FOCUS MODE (currentMic changed)', {currentMic:this.currentMic, micId})
                this.focusMode(this.currentMic)
            } else if (forced) {
                this.logger.warn('ILLUSTRATION MODE (focusMode forced)', {forced})
                this.unfocus_()
                this.illustrationMode()
            }
        }, duration * 1000))

        this.timeouts.push(setTimeout(() => {
            this.logger.warn('end (focus)')

            if (!this.enable) return

            if (!this.focus || this.toUnfocus || !this.currentMic) {
                this.logger.warn('ILLUSTRATION MODE (after max duration && !focus)', {focus:this.focus, toUnfocus:this.toUnfocus, currentMic:this.currentMic})

                this.toUnfocus = false
                this.focus = false

                this.illustrationMode(this.currentMic)
            } else {

                this.logger.warn('FOCUS MODE (after max duration)', {currentMic:this.currentMic})
                this.focusMode(this.currentMic)
            }

        }, this.durations.max * 1000))
    }

    // PUBLIC METHODS

    init(currentMic?: MicId) {
        if (currentMic) {
            this.trigger$.next({ micId: currentMic })
        } else {
            this.illustrationMode()
        }
        return
    }

    clearTimeouts() {
        this.timeouts.forEach(t => {
            clearTimeout(t)
        })
    }

    isShowingShot(shot: Asset['source']['name']): boolean {
        return (this.currentShot.name === shot)
    }

    isShowingMic(micId: MicId): boolean {
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

    private shotIsMatching(matching: string[], availableMicsMap: AvailableMicsMap): boolean {
        let resp = false

        for (let i in matching) {
            const entry = matching[i].split('')
            const availableMics = Array.from(availableMicsMap).map(m => m[1])

            if (entry.length !== availableMics.length) continue

            let good = true
            for (let j in entry) {
                if (entry[j] === '*') continue
                if (!!+entry[j] !== availableMics[j]) {
                    good = false
                    break
                }
            }

            if (good) {
                resp = true
                break
            }
        }

        return resp
    }

    private getMatchingShots(availableMicsMap: AvailableMicsMap): MatchingShots {
        const shots: MatchingShots = {
            matching: [],
            unmatching: []
        }

        const shotsMap: typeof this.shotsMap = deepCopy(this.shotsMap)
        for (let i in shotsMap) {
            for (let j in shotsMap[i].cams) {
                const cam = shotsMap[i].cams[j]
                if (cam.source.options && cam.source.options.matching) {
                    if (this.shotIsMatching(cam.source.options.matching, availableMicsMap)) {
                        shots.matching.push(cam.source.name)
                    } else {
                        shots.unmatching.push(cam.source.name)
                    }
                }
            }
        }

        return shots
    }

    filterShotMaps(availableMicsMap: AvailableMicsMap) {
        const shotsMap: typeof this.shotsMap = deepCopy(this.shotsMap)

        const forbiddenShotsMap = shotsMap
        .filter(m => !availableMicsMap.get(m.id))
        const matchingShots = this.getMatchingShots(availableMicsMap)
        const forbiddenShots = this.getShotsFromMap(forbiddenShotsMap)
        .filter(s => matchingShots.matching.indexOf(s) < 0)

        matchingShots.unmatching.forEach(s => {
            if (forbiddenShots.indexOf(s) === -1) forbiddenShots.push(s)
        })

        this.filteredShotsMap = shotsMap
        .filter(m => availableMicsMap.get(m.id))

        this.filteredShotsMap.forEach(m => {
            m.cams = m.cams.filter(c => forbiddenShots.indexOf(c.source.name) < 0)
        })

        this.allShots = this.getShotsFromMap(this.filteredShotsMap)
        this.shots = this.getShotsFromMap(this.filteredShotsMap, true)
        this.micsMap = this.getMicsMapFromShotMap(this.filteredShotsMap)
    }

    unfocus_() {
        if (this.focus) this.toUnfocus = true
    }

    focus_() {
        this.focus = true
        this.toUnfocus = false
    }

    disabledInit(lockShot: Asset['source']) {
        let shotName: string|undefined = lockShot.name
        if (!this.hasShot(lockShot, true)) {
            shotName = this.getRandomShot(this.shots)
        }
        if (shotName) {
            this.trigger$.next({ micId: this.currentMic, shotName })
        }
        return
    }

    getCurrentShot(): Asset['source'] {
        return this.currentShot
    }

}