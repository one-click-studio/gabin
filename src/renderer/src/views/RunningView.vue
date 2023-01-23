<script lang="ts" setup>

import { ref } from 'vue'
import { store } from '@src/renderer/src/store/store'

import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'

import ControlBtns from '@src/renderer/src/components/run/ControlBtns.vue'
import Speakers from '@src/renderer/src/components/run/Speakers.vue'

import type { SpeakingMic } from '@src/types/protocol'

const { invoke, handle } = window.api

const INIT_MSG = 'Not showing any camera.'

const loading = ref(false)
const msg = ref({ default: INIT_MSG, main: '' })
const speakingMics = ref([] as SpeakingMic[])


const togglePower = async () => {
    if (!loading.value){
        loading.value = true
        await invoke.togglePower(!store.power)
        loading.value = false
    }
}

handle.handlePower(async (_, power) => {
    store.power = power.data
    if (!power.data) {
        msg.value = { default: INIT_MSG, main: '' }
    }
})

handle.handleNewShot(async (_, shoot) => {
    msg.value.default = 'I\'m now showing'
    msg.value.main = `${shoot.data.shotId.name}`
})

handle.handleTimeline(async (_, { data }) => {
    for (const i in  speakingMics.value){
        speakingMics.value[i].speaking = speakingMics.value[i].name === data? true : false
    }
})

const init = () => {
    store.isFirstRun = false
    const profile = store.profiles.getCurrent()

    profile?.settings.mics.forEach((device) => {
        for (const i in device.mics){
            if (!device.mics[i]) continue
            speakingMics.value.push({
                name: device.micsName[i],
                speaking: false,
            })
        }
    })

    // console.log(speakingMics.value)
}

if (!store.power) {
    togglePower()
}

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
                    <div
                        v-for="(m, index) in store.connections"
                        :key="'module-'+index"
                        class="connected-module"
                        :class="m? 'is-connected' : ''"
                    >
                        <span class="uppercase">{{ index }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-col items-center flex-1 bg-bg-2">
            <ControlBtns />
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