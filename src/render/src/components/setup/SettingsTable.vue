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

    return s
}
// const updateWeightSettings = (i: number, j: number, k: number, v: number) => {
//     v = (v < 0 || !v)? 0 : v
//     v = v > 100? 100 : v

//     acSettings.value[i].mics[j].cams[k].weight = Math.round(v)
//     update()
// }
// const updateDurationsSettings = (i: number, key: 'min'|'max', v: number) => {
//     v = (v < 0 || !v)? 0 : v

//     acSettings.value[i].durations[key] = v
//     update()
// }
// const isLast = (array: unknown[], index: number): boolean => {
//     return (array.length - 1 === index)
// }
// const getCorrectPercent = (cams: AutocamSource[], index: number): number => {
//     let percent = 100
//     for (const i in cams) {
//         percent -= parseInt(i) !== index? cams[i].weight : 0
//     }
//     return percent || 1
// }
// const update = () => {
//     $emit('update', acSettings.value)
// }
// const filtredSettings = (): AutocamSettings[] => {
//     const acs: AutocamSettings[] = deepRawCopy(acSettings.value)

//     acs.forEach(c =>
//         c.mics.forEach(m =>
//             m.cams = m.cams.filter(c => c.weight > 0),
//         ),
//     )

//     return acs
// }
// const getRowspan = (c: AutocamSettings): number => {
//     return c.mics.reduce((p, l) => p += l.cams.length, 0)
// }
// const resetAll = () => {
//     acSettings.value = defaultSettings(store.profiles.settings().mics, store.profiles.settings().containers)
// }

const pSettings = store.profiles.settings()
acSettings.value = defaultSettings(pSettings.mics, pSettings.containers, pSettings.autocam)
// update()

</script>

