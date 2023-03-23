<script lang="ts" setup>

import { ref, watch, toRaw } from 'vue'

import { store } from '@src/store/store'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import InputUi from '@src/components/basics/InputUi.vue'

import PlusIcon from '@src/components/icons/PlusIcon.vue'
import BinIcon from '@src/components/icons/BinIcon.vue'
import PlayIcon from '@src/components/icons/PlayIcon.vue'

import { onEnterPress } from '@src/components/utils/KeyPress.vue'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'

import type { 
    OscScene,
    OscSource
} from '../../../../types/protocol'

const scenes_ = ref<OscScene[]>([])
const containers_ = ref<Map<OscScene['container'], OscScene['sources']>>(new Map())
const sources_ = ref<Map<OscSource['id'], OscSource['path']>>(new Map())

const connectOsc = () => {
    if (store.connections.osc || !store.profiles.editProfile) return

    const connections = store.profiles.connections()
    if (!connections.osc) return

    socketEmitter(store.socket, 'connectOsc', toRaw(connections.osc))
    store.toast.info('OSC connection attempt')

    setTimeout(() => {
        if (store.connections.osc) {
            store.toast.success('OSC connection succeeded')
        } else {
            store.toast.error('OSC connection failed', 'Please check your settings')
            socketEmitter(store.socket, 'disconnectOsc')
        }
    }, 3000)
}

const nextIsInvalid = (): boolean => {
    if (!scenes_.value.length) return true

    for (const scene of scenes_.value) {
        if (!scene.id || !scene.container || !scene.sources.length) return true
        for (const source of scene.sources) {
            if (!source.path || !source.id) return true
        }
    }

    return false
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = nextIsInvalid()
}

