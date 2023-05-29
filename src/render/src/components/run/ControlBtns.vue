<script lang="ts" setup>
import { ref } from 'vue'
import { klona } from 'klona'
import { store } from '@src/store/store'

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

const powerOff = async () => {
    await socketEmitter(store.socket, 'togglePower', false)
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

// const getAllSources = (): Asset['source'][] => {
//     const containers = getAllContainers()
//     const sources = containers.reduce((p, c) => p.concat(c.sources), <Asset['source'][]>[])
//     const sourcesMap = new Map(sources.map((v)=>([v.name, v])))
//     return Object.values(Object.fromEntries(sourcesMap))
// }


const props = defineProps<{
    shoots: Map<Asset['container']['name'], Shoot>
}>()

const autocam_ = ref(true)
const containers_ = ref(getAllContainers())
const availableMics_ = ref(getAvailableMics())

const init = () => {

    socketHandler(store.socket, 'handleAutocam', (ac: boolean) => {
        autocam_.value = ac
    })
    socketHandler(store.socket, 'handleAvailableMics', (am: any) => {
        availableMics_.value = new Map(Object.entries(am))
    })

    onSpacePress(() => {
        toggleAutocam()
    })
}

const toggleAutocam = () => {
    socketEmitter(store.socket, 'toggleAutocam', !autocam_.value)
}

const toggleMicAvailability = (mic: string) => {
    socketEmitter(store.socket, 'toggleAvailableMic', mic)
}

const triggerShot = (shot: Asset['source']) => {
    socketEmitter(store.socket, 'triggerShot', klona(shot))
}

const sceneHasContainer = (container: Asset['container']): boolean => {
    const shoot = props.shoots.get(container.name)

    return !!shoot
}

const isFocusedShot = (container: Asset['container'], shot: Asset['source']): boolean => {
    const shoot = props.shoots.get(container.name)
    if (!shoot) return false

    return (shoot.shot.name === shot.name && shoot.mode === 'focus')
}

const isIllustrationShot = (container: Asset['container'], shot: Asset['source']): boolean => {
    const shoot = props.shoots.get(container.name)
    if (!shoot) return false

    return (shoot.shot.name === shot.name && shoot.mode === 'illustration')
}

init()


</script>

<template>
    <div class="flex flex-col w-full h-full bg-bg-3">
        <div class="flex h-24">
            <ButtonContainerUi
                class="w-24"
                :custom-width="true"
                :active="!autocam_"
                :primary="true"
                :keycode="'␣'"
            >
                <ButtonUi
                    class="control-btn"
                    @click="toggleAutocam"
                >
                    <PlayCircleIcon v-show="!autocam_" />
                    <PauseCircleIcon v-show="autocam_" />
                </ButtonUi>
            </ButtonContainerUi>
            <ButtonContainerUi class="flex-1">
                <ButtonUi
                    class="i-first danger w-full h-full !justify-center"
                    @click="powerOff"
                >
                    <StopIcon />
                    Stop Gabin
                </ButtonUi>
            </ButtonContainerUi>
        </div>

        <div class="flex max-w-full flex-wrap">
            <ButtonContainerUi
                v-for="[mic, a] in availableMics_"
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
                        @update="() => toggleMicAvailability(mic)"
                    />
                </ButtonUi>
            </ButtonContainerUi>
        </div>

        <template
            v-for="(container, i) in containers_"
            :key="'container-'+i"
        >
            <div
                v-if="sceneHasContainer(container)"
                class="flex-1 flex items-stretch content-stretch flex-wrap w-full"
            >
                <ButtonContainerUi
                    v-for="(source) in container.sources"
                    :key="'container-'+i+'-source-'+source.name"
                    :active="isFocusedShot(container, source) || isIllustrationShot(container, source)"
                    :primary="isFocusedShot(container, source)"
                >
                    <ButtonUi
                        class="flex flex-col items-center control-btn"
                        :active="isFocusedShot(container, source) || isIllustrationShot(container, source)"
                        @click="() => triggerShot(source)"
                    >
                        <CamIcon class="m-4" />
                        <span class="text-m">{{ source.name }}</span>
                        <span class="text-xs mt-2">{{ container.name }}</span>
                    </ButtonUi>
                </ButtonContainerUi>
            </div>
        </template>
        <div
            v-if="shoots.size === 0"
            class="w-full h-full flex items-center justify-center text-xl text-white"
        >
            No scene loaded
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