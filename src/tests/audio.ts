import fs from "fs"
import path from "path"
import OSC from 'osc-js'
import { Subject, BehaviorSubject } from 'rxjs'

import { App as Gabin } from '../main/app'

type ShotRegister = {
    name: string
    time: number
    interval: number
}

const DEFAULT = {
    HOST: 'localhost',
    OSC_PORT: 32123,
} as const

const CONFIG = {
    host: 'localhost',
    port: 57121,
    device: "Existential Audio Inc.: BlackHole 16ch",
    apiName: "MACOSX_CORE"
} as const

// const sendWav = async (wavPath: string, device: {id: number, nChannels: number}, callback: ()=>void): Promise<boolean> => {

//     const splitBuffer = (buffer: Buffer, size: number, channels: number):number[][] => {
//         const buffers: number[][] = []

//         // init buffers
//         for (let i = 0; i < channels; i++) buffers[i] = []

//         for (let i = 0; i < buffer.length; i++) {
//             const index = Math.floor((i%(channels*size)) / size)
//             buffers[index].push(buffer[i])
//         }

//         return buffers
//     }

//     const joinBuffers = (buffers: number[][], size: number): Buffer => {
//         const length = buffers[0].length
//         const channels = buffers.length

//         let array: number[] = []

//         for (let i = 0; i < length; i+=size) {
//             for (let j = 0; j < channels; j++) {
//                 for (let k = 0; k < size; k++) {
//                     array.push(buffers[j][i+k])
//                 }
//             }
//         }

//         return Buffer.from(array)
//     }

//     const openWavFile = (filePath: string): Buffer => {
//         return fs.readFileSync(filePath)
//     }

//     const getWavBody = (buf: Buffer): Buffer => {
//         const endOfHeader = [116, 97] as const

//         let headerEnd = 0
//         for (let i = 0; i < 1000; i++) {
//             if (buf[i] === endOfHeader[0] && buf[i+1] === endOfHeader[1]) {
//                 headerEnd = i + 6
//                 break
//             }
//         }

//         return buf.subarray(headerEnd)
//     }

//     const rawBuf = openWavFile(wavPath)
//     const nChannels = rawBuf[22]

//     const buf = getWavBody(rawBuf)

//     // rtAudio.getDevices().forEach((device) => {
//     //     console.log(device)
//     // })
//     // return

//     // const virtualAudioLoopback = {
//     //     deviceId: device.id,
//     //     nChannels: device.nChannels,
//     //     firstChannel: 0
//     // }

//     // console.log(`\nvirtualAudioLoopback: ${JSON.stringify(virtualAudioLoopback)}`)

//     // let index = 0
//     // const dataSize = 2
//     // const frameSize = 1920
//     // const channels = virtualAudioLoopback.nChannels
//     // const length = frameSize * channels * dataSize

//     // console.warn(`\n\nthis will stream only the ${channels} firsts channels of the wav file.`)
//     // console.warn('the wav file must be 16bits, 44100Hz, and must be a valid wav file.')

//     // return new Promise((resolve, reject) => {

//     //     rtAudio.openStream(
//     //         virtualAudioLoopback,
//     //         virtualAudioLoopback,
//     //         RtAudioFormat.RTAUDIO_SINT16,
//     //         44100,
//     //         frameSize,
//     //         "MyStream",
//     //         () => {
//     //             if (!index) {
//     //                 callback()
//     //             }

//     //             if (index >= buf.length) {
//     //                 rtAudio.stop()
//     //                 console.log(`\nstop streaming`)
//     //                 return resolve(true)
//     //             }

//     //             let resp = buf.subarray(index, index + frameSize*nChannels*dataSize)
//     //             const buffers = splitBuffer(resp, dataSize, nChannels)

//     //             if (nChannels < channels){
//     //                 while (buffers.length < channels) {
//     //                     buffers.push(new Array(frameSize*dataSize).fill(0))
//     //                 }
//     //             } else if (nChannels >  channels) {
//     //                 while (buffers.length > channels) {
//     //                     buffers.pop()
//     //                 }
//     //             }
//     //             resp = joinBuffers(buffers, dataSize)
//     //             index += frameSize*nChannels*dataSize

//     //             if (resp.length !== length) {
//     //                 console.warn(`buffer length is not correct (${resp.length} instead of ${length})`)
//     //                 return
//     //             }
//     //             rtAudio.write(resp)
//     //         },
//     //         null
//     //     )