<template>
    <!-- <div
        v-if="editable"
        class="w-full flex justify-end mb-4"
    >
        <ButtonUi
            class="i-first small"
            @click="resetAll"
        >
            <ReturnIcon />
            Reset All
        </ButtonUi>
    </div>
    <div class="w-full">
        <table :class="editable? 'editable' : ''">
            <thead>
                <tr>
                    <th class="column-1">
                        Container
                    </th>
                    <th class="column-2">
                        Mic
                    </th>
                    <th class="column-3">
                        Shot
                    </th>
                    <th
                        v-if="editable"
                        class="column-4"
                    />
                    <th class="column-5">
                        <TooltipUi
                            value="Describes how often this camera will be shown (between 0 and 100%)"
                        >
                            Probability
                            <InfoIcon class="w-3 h-3 px-1" />
                        </TooltipUi>
                    </th>
                    <th class="column-6">
                        <TooltipUi
                            value="Minimum duration a camera is shown. 0s will allow ugly glitches."
                        >
                            Min
                            <InfoIcon class="w-3 h-3 px-1" />
                        </TooltipUi>
                    </th>
                    <th class="column-7">
                        <TooltipUi
                            value="Maximum duration a camera is shown before changing to other available camera angles. Not useful if no other cameras are enabled for this mic."
                        >
                            Max
                            <InfoIcon class="w-3 h-3 px-1" />
                        </TooltipUi>
                    </th>
                </tr>
            </thead>
            <tbody>
                <template v-for="(container, i) in (editable? acSettings : filtredSettings())">
                    <template v-for="(mic, j) in container.mics">
                        <template
                            v-for="(cam, k) in mic.cams"
                            :key="`container${i}-mic${j}-cam${k}`"
                        >
                            <tr :class="cam.weight? '' : 'no-weight'">
                                <td
                                    v-if="!j && !k"
                                    class="border-b-4 column-1"
                                    :rowspan="getRowspan(container)"
                                >
                                    <b>{{ container.scene }}</b><br>
                                    <span>{{ container.source.name }}</span>
                                </td>
                                <td
                                    v-if="!k"
                                    class="column-2"
                                    :rowspan="mic.cams.length"
                                    :class="{
                                        'border-b-4': isLast(container.mics, j),
                                        'border-b-2': !isLast(container.mics, j)
                                    }"
                                >
                                    {{ mic.id }}
                                </td>
                                <td
                                    class="column-3"
                                    :class="{
                                        'border-b': !isLast(mic.cams, k),
                                        'border-b-4': isLast(mic.cams, k) && isLast(container.mics, j),
                                        'border-b-2': isLast(mic.cams, k) && !isLast(container.mics, j)
                                    }"
                                >
                                    {{ cam.source.name }}
                                </td>
                                <td
                                    v-if="editable"
                                    class="column-4"
                                    :class="{
                                        'border-b': !isLast(mic.cams, k),
                                        'border-b-4': isLast(mic.cams, k) && isLast(container.mics, j),
                                        'border-b-2': isLast(mic.cams, k) && !isLast(container.mics, j)
                                    }"
                                >
                                    <ToggleUi
                                        :value="(cam.weight > 0)"
                                        @update="(v) => updateWeightSettings(i, j, k, v? getCorrectPercent(mic.cams, k) : 0)"
                                    />
                                </td>
                                <td
                                    class="column-5"
                                    :class="{
                                        'border-b': !isLast(mic.cams, k),
                                        'border-b-4': isLast(mic.cams, k) && isLast(container.mics, j),
                                        'border-b-2': isLast(mic.cams, k) && !isLast(container.mics, j)
                                    }"
                                >
                                    <div class="weight-cell">
                                        <template v-if="editable">
                                            <ButtonUi
                                                class="i-round"
                                                @click="() => updateWeightSettings(i, j, k, cam.weight - 5)"
                                            >
                                                <MinCircleIcon />
                                            </ButtonUi>
                                            <InputUi
                                                label=""
                                                center
                                                unit="%"
                                                :value="cam.weight + ''"
                                                @update="(v) => updateWeightSettings(i, j, k, parseInt(v))"
                                            />
                                            <ButtonUi
                                                class="i-round"
                                                @click="() => updateWeightSettings(i, j, k, cam.weight + 5)"
                                            >
                                                <PlusCircleIcon />
                                            </ButtonUi>
                                        </template>
                                        <template v-else>
                                            {{ cam.weight }}%
                                        </template>
                                    </div>
                                </td>
                                <td
                                    v-if="!j && !k"
                                    :rowspan="getRowspan(container)"
                                    class="text-center border-b-4 column-6"
                                >
                                    <template v-if="editable">
                                        <InputUi
                                            label=""
                                            center
                                            unit="s"
                                            :value="container.durations.min + ''"
                                            @update="(v) => updateDurationsSettings(i, 'min', parseFloat(v))"
                                        />
                                    </template>
                                    <template v-else>
                                        {{ container.durations.min }}s
                                    </template>
                                </td>
                                <td
                                    v-if="!j && !k"
                                    :rowspan="getRowspan(container)"
                                    class="text-center border-b-4 column-7"
                                >
                                    <template v-if="editable">
                                        <InputUi
                                            label=""
                                            center
                                            unit="s"
                                            :value="container.durations.max + ''"
                                            @update="(v) => updateDurationsSettings(i, 'max', parseFloat(v))"
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
            </tbody>
        </table>
    </div> -->
</template>

<style scoped>
table .inputui-container {
    @apply bg-transparent hover:bg-bg-1 pt-0 px-0 h-10;
}
.weight-cell {
    @apply flex items-center justify-between;
}
tr .weight-cell button.btn.i-round {
    @apply opacity-0 transition-all;
}
tr:hover .weight-cell button.btn.i-round {
    @apply opacity-100 bg-transparent;
}
tr.no-weight > td.column-3,
tr.no-weight > td.column-5 {
    @apply text-content-3;
}
table.editable {
    @apply mt-2;
}
table > thead > tr > th.column-1,
table > tbody > tr > td.column-1 {
    @apply w-3/12;
}
table > thead > tr > th.column-2,
table > tbody > tr > td.column-2 {
    @apply w-2/12;
}
table > thead > tr > th.column-3,
table > tbody > tr > td.column-3 {
    @apply w-2/12;
}
table > thead > tr > th.column-5,
table > tbody > tr > td.column-5 {
    @apply w-3/12;
}
table > thead > tr > th.column-6,
table > tbody > tr > td.column-6 {
    @apply w-1/12;
}
table > thead > tr > th.column-7,
table > tbody > tr > td.column-7 {
    @apply w-1/12;
}
table.editable > thead > tr > th.column-4,
table.editable > tbody > tr > td.column-4 {
    @apply w-1/12;
}
table.editable > thead > tr > th.column-5,
table.editable > tbody > tr > td.column-5 {
    @apply w-2/12;
}
td.column-1, td.column-2, td.column-3, td.column-4, td.column-5, td.column-6, td.column-7 {
    @apply border-solid border-t-0 border-x-0;
}

</style>