import fs from "fs"
import path from "path"
import { RtAudio, RtAudioFormat } from "audify"

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

const joinBuffers = (buffers: number[][], size: number): Buffer => {
    const length = buffers[0].length
    const channels = buffers.length

    let array: number[] = []

    for (let i = 0; i < length; i+=size) {
        for (let j = 0; j < channels; j++) {
            for (let k = 0; k < size; k++) {
                array.push(buffers[j][i+k])
            }
        }
    }

    return Buffer.from(array)
}


const receiveWav = () => {
    const rtAudio = new RtAudio()

    rtAudio.getDevices().forEach((device) => {
        console.log(device)
    })
    return

    const REC_FILE = path.join(__dirname, '../../recordings', 'raw-' + Date.now() + '.txt')
    if (!fs.existsSync(path.dirname(REC_FILE))) fs.mkdirSync(path.dirname(REC_FILE), { recursive: true })
    if (!fs.existsSync(REC_FILE)) fs.writeFileSync(REC_FILE, '')

    let buffers: string[] = []

    const frameSize = 1920
    let started = false

    rtAudio.openStream(
        null,
        {
            deviceId: 134, // Input device id (Get all devices using `getDevices`)
            nChannels: 2, // Number of channels
            firstChannel: 0, // First channel index on device (default = 0).
        },
        RtAudioFormat.RTAUDIO_SINT16,
        44100,
        frameSize,
        "MyStream",
        (pcm: Buffer) => {
            rtAudio.write(Buffer.from([]))

            if (!started && ![...pcm].slice(0, 32).reduce((a, b) => a + b, 0)) return
            started = true


            const bs = splitBuffer(pcm, 2, 2)

            for (let i = 0; i < 20; i++) {
                buffers.push([...bs[0]].slice(i*4, i*4+4).join('\t'))
            }
            buffers.push('\n')

            if (buffers.length >= 100) {
                fs.appendFileSync(REC_FILE, buffers.join('\n') + '\n')
                buffers = []
            }
        },
        null
    )

    rtAudio.start()
    console.log(`streaming ...`)
}

const main = async () => {
    receiveWav()
}

main()
