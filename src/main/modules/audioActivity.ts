import path from "path"
import fs from "fs"

import audioManager, { AudioDevice, AudioFeedback, HostApi } from 'audio-manager-node'

import { getLogger } from '../utils/logger'
import { formatDate } from '../utils/utils'
import { Thresholds } from "@src/types/protocol"

const logger = getLogger('audio Activity')

type ProcessedChannel = Map<number, {volume:number, speaking:boolean|undefined}>

export class AudioActivity {
    private _speaking: boolean[]
    private _consecutive: number[]

    private _speakingThreshold = 5
    private _silenceThreshold = 20
    private _buffer: AudioFeedback[] = []

    private _vadThreshold = 0.75
    private _minVolume = -35
 
    private _sharedState: unknown | undefined

    private _deviceName: string
    private _device : AudioDevice | undefined

    private _isOpen: boolean

    private _gain: number = 0
    private _record: string | null = null

    private _channels: number[]
    private _onAudio: (speaking: boolean, channel: number, volume: number) => void

    private _restarting: boolean = false
    private _volumes: number[] = []
    private _volFrameLength = 0

    constructor(options: {
        deviceName: string
        host?: HostApi
        gain?: number
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
        if (options.gain) this._gain = options.gain

        const maxChannel = options.channels[options.channels.length-1]+1
        this._speaking = Array(maxChannel).fill(false)
        this._consecutive = Array(maxChannel).fill(0)
        this._isOpen = false

        this._device = getAudioDevice(this._deviceName, options.host)
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

    public async start() {
        if (!this._device) return
        
        logger.info(this._device)
        logger.debug(this._gain)

        this._sharedState = audioManager.start(
            this._device.name,
            this._device.host,
            this.getFileName(),
            (err, data) => {
                if (err) {
                    logger.error(err)
                    return
                }
                // logger.info(data)
                this.process(data)
            },
            this._gain
        )

        this._isOpen = true
        // this._volumes = []
        // this._restarting = false
    }

    public stop() {
        if (!this._sharedState || !this._isOpen) return

        audioManager.stop(this._sharedState)

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

        const deviceName = this._device.name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 10)

        let d = new Date()
        let datestring = d.getFullYear() + ("0"+(d.getMonth()+1)).slice(-2) + ("0" + d.getDate()).slice(-2) + "-" + ("0" + d.getHours()).slice(-2) + ("0" + d.getMinutes()).slice(-2)

        const dir = formatDate(this._record)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir)

        return path.join(dir, `audio-${datestring}-${deviceName}.wav`)
    }

    private async process(data: AudioFeedback[]) {
        if (!this._device) return

        for (let channelId of this._channels) {
            this._buffer.push(data[channelId])
        }

        const bufferLength = (this._speakingThreshold+2)*this._channels.length
        if (this._buffer.length > bufferLength) {
            this._buffer = this._buffer.slice(this._buffer.length - bufferLength)
        }
        if (this._buffer.length < bufferLength) {
            return
        }

        const processed: ProcessedChannel = new Map()
        let start = this._speaking.reduce((p, v) => (p||v? true : false), false)
        for (let channelId of this._channels) {
            const filtred = this._buffer.filter((d) => d.channelId === channelId)
            if (!start) {
                const sf = this.speakingFrames(filtred.slice(0, this._speakingThreshold))
                if (sf === this._speakingThreshold) start = true
            }

            let isSpeaking = this.isSpeaking(channelId, filtred)
            processed.set(channelId, {
                speaking: isSpeaking,
                volume: data[channelId].volume,
            })
        }

        if (start) {
            let speakers = this.getSpeakers(processed)
            if (speakers.length > 1) {
                const loudestChanId = this.getLoudestSpeakers(speakers)

                for (let channelId of speakers) {
                    if (channelId !== loudestChanId) {
                        const speaking = this._speaking[channelId]? false : undefined
                        processed.set(channelId, {
                            speaking: speaking,
                            volume: data[channelId].volume,
                        })
                    }
                }
            }
        }

        for (let channelId of this._channels) {
            const c = processed.get(channelId)
            if (!c) continue

            if (c.speaking !== undefined) this._speaking[channelId] = c.speaking
            if (!start) this._speaking[channelId] = false
            this._onAudio(this._speaking[channelId], channelId, c.volume)
        }
    }

    private speakingFrames(frames: AudioFeedback[]): number {
        return frames.reduce((total, d) => {
            if (d.speakingProb >= this._vadThreshold) {
                total += 1
            }
            return total
        }, 0)
    }

    private avgDecibels(frames: AudioFeedback[]): number {
        const totalNoiseEnergy = frames
        .map((d) => Math.pow(10, d.volume/10))
        .reduce((total, v) => total + v, 0)

        return 10*Math.log10(totalNoiseEnergy/frames.length)
    }

    private isSpeaking(channelId: number, frames: AudioFeedback[]): boolean | undefined {
        const LIMIT = 30
        let isSpeaking: boolean | undefined = (this.speakingFrames(frames) >= this._speakingThreshold)
        const toAdd = isSpeaking? 1 : -1

        // reset consecutive if the sign changes
        if (this._consecutive[channelId] * toAdd < 0) this._consecutive[channelId] = 0
        if (-LIMIT < this._consecutive[channelId] && this._consecutive[channelId] < LIMIT) this._consecutive[channelId] += toAdd

        if (!this._speaking[channelId] && isSpeaking) {
            isSpeaking = true
        } else if (this._speaking[channelId] && this._consecutive[channelId] < this._silenceThreshold*-1) {
            isSpeaking = false
        } else {
            isSpeaking = undefined
        }

        return isSpeaking
    }

    private getSpeakers(processed: ProcessedChannel): number[] {
        let speakers: number[] = []
        for (let channelId of this._channels) {
            const c = processed.get(channelId)
            if (!c) continue

            if (c.speaking || (c.speaking === undefined && this._speaking[channelId])) {
                speakers.push(channelId)
            }
        }

        return speakers
    }

    private getLoudestSpeakers(speakers: number[]): number {
        const loudestChan = {channelId: -1, volume: -100}
        for (let channelId of speakers) {
            const filtred = this._buffer.filter((d) => d.channelId === channelId)
            const avg = this.avgDecibels(filtred)
            if (avg > loudestChan.volume) {
                loudestChan.channelId = channelId
                loudestChan.volume = avg
            }
        }

        return loudestChan.channelId
    }

}

const getAudioDevice = (deviceName: string, host?: HostApi): AudioDevice | undefined => {
    try {
        const device = audioManager.getDevice(deviceName, host)
        if (device.error) {
            logger.error(`cannot find device ${deviceName}`, device.error)
            return undefined
        }
        return device
    } catch (e) {
        logger.error(`cannot find device ${deviceName}`, e)
        return undefined
    }
}

export const getDevices = (): AudioDevice[] => {
    return audioManager.getAllDevices();
}

