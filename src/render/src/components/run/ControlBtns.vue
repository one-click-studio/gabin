<script lang="ts" setup>
import { ref } from 'vue'
import { klona } from 'klona'
import { store } from '@src/store/store'
import { useRouter } from 'vue-router'

import ToggleUi from '@src/components/basics/ToggleUi.vue'
import ButtonUi from '@src/components/basics/ButtonUi.vue'
import ButtonContainerUi from '@src/components/basics/ButtonContainerUi.vue'

import { onAlphaNumPress, onSpacePress } from '@src/components/utils/KeyPress.vue'
import { socketEmitter, socketHandler } from '@src/components/utils/UtilsTools.vue'

import PlayCircleIcon from '@src/components/icons/PlayCircleIcon.vue'
import PauseCircleIcon from '@src/components/icons/PauseCircleIcon.vue'
import StopIcon from '@src/components/icons/StopIcon.vue'
import CamIcon from '@src/components/icons/CamIcon.vue'

import type { Shoot, AvailableMicsMap, ObsAssetId, ObsSource } from '../../../../types/protocol'

const ALPHA_NUM = '0123456789abcdefghijklmnopqrstuvwxyz'

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

const getAllShots = (containerIds: string[]): ObsSource[][] => {
    const shots_: ObsSource[][] = []
    const containers = store.profiles.settings().containers
    for (const cId of containerIds) {
        for (const c of containers) {
            if (c.source.name === cId) {
                shots_.push(c.cams)
                break
            }
        }
    }

    return shots_
}

const autocam = ref(true)
const currentContainers = ref(<ObsAssetId['scene'][]>[])
const availableMics = ref(getAvailableMics())
const shots = ref<ObsSource[][]>([])
const currentShots = ref<ObsSource[]>([])

const init = () => {
    currentContainers.value = store.profiles.settings().containers.map(c => c.source.name).filter((c, i, a) => a.indexOf(c) === i)
    shots.value = getAllShots(currentContainers.value)

    socketHandler(store.socket, 'handleNewShot', (shot: Shoot) => {
        setCurrentShot(shot)
    })
    socketHandler(store.socket, 'handleAutocam', (ac: boolean) => {
        autocam.value = ac
    })
    socketHandler(store.socket, 'handleAvailableMics', (am: AvailableMicsMap) => {
        availableMics.value = am
    })

    onAlphaNumPress((key) => {
        const coords = shortcutToShot(key)
        if (coords && coords.j < shots.value[coords.i].length) {
            triggerShot(coords.i, coords.j)
        }
    })
    onSpacePress(() => {
        toggleAutocam()
    })
}

const setCurrentShot = (shot: Shoot) => {
    for (const i in currentContainers.value) {
        if (currentContainers.value[i] === shot.containerId) {
            currentShots.value[i] = shot.shotId
        }
    }
}

const toggleAutocam = () => {
    socketEmitter(store.socket, 'toggleAutocam', !autocam.value)
}

const toggleMicAvailability = (mic: string) => {
    socketEmitter(store.socket, 'toggleAvailableMic', mic)
}

const triggerShot = (i: number, j: number) => {
    socketEmitter(store.socket, 'triggerShot', klona(shots.value[i][j]))
}

const shotToShortcut = (i: number, j: number): string => {
    let count = j
    for (let k=0; k<i; k++) {
        count += shots.value[k].length
    }

    return ALPHA_NUM[count]
}

const shortcutToShot = (key: string): {i: number, j: number}|undefined => {
    const index = ALPHA_NUM.indexOf(key)
    if (index < 0) {
        return undefined
    }

    let i = 0
    let count = 0
    for (i; i<shots.value.length; i++) {
        if (count + shots.value[i].length > index) {
            break
        }
        count += shots.value[i].length
    }

    if (i >= shots.value.length) {
        return undefined
    }

    const j = index - count
    return { i, j }
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
        <div class="flex-1 flex flex-col">
            <div
                v-for="(_v, i) in shots"
                :key="i"
                class="flex flex-col flex-1 w-full"
            >
                <div class="flex-1 flex items-stretch content-stretch flex-wrap w-full">
                    <ButtonContainerUi
                        v-for="(shot, j) in shots[i]"
                        :key="'shot-'+shot"
                        :active="(shot?.name === currentShots[i]?.name)"
                        :primary="true"
                        :keycode="shotToShortcut(i, j)"
                    >
                        <ButtonUi
                            class="flex flex-col items-center control-btn"
                            :active="(shot?.name === currentShots[i]?.name)"
                            @click="() => triggerShot(i, j)"
                        >
                            <CamIcon class="m-4" />
                            <span class="text-content-2 text-sm">Container {{ i+1 }}</span>
                            <span class="text-base">{{ shot.name }}</span>
                        </ButtonUi>
                    </ButtonContainerUi>
                </div>
            </div>
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