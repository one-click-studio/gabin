import path from "path"
import fs from "fs"

import audioModule, { AudioDevice, AudioFeedback } from 'audio-manager-node'

import { getLogger } from '../utils/logger'
import { formatDate } from '../utils/utils'
import { Thresholds } from "@src/types/protocol"

const logger = getLogger('audio Activity')

interface Device {
    id: number
    data: AudioDevice
}

type ProcessedChannel = Map<number, {volume:number, speaking:boolean|undefined}>

const TIME_TO_WATCH = 30 * 1000

export class AudioActivity {
    private _speaking: boolean[]
    private _consecutive: number[]

    private _speakingThreshold = 3
    private _silenceThreshold = 10

    private _vadThreshold = 0.75
    private _minVolume = -35
 
    private _bufferLength: number = 0
 
    private _sharedState: unknown | undefined

    private _deviceName: string
    private _device : Device | undefined

    private _isOpen: boolean

    private _record: string | null = null

    private _channels: number[]
    private _onAudio: (speaking: boolean, channel: number, volume: number) => void

    private _restarting: boolean = false
    private _lastProcess: number = 0
    private _volumes: number[] = []
    private _volFrameLength = 0

    constructor(options: {
        deviceName: string
        channels: number[]
        onAudio: (speaking: boolean, channel: number, volume: number) => void,
        thresholds?: {
            speaking?: number,
            silence?: number,
            vad?: number
        },
        record?: string
    }) {

        this._deviceName = options.deviceName
        this._channels = options.channels
        this._onAudio = options.onAudio

        if (options.thresholds?.speaking) this.setSpeakingThreshold(options.thresholds.speaking)
        if (options.thresholds?.silence) this.setSilenceThreshold(options.thresholds.silence)
        if (options.thresholds?.vad) this.setVadThreshold(options.thresholds.vad)
        if (options.record) this._record = options.record

        this._speaking = Array(options.channels.length).fill(false)
        this._consecutive = Array(options.channels.length).fill(0)
        this._isOpen = false

        this.getDevice()
    }

    public getName(): string {
        return this._deviceName
    }

    public setThresholds(thresholds: Thresholds) {
        this.setSpeakingThreshold(thresholds.speaking)
        this.setSilenceThreshold(thresholds.silence)
        this.setVadThreshold(thresholds.vad)
        this.setMinVolume(thresholds.minVolume)
    }

    public getThresholds(): Thresholds {
        return {
            speaking: this.getSpeakingThreshold(),
            silence: this.getSilenceThreshold(),
            vad: this.getVadThreshold(),
            minVolume: this.getMinVolume()
        }
    }

    public getSpeakingThreshold(): number {
        return this._speakingThreshold
    }

    public setSpeakingThreshold(value: number) {
        this._speakingThreshold = value
    }

    public getSilenceThreshold(): number {
        return this._silenceThreshold
    }

    public setSilenceThreshold(value: number) {
        this._silenceThreshold = value
    }

    public getVadThreshold(): number {
        return this._vadThreshold
    }

    public setVadThreshold(value: number) {
        this._vadThreshold = value
    }

    public getMinVolume(): number {
        return this._minVolume
    }

    public setMinVolume(value: number) {
        this._minVolume = value
    }

    public isReady(): boolean {
        return true
    }

    public async init() {
        if (!this._device) return

        // 30 * 1000 milliseconds / (( samplerate * bitrate) / (framesPerBuffer * channels * 2))
        // this._volFrameLength = Math.round(TIME_TO_WATCH/((this._sampleRate*8)/(this._framesPerBuffer*this._device.data.inputChannels*2)))

        // setInterval(() => {
        //     if (this._isOpen && Date.now() - this._lastProcess > TIME_TO_WATCH) {
        //         logger.error('Audio stream not processing, restarting')
        //         this.restart()
        //     }
        // }, TIME_TO_WATCH/2)
    }

    public async start() {
        if (!this._device) return

        this.init()

        logger.info({
            deviceId: this._device.id,
            nChannels: this._device.data.inputChannels,
            firstChannel: 0
        })

        this._sharedState = audioModule.start(this._device.data.name, this.getFileName(), (err, data) => {
            if (err) {
                logger.error(err)
                return
            }
            // logger.info(data)
            this.process(data)
        })

        this._isOpen = true
        this._volumes = []
        
        this._restarting = false
    }

    public stop() {
        if (!this._sharedState || !this._isOpen) return

        audioModule.stop(this._sharedState)

        this._isOpen = false
        this._sharedState = undefined
    }

    public async restart() {
        if (this._restarting) return

        logger.debug('Restarting audio stream')
        this.stop()
        // wait 1 second to make sure the stream is closed
        await new Promise(resolve => setTimeout(resolve, 1000))
        this.start()
    }

    private getFileName(): string {
        if (!this._device || !this._record) return ""

        const deviceName = this._device.data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 10)

        let d = new Date()
        let datestring = d.getFullYear() + ("0"+(d.getMonth()+1)).slice(-2) + ("0" + d.getDate()).slice(-2) + "-" + ("0" + d.getHours()).slice(-2) + ("0" + d.getMinutes()).slice(-2)