onEnterPress(() => {
    if (!nextIsInvalid() && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

store.layout.footer.back.callback = () => {
    if (store.profiles.editProfile) {
        socketEmitter(store.socket, 'disconnectOsc')
    }
}

store.layout.footer.next.callback = async () => {
    if (store.profiles.editProfile) {
        await store.profiles.save()
        socketEmitter(store.socket, 'disconnectOsc')
        store.toast.success('Profile saved !')
    }
}

connectOsc()
updateNextBtn()

const addScene = () => {
    let containersTmp: OscScene['container'][] = []
    for (const scene of scenes_.value) {
        if (scene.container && containersTmp.indexOf(scene.container) === -1) containersTmp.push(scene.container)
    }

    scenes_.value.push({
        id: 'Scene ' + (scenes_.value.length + 1),
        container: 'Container ' + (containersTmp.length + 1),
        sources: [],
    })
    updateNextBtn()
}

const removeScene = (index: number) => {
    scenes_.value.splice(index, 1)
    resetContainersMap()
    resetSourcesMap()
    updateNextBtn()
}

const addSource = (index: number) => {
    scenes_.value[index].sources.push({
        id: 'Source ' + (sources_.value.size + 1),
        path: `/${scenes_.value[index].container}/Source ${sources_.value.size + 1}`.replace(/ /g, ''),
    })

    updateContainersMap(scenes_.value[index].container, scenes_.value[index].sources)
    resetSourcesMap()
    updateNextBtn()
}

const removeSource = (scIndex: number, soIndex: number) => {
    scenes_.value[scIndex].sources.splice(soIndex, 1)
    resetSourcesMap()
    updateNextBtn()
}

const testSource = (scIndex: number, soIndex: number) => {
    const path = scenes_.value[scIndex].sources[soIndex].path
    if (!path) {
        store.toast.error('No path defined')
        return
    }
    store.toast.info('Sending test OSC message')
    socketEmitter(store.socket, 'sendOsc', toRaw(path))
}


const updateSceneId = (index: number, id: string) => {
    scenes_.value[index].id = id
    updateNextBtn()
}

const updateSceneContainer = (index: number, container: string) => {
    scenes_.value[index].container = container

    const sourcesTmp = containers_.value.get(container)
    if (sourcesTmp) scenes_.value[index].sources = sourcesTmp

    resetContainersMap()
    updateNextBtn()
}

const updateSourceId = (scIndex: number, soIndex: number, id: string) => {
    scenes_.value[scIndex].sources[soIndex].id = id

    const path = sources_.value.get(id)
    if (path) scenes_.value[scIndex].sources[soIndex].path = path

    updateContainersMap(scenes_.value[scIndex].container, scenes_.value[scIndex].sources)
    resetSourcesMap()
    updateNextBtn()
}

const updateSourcePath = (scIndex: number, soIndex: number, path: string) => {
    const p = path.replace(/ /g, '')

    const id = scenes_.value[scIndex].sources[soIndex].id
    if (sources_.value.has(id)) updateSourcesMap(id, p)

    scenes_.value[scIndex].sources[soIndex].path = p
    updateContainersMap(scenes_.value[scIndex].container, scenes_.value[scIndex].sources)
    updateNextBtn()
}

const resetSourcesMap = () => {
    sources_.value = new Map()

    for (const scene of scenes_.value) {
        for (const source of scene.sources) {
            sources_.value.set(source.id, source.path)
        }
    }
}

const resetContainersMap = () => {
    containers_.value = new Map()

    for (const scene of scenes_.value) {
        containers_.value.set(scene.container, scene.sources)
    }
}

const updateSourcesMap = (id: string, path: string) => {
    sources_.value.set(id, path)

    for (const scene of scenes_.value) {
        for (const source of scene.sources) {
            if (source.id === id) source.path = path
        }
    }

    updateNextBtn()
}

const updateContainersMap = (container: OscScene['container'], sources: OscScene['sources']) => {
    containers_.value.set(container, sources)

    for (const scene of scenes_.value) {
        if (scene.container === container) scene.sources = JSON.parse(JSON.stringify(sources))
    }

    updateNextBtn()
}

// const availableSceneId = (scene: OscScene): boolean => {
//     if (!scene.id) return false
//     return scenes_.value.filter((s) => s.id === scene.id).length === 1
// }

</script>

<template>
    <div class="flex flex-col w-full pb-10">
        <div class="flex items-center bg-bg-2 text-content-2 text-sm p-4">
            <span class="emoji">📺</span>
            <p>Tell Gabin which scenes you want him to manage.</p>
        </div>
        <ButtonUi
            class="add-scene-btn i-first primary w-full h-14 mt-4"
            @click="addScene"
        >
            <PlusIcon />
            Add a scene
        </ButtonUi>
        <div
            v-for="(scene, scIndex) in scenes_"
            :key="'scene-' + scIndex"
            class="bg-bg-2 flex flex-col w-full p-2 mt-4"
        >
            <div class="flex w-full justify-between items-center">
                <div class="w-2/3 flex justify-start items-center">
                    <InputUi
                        class="bg-bg-1 flex-1 mr-2"
                        label="Scene name"
                        :value="scenes_[scIndex].id"
                        :error="!scenes_[scIndex].id"
                        @update="(v) => updateSceneId(scIndex, v)"
                    />
                    <InputUi
                        class="bg-bg-1 flex-1 mr-2"
                        label="Container name"
                        :value="scenes_[scIndex].container"
                        :error="!scenes_[scIndex].container"
                        @update="(v) => updateSceneContainer(scIndex, v)"
                    />
                </div>
                <div class="flex justify-end items-center">
                    <ButtonUi
                        class="add-source-btn i-first primary"
                        @click="() => addSource(scIndex)"
                        :disabled="!scenes_[scIndex].id || !scenes_[scIndex].container"
                    >
                        <PlusIcon />
                        Add a source
                    </ButtonUi>
                    <ButtonUi
                        class="i-round ml-2"
                        @click="() => removeScene(scIndex)"
                        title="Remove scene"
                    >
                        <BinIcon />
                    </ButtonUi>
                </div>
            </div>

            <div
                v-for="(source, soIndex) in scenes_[scIndex].sources"
                :key="`source-${scIndex}-${soIndex}`"
                class="flex w-full justify-between items-center mt-4"
            >
                <div class="w-2/3 flex justify-end items-center">
                    <div class="w-8" />
                    <InputUi
                        class="bg-bg-1 flex-1 mr-2"
                        label="Source name"
                        :value="scenes_[scIndex].sources[soIndex].id"
                        @update="(v) => updateSourceId(scIndex, soIndex, v)"
                    />
                    <InputUi
                        class="bg-bg-1 flex-1 mr-2"
                        label="Source path"
                        :value="scenes_[scIndex].sources[soIndex].path"
                        @update="(v) => updateSourcePath(scIndex, soIndex, v)"
                    />
                </div>
                <div class="flex justify-end items-center">
                    <ButtonUi
                        class="i-round ml-2"
                        @click="() => testSource(scIndex, soIndex)"
                        title="Test path"
                        :disabled="!scenes_[scIndex].sources[soIndex].path"
                    >
                        <PlayIcon />
                    </ButtonUi>
                    <ButtonUi
                        class="i-round ml-2"
                        @click="() => removeSource(scIndex, soIndex)"
                        title="Remove source"
                    >
                        <BinIcon />
                    </ButtonUi>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.add-scene-btn {
    justify-content: center !important;
}
</style>