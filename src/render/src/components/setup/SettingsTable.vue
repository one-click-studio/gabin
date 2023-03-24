<script lang="ts" setup>

import { ref, watch, toRaw } from 'vue'
import { store } from '@src/store/store'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import InputUi from '@src/components/basics/InputUi.vue'
import ToggleUi from '@src/components/basics/ToggleUi.vue'
import TooltipUi from '@src/components/basics/TooltipUi.vue'

import ReturnIcon from '@src/components/icons/ReturnIcon.vue'
import PlusCircleIcon from '@src/components/icons/PlusCircleIcon.vue'
import MinCircleIcon from '@src/components/icons/MinCircleIcon.vue'
import InfoIcon from '@src/components/icons/InfoIcon.vue'

import type {
    Asset,
    AutocamSettings,
    AutocamContainer,
    AutocamMic,
    AutocamSource,
    AudioDeviceSettings,
} from '../../../../types/protocol'

interface Emits {
    (e: 'update', value: AutocamSettings[]): void
}

defineProps<{
    editable: boolean
}>()
const $emit = defineEmits<Emits>()
const acSettings = ref<AutocamSettings[]>(store.profiles.settings().autocam)

watch(() => store.profiles.current, () => {
    acSettings.value = store.profiles.settings().autocam
})

const deepRawCopy = <T>(object: T): T => {
    return JSON.parse(JSON.stringify(toRaw(object)))
}

const defaultSettings = (devices: AudioDeviceSettings[], scenes: Asset['scene'][], autocam?: AutocamSettings[]): AutocamSettings[] => {
    const s: AutocamSettings[] = []

    for (const i in scenes) {
        const scene = scenes[i]
        const autocamScene = autocam?.find((a) => a.id === scene.id)

        const containersSettings: AutocamContainer[] = []
        for (const j in scene.containers) {
            const container = scene.containers[j]
            const autocamContainer = autocamScene?.containers.find((a) => a.id === container.id)

            const micsSettings: AutocamMic[] = []
            for (const k in devices) {
                const device = devices[k]
                for (const l in device.micsName) {
                    const mic = device.micsName[l]
                    const autocamMic = autocamContainer?.mics.find((a) => a.id === mic)

                    const camsSettings: AutocamSource[] = []
                    for (const l in container.sources) {
                        const source = container.sources[l]

                        const autocamCam = autocamMic?.cams.find((a) => a.source.name === source.name)
            
                        camsSettings.push({
                            source,
                            weight: autocamCam?.weight || 0
                        })
                    }
                    micsSettings.push({
                        id: mic,
                        cams: camsSettings
                    })
                }
            }
            containersSettings.push({
                id: container.id,
                name: container.name,
                sources: container.sources,
                mics: micsSettings,
                durations: autocamContainer?.durations || {
                    min: 0,
                    max: 0
                }
            })
        }
        s.push({
            id: scene.id,
            name: scene.name,
            containers: containersSettings
        })
    }

    console.log(s)
    return s
}

const getSceneRowspan = (scene: AutocamSettings): number => {
    let rowspan = 0
    for (const container of scene.containers) {
        rowspan += getContainerRowspan(container)
    }
    return rowspan
}

const getContainerRowspan = (container: AutocamContainer): number => {
    let rowspan = 0
    for (const mic of container.mics) {
        rowspan += getMicRowspan(mic)
    }
    return rowspan
}
const getMicRowspan = (mic: AutocamMic): number => {
    return mic.cams.length
}

const isLast = (array: unknown[], index: number): boolean => {
    return (array.length - 1 === index)
}

const getTdClass = (o: {scene: AutocamSettings, container: AutocamContainer, mic?: AutocamMic, source?: AutocamSource}): string => {
    const { scene, container, mic, source } = o

    const state = {
        container: isLast(scene.containers, scene.containers.indexOf(container)),
        mic: mic && isLast(container.mics, container.mics.indexOf(mic)),
        source: mic && source && isLast(mic.cams, mic.cams.indexOf(source)),
    }
    
    if (state.container && (state.mic || !mic) && (state.source || !source)) return 'border-b-6'
    if ((state.mic || !mic) && (state.source || !source)) return 'border-b-4'
    if ((state.source || !source)) return 'border-b-2'
    return 'border-b'
}

const pSettings = store.profiles.settings()
acSettings.value = defaultSettings(pSettings.mics, pSettings.containers, pSettings.autocam)

</script>

<template>
    <div>
        <table>
            <thead>
                <tr>
                    <th>Scene</th>
                    <th>Container</th>
                    <th>Mic</th>
                    <th>Source</th>
                    <th>Weight</th>
                    <th>Min</th>
                    <th>Max</th>
                </tr>
            </thead>

            <tbody>
                <template v-for="(scene, i) in acSettings" :key="`scene-${i}`">
                    <template v-for="(container, j) in scene.containers" :key="`scene-${i}-container-${j}`">
                        <template v-for="(mic, k) in container.mics" :key="`scene-${i}-container-${j}-mic-${k}`">
                            <template v-for="(source, l) in mic.cams" :key="`scene-${i}-container-${j}-mic-${k}-source-${l}`">
                                <tr>
                                    <td
                                        v-if="l === 0 && k === 0 && j === 0"
                                        :rowspan="getSceneRowspan(scene)"
                                        class="border-b-6"
                                    >{{ scene.name }}</td>
                                        
                                    <td
                                        v-if="l === 0 && k === 0"
                                        :rowspan="getContainerRowspan(container)"
                                        :class="getTdClass({scene, container})"
                                    >{{ container.name }}</td>
                                    
                                    <td
                                        v-if="l === 0"
                                        :rowspan="getMicRowspan(mic)"
                                        :class="getTdClass({scene, container, mic})"
                                    >{{ mic.id }}</td>
                                    
                                    <td
                                        :class="getTdClass({scene, container, mic, source})"
                                    >{{ source.source.name }}</td>
                                    <td
                                        :class="getTdClass({scene, container, mic, source})"
                                    >{{ source.weight }}</td>
                                    <td
                                        :class="getTdClass({scene, container, mic, source})"
                                    >{{ container.durations.min }}</td>
                                    <td
                                        :class="getTdClass({scene, container, mic, source})"
                                    >{{ container.durations.max }}</td>
                                </tr>
                            </template>
                        </template>
                    </template>
                </template>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
td {
    @apply border-solid border-t-0 border-x-0
}
</style>