//     //     rtAudio.start()
//     //     console.log(`\nstreaming ${wavPath}`)
//     // })
// }

const initOSC = async (): Promise<any> => {
    console.log('init osc')

    return new Promise((resolve, reject) => {
        const options = { 
            type: 'udp4',
            open: { host: CONFIG.host, port: CONFIG.port },
            send: { host: DEFAULT.HOST, port: DEFAULT.OSC_PORT },
        }

        const server = new OSC({plugin: new OSC.DatagramPlugin(options)})

        const send = (path: string, ...args: any[]) => {
            const message = new OSC.Message(path, ...args)
            // console.log(`\nOSC - sending message: ${message.address}`)
            server.send(message)
        }

        const on = (path: string, callback: (message: any) => void) => {
            server.on(path, callback)
        }

        const close = () => {
            server.close()
        }

        server.on('open', () => {
            console.log("connection was established")
            return resolve ({
                server,
                send,
                on,
                close
            })
        })

        server.on('close', () => {
            console.log("OSC - connection was closed")
        })

        server.on('error', (err: Error) => {
            console.error("OSC - an error occurred", err.stack)
        })

        server.open()
        // console.log('OSC - listening on', CONFIG)
    })
}

const getFiles = (): {wav: string, config: string, shots: string}|undefined => {
    const RESOURCES = path.join(__dirname, 'resources')
    const files = fs.readdirSync(RESOURCES)

    const wavFile = files.find((file) => file.includes('.wav'))
    const configFile = files.find((file) => file.includes('profile.json'))
    const shotsFile = files.find((file) => file.includes('shots.json'))

    if (!wavFile) console.error('no wav file found (must be a valid wav file)')
    if (!configFile) console.error('no config file found (must be profile.json)')
    if (!shotsFile) console.error('no config file found (must be shots.json)')
    if (!wavFile || !configFile || !shotsFile) return

    return {
        wav: path.join(RESOURCES, wavFile),
        config: path.join(RESOURCES, configFile),
        shots: path.join(RESOURCES, shotsFile)
    }
}

// TODO
// launch gabin
// get devices OK
// get settings OK
// send settings OK
// power on gabin OK
// send wav OK
// listen to shots OK
// verify shots OK
// power off gabin OK
// stop gabin

const main = async () => {
    const devices$ = new BehaviorSubject<any>(undefined)
    const settings$ = new BehaviorSubject<any>(undefined)
    const autocam$ = new BehaviorSubject<boolean>(false)
    const playing$ = new BehaviorSubject<boolean|undefined>(undefined)
    const profileId$ = new BehaviorSubject<number|undefined>(undefined)
    const shot$ = new Subject<string>()

    const files = getFiles()
    const shots: ShotRegister[] = []
    let referential: any
    let initPlaying = false

    if (!files) return

    const osc = await initOSC()

    process.env.DEBUG = 'true'
    const app = new Gabin()
    await app.init()

    const addListeners = () => {
        console.log('adding listeners')
        osc.on('/gabin/devices', (message: any) => {
            if (!message.args[0]) return
            devices$.next(JSON.parse(message.args[0]))
        })
        osc.on('/gabin/autocam', (message: any) => {
            if (!message.args[0]) return
            autocam$.next(message.args[0] === 'true')
        })
        osc.on('/gabin/defaultProfile', (message: any) => {
            if (!message.args[0]) return
            profileId$.next(message.args[0])
        })
        osc.on('/gabin/shot/*', (message: any) => {
            const shot = message.address.split('/').pop()
            shot$.next(shot)
        })

        osc.send('/register/autocam', CONFIG.host, CONFIG.port, '/gabin/autocam')
        osc.send('/register/defaultProfile', CONFIG.host, CONFIG.port, '/gabin/defaultProfile')
    }

    const getDevices = () => {
        console.log('getting devices')
        osc.send('/gabin/devices', CONFIG.host, CONFIG.port, '/gabin/devices')
    }

    const getSettings = () => {
        console.log('getting settings')
        const profile = fs.readFileSync(files.config)
        settings$.next(JSON.parse(profile.toString()))
    }

    const sendSettings = () => {
        console.log('sending settings')
        const settings = settings$.getValue()
        if (!settings) return
        osc.send('/gabin/config', JSON.stringify(settings))
    }

    const powerOn = () => {
        console.log('powering on')
        osc.send('/gabin/on')
        setTimeout(() => {
            osc.send('/autocam', 1)
        }, 250)
    }

    const powerOff = () => {
        console.log('powering off')
        osc.send('/gabin/off')
    }

    const sendScene = () => {
        console.log('sending scene')
        const settings = settings$.getValue()
        if (!settings) return

        const scene = settings.settings.containers[0]
        osc.send(`/gabin/scene/${scene.name}`)
    }

    const sendSource = () => {
        console.log('sending source')

        const settings = settings$.getValue()
        if (!settings) return
        
        const scene = settings.settings.containers[0]
        const container = scene.containers[0]
        const source = container.sources[0]
        osc.send(`/gabin/source/${source.name}`)
    }

    const play = async () => {
        console.log('playing')
        const devices = devices$.getValue()
        const device = devices?.find((device: any) => device.name === CONFIG.device && device.apiName === CONFIG.apiName)

        if (!device) {
            console.log(`\ncould not find device ${CONFIG.device} with api ${CONFIG.apiName}`)
            console.log(`\nmake sure it's installed by typing :\nbrew install blackhole-16ch\ncheck here for others install options https://github.com/ExistentialAudio/BlackHole`)
        }


        if (playing$.getValue() === true || !device) return

        // sendWav(files.wav, device, () => {
        //     initPlaying = false
        //     playing$.next(true)
        // }).then(() => {
        //     playing$.next(false)
        // }).catch((err) => {
        //     console.error(err)
        // })
    }

    const getShots = () => {
        console.log('getting shots')

        const shotsFile = fs.readFileSync(files.shots)
        return JSON.parse(shotsFile.toString())
    }

    const checkLastShot = () => {
        const index = shots.length-1
        const shot = shots[index]

        if (!shot) return

        const r = referential[index]
        if (!r) {
            console.error(`\n\n[KO]\tshot: ${shots[shots.length-1].name}\tinterval: ${shots[shots.length-1].interval}\n`)
            stop(1)
        }

        // if referential shot name is in shot name
        if (!shot.name.includes(r.name)) {
            console.error(`\n\n[KO]\tshot: ${shots[shots.length-1].name}\tinterval: ${shots[shots.length-1].interval}\nshould contain: ${r.name}\n`)
            stop(1)
        }

        const diff = Math.abs(shot.interval - r.interval)
        if (diff > 250) {
            console.error(`\n\n[KO]\tshot: ${shots[shots.length-1].name}\tinterval: ${shots[shots.length-1].interval}\nshould have been: ${r.interval}ms (±250)\n`)
            stop(1)
        }
    }

    const timeline = () => {

        devices$.subscribe((devices) => {
            if (!devices || !devices.length) return
            getSettings()
        })

        settings$.subscribe((settings) => {
            if (!settings) return
            sendSettings()
        })

        profileId$.subscribe((profileId) => {
            if (profileId === undefined) return
            powerOn()
        })

        autocam$.subscribe((autocam) => {
            if (!autocam) return
            sendScene()
        })

        shot$.subscribe((shot) => {
            const playing = playing$.getValue()

            if (!shot || playing === false || initPlaying) return

            if (playing === undefined && !initPlaying) {
                initPlaying = true
                sendSource()
                setTimeout(() => {
                    play()
                }, 2500)
                return
            }

            const lastShotTime = (shots.length)? shots[shots.length-1].time : Date.now()
            const shotTime = Date.now()
            const interval = shotTime - lastShotTime

            shots.push({
                name: shot,
                time: shotTime,
                interval
            })

            checkLastShot()
        })

        playing$.subscribe((playing) => {
            if (playing === undefined) return

            if (playing === false) {
                stop(0)
            }
        })
    }

    const stop = async (code=0) => {
        console.log('stopping')
        powerOff()

        await new Promise((resolve) => setTimeout(resolve, 250))
        osc.close()

        if (code === 0) {
            console.log('\n\n\n\n\n\n[OK]\tall tests passed\n')
        } else {
            console.log('\n\n\n\n\n\n[FAIL]\ttests failed\n')
        }
        process.exit(code)
    }

    const init = () => {
        addListeners()
        timeline()

        referential = getShots()

        setTimeout(() => {
            getDevices()
        }, 1000)
    }

    setTimeout(() => {
        init()
    }, 2000)
}

main()