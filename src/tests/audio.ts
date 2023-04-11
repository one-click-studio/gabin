import { RtAudio, RtAudioFormat } from "audify"

const testBH = async () => {

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

    const rtAudio = new RtAudio()

    const devices = rtAudio.getDevices()

    devices.forEach((device) => {
        console.log(device)
    })

    const device = devices.find((device) => device.name === 'Existential Audio Inc.: BlackHole 2ch')
    if (!device) throw new Error('device not found')

    const virtualAudioLoopback = {
        deviceId: device.id,
        nChannels: device.inputChannels,
        firstChannel: 0
    }

    console.log(`virtualAudioLoopback: ${JSON.stringify(virtualAudioLoopback)}`)

    let index = 0
    const dataSize = 2
    const frameSize = 1920
    const channels = virtualAudioLoopback.nChannels
    const length = frameSize * channels * dataSize

    // console.warn(`\n\nthis will stream only the ${channels} firsts channels of the wav file.`)
    // console.warn('the wav file must be 16bits, 44100Hz, and must be a valid wav file.')

    rtAudio.openStream(
        virtualAudioLoopback,
        virtualAudioLoopback,
        RtAudioFormat.RTAUDIO_SINT16,
        44100,
        frameSize,
        "MyStream",
        (pcm) => {
            const bhIntput = splitBuffer(pcm, dataSize, channels)

            if (bhIntput[0].reduce((a, b) => a + b, 0) > 0) {
                console.log(bhIntput.slice(0,2).map((v) => v.slice(0, 16).join(' ')))
            } else {
                console.log('silence')
            }

            const buffers:number[][] = []
            while (buffers.length < channels) {
                buffers.push(new Array(frameSize*dataSize).fill(200+buffers.length))
            }
            let resp = joinBuffers(buffers, dataSize)

            if (resp.length !== length) {
                console.error(`error: buffer length is not correct (${resp.length} instead of ${length})`)
                return
            }
            rtAudio.write(resp)
        },
        null
    )

    rtAudio.start()
    console.log(`streaming ...`)
}

const main = async () => {
    testBH()
}

main()