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

const defaultSettings = (devices: AudioDeviceSettings[], scenes: Asset['scene'][], autocam?: AutocamSettings[]): AutocamSettings[] => {
    const s: AutocamSettings[] = []

    for (const i in scenes) {
        const scene = scenes[i]
        const autocamScene = autocam?.find((a) => a.name === scene.name)

        const containersSettings: AutocamContainer[] = []
        for (const j in scene.containers) {
            const container = scene.containers[j]
            const autocamContainer = autocamScene?.containers.find((a) => a.name === container.name)

            const micsSettings: AutocamMic[] = []
            for (const k in devices) {
                const device = devices[k]
                const micsNames = device.micsName.filter((_name, index) => device.mics[index])

                for (const l in micsNames) {
                    const mic = micsNames[l]
                    const autocamMic = autocamContainer?.mics.find((a) => a.id === mic)

                    const camsSettings: AutocamSource[] = []
                    for (const m in container.sources) {
                        const source = container.sources[m]

                        const autocamCam = autocamMic?.cams.find((a) => a.source.name === source.name)

                        camsSettings.push({
                            source,
                            weight: autocamCam?.weight || l===m? 100 : 0
                        })
                    }
                    micsSettings.push({
                        id: mic,
                        cams: camsSettings
                    })
                }
            }
            containersSettings.push({
                name: container.name,
                sources: container.sources,
                mics: micsSettings,
                durations: autocamContainer?.durations || {
                    min: 3,
                    max: 12
                }
            })
        }
        s.push({
            name: scene.name,
            containers: containersSettings
        })
    }

    // console.log(s)
    return s
}

const reset = () => {
    acSettings.value = defaultSettings(store.profiles.settings().mics, store.profiles.settings().containers)
}

const update = () => {
    $emit('update', acSettings.value)
}

const getRowspan = {
    scene: (scene: AutocamSettings): number => {
        let rowspan = 0
        for (const container of scene.containers) {
            rowspan += getRowspan.container(container)
        }
        return rowspan
    },
    container: (container: AutocamContainer): number => {
        let rowspan = 0
        for (const mic of container.mics) {
            rowspan += getRowspan.mic(mic)
        }
        return rowspan
    },
    mic: (mic: AutocamMic): number => {
        return mic.cams.length
    }
}

const getTdClass = (o: {scene: AutocamSettings, container: AutocamContainer, mic?: AutocamMic, source?: AutocamSource}): string => {
    const { scene, container, mic, source } = o

    const isLast = (array: unknown[], index: number): boolean => {
        return (array.length - 1 === index)
    }

    const state = {
        container: isLast(scene.containers, scene.containers.indexOf(container)),
        mic: mic && isLast(container.mics.filter(m => m.cams.length), container.mics.filter(m => m.cams.length).indexOf(mic)),
        source: mic && source && isLast(mic.cams, mic.cams.indexOf(source)),
    }
    
    if (state.container && (state.mic || !mic) && (state.source || !source)) return 'border-b-6'
    if ((state.mic || !mic) && (state.source || !source)) return 'border-b-4'
    if ((state.source || !source)) return 'border-b-2'
    return 'border-b'
}

const getCorrectPercent = (sources: AutocamSource[], index: number): number => {
    let percent = 100
    for (const i in sources) {
        percent -= parseInt(i) !== index? sources[i].weight : 0
    }
    return (percent > 0? percent : 1)
}

const updateWeightSettings = (i: number, j: number, k: number, l: number, v: number) => {
    v = (v < 0 || !v)? 0 : v
    v = v > 100? 100 : v

    acSettings.value[i].containers[j].mics[k].cams[l].weight = Math.round(v)
    update()
}

const updateDurationsSettings = (i: number, j: number, key: 'min'|'max', v: number) => {
    v = (v < 0 || !v)? 0 : v

    acSettings.value[i].containers[j].durations[key] = v
    update()
}

const filtredSettings = (): AutocamSettings[] => {
    const acs: AutocamSettings[] = JSON.parse(JSON.stringify(toRaw(acSettings.value)))

    acs.forEach(c =>
        c.containers.forEach(c =>
            c.mics.forEach(m =>
                m.cams = m.cams.filter(c => c.weight > 0),
            )
        )
    )

    return acs
}

const pSettings = store.profiles.settings()
acSettings.value = defaultSettings(pSettings.mics, pSettings.containers, pSettings.autocam)
update()

</script>

