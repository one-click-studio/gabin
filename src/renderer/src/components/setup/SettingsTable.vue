<script lang="ts" setup>

import { ref, watch, toRaw } from 'vue'
import { store } from '@src/renderer/src/store/store'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import InputUi from '@src/renderer/src/components/basics/InputUi.vue'
import ToggleUi from '@src/renderer/src/components/basics/ToggleUi.vue'

import ReturnIcon from '@src/renderer/src/components/icons/ReturnIcon.vue'
import PlusCircleIcon from '@src/renderer/src/components/icons/PlusCircleIcon.vue'
import MinCircleIcon from '@src/renderer/src/components/icons/MinCircleIcon.vue'

import type {
    AudioDeviceSettings,
    VideoDeviceSettings,
    AutocamSettings,
    AutocamSource,
    AutocamMic,
    ObsAssetId
} from '@src/types/protocol'

interface Props {
    editable: boolean
}

interface Emits {
    (e: 'update', value: AutocamSettings[]): void
}

defineProps<Props>()
const $emit = defineEmits<Emits>()
const acSettings = ref<AutocamSettings[]>(store.profiles.settings().autocam)

watch(() => store.profiles.current, () => {
    acSettings.value = store.profiles.settings().autocam
})

const deepRawCopy = <T>(object: T): T => {
    return JSON.parse(JSON.stringify(toRaw(object)))
}
const defaultSettings = (mics: AudioDeviceSettings[], containers: VideoDeviceSettings[], autocam?: AutocamSettings[]): AutocamSettings[] => {
    const s: AutocamSettings[] = []

    const getContainer = (scene: ObsAssetId['scene'], source: ObsAssetId['source']): AutocamSettings | undefined => {
        const container = autocam?.filter(c => c.scene === scene && c.source.name === source.name)
        return (container?.length === 1? container[0] : undefined)
    }

    const getMic = (c: AutocamSettings, micId: string): AutocamMic | undefined => {
        const mic = c.mics.filter(m => m.id === micId)
        return (mic?.length === 1? mic[0] : undefined)
    }

    const getCam = (m: AutocamMic, camId: ObsAssetId['source']): AutocamSource | undefined => {
        const source = m.cams.filter(c => c.source.name === camId.name)
        return (source?.length === 1? source[0] : undefined)
    }

    const flatMics = mics.flatMap(d => d.micsName.filter((_m,i) => d.mics[i]))

    for (const i in containers) {
        const oldC = getContainer(containers[i].scene, containers[i].source)
        const c: AutocamSettings = {
            scene: containers[i].scene,
            source: containers[i].source,
            mics: [],
            durations: {
                min: oldC?.durations.min || 3,
                max: oldC?.durations.max || 12,
            },
        }

        for (const j in flatMics) {
            const oldMic = oldC? getMic(oldC, flatMics[j]) : undefined
            if (!flatMics[j]) {
                continue
            }

            const cams: AutocamSource[] = []
            const percent = Math.round(100/containers[i].cams.length)
            const last = 100 - (containers[i].cams.length - 1) * percent
            for (const k in containers[i].cams) {
                const oldCam = oldMic? getCam(oldMic, containers[i].cams[k]) : undefined
                cams.push({
                    source: containers[i].cams[k],
                    weight: oldCam? oldCam.weight : (isLast(containers[i].cams, parseInt(k))? last : percent),
                })
            }
            c.mics.push({ id: flatMics[j], cams })
        }
        s.push(c)
    }

    return s
}
const updateWeightSettings = (i: number, j: number, k: number, v: number) => {
    v = (v < 0 || !v)? 0 : v
    v = v > 100? 100 : v

    acSettings.value[i].mics[j].cams[k].weight = Math.round(v)
    update()
}
const updateDurationsSettings = (i: number, key: 'min'|'max', v: number) => {
    v = (v < 0 || !v)? 0 : v

    acSettings.value[i].durations[key] = v
    update()
}
const isLast = (array: unknown[], index: number): boolean => {
    return (array.length - 1 === index)
}
const correctPercent = (cams: AutocamSource[]): boolean => {
    return (Math.round(cams.reduce((p, c) => p + c.weight, 0)) === 100)
}
const getCorrectPercent = (cams: AutocamSource[], index: number): number => {
    let percent = 100
    for (const i in cams) {
        percent -= parseInt(i) !== index? cams[i].weight : 0
    }
    return percent || 1
}
const update = () => {
    $emit('update', acSettings.value)
}
const filtredSettings = (): AutocamSettings[] => {
    const acs: AutocamSettings[] = deepRawCopy(acSettings.value)

    acs.forEach(c =>
        c.mics.forEach(m =>
            m.cams = m.cams.filter(c => c.weight > 0),
        ),
    )

    return acs
}
const getRowspan = (c: AutocamSettings): number => {
    return c.mics.reduce((p, l) => p += l.cams.length, 0)
}
const resetAll = () => {
    acSettings.value = defaultSettings(store.profiles.settings().mics, store.profiles.settings().containers)
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
            @click="resetAll"
        >
            <ReturnIcon />
            Reset All
        </ButtonUi>
    </div>
    <div class="w-full h-full scroll-hidden">
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
                        Probability
                    </th>
                    <th class="column-6">
                        Min
                    </th>
                    <th class="column-7">
                        Max
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
                                    :class="isLast(container.mics, j)? 'border-b-4' : 'border-b-2'"
                                >
                                    {{ mic.id }}
                                </td>
                                <td
                                    class="column-3"
                                    :class="!isLast(mic.cams, k)? 'border-b' : isLast(container.mics, j)? 'border-b-4' : 'border-b-2'"
                                >
                                    {{ cam.source.name }}
                                </td>
                                <td
                                    v-if="editable"
                                    class="column-4"
                                    :class="!isLast(mic.cams, k)? 'border-b' : isLast(container.mics, j)? 'border-b-4' : 'border-b-2'"
                                >
                                    <ToggleUi
                                        :value="(cam.weight > 0)"
                                        @update="(v) => updateWeightSettings(i, j, k, v? getCorrectPercent(mic.cams, k) : 0)"
                                    />
                                </td>
                                <td
                                    class="column-5"
                                    :class="!isLast(mic.cams, k)? 'border-b' : isLast(container.mics, j)? 'border-b-4' : 'border-b-2'"
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
                                                :value="cam.weight + ''"
                                                :class="correctPercent(mic.cams)? '' : 'incorrect-percent'"
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
                                            :value="container.durations.min + ''"
                                            @update="(v) => updateDurationsSettings(i, 'min', parseFloat(v))"
                                        />
                                    </template>
                                    <template v-else>
                                        {{ container.durations.min }}
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
                                            :value="container.durations.max + ''"
                                            @update="(v) => updateDurationsSettings(i, 'max', parseFloat(v))"
                                        />
                                    </template>
                                    <template v-else>
                                        {{ container.durations.max }}
                                    </template>
                                </td>
                            </tr>
                        </template>
                    </template>
                </template>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
table .inputui-container {
    @apply bg-transparent hover:bg-bg-1 pt-0 px-0 h-10;
}
.weight-cell {
    @apply flex items-center justify-between;
}
.inputui-container.incorrect-percent {
    @apply text-content-negative;
}
tr.no-weight .inputui-container.incorrect-percent {
    @apply text-content-3;
}

.weight-cell button.btn.i-round {
    @apply opacity-0 hover:opacity-100 hover:bg-transparent transition-all;
}
tr.no-weight > td.column-3,
tr.no-weight > td.column-5 {
    @apply text-content-3;
}
table.editable {
    @apply mt-9 mb-32;
}
table.editable > thead {
    @apply absolute top-12 left-0 right-0 z-20;
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