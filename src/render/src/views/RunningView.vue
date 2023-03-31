<script lang="ts" setup>

import { ref } from 'vue'
import { store } from '@src/store/store'
import { socketEmitter, socketHandler } from '@src/components/utils/UtilsTools.vue'

import Gabin from '@src/components/basics/GabinFace.vue'

import ControlBtns from '@src/components/run/ControlBtns.vue'
import Speakers from '@src/components/run/Speakers.vue'

import type { SpeakingMic, Shoot } from '../../../types/protocol'

const INIT_MSG = 'Not showing any camera.'

const loading = ref(false)
const msg = ref({ default: INIT_MSG, main: '' })
const speakingMics = ref(<SpeakingMic[]>[])
const shoot_ = ref<Shoot>()

const powerOn = async () => {
    if (!loading.value){
        loading.value = true
        await socketEmitter(store.socket, 'togglePower', true)
        loading.value = false
    }
}

socketHandler(store.socket, 'handleNewShot', (shoot: Shoot) => {
    shoot_.value = shoot
    msg.value.default = 'I\'m now showing'
    msg.value.main = `${shoot.shot.name}`
})

socketHandler(store.socket, 'handleTimeline', (data) => {
    for (const i in  speakingMics.value){
        speakingMics.value[i].speaking = speakingMics.value[i].name === data? true : false
    }
})

socketHandler(store.socket, 'handleVolumeMics', (data) => {
    let deviceName: keyof typeof data
    for (deviceName in data) {
        for (const i in speakingMics.value){
            if (speakingMics.value[i].name !== deviceName) continue
            speakingMics.value[i].volume = data[deviceName]
        }
    }
})

const init = () => {
    store.isFirstRun = false
    const profile = store.profiles.getCurrent()

    profile?.settings.mics.forEach((device) => {
        for (const i in device.mics){
            if (!device.mics[i]) continue
            speakingMics.value.push({
                device: device.name,
                name: device.micsName[i],
                speaking: false,
                volume: 0
            })
        }
    })
}

powerOn()
init()


</script>

<template>
    <div class="flex w-full h-full">
        <div class="flex flex-col justify-between items-center pr-10 w-2/5">
            <Speakers :mics="speakingMics" />

            <div class="flex items-center justify-center w-80 mt-40">
                <Gabin
                    size="xl"
                    :msg="msg.default"
                    :main-msg="msg.main"
                    class="mb-8"
                />
            </div>

            <div class="flex justify-between items-center w-full">
                <div class="flex flex-col items-start">
                    <template
                        v-for="(m, index) in store.connections"
                        :key="'module-'+index"
                    >
                        <div
                            v-if="store.profiles.connections()[index]"
                            class="connected-module"
                            :class="m? 'is-connected' : ''"
                        >
                            <span class="uppercase">{{ index }}</span>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <div class="flex flex-col items-center flex-1 bg-bg-2">
            <ControlBtns :shoot="shoot_"/>
        </div>
    </div>
</template>

<style scoped>
.connected-module {
    @apply relative pl-5;
}
.connected-module::before {
    content: '';
    @apply absolute h-3 w-3 m-auto left-0 top-[0.3rem] rounded-full;
    @apply bg-content-negative;
}
.connected-module.is-connected::before {
    @apply bg-green;
}
</style>