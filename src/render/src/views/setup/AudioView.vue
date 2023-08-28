<script lang="ts" setup>

import { ref } from 'vue'

import { store } from '@src/store/store'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'
import { onEnterPress } from '@src/components/utils/KeyPress.vue'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import InputUi from '@src/components/basics/InputUi.vue'
import SelectUi from '@src/components/basics/SelectUi.vue'
import TagUi from '@src/components/basics/TagUi.vue'
// import TooltipUi from '@src/components/basics/TooltipUi.vue'

import PlusIcon from '@src/components/icons/PlusIcon.vue'
import BinIcon from '@src/components/icons/BinIcon.vue'

import type { AudioDevice, AudioDeviceSettings } from '../../../../types/protocol'

const devices_ = ref<AudioDeviceSettings[]>(store.profiles.settings().mics)
const audioDevices = ref<AudioDevice[]>([])

const addDevice = () => {
    devices_.value.push({
        id: -1,
        api: -1,
        apiName: '',
        name: '',
        mics: [],
        micsName: [],
        sampleRate: 0,
        nChannels: 0,
        thresholds: {
            speaking: 3,
            silence: 10,
            vad: 0.05,
            minVolume: 0.5
        }
    })

    updateNextBtn()
}

const updateDevice = (device: AudioDevice, index: number) => {
    devices_.value[index] = {
        id: device.id,
        name: device.name,
        api: device.api,
        apiName: device.apiName,
        nChannels: device.nChannels,
        sampleRate: device.sampleRate,
        mics: Array(device.nChannels).fill((device.nChannels === 1)),
        micsName: Array(device.nChannels).fill('')
    }

    updateNextBtn()
}

const removeDevice = (index: number) => {
    devices_.value.splice(index, 1)

    updateNextBtn()
}

const updateMic = (index: number, mic: number, value: boolean) => {
    devices_.value[index].mics[mic] = value
    devices_.value[index].micsName[mic] = value? defaultMicName(index, mic) : ''

    updateNextBtn()
}

const updateMicName = (index: number, mic: number, value: string) => {
    devices_.value[index].micsName[mic] = value

    updateNextBtn()
}

const defaultMicName = (index: number, mic: number) => {
    let count = 0
    for (let i=0; i<=mic; i++) {
        if (devices_.value[index].mics[i]) count++
    }

    return 'Person ' + count
}

const hasDuplicates = (index: number, mic: number): boolean => {
    const device = devices_.value[index]
    const names = device.micsName.filter((_, i) => device.mics[i] && i !== mic)

    return (names.indexOf(device.micsName[mic]) !== -1)
}

const nextIsInvalid = (): boolean => {
    if (!devices_.value.length) return true

    for (const i in devices_.value) {
        const d = devices_.value[i]

        if (!d.mics.reduce((t, x) => t += x?1:0, 0)) return true

        const names = d.micsName.filter((_, i) => d.mics[i])
        if (names.length !== new Set(names).size) return true
    }

    return false
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = nextIsInvalid()
}

const setAudioDevices = async () => {
    audioDevices.value = await socketEmitter(store.socket, 'getAudioDevices', {}) as AudioDevice[]

    audioDevices.value.sort((a, b) => {
        if (a.apiName === b.apiName) {
            return a.name > b.name ? 1 : -1
        }
        return a.apiName > b.apiName ? 1 : -1
    })
}

onEnterPress(() => {
    if (!nextIsInvalid() && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

setAudioDevices()
updateNextBtn()

</script>

<template>
    <div class="flex flex-col w-full pb-10">
        <div class="flex items-center bg-bg-2 text-content-2 text-sm p-4">
            <span class="emoji">🎙</span>
            <p>Which mic should we listen to ? This must be a specific channel from an audio device.</p>
        </div>
        <ButtonUi
            class="add-audio-btn i-first primary w-full h-14 mt-4"
            @click="addDevice"
        >
            <PlusIcon />
            Add audio device
        </ButtonUi>
        <div
            v-for="(device, index) in devices_"
            :key="'device-select' + index"
            class="bg-bg-2 flex flex-col w-full mt-4"
        >
            <div class="m-2">
                <div class="flex w-full items-center">
                    <SelectUi
                        class="bg-bg-1 flex-1"
                        :options="audioDevices"
                        label="Audio device"
                        :value="device.name? device.name + ' - ' + device.apiName :  ''"
                        keyvalue="name,apiName"
                        @update="(d: AudioDevice) => updateDevice(d, index)"
                    />
                    <ButtonUi
                        class="i-round ml-2"
                        @click="() => removeDevice(index)"
                    >
                        <BinIcon />
                    </ButtonUi>
                </div>
                <div
                    v-if="device.nChannels > 1"
                    class="flex flex-wrap w-full"
                >
                    <div class="w-full text-content-2 text-sm mt-2">
                        <span>Add or remove channels as a mics.</span>
                    </div>
                    <template
                        v-for="(_e, mic) in device.nChannels"
                        :key="'tag-mic-' + mic"
                    >
                        <!-- <TooltipUi :value="device.mics[mic]? 'Remove this channel as a Mic.':'Add this channel as a Mic.'"> -->
                        <TagUi
                            class="mr-2 mt-2"
                            :label="'Channel ' + (mic+1)"
                            :value="device.mics[mic]"
                            @update="(v: boolean) => updateMic(index, mic, v)"
                        />
                        <!-- </TooltipUi> -->
                    </template>
                </div>
                <div class="flex flex-col w-full">
                    <div
                        v-for="(_e, mic) in device.nChannels"
                        :key="'input-mic-' + mic"
                        class="w-full"
                    >
                        <InputUi
                            v-if="device.mics[mic]"
                            class="min-w-full mt-2"
                            :label="'Channel ' + (mic+1) + ' name'"
                            :error="hasDuplicates(index, mic)"
                            :value="device.micsName[mic]"
                            @update="(v: string) => updateMicName(index, mic, v)"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.add-audio-btn {
    justify-content: center !important;
}
</style>