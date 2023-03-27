<script lang="ts" setup>

import { ref, toRaw } from 'vue'

import { store } from '@src/store/store'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import InputUi from '@src/components/basics/InputUi.vue'
import ModalUi from '@src/components/basics/ModalUi.vue'

import InfoIcon from '@src/components/icons/InfoIcon.vue'
import PlusIcon from '@src/components/icons/PlusIcon.vue'
import BinIcon from '@src/components/icons/BinIcon.vue'
import PlayIcon from '@src/components/icons/PlayIcon.vue'

import Tuto from '@src/components/setup/OscTuto.vue'

import { onEnterPress } from '@src/components/utils/KeyPress.vue'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'

import type { 
    Asset
} from '../../../../types/protocol'

const scenes_ = ref<Asset['scene'][]>(store.profiles.settings().containers)
const containers_ = ref<Map<Asset['container']['name'], Asset['container']>>(new Map())
const tuto_ = ref<boolean>(store.profiles.editProfile? false : true)

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

    for (const i in scenes_.value) {
        const scene = scenes_.value[i]
        if (!scene.id || !sceneNameIsValid(parseInt(i)) || !scene.containers.length || !scene.containers.reduce((p, c)=> p += c.sources.length, 0)) return true

        for (const container of scene.containers) {
            if (!container.id || !container.name || !container.sources.length) return true

            for (const source of container.sources) {
                if (!source.id || !source.options.path || !source.name) return true
            }
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

const addScene = () => {
    scenes_.value.push({
        id: -1,
        name: 'Scene ' + (scenes_.value.length + 1),
        containers: [],
    })
    updateNextBtn()
}

const removeScene = (i: number) => {
    scenes_.value.splice(i, 1)
    resetContainersMap()
    updateNextBtn()
}

const addContainer = (i: number) => {
    const scene = scenes_.value[i]
    scene.containers.push({
        id: -1,
        name: 'Container ' + (containers_.value.size + 1),
        sources: [],
    })
    resetContainersMap()
    updateNextBtn()
}

const removeContainer = (i: number, j: number) => {
    scenes_.value[i].containers.splice(j, 1)

    resetContainersMap()
    updateNextBtn()
}

const addSource = (i: number, j: number) => {
    const constainer = scenes_.value[i].containers[j]
    constainer.sources.push({
        id: -1,
        name: 'Source ' + (constainer.sources.length + 1),
        options: {
            path: `/${constainer.name}/Source ${constainer.sources.length + 1}`.replace(/ /g, ''),
        },
    })

    updateNextBtn()
}

const removeSource = (i: number, j: number, k: number) => {
    scenes_.value[i].containers[j].sources.splice(k, 1)

    updateNextBtn()
}

const updateSceneName = (index: number, name: string) => {
    scenes_.value[index].name = name
    updateNextBtn()
}

const updateContainerName = (i: number, j: number, name: string) => {
    const container = containers_.value.get(name)
    if (container) {
        scenes_.value[i].containers[j] = container
    } else {
        scenes_.value[i].containers[j].name = name
    }

    resetContainersMap()
    updateNextBtn()
}

const updateSourceName = (i: number, j: number, k: number, name: string) => {
    scenes_.value[i].containers[j].sources[k].name = name
    updateNextBtn()
}

const updateSourcePath = (i: number, j: number, k: number, path: string) => {
    scenes_.value[i].containers[j].sources[k].options.path = path
    updateNextBtn()
}

const testSource = (i: number, j: number, k: number) => {
    const path = scenes_.value[i].containers[j].sources[k].options.path
    if (!path) {
        store.toast.error('No path defined')
        return
    }
    store.toast.info('Sending test OSC message')
    socketEmitter(store.socket, 'sendOsc', toRaw(path))
}

const sceneNameIsValid = (index: number): boolean => {
    const name = scenes_.value[index].name
    if (!name) return false

    for (let i = 0; i < scenes_.value.length; i++) {
        if (i === index) continue
        if (scenes_.value[i].name === name) return false
    }

    return true
}

const resetContainersMap = () => {
    containers_.value = new Map()

    for (const scene of scenes_.value) {
        for (const container of scene.containers) {
            containers_.value.set(container.name, container)
        }
    }
}

connectOsc()
updateNextBtn()

</script>

<template>
    <Teleport to="#header-btn-slot">
        <ButtonUi
            class="i-first mx-1 h-12 whitespace-nowrap"
            @click="() => tuto_ = true"
        >
            <InfoIcon />
            Open tutorial
        </ButtonUi>
    </Teleport>

    <ModalUi
        :open="tuto_"
        @close="tuto_ = false"
    >
        <div class="flex flex-col w-full">
            <Tuto />
            <div class="flex justify-end w-full">
                <ButtonUi
                    class="primary"
                    @click="tuto_ = false"
                >
                    I got it !
                </ButtonUi>
            </div>
        </div>
    </ModalUi>

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

        <div class="flex justify-between items-center bg-bg-2 text-content-2 text-sm mt-4 p-4">
            <p class="flex-1">
                Call <code>/scene/$NAME_OF_YOUR_SCENE</code> with OSC
                on the <code>{{ store.profiles.connections().osc?.server.ip }}</code> port
                to tell Gabin what the current scene is. You can test it now !
            </p>
            <p class="text-white font-bold text-right">Current scene :<br> {{ store.assets.scene? store.assets.scene : 'Undefined' }}</p>
        </div>

        <div
            v-for="(_scene, i) in scenes_"
            :key="'scene-' + i"
            class="bg-bg-2 flex flex-col w-full p-2 mt-4"
        >
            <div class="flex w-full justify-between items-center">
                <div class="w-2/3 flex justify-start items-center">
                    <InputUi
                        class="bg-bg-1 flex-1 mr-2"
                        label="Scene name"
                        :value="scenes_[i].name"
                        :error="!sceneNameIsValid(i)"
                        @update="(value) => updateSceneName(i, value)"
                    />
                </div>
                <div class="flex justify-end items-center">
                    <ButtonUi
                        class="add-source-btn i-first primary"
                        :disabled="!sceneNameIsValid(i)"
                        @click="() => addContainer(i)"
                    >
                        <PlusIcon />
                        Add a container
                    </ButtonUi>
                    <ButtonUi
                        class="i-round ml-2"
                        @click="() => removeScene(i)"
                        title="Remove scene"
                    >
                        <BinIcon />
                    </ButtonUi>
                </div>
            </div>
            <div
                v-for="(_container, j) in scenes_[i].containers"
                :key="`scene-${i}-container-${j}`"
                class="flex flex-col w-full"
            >
                <div class="flex w-full justify-between items-center mt-4">
                    <div class="w-2/3 flex justify-end items-center">
                        <div class="w-8" />
                        <InputUi
                            class="bg-bg-1 flex-1 mr-2"
                            label="Container name"
                            :value="scenes_[i].containers[j].name"
                            :error="!scenes_[i].containers[j].name"
                            @update="(value) => updateContainerName(i, j, value)"
                        />
                    </div>
                    <div class="flex justify-end items-center">
                        <ButtonUi
                            class="add-source-btn i-first primary"
                            @click="() => addSource(i, j)"
                            :disabled="!scenes_[i].name || !scenes_[i].containers[j].name"
                        >
                            <PlusIcon />
                            Add a source
                        </ButtonUi>
                        <ButtonUi
                            class="i-round ml-2"
                            @click="() => removeContainer(i, j)"
                            title="Remove source"
                        >
                            <BinIcon />
                        </ButtonUi>
                    </div>
                </div>
                <div
                    v-for="(_container, k) in scenes_[i].containers[j].sources"
                    :key="`scene-${i}-container-${j}-source-${k}`"
                    class="flex w-full justify-between items-center mt-4"
                >
                    <div class="w-2/3 flex justify-end items-center">
                        <div class="w-8" />
                        <div class="w-8" />
                        <InputUi
                            class="bg-bg-1 flex-1 mr-2"
                            label="Source name"
                            :value="scenes_[i].containers[j].sources[k].name"
                            :error="!scenes_[i].containers[j].sources[k].name"
                            @update="(value) => updateSourceName(i, j, k, value)"
                        />
                        <InputUi
                            class="bg-bg-1 flex-1 mr-2"
                            label="Source path"
                            :value="scenes_[i].containers[j].sources[k].options.path"
                            :error="!scenes_[i].containers[j].sources[k].options.path"
                            @update="(value) => updateSourcePath(i, j, k, value)"
                        />
                    </div>
                    <div class="flex justify-end items-center">
                        <ButtonUi
                            class="i-round ml-2"
                            @click="() => testSource(i, j, k)"
                            title="Test path"
                            :disabled="!scenes_[i].containers[j].sources[k].options.path"
                        >
                            <PlayIcon />
                        </ButtonUi>
                        <ButtonUi
                            class="i-round ml-2"
                            @click="() => removeSource(i, j, k)"
                            title="Remove source"
                        >
                            <BinIcon />
                        </ButtonUi>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.add-scene-btn {
    justify-content: center !important;
}
code {
    @apply bg-bg-1 text-content-1 text-sm p-1;
}
</style>