<template>
    <div
        v-if="editable"
        class="w-full flex justify-end mb-4"
    >
        <ButtonUi
            class="i-first small"
            @click="reset"
        >
            <ReturnIcon />
            Reset All
        </ButtonUi>
    </div>

    <div>
        <table>
            <thead>
                <tr>
                    <th>Scene</th>
                    <th>Container</th>
                    <th>Mic</th>
                    <th>Source</th>
                    <th v-if="editable" />
                    <th>
                        <TooltipUi value="Describes how often this camera will be shown (between 0 and 100%)">
                            Probability
                            <InfoIcon class="w-3 h-3 px-1" />
                        </TooltipUi>
                    </th>
                    <th>
                        <TooltipUi value="Minimum duration a camera is shown. 0s will allow ugly glitches.">
                            Min
                            <InfoIcon class="w-3 h-3 px-1" />
                        </TooltipUi>
                    </th>
                    <th>
                        <TooltipUi value="Maximum duration a camera is shown before changing to other available camera angles. Not useful if no other cameras are enabled for this mic.">
                            Max
                            <InfoIcon class="w-3 h-3 px-1" />
                        </TooltipUi>
                    </th>
                </tr>
            </thead>

            <tbody>
                <template v-for="(scene, i) in (editable? acSettings : filtredSettings())" :key="`scene-${i}`">
                    <template v-for="(container, j) in scene.containers" :key="`scene-${i}-container-${j}`">
                        <template v-for="(mic, k) in container.mics" :key="`scene-${i}-container-${j}-mic-${k}`">
                            <template v-for="(source, l) in mic.cams" :key="`scene-${i}-container-${j}-mic-${k}-source-${l}`">
                                <tr>
                                    <td
                                        v-if="l === 0 && k === 0 && j === 0"
                                        :rowspan="getRowspan.scene(scene)"
                                        class="border-b-6"
                                    >{{ scene.name }}</td>
                                        
                                    <td
                                        v-if="l === 0 && k === 0"
                                        :rowspan="getRowspan.container(container)"
                                        :class="getTdClass({scene, container})"
                                    >{{ container.name }}</td>
                                    
                                    <td
                                        v-if="l === 0"
                                        :rowspan="getRowspan.mic(mic)"
                                        :class="getTdClass({scene, container, mic})"
                                    >{{ mic.id }}</td>
                                    
                                    <td
                                        :class="getTdClass({scene, container, mic, source})"
                                    >{{ source.source.name }}</td>

                                    <td
                                        v-if="editable"
                                        :class="getTdClass({scene, container, mic, source})"
                                    >
                                        <ToggleUi
                                            :value="(source.weight > 0)"
                                            @update="(v) => updateWeightSettings(i, j, k, l, v? getCorrectPercent(mic.cams, k) : 0)"
                                        />
                                    </td>
                                    <td
                                        :class="getTdClass({scene, container, mic, source})"
                                    >
                                        <div
                                            v-if="editable"
                                            class="weight-cell"
                                        >
                                            <ButtonUi
                                                class="i-round"
                                                @click="() => updateWeightSettings(i, j, k, l, source.weight - 5)"
                                            >
                                                <MinCircleIcon />
                                            </ButtonUi>
                                            <InputUi
                                                label=""
                                                center
                                                unit="%"
                                                :value="source.weight + ''"
                                                @update="(v) => updateWeightSettings(i, j, k, l, parseInt(v))"
                                            />
                                            <ButtonUi
                                                class="i-round"
                                                @click="() => updateWeightSettings(i, j, k, l, source.weight + 5)"
                                            >
                                                <PlusCircleIcon />
                                            </ButtonUi>
                                        </div>
                                        <template v-else>
                                            {{ source.weight }}%
                                        </template>
                                    </td>
                                    <td
                                        v-if="l === 0 && k === 0"
                                        :rowspan="getRowspan.container(container)"
                                        :class="getTdClass({scene, container})"
                                    >
                                        <template v-if="editable">
                                            <InputUi
                                                label=""
                                                center
                                                unit="s"
                                                :value="container.durations.min + ''"
                                                @update="(v) => updateDurationsSettings(i, j, 'min', parseFloat(v))"
                                            />
                                        </template>
                                        <template v-else>
                                            {{ container.durations.min }}s
                                        </template>
                                    </td>
                                    <td
                                        v-if="l === 0 && k === 0"
                                        :rowspan="getRowspan.container(container)"
                                        :class="getTdClass({scene, container})"
                                    >
                                        <template v-if="editable">
                                            <InputUi
                                                label=""
                                                center
                                                unit="s"
                                                :value="container.durations.max + ''"
                                                @update="(v) => updateDurationsSettings(i, j, 'max', parseFloat(v))"
                                            />
                                        </template>
                                        <template v-else>
                                            {{ container.durations.max }}s
                                        </template>
                                    </td>
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

tr .weight-cell {
    @apply flex items-center justify-center;
}

tr .weight-cell button.btn.i-round {
    @apply opacity-0 transition-all;
}
tr:hover .weight-cell button.btn.i-round {
    @apply opacity-100 bg-transparent;
}

table td .inputui-container {
    @apply bg-transparent hover:bg-bg-1 px-0 h-10 w-20;
}


</style>