import { AudioActivity, getDevices } from './src/main/modules/audioActivity'
import type { RtAudioApi } from 'audify'

let recorder: AudioActivity

const deviceData = {
    id: 4,
    api: 7,
    apiName: "WINDOWS_WASAPI",
    name: "IN 1-8 (BEHRINGER UMC 1820)",
    mics: [true, true, true, true, true, true, true, true],
    micsName: ["Person 1", "Person 2", "Person 3", "Person 4", "Person 5", "Person 6", "Person 7", "Person 8"],
    sampleRate: 44100,
    nChannels: 8,
    channels: [
        { id: "Person 1", channelId: 0 },
        { id: "Person 2", channelId: 1 },
        { id: "Person 3", channelId: 2 },
        { id: "Person 4", channelId: 3 },
        { id: "Person 5", channelId: 4 },
        { id: "Person 6", channelId: 5 },
        { id: "Person 7", channelId: 6 },
        { id: "Person 8", channelId: 7 }
    ]
}

const init = () => {
    recorder = new AudioActivity({
        deviceName: deviceData.name,
        apiId: deviceData.api as RtAudioApi,
        channels: deviceData.channels.map(c => c.channelId),
        framesPerBuffer: 960,
        onAudio: (speaking, channelId) => {
            console.log('channelId', channelId, 'speaking', speaking)
        }
    })
    recorder.start()
}

const clean = () => {
    recorder?.stop()
}

const main = async () => {
    console.log('start\n')
    init()
    await new Promise(resolve => setTimeout(resolve, 10000))
    clean()
    console.log('\ndone')
    process.exit(0)
}

main()