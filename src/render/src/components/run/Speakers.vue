<script lang="ts" setup>

import { ref } from 'vue'

import UserIcon from '@src/components/icons/UserIcon.vue'
import SettingsIcon from '@src/components/icons/SettingsIcon.vue'
import ReturnIcon from '@src/components/icons/ReturnIcon.vue'
import ModalUi from '@src/components/basics/ModalUi.vue'
import ButtonUi from '@src/components/basics/ButtonUi.vue'
import InputUi from '@src/components/basics/InputUi.vue'

import { store } from '@src/store/store'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'

import type { SpeakingMic, Thresholds } from '../../../../types/protocol'

const props = defineProps<{
    mics: SpeakingMic[]
}>()

const DEFAULT_THRESHOLDS = {
    speaking: 10,
    silence: 3,
    vad: 0.05,
    minVolume: 0.5
}

const deviceName = ref<SpeakingMic['device']|false>(false)
const thresholds = ref<Thresholds>(DEFAULT_THRESHOLDS)

const settings = (mic: SpeakingMic) => {
    store.profiles.settings().mics.forEach((m) => {
        if (m.name === mic.device && m.thresholds) {
            thresholds.value = m.thresholds
        }
    })
    deviceName.value = mic.device
}

const updateThresholds = (key: keyof Thresholds, value: number) => {
    if (!value && key !== 'minVolume') {
        thresholds.value[key] = 0
        return
    }
    thresholds.value[key] = value
}

const getMinVolume = (mic: SpeakingMic): number => {
    const mics = store.profiles.settings().mics
    if (mics.length > 0){
        return mics[0].thresholds?.minVolume || DEFAULT_THRESHOLDS.minVolume
    }

    return DEFAULT_THRESHOLDS.minVolume
}

const updateMinVolume = (mic: SpeakingMic, value: number) => {
    store.profiles.settings().mics.forEach((m) => {
        if (m.name === mic.device && m.thresholds) {
            thresholds.value = m.thresholds
        }
    })
    thresholds.value.minVolume = value

    saveSettings(mic.device)
}

const saveSettings = async (dName?: string) => {
    await socketEmitter(store.socket, 'setThresholds', {
        id: store.profiles.current,
        deviceName: dName? dName : deviceName.value,
        thresholds: thresholds.value
    })

    store.profiles.settings().mics.forEach((m) => {
        if (m.name === deviceName.value) {
            m.thresholds = thresholds.value
        }
    })

    thresholds.value = DEFAULT_THRESHOLDS
    deviceName.value = false
}

const resetAll = async () => {
    thresholds.value = DEFAULT_THRESHOLDS
}

</script>

<template>
    <div class="flex items-center content-evenly flex-wrap justify-center">
        <ModalUi
            :open="deviceName !== false"
            @close="deviceName = false"
        >
            <div class="flex flex-col w-full">
                <div class="flex-1 w-full text-m mb-10">
                    <p>Edit <b>{{ deviceName }}</b> thresholds</p>
                </div>

                <div class="flex justify-between mb-10">
                    <p class="text-sm text-content-2">
                        Thresholds will be edited for all channels of the audio device.
                    </p>
                    <ButtonUi
                        class="i-first small h-fit"
                        @click="resetAll"
                    >
                        <ReturnIcon />
                        Reset to<br>default
                    </ButtonUi>
                </div>

                <div class="flex flex-col w-full mb-5">
                    <div class="threshold">
                        <p class="threshold-description">
                            Number of consecutive audio frames needed to determine if someone is speaking.
                            <p class="threshold-info">lower: more reactive</p>
                            <p class="threshold-info">higher: more accurate</p>
                        </p>
                        <InputUi
                            label="Speaking"
                            class="threshold-input"
                            :value="thresholds.speaking + ''"
                            @update="(v) => updateThresholds('speaking', Math.round(parseInt(v))/100)"
                        />
                    </div>
                    <div class="threshold">
                        <p class="threshold-description">
                            Number of consecutive audio frames needed to determine if someone stopped talking.
                            <p class="threshold-info">lower: more reactive</p>
                            <p class="threshold-info">higher: more accurate</p>
                        </p>
                        <InputUi
                            label="Silence"
                            class="threshold-input"
                            :value="thresholds.silence + ''"
                            @update="(v) => updateThresholds('silence', parseInt(v))"
                        />
                    </div>
                    <div class="threshold">
                        <p class="threshold-description">
                            Tolerance of the voice activity detector.
                            <p class="threshold-info">lower: noises may be considered as voice</p>
                            <p class="threshold-info">higher: voice may be interpreted as noise</p>
                        </p>
                        <InputUi
                            label="VAD"
                            class="threshold-input"
                            :value="thresholds.vad*100 + ''"
                            unit="%"
                            @update="(v) => updateThresholds('vad', parseInt(v))"
                        />
                    </div>
                    <div class="threshold">
                        <p class="threshold-description">
                            Minimum required volume to trigger mic.
                            <p class="threshold-info">lower: CPU goes brrrrrr</p>
                            <p class="threshold-info">higher: mic may never be triggered</p>
                        </p>
                        <InputUi
                            label="Min. vol."
                            class="threshold-input"
                            :value="thresholds.minVolume*100/2 + ''"
                            unit="%"
                            @update="(v) => updateThresholds('minVolume', parseInt(v)/100*2)"
                        />
                    </div>
                </div>
                <div class="flex justify-between w-full">
                    <ButtonUi
                        class=""
                        @click="deviceName = false"
                    >
                        Cancel
                    </ButtonUi>
                    <ButtonUi
                        class="primary"
                        @click="saveSettings"
                    >
                        Save settings
                    </ButtonUi>
                </div>
            </div>
        </ModalUi>

        <template v-for="mic in props.mics">
            <div class="speaker">
                <div
                    class="settings-icon"
                    @click="() => settings(mic)"
                >
                    <SettingsIcon />
                </div>
                <UserIcon
                    class="w-10 h-10 mb-1"
                    :class="{
                        'text-white': mic.speaking,
                        'text-gray-500': !mic.speaking,
                    }"
                />
                <span>{{ mic.name }}</span>

                <div class="w-full relative mt-3">
                    <input
                        type="range"
                        class="slider-range"
                        min="0"
                        max="100"
                        :value="getMinVolume(mic)*100/2"
                        @change="(v: any) => updateMinVolume(mic, v.target?.value/100*2 )"
                    >
                    <div class="volume-meter w-full h-1 rounded bg-bg-2 overflow-hidden">
                        <div
                            class="volume-meter-bar bg-white h-full transition-all duration-100"
                            :style="{ width: (mic.volume*100/2) + '%' }"
                        />
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>

.threshold {
    @apply flex align-center flex-wrap pb-6;
}
.threshold > .threshold-description {
    @apply pr-5 pb-1 w-4/5;
}
.threshold > .threshold-description > .threshold-info {
    @apply text-sm text-content-2;
}
.threshold > .threshold-input {
    @apply min-w-[80px] flex-1 pb-1;
}
.speaker {
    @apply flex flex-col items-center p-5 relative;
}
.speaker > .settings-icon {
    @apply absolute top-4 right-2 p-1 cursor-pointer;
    @apply hidden;
}
.speaker > .settings-icon > svg {
    @apply w-4 h-4 text-bg-2;
}
.speaker > .settings-icon:hover > svg {
    @apply w-4 h-4 text-white;
}
.speaker:hover > .settings-icon {
    @apply block;
}
.slider-range {
    @apply appearance-none h-0 absolute left-0 right-0 cursor-pointer;
}
.slider-range::-webkit-slider-thumb {
    @apply appearance-none bg-gray-700 h-3 w-1 rounded;
}
.speaker:hover .slider-range::-webkit-slider-thumb {
    @apply bg-gray-400;
}

</style>