import fs from "fs"
import path from "path"
import { AudioActivity, getDevices } from '../main/modules/audioActivity'

const BOUNDS = {
    loud: [230, 255],
    normal: [100, 150],
    silence: [0, 25],
    chunk: [2, 15],
    repetition: [1, 30]
} as const

type Bound = typeof BOUNDS[keyof typeof BOUNDS]

const random = (bounds: Bound) => {
    const min = bounds[0]
    const max = bounds[1]

    return Math.floor(Math.random() * (max - min + 1)) + min
}

const generateChannelBuffer = (size: number, speaking: Bound|undefined): number[] => {
    const buf: number[] = Array(size)

    if (!speaking) {
        buf.fill(0)
        return buf
    }

    let i = 0
    let silence = true
    while (i < size) {
        silence = !silence
        const chunkSize = random(BOUNDS.chunk)
        const repetition = random(BOUNDS.repetition)

        for (let j = 0; j < repetition; j++) {
            const value = random(silence? BOUNDS.silence : speaking)
            for (let k = 0; k < chunkSize; k++) {
                buf[i] = value
                i++
                if (i >= size) break
            }
            if (i >= size) break
        }
    }

    return buf
}

const mergeAudioBuffers = (audioL: number[], audioR: number[]): number[] => {
    const audio: number[] = Array(audioL.length + audioR.length)

    for (let i = 0; i < audioL.length; i++) {
        audio[i * 2] = audioL[i]
        audio[i * 2 + 1] = audioR[i]
    }

    return audio
}

const generateAudioBuffer = async (size: number, left: Bound|undefined, right: Bound|undefined): Promise<number[]> => {
    const audioL = generateChannelBuffer(size/2, left)
    const audioR = generateChannelBuffer(size/2, right)
    const audio = mergeAudioBuffers(audioL, audioR)
    
    return audio
}

const initAudioActivity = async (callback: (speaking:boolean, channelId: number, volume: number)=>void) => {
    const devices = getDevices()

    const device = devices.find(d => d.data.inputChannels === 2)
    if (!device) {
        throw new Error('No device with 2 input channels found')
    }

    console.log('Choosen device :', device)

    return new AudioActivity({
        deviceName: device.data.name,
        apiId: device.apiId,
        channels: [0,1],
        framesPerBuffer: 960,
        onAudio: callback
    })
}

const mainTest = async () => {
    const duration = 10

    let data = {
        error: 0,
        warning: 0,
        success: 0,
    }

    let leftSpeaker = true
    let temp = false
    let intervalSpeaker: NodeJS.Timer

    const resetData = () => {
        data.error = 0
        data.warning = 0
        data.success = 0
    }

    const toggleSpeaker = () => {
        tempo()

        const interval = duration*1000/3
        intervalSpeaker = setInterval(() => {
            leftSpeaker = !leftSpeaker
            tempo()
        }, interval > 5000? 5000 : interval)
    }

    const clearIntervalSpeaker = () => {
        clearInterval(intervalSpeaker)
    }

    const tempo = () => {
        temp = true
        setTimeout(() => {
            temp = false
        }, 250)
    }

    const test01 = async (audioActivity: AudioActivity): Promise<void> => {
        console.log(`\n\nStarting test 1 (${duration}s)`)

        const test = async () => {
            const left = leftSpeaker? BOUNDS.loud : undefined
            const right = !leftSpeaker? BOUNDS.loud : undefined
            const audio = await generateAudioBuffer(1920, left, right)
            audioActivity.process(Buffer.from(audio))
        }

        return new Promise(async (resolve) => {
            toggleSpeaker()

            const interval = setInterval(() => {
                test()
            }, 19)

            setTimeout(() => {
                clearInterval(interval)
                clearIntervalSpeaker()

                console.log(`Finishing test 1`)
                resolve()
            }, duration * 1000)
        })
    }

    const test02 = async (audioActivity: AudioActivity): Promise<void> => {
        console.log(`\n\nStarting test 2 (${duration}s)`)

        const test = async () => {
            const left = leftSpeaker? BOUNDS.loud : BOUNDS.silence
            const right = !leftSpeaker? BOUNDS.loud : BOUNDS.silence
            const audio = await generateAudioBuffer(1920, left, right)
            audioActivity.process(Buffer.from(audio))
        }

        return new Promise(async (resolve) => {
            toggleSpeaker()

            const interval = setInterval(() => {
                test()
            }, 19)

            setTimeout(() => {
                clearInterval(interval)
                clearIntervalSpeaker()

                console.log(`Finishing test 2`)
                resolve()
            }, duration * 1000)
        })
    }

    const test03 = async (audioActivity: AudioActivity): Promise<void> => {
        console.log(`\n\nStarting test 3 (${duration}s)`)

        const test = async () => {
            const left = leftSpeaker? BOUNDS.loud : BOUNDS.normal
            const right = !leftSpeaker? BOUNDS.loud : BOUNDS.normal
            const audio = await generateAudioBuffer(1920, left, right)
            audioActivity.process(Buffer.from(audio))
        }

        return new Promise(async (resolve) => {
            toggleSpeaker()

            const interval = setInterval(() => {
                test()
            }, 19)

            setTimeout(() => {
                clearInterval(interval)
                clearIntervalSpeaker()

                console.log('Finishing test 3')
                resolve()
            }, duration * 1000)
        })
    }

    const audioActivity = await initAudioActivity((speaking, channelId, _volume) => {        
        // console.log(`channel: ${channelId}\tspeaking: ${speaking?1:0}\tvolume:${_volume}\t\t(${leftSpeaker? 'left' : 'right'})`)
        if (temp) return
        
        if (speaking && ((leftSpeaker && channelId === 1) || (!leftSpeaker && channelId === 0))) {
            console.log(`ERROR:\t\tchannel: ${channelId}\tspeaking: ${speaking?1:0}\tvolume:${_volume}\t\t(${leftSpeaker? 'left' : 'right'})`)
            data.error++
        } else if (!speaking && ((leftSpeaker && channelId === 0) || (!leftSpeaker && channelId === 1))) {
            console.log(`WARNING:\tchannel: ${channelId}\tspeaking: ${speaking?1:0}\tvolume:${_volume}\t\t(${leftSpeaker? 'left' : 'right'})`)
            data.warning++
        } else {
            data.success++
        }
    })

    audioActivity.init()

    setTimeout(async () => {
        await test01(audioActivity)
        console.log(data)

        resetData()
        await test02(audioActivity)
        console.log(data)

        resetData()
        await test03(audioActivity)
        console.log(data)
    }, 1000)

}

// mainTest()

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


const openWavFile = (fileName: string): Buffer => {
    const filePath = path.join(__dirname, '../../recordings', fileName)
    return fs.readFileSync(filePath)
}

const getWavBody = (buf: Buffer): Buffer => {
    const endOfHeader = [116, 97] as const

    let headerEnd = 0
    for (let i = 0; i < 1000; i++) {
        if (buf[i] === endOfHeader[0] && buf[i+1] === endOfHeader[1]) {
            headerEnd = i + 6
            break
        }
    }

    return buf.subarray(headerEnd)
}

const decomposeWav = (wavName: string) => {
    const rawBuf = openWavFile(wavName)

    const channels = rawBuf[22]
    const size = 2

    const buf = getWavBody(rawBuf)
    const buffers = splitBuffer(buf, size, channels)

    let a: string = ''
    for (let i = 0; i < 256; i++) {
        a += buffers[0][i] + '\t'
        if ((i+1)%4 === 0) a += '\t'
        if ((i+1)%16 === 0) a += '\n'
    }

    console.log(a)
}

const extractRawData = (wavName: string) => {
    const buf = openWavFile(wavName)

    // @ts-ignore
    const REC_FILE = path.join(__dirname, '../../recordings', 'raw-'+wavName.split('.')[0] + '.txt')
    if (!fs.existsSync(path.dirname(REC_FILE))) fs.mkdirSync(path.dirname(REC_FILE), { recursive: true })
    if (!fs.existsSync(REC_FILE)) fs.writeFileSync(REC_FILE, '')

    const endOfHeader = [116, 97] as const

    let a: string = ''
    let isEnd = 0
    let indexEnd = 0
    for (let i = 0; i < 1000; i++) {
        a += buf[i]

        if (i === 3) a+= '\t-> RIFF\n'
        else if (i === 7) a+= '\t-> FILE SIZE\n'
        else if (i === 11) a+= '\t-> WAVE\n'
        else if (i === 15) a+= '\t-> fmt\n'
        else if (i === 19) a+= '\t-> fmt size\n'
        else if (i === 21) a+= '\t\t\t-> audio format\n'
        else if (i === 23) a+= '\t\t\t-> num channels\n'
        else if (i === 27) a+= '\t-> sample rate\n'
        else if (i === 31) a+= '\t-> byte rate\n'
        else if (i === 35) a+= '\t-> block align\n'
        else if (i === 37) a+= '\t\t\t-> bits per sample\n'
        else if (i === 39) a+= '\t\t\t-> data\n'
        else if (i === 43) a+= '\t-> data size\n'
        else if (!indexEnd && (i+1)%4!==0) a+= '\t'
        else if ((i-indexEnd)%8===0) a+= '\n'
        else a+= ((i-indexEnd)%2===0? '\t\t':'\t')

        if (i > 37 && isEnd < 2 && buf[i] === endOfHeader[isEnd]) {
            isEnd++
        } else if (i > 37 && isEnd === 1 && buf[i] !== endOfHeader[isEnd]) {
            isEnd = 0
        }
        if (isEnd > 1 && isEnd < 7) {
            isEnd++
        }
        if (isEnd === 7) {
            isEnd++
            indexEnd = i
            a+= '\n\nBEGINNING\n\n'
        }
    }

    fs.writeFileSync(REC_FILE, a)
}

const main = async () => {
    const files = [
        'mic1-2.wav',
        'mic2-2.wav',
        'mic3-2.wav',
        'mic4-2.wav',
        'output-stereo.wav',
        'output.wav',
    ]

    for (const file of files) {
        extractRawData(file)
        decomposeWav(file)
    }
}

main()
