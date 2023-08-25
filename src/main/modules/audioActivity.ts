import path from "path"
import fs from "fs"
import os from "os"
import { RtAudio, RtAudioFormat, RtAudioApi, RtAudioDeviceInfo } from "audify"
import { InferenceSession, Tensor } from "onnxruntime-node"
import { getLogger } from '../utils/logger'
import { formatDate } from '../utils/utils'
import { Thresholds } from "@src/types/protocol"
import { FileWriter } from 'wav'

const sileroModelPath = path.join(__dirname, `../../resources/models/silero.onnx`)

const logger = getLogger('audio Activity')

interface Device {
    id: number
    data: RtAudioDeviceInfo
    apiId: RtAudioApi
    apiName: string
}

type ProcessedChannel = Map<number, {volume:number, speaking:boolean|undefined, consecutive: number}>

const AudioApiByPlateform = {
    LINUX_ALSA: ['linux'],
    LINUX_OSS: ['linux'],
    LINUX_PULSE: ['linux'],
    MACOSX_CORE: ['darwin'],
    RTAUDIO_DUMMY: [],
    UNIX_JACK: ['darwin', 'linux'],
    UNSPECIFIED: [],
    WINDOWS_ASIO: ['win32'],
    WINDOWS_DS: ['win32'],
    WINDOWS_WASAPI: ['win32']
}

class SileroVad {
    private loaded = false;
    private session: any;

    public ready = false;

    private _h: Tensor
    private _c: Tensor
    private _sr: Tensor

    constructor() {
        // @ts-ignore
        this._sr = new Tensor("int64", [16000n])
        this._c = new Tensor("float32", Array(2 * 64).fill(0), [2, 1, 64])
        this._h = new Tensor("float32", Array(2 * 64).fill(0), [2, 1, 64])
    }

    async load() {
        if (this.loaded) return

        this.loaded = true

        try {
            const model = fs.readFileSync(sileroModelPath)
            this.session = await InferenceSession.create(model)
        } catch (e) {
            logger.error(e)
            return
        }

        if (!this.session) return

        this.ready = true
    }

    async process(audio: number[], batchSize = 1): Promise<number> {
        if (!this.loaded) {
            await this.load()
        }

        if (!this.ready) return 0

        const result = await this.session.run({
            input: new Tensor(Float32Array.from(audio), [batchSize, audio.length / batchSize]),
            sr: this._sr,
            c: this._c,
            h: this._h,
        })

        this._h = result.hn
        this._c = result.cn
    
        return result.output.data[0]
    }
}

const splitBuffer = (buffer: Buffer, size: number, channels: number):number[][] => {
    const buffers: number[][] = []

    // init buffers
    for (let i = 0; i < channels; i++) buffers[i] = []

    for (let i = 0; i < buffer.length; i++) {
        const index = Math.floor((i%(channels*size)) / size)
        buffers[index].push(buffer[i])
    }

    return buffers
}

export class AudioActivity {
    private _speaking: boolean[]
    private _consecutive: number[]

    private _speakingThreshold = 3
    private _silenceThreshold = 10

    private _vadThreshold = 0.05
    private _minVolume = 0.5
 
    private _bufferLength: number = 0
 
    private _sileroVad: SileroVad | undefined
    private _rtAudio: RtAudio | undefined

    private _deviceName: string
    private _device : Device | undefined

    private _apiId: RtAudioApi | undefined
    private _framesPerBuffer: number
    private _sampleRate: number = 0
    private _isOpen: boolean

    private _recorders: FileWriter[]
    private _record: string | undefined

    private _channels: number[]
    private _onAudio: (speaking: boolean, channel: number, volume: number) => void

    constructor(options: {
        deviceName: string
        apiId?: RtAudioApi
        channels: number[]
        framesPerBuffer: number
        sampleRate?: number
        onAudio: (speaking: boolean, channel: number, volume: number) => void,
        thresholds?: {
            speaking?: number,
            silence?: number,
            vad?: number
        },
        record?: string
    }) {

        this._deviceName = options.deviceName
        this._apiId = options.apiId
        this._channels = options.channels
        this._framesPerBuffer = options.framesPerBuffer
        if (options.sampleRate) this._sampleRate = options.sampleRate
        this._onAudio = options.onAudio

        if (options.thresholds?.speaking) this.setSpeakingThreshold(options.thresholds.speaking)
        if (options.thresholds?.silence) this.setSilenceThreshold(options.thresholds.silence)
        if (options.thresholds?.vad) this.setVadThreshold(options.thresholds.vad)
        if (options.record) this._record = options.record

        this._speaking = Array(options.channels.length).fill(false)
        this._consecutive = Array(options.channels.length).fill(0)
        this._isOpen = false
        this._recorders = []

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
        return this._sileroVad?.ready || false
    }

    public async init() {
        if (!this._device) return

        this._sampleRate = this.getSampleRate(this._device.data)

        this._sileroVad = new SileroVad()
        await this._sileroVad.load()

        for (let i = 0; i < this._channels.length; i++) {
            if (this._record) {
                this._recorders[i] = new FileWriter(this.getFileName(i), {
                    sampleRate: this._sampleRate/2,
                    channels: 1
                })
            }
        }
    }

    public async start() {
        if (!this._device) return

        this.init()

        this._rtAudio = new RtAudio(this._apiId)

        logger.info({
            deviceId: this._device.id,
            nChannels: this._device.data.inputChannels,
            firstChannel: 0
        })

        this._rtAudio.openStream(
            null,
            {
                deviceId: this._device.id,
                nChannels: this._device.data.inputChannels,
                firstChannel: 0
            },
            RtAudioFormat.RTAUDIO_SINT8,
            this._sampleRate,
            this._framesPerBuffer,
            "MyStream",
            this.process.bind(this),
            null
        )
        this._isOpen = true

        this._rtAudio.start()
    }

    public stop() {
        if (!this._rtAudio || !this._isOpen) return

        for (let i in this._recorders) this._recorders[i].end()

        this._rtAudio.stop()
        this._rtAudio.closeStream()
    }

    private async load() {
        if (!this._sileroVad) return
        for (let i = 0; i < this._channels.length; i++) await this._sileroVad.load()
    }

    private getSampleRate(data: RtAudioDeviceInfo): number {
        if (this._sampleRate) return this._sampleRate

        if (data.preferredSampleRate) return data.preferredSampleRate

        for (let i = data.sampleRates.length-1; i >= 0; i--) {
            if (data.sampleRates[i] < 50000) return data.sampleRates[i]
        }

        return data.sampleRates[0]
    }

    private setBufferSize(size: number) {
        const min = this._sampleRate / 50
        const sizes = [min, min*2, min*3]

        for (let i = sizes.length-1; i >= 0; i--) {
            if (sizes[i] <= size) {
                this._bufferLength = sizes[i]
                break
            }
        }
    }

    private getVolume(pcm: number[]): number {
        let sum = 0
        for (let i = 0; i < pcm.length; i++) {
            sum += pcm[i] * pcm[i]
        }
        const rms = Math.sqrt(sum / pcm.length)
        const volume = rms / 128

        return volume
    }

    private getFileName(channel: number): string {
        if (!this._device || !this._record) return ""

        const deviceName = this._device.data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 10)

        let d = new Date()
        let datestring = d.getFullYear() + ("0"+(d.getMonth()+1)).slice(-2) + ("0" + d.getDate()).slice(-2) + "-" + ("0" + d.getHours()).slice(-2) + ("0" + d.getMinutes()).slice(-2)

        const dir = formatDate(this._record)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir)

        return path.join(dir, `audio-${datestring}-${deviceName}-${this._channels[channel]+1}.wav`)
    }


    async process(pcm: Buffer) {
        // make sure stream stays open
        this._rtAudio?.write(Buffer.from([]))

        if (!this._device) return
        const buffers = splitBuffer(pcm, 1, this._device.data.inputChannels)

        if (!this.isReady()) {
            await this.load()
        }

        const processed: ProcessedChannel = new Map()

        for (let i = 0; i < buffers.length; i++) {
            if (!this._bufferLength) this.setBufferSize(buffers[i].length)

            const shortIndex = this.shortIndex(i)
            if (shortIndex === -1) continue

            if (this._recorders[shortIndex] && this._recorders[shortIndex].writable) {
                this._recorders[shortIndex].write(Buffer.from(buffers[i]))
            }

            const volume = Math.round(this.getVolume(buffers[i])*100)/100
            const speaking = await this.processChannel(buffers[i], i, volume)
            
            processed.set(i, {volume, speaking, consecutive: 0})
        }

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

    private async processChannel(buffer: number[], cId: number, volume: number): Promise<boolean|undefined> {
        if (!this._sileroVad) return false

        if (buffer.length !== this._bufferLength){
            buffer = buffer.slice(0, this._bufferLength)
        }

        let isSpeaking = false
        const index = this.shortIndex(cId)

        if (volume > this._minVolume) {
            const vadLastProbability = await this._sileroVad.process(buffer)
            if (vadLastProbability > this._vadThreshold) {
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
        if (this._apiId) {
            const device = this.findDevice(this._apiId, 'unknown', this._deviceName)

            if (device) {
                this._device = device
                return
            }
        }


        const plateform = os.platform()
        // @ts-ignore
        for (let i in RtAudioApi) {
            // @ts-ignore
            if (AudioApiByPlateform[i].indexOf(plateform) === -1) continue

            // @ts-ignore
            const api: unknown = RtAudioApi[i]

            const device = this.findDevice(api as RtAudioApi, i, this._deviceName)
            if (device) {
                this._apiId = api as RtAudioApi
                this._device = device
                return
            }
        }
    }

    private findDevice(apiId: RtAudioApi, apiName: string, deviceName: string): Device | undefined {
        const rtAudio = new RtAudio(apiId)
        const devices = rtAudio.getDevices()
        const deviceId = devices.findIndex(d => d.inputChannels > 0 && d.name === deviceName)
        if (deviceId !== -1) {
            return { id: deviceId, data: devices[deviceId], apiId, apiName }
        }

        return undefined
    }
}

export const getDevices = (): Device[] => {
    const devices: Device[] = []
    const plateform = os.platform()

    // @ts-ignore
    for (let i in RtAudioApi) {
        // @ts-ignore
        if (AudioApiByPlateform[i].indexOf(plateform) === -1) continue
        // @ts-ignore
        const api: RtAudioApi = RtAudioApi[i]

        const rtAudio = new RtAudio(api)
        const d = rtAudio.getDevices()

        for (let j = 0; j < d.length; j++) {
            devices.push({
                id: j,
                data: d[j],
                apiId: api,
                apiName: i
            })
        }
    }

    return devices
}

