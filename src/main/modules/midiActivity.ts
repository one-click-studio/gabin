import { ActivityInterface } from "./activityInterface"
import easymidi from 'easymidi'

export class MIDIActivity implements ActivityInterface {
    private _deviceName: string
    private _channels: number[]
    private _midiChannel: number
    private _onAudio: (speaking: boolean, channel: number) => void
    private _midi: any

    constructor(options: {
        deviceName: string
        channels: number[],
        midiChannel: string,
        onAudio: (speaking: boolean, channel: number) => void
    }) {
        [ this._deviceName ] = options.deviceName.split(/\s*\[.*\]/gi)
        this._channels = options.channels
        this._midiChannel = +(options.midiChannel)
        this._onAudio = options.onAudio
    }

    public async start(): Promise<any> {
        this._midi = new easymidi.Input(this._deviceName)
        this._midi.on('noteon', this.noteon.bind(this))
        this._midi.on('noteoff', this.noteoff.bind(this))
    }

    public stop(): void {
        this._midi.close()
    }

    // @ts-ignore
    noteon({ channel, note }) {
        if (channel !== this._midiChannel) return
        if (!(this._channels.includes(note))) return
        this._onAudio(true, note)
    }

    // @ts-ignore
    noteoff({ channel, note }) {
        if (channel !== this._midiChannel) return
        if (!(this._channels.includes(note))) return
        this._onAudio(false, note)
    }
}