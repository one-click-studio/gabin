<script lang="ts" setup>

import { ref } from 'vue'

import { store } from '@src/renderer/src/store/store'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import InputUi from '@src/renderer/src/components/basics/InputUi.vue'
import SelectUi from '@src/renderer/src/components/basics/SelectUi.vue'
import TagUi from '@src/renderer/src/components/basics/TagUi.vue'

import PlusIcon from '@src/renderer/src/components/icons/PlusIcon.vue'
import BinIcon from '@src/renderer/src/components/icons/BinIcon.vue'

import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

import type { AudioDevice, AudioDeviceSettings } from '@src/types/protocol'

const { invoke } = window.api

const choosenDevices = ref<AudioDeviceSettings[]>(store.profiles.settings().mics)
const duplicate = ref<boolean[][]>([])
const audioDevices = ref<AudioDevice[]>([])

const addDevice = () => {
    choosenDevices.value.push({
        id: -1,
        api: -1,
        apiName: '',
        name: '',
        mics: [],
        micsName: [],
        sampleRate: 0,
        nChannels: 0,
    })
    duplicate.value.push([])

    updateNextBtn()
}

const removeDevice = (index: number) => {
    choosenDevices.value.splice(index, 1)
    duplicate.value.splice(index, 1)
    recalculateDuplicate()
    updateNextBtn()
}

const updateDevice = (device: AudioDevice, index: number) => {
    choosenDevices.value[index].id = device.id
    choosenDevices.value[index].name = device.name
    choosenDevices.value[index].api = device.api
    choosenDevices.value[index].apiName = device.apiName
    choosenDevices.value[index].nChannels = device.nChannels
    choosenDevices.value[index].sampleRate = device.sampleRate
    choosenDevices.value[index].mics = Array(device.nChannels).fill((device.nChannels === 1))
    choosenDevices.value[index].micsName = Array(device.nChannels).fill('')
    duplicate.value[index] = Array(device.nChannels).fill(false)
}

const updateMic = (index: number, mic: number, value: boolean) => {
    choosenDevices.value[index].mics[mic] = value? true : false
    updateMicName(index, mic, choosenDevices.value[index].micsName[mic])
    recalculateDuplicate()
}

const updateMicName = (index: number, mic: number, value: string) => {
    const names = getAllNames(index, mic)

    duplicate.value[index][mic] = (names.indexOf(value) !== -1)

    choosenDevices.value[index].micsName[mic] = value

    updateNextBtn()
}

const getAllNames = (index = -1, mic = -1): string[] => {
    const names: string[] = []

    for (const i in choosenDevices.value) {
        const d = choosenDevices.value[i]
        for (const j in d.mics) {
            if (d.mics[j] && d.micsName[j] && (parseInt(i) !== index || parseInt(j) !== mic)) {
                names.push(d.micsName[j])
            }
        }
    }

    return names
}

const recalculateDuplicate = () => {
    const names: string[] = []

    for (const i in choosenDevices.value) {
        const d = choosenDevices.value[i]
        for (const j in d.mics) {
            if (!duplicate.value[i]) {
                duplicate.value[i] = []
            }
            duplicate.value[i][j] = false
            if (d.mics[j] && d.micsName[j]) {
                if (names.indexOf(d.micsName[j]) > -1) {
                    duplicate.value[i][j] = true
                }
                names.push(d.micsName[j])
            }
        }
    }
}

const nextIsInvalid = (): boolean => {
    let disable = true

    if (choosenDevices.value.length > 0) {
        disable = false

        for (const i in choosenDevices.value) {
            const d = choosenDevices.value[i]

            if (!d.mics.reduce((t, x) => (x===true ? t+1 : t), 0)) {
                disable = true
                break
            }

            for (const j in d.mics) {
                if (d.mics[j] && (!d.micsName[j] || duplicate.value[i][j])) {
                    disable = true
                    break
                }
            }
        }
    }

    return disable
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = nextIsInvalid()
}

const setAudioDevices = async () => {
    audioDevices.value = await invoke.getAudioDevices()
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
recalculateDuplicate()
updateNextBtn()

</script>

<template>
    <div class="flex flex-col w-full scroll-hidden pb-10">
        <div class="flex items-center bg-bg-2 text-content-2 text-sm p-4">
            <span class="emoji">🎙</span>
            <p>Tell Gabin which source he should listen to. This could be 1 or more microphones or even a mixer.</p>
        </div>
        <ButtonUi
            class="add-audio-btn i-first primary w-full h-14 mt-4"
            @click="addDevice"
        >
            <PlusIcon />
            Add audio device
        </ButtonUi>
        <div
            v-for="(device, index) in choosenDevices"
            :key="'device-select' + index"
            class="bg-bg-2 flex flex-col w-full mt-4"
        >
            <div class="m-2">
                <div class="flex w-full items-center">
                    <SelectUi
                        class="bg-bg-1 flex-1"
                        :options="audioDevices"
                        label="Source name"
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
                    <TagUi
                        v-for="(_e, mic) in device.nChannels"
                        :key="'tag-mic-' + mic"
                        class="mr-2 mt-2"
                        :label="'Mic ' + (mic+1)"
                        :value="device.mics[mic]"
                        @update="(v: boolean) => updateMic(index, mic, v)"
                    />
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
                            :label="'Mic ' + (mic+1) + ' Custom Name'"
                            :error="duplicate[index][mic]"
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