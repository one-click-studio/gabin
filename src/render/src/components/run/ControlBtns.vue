<script lang="ts" setup>
import { ref } from 'vue'
import { klona } from 'klona'
import { store } from '@src/store/store'
import { useRouter } from 'vue-router'

import ToggleUi from '@src/components/basics/ToggleUi.vue'
import ButtonUi from '@src/components/basics/ButtonUi.vue'
import ButtonContainerUi from '@src/components/basics/ButtonContainerUi.vue'

import { onSpacePress } from '@src/components/utils/KeyPress.vue'
import { socketEmitter, socketHandler } from '@src/components/utils/UtilsTools.vue'

import PlayCircleIcon from '@src/components/icons/PlayCircleIcon.vue'
import PauseCircleIcon from '@src/components/icons/PauseCircleIcon.vue'
import StopIcon from '@src/components/icons/StopIcon.vue'
import CamIcon from '@src/components/icons/CamIcon.vue'

import type { Shoot, AvailableMicsMap, Asset } from '../../../../types/protocol'

const router = useRouter()

const togglePower = async () => {
    await socketEmitter(store.socket, 'togglePower', !store.power)
    router.push('/home')
}

const getAvailableMics = (): AvailableMicsMap => {
    const mics = store.profiles.settings().mics.reduce((p, d) => p.concat(d.micsName.filter((_m,i) => d.mics[i])), <string[]>[])
    const micsMap = new Map(mics.map((v)=>([v, true])))
    return micsMap
}

const getAllScenes = (): Asset['scene'][] => {
    return store.profiles.settings().containers
}

const getAllContainers = (): Asset['container'][] => {
    const scenes = getAllScenes()
    const containers = scenes.reduce((p, scene) => p.concat(scene.containers), <Asset['container'][]>[])
    const containersMap = new Map(containers.map((v)=>([v.name, v])))

    return Object.values(Object.fromEntries(containersMap))
}

const getAllSources = (): Asset['source'][] => {
    const containers = getAllContainers()
    const sources = containers.reduce((p, c) => p.concat(c.sources), <Asset['source'][]>[])
    const sourcesMap = new Map(sources.map((v)=>([v.name, v])))
    return Object.values(Object.fromEntries(sourcesMap))
}

const autocam = ref(true)

const currentContainers = ref(getAllContainers())
const shots = ref(getAllSources())
const availableMics = ref(getAvailableMics())

const currentShots = ref<Asset['source']['name']>()

const init = () => {

    socketHandler(store.socket, 'handleNewShot', (shot: Shoot) => {
        setCurrentShot(shot)
    })
    socketHandler(store.socket, 'handleAutocam', (ac: boolean) => {
        autocam.value = ac
    })
    socketHandler(store.socket, 'handleAvailableMics', (am: any) => {
        availableMics.value = new Map(Object.entries(am))
    })

    onSpacePress(() => {
        toggleAutocam()
    })
}

const setCurrentShot = (shot: Shoot) => {
    currentShots.value = shot.shot.name
}

const toggleAutocam = () => {
    socketEmitter(store.socket, 'toggleAutocam', !autocam.value)
}

const toggleMicAvailability = (mic: string) => {
    socketEmitter(store.socket, 'toggleAvailableMic', mic)
}

const triggerShot = (shot: Asset['source']) => {
    socketEmitter(store.socket, 'triggerShot', klona(shot))
}

init()


</script>

<template>
    <div class="flex flex-col w-full h-full bg-bg-3">
        <div class="flex h-24">
            <ButtonContainerUi
                class="w-24"
                :custom-width="true"
                :active="!autocam"
                :primary="true"
                :keycode="'␣'"
            >
                <ButtonUi
                    class="control-btn"
                    @click="toggleAutocam"
                >
                    <PlayCircleIcon v-show="!autocam" />
                    <PauseCircleIcon v-show="autocam" />
                </ButtonUi>
            </ButtonContainerUi>
            <ButtonContainerUi class="flex-1">
                <ButtonUi
                    class="i-first danger w-full h-full !justify-center"
                    @click="togglePower"
                >
                    <StopIcon />
                    Stop Gabin
                </ButtonUi>
            </ButtonContainerUi>
        </div>

        <div class="flex max-w-full flex-wrap">
            <ButtonContainerUi
                v-for="[mic, a] in availableMics"
                :key="'mic-'+mic"
                :active="a"
                class="h-20"
            >
                <ButtonUi
                    class="control-btn"
                    @click="() => toggleMicAvailability(mic)"
                >
                    <ToggleUi
                        :label="mic"
                        :value="a"
                    />
                </ButtonUi>
            </ButtonContainerUi>
        </div>
        <div class="flex-1 flex items-stretch content-stretch flex-wrap w-full">
            <ButtonContainerUi
                v-for="(shot, i) in shots"
                :key="'shot-'+shot"
                :active="(shot.name === currentShots)"
                :primary="true"
            >
                <ButtonUi
                    class="flex flex-col items-center control-btn"
                    :active="(shot.name === currentShots)"
                    @click="() => triggerShot(shot)"
                >
                    <CamIcon class="m-4" />
                    <span class="text-base">{{ shot.name }}</span>
                </ButtonUi>
            </ButtonContainerUi>
        </div>
    </div>
</template>

<style scoped>
.control-btn {
    @apply h-full w-full !justify-center !bg-inherit;
}
.control-btn:hover {
    background-color: #00000040;
}
</style>