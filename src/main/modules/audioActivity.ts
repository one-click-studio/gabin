import path from "path"
import fs from "fs"
import { RtAudio, RtAudioFormat, RtAudioApi, RtAudioDeviceInfo } from "audify"
import { InferenceSession, Tensor } from "onnxruntime-node"
import { getLogger } from '../../main/utils/logger'
import easymidi from 'easymidi'
import { ActivityInterface } from "./activityInterface"

const sileroModelPath = path.join(__dirname, `../../resources/models/silero.onnx`)

const logger = getLogger('audio Activity')

interface Device {
    id: number
    data: RtAudioDeviceInfo
    apiId: RtAudioApi | string
    apiName: string
}

type ProcessedChannel = Map<number, {volume:number, speaking:boolean|undefined}>

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

// const joinBuffers = (buffers: number[][], size: number): Buffer => {
//     const length = buffers[0].length
//     const channels = buffers.length

//     let array: number[] = []

//     for (let i = 0; i < length; i+=size) {
//         for (let j = 0; j < channels; j++) {
//             for (let k = 0; k < size; k++) {
//                 array.push(buffers[j][i+k])
//             }
//         }
//     }

//     return Buffer.from(array)
// }

export class AudioActivity implements ActivityInterface {
    private _speaking: boolean[]
    private _consecutiveSilence: number[]
    private _consecutiveSpeech: number[]

    private _speakingThreshold = 3
    private _silenceThreshold = 10

    private _speechThreshold = 0.05
 
    private _bufferLength: number = 0
 
    private _sileroVad: SileroVad[] | undefined
    private _rtAudio: RtAudio | undefined

    private _deviceName: string
    private _device : Device | undefined
        
    private _apiId: RtAudioApi | undefined
    private _framesPerBuffer: number
    private _sampleRate: number = 0
    private _isOpen: boolean

    private _channels: number[]
    private _onAudio: (speaking: boolean, channel: number) => void

    constructor(options: {
        deviceName: string
        apiId?: RtAudioApi
        channels: number[]
        framesPerBuffer: number
        sampleRate?: number
        onAudio: (speaking: boolean, channel: number) => void
    }) {

        this._deviceName = options.deviceName
        this._apiId = options.apiId
        this._channels = options.channels
        this._framesPerBuffer = options.framesPerBuffer
        if (options.sampleRate) this._sampleRate = options.sampleRate
        this._onAudio = options.onAudio

        this._speaking = Array(options.channels.length).fill(false)
        this._consecutiveSilence = Array(options.channels.length).fill(0)
        this._consecutiveSpeech = Array(options.channels.length).fill(0)
        this._isOpen = false

        this.getDevice()
    }

    public isReady(): boolean {
        if (!this._sileroVad) return false

        for (let i = 0; i < this._channels.length; i++){
            if (!this._sileroVad[i].ready) return false
        }
        
        return true
    }

    public async start() {
        if (!this._device) return

        this._sileroVad = []

        this._sampleRate = this.getSampleRate(this._device.data)

        for (let i = 0; i < this._channels.length; i++) {
            const sileroVad = new SileroVad()
            await sileroVad.load()
            this._sileroVad[i] = sileroVad
        }

        this._rtAudio = new RtAudio(this._apiId)

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

        this._rtAudio.stop()
        this._rtAudio.closeStream()
    }

    private async load() {
        if (!this._sileroVad) return
        for (let i = 0; i < this._channels.length; i++) await this._sileroVad[i].load()
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

    private async process(pcm: Buffer) {
        if (!this._device) return
        const buffers = splitBuffer(pcm, 1, this._device.data.inputChannels)
    
        // STEREO (COPY LEFT (0) TO RIGHT (1))
        // buffers[1] = JSON.parse(JSON.stringify(buffers[0]))
        // MUTE LEFT (0) OR RIGHT (1)
        // buffers[0].fill(0)

        if (!this.isReady()) {
            await this.load()
        }

        const processed: ProcessedChannel = new Map()

        for (let i = 0; i < buffers.length; i++) {
            if (!this._bufferLength) this.setBufferSize(buffers[i].length)
            if (this._channels.indexOf(i) === -1) continue

            const volume = Math.round(this.getVolume(buffers[i])*100)/100
            const speaking = await this.processChannel(buffers[i], i)

            processed.set(i, {volume, speaking})
        }

        if (this.tooManySpeakers(processed)){
            const channelId = this.chooseSpeaker(processed)

            for (let i = 0; i < this._channels.length; i++) {
                const channel = processed.get(i)
                if (!channel || i === channelId) continue
                if (channel.speaking !== true && !this._speaking[i]) continue

                const speaking = this._speaking[i]? false : undefined
                processed.set(i, {speaking, volume: channel.volume})
            }
        }

        for (let i = 0; i < this._channels.length; i++) {
            const channel = processed.get(i)
            if (!channel || channel.speaking === undefined) continue

            this._speaking[i] = channel.speaking
            this._onAudio(this._speaking[i], i)
        }

    }
    
    private tooManySpeakers(processed: ProcessedChannel): boolean {
        let speaking = 0
        for (let i = 0; i < this._channels.length; i++) {
            const channel = processed.get(this._channels[i])
            if (channel?.speaking || (channel?.speaking === undefined && this._speaking[i])) {
                speaking++
            }
        }

        return (speaking > 1)
    }

    private chooseSpeaker(processed: ProcessedChannel): number {
        let maxVolume = 0
        let maxChannel = 0
        for (let i = 0; i < this._channels.length; i++) {
            const channel = this._channels[i]
            const volume = processed.get(channel)?.volume
            if (volume && volume > maxVolume) {
                maxVolume = volume
                maxChannel = channel
            }
        }

        return maxChannel
    }

    private async processChannel(buffer: number[], channel: number): Promise<boolean|undefined> {
        if (!this._sileroVad) return false

        if (buffer.length !== this._bufferLength){
            buffer = buffer.slice(0, this._bufferLength)
        }

        let isSpeaking = false
        const vadLastProbability = await this._sileroVad[channel].process(buffer)
        if (vadLastProbability > this._speechThreshold) {
            isSpeaking = true
        }

        if (isSpeaking) {
            this._consecutiveSpeech[channel]++
            this._consecutiveSilence[channel] = 0
        } else {
            this._consecutiveSilence[channel]++
            this._consecutiveSpeech[channel] = 0
        }

        if (!this._speaking[channel] && this._consecutiveSpeech[channel] > this._speakingThreshold) {
            return true
        } else if (this._speaking[channel] && this._consecutiveSilence[channel] > this._silenceThreshold) {
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

        // @ts-ignore
        for (let i in RtAudioApi) {
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

    // @ts-ignore
    for (let i in RtAudioApi) {
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

    let index = 10000
    for (let port of easymidi.getInputs()) {
        for (let channel = 0; channel < 16; ++channel) {
            const id = index++
            devices.push({
                id: id,
                data: {
                    id,
                    name: port + ' [Channel ' + ('' + (channel + 1)).padStart(2, '0') + ']',
                    outputChannels: 0,
                    inputChannels: 128,
                    duplexChannels: 0,
                    isDefaultOutput: 0,
                    isDefaultInput: 0,
                    sampleRates: [ ],
                    preferredSampleRate: 0,
                    nativeFormats: 0
                },
                apiId: 'MIDI:' + channel,
                apiName: 'MIDI'
            })
        }
    }

    return devices
}