        const dir = formatDate(this._record)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir)

        return path.join(dir, `audio-${datestring}-${deviceName}.wav`)
    }

    private shouldRestart(): boolean {
        const sum = this._volumes.reduce((a, b) => a + b, 0)
        if (sum === 0 && this._volumes.length >= this._volFrameLength) return true
        return false
    }


    async process(data: AudioFeedback[]) {
        if (!this._device) return

        const processed: ProcessedChannel = new Map()
        this._lastProcess = Date.now()

        // let sumVolume = 0 
        for (let i = 0; i < data.length; i++) {
            const shortIndex = this.shortIndex(i)
            if (shortIndex === -1) continue

            const speaking = await this.processChannel(data[i]);
            if (data[i].volume > -30) {
                logger.debug({
                    channel: data[i].channelId,
                    volume: data[i].volume,
                })
            }

            // sumVolume += volume
            processed.set(i, {
                speaking,
                volume: data[i].volume,
            })
        }
        // this._volumes.push(sumVolume)
        // this._volumes = this._volumes.slice(-this._volFrameLength)

        // if (this.shouldRestart()) return this.restart()

        if (this.tooManySpeakers(processed)){
            const channelId = this.chooseSpeaker(processed)

            for (let i = 0; i < this._channels.length; i++) {
                const cId = this.longIndex(i)
                const channel = processed.get(cId)
                if (!channel || cId === channelId) continue
                if (channel.speaking !== true && !this._speaking[i]) continue

                channel.speaking = this._speaking[i]? false : undefined
            }
        }

        for (let i = 0; i < this._channels.length; i++) {
            const cId = this.longIndex(i)
            const channel = processed.get(cId)
            if (!channel) continue

            if (channel.speaking !== undefined) this._speaking[i] = channel.speaking
            this._onAudio(this._speaking[i], cId, channel.volume)
        }
    }

    private tooManySpeakers(processed: ProcessedChannel): boolean {
        let speaking = 0
        for (let i = 0; i < this._channels.length; i++) {
            const cId = this.longIndex(i)
            const channel = processed.get(cId)
            if (channel?.speaking || (channel?.speaking === undefined && this._speaking[i])) {
                speaking++
            }
        }

        return (speaking > 1)
    }

    private chooseSpeaker(processed: ProcessedChannel): number {
        const wasSpeaking = this.wasSpeaking(processed)
        if (wasSpeaking !== -1) return wasSpeaking

        return this.getLoudestChannel(processed)
    }

    private wasSpeaking(processed: ProcessedChannel): number {
        for (let i = 0; i < this._channels.length; i++) {
            const cId = this.longIndex(i)
            const channel = processed.get(cId)
            
            if ((channel?.speaking || channel?.speaking === undefined) && this._speaking[i]) {
                return cId
            }
        }

        return -1
    }
    
    private getLoudestChannel(processed: ProcessedChannel): number {
        let maxVolume = 0
        let maxChannel = 0
        for (let i = 0; i < this._channels.length; i++) {
            const cId = this.longIndex(i)
            const channel = processed.get(cId)
            if (channel?.volume && channel.volume > maxVolume) {
                maxVolume = channel.volume
                maxChannel = cId
            }
        }
        return maxChannel
    }

    // channels : [1, 2, 4]
    // inputChannels :  6
    // buffers : [null, buf, buf, null, buf, null]

    // index 1 -> 0
    private shortIndex(index: number): number {
        return this._channels.indexOf(index)
    }

    // index 0 -> 1
    private longIndex(index: number): number {
        return this._channels[index]
    }

    private async processChannel(data: AudioFeedback): Promise<boolean|undefined> {
        let isSpeaking = false
        const index = this.shortIndex(data.channelId)

        if (data.volume > this._minVolume) {
            if (data.speakingProb > this._vadThreshold) {
                isSpeaking = true
            }
        }

        const toAdd = isSpeaking? 1 : -1
    
        if (this._consecutive[index] * toAdd < 0)
        this._consecutive[index] = 0
        
        this._consecutive[index] += toAdd

        if (!this._speaking[index] && this._consecutive[index] > this._speakingThreshold) {
            return true
        } else if (this._speaking[index] && this._consecutive[index] < this._silenceThreshold*-1) {
            return false
        }

        return undefined
    }

    private getDevice() {

        const device = getAudioDevice(this._deviceName)
        if (device) {
            this._device = {
                id: -1,
                data: device,
            }

            return
        }
    }

}

const getAudioDevice = (deviceName: string): AudioDevice | undefined => {
    try {
        return audioModule.getDevice(deviceName)
    } catch (e) {
        logger.error(`cannot find device ${deviceName}`, e)
        return undefined
    }
}

export const getDevices = (): Device[] => {
    const d = audioModule.getAllDevices();

    const devices: Device[] = []
    for (let j = 0; j < d.inputs.length; j++) {
        const device = getAudioDevice(d.inputs[j])
        if (!device) continue

        devices.push({
            id: j,
            data: device,
        })
    }

    return devices
}

