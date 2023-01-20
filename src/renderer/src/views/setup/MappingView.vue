<script lang="ts" setup>

import { ref, watch } from 'vue'

import { store } from '@src/renderer/src/store/store'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import SelectUi from '@src/renderer/src/components/basics/SelectUi.vue'

import PlusIcon from '@src/renderer/src/components/icons/PlusIcon.vue'
import BinIcon from '@src/renderer/src/components/icons/BinIcon.vue'

import SourcesTree from '@src/renderer/src/components/setup/SourcesTree.vue'

import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

import type { ObsScene, ObsAssetId, VideoDeviceSettings } from '@src/types/protocol'

const obsContainers = ref<VideoDeviceSettings[]>(store.profiles.settings().containers)
const obsScenesFiltered = ref<ObsScene[]>([])
const obsConnectionLoading = ref(false)

const addAsset = () => {
    obsContainers.value.push({
        scene: '',
        source: { id: -1, name: '' },
        cams: [],
    })
    updateNextBtn()
}

const removeAsset = (index: number) => {
    obsContainers.value.splice(index, 1)
    updateNextBtn()
}

const updateScene = (asset: ObsScene, index: number) => {
    obsContainers.value[index].scene = asset.id
    obsContainers.value[index].source = { id: -1, name: '' }

    updateNextBtn()
}

const updateSource = (source: ObsAssetId['source'], index: number) => {
    obsContainers.value[index].source = source
    obsContainers.value[index].cams = getSourcesForScene(source.name, false)
    updateNextBtn()
}

const getSourcesForScene = (sceneId: ObsAssetId['scene'], restricted = true): ObsAssetId['source'][] => {
    let sources: ObsAssetId['source'][] = []

    const scenes = restricted? obsScenesFiltered.value : store.assets.scenes

    for (const scene of scenes) {
        if (scene.id === sceneId) {
            for (const source of scene.sources) {
                if (!alreadyChoosen(scene.id, source)) {
                    sources.push(source)
                }
            }
            break
        }
    }

    return sources
}

const filterScenes = (scenes: ObsScene[]): ObsScene[] => {
    const filtered: ObsScene[] = []
    const allScenes = scenes.map(s => s.id)


    for (const scene of scenes) {
        const obsScene: ObsScene = {
            id: scene.id,
            sources: [],
        }
        for (const source of scene.sources) {
            if (allScenes.indexOf(source.name) > -1) {
                obsScene.sources.push(source)
            }
        }
        if (obsScene.sources.length > 0) {
            filtered.push(obsScene)
        }
    }

    return filtered
}

const alreadyChoosen = (scene: ObsAssetId['scene'], source: ObsAssetId['source']): boolean => {
    for (const c of obsContainers.value) {
        if (c.scene === scene && c.source === source) {
            return true
        }
    }

    return false
}

const nextIsInvalid = (): boolean => {
    let disable = (obsContainers.value.length === 0)

    for (const c of obsContainers.value) {
        if (!c.scene || !c.source) {
            disable = true
            break
        }
    }

    return disable
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = nextIsInvalid()
}

watch(() => store.assets.scenes, () => {
    obsScenesFiltered.value = filterScenes(store.assets.scenes)
    updateNextBtn()
})

watch(() => store.connections.obs, () => {
    if (obsConnectionLoading.value && store.connections.obs) {
        obsConnectionLoading.value = false
    }
})

onEnterPress(() => {
    if (!nextIsInvalid() && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

obsScenesFiltered.value = filterScenes(store.assets.scenes)
updateNextBtn()

</script>

<template>
    <div class="flex flex-col w-full pb-10">
        <div class="flex items-center bg-bg-2 text-content-2 text-sm p-4">
            <span class="emoji">📺</span>
            <p>Tell Gabin which scenes you want him to manage.</p>
        </div>
        <ButtonUi
            class="add-scene-btn i-first primary w-full h-14 mt-4"
            @click="addAsset"
        >
            <PlusIcon />
            Add a scene
        </ButtonUi>
        <div
            v-for="(_asset, index) in obsContainers"
            :key="'asset-select' + index"
            class="bg-bg-2 flex flex-col w-full p-2 mt-4"
        >
            <div class="flex w-full items-center">
                <div class="flex-1 flex justify-between items-center">
                    <SelectUi
                        class="bg-bg-1 w-1/3 mr-2"
                        :options="obsScenesFiltered"
                        label="Scene"
                        :value="obsContainers[index].scene"
                        keyvalue="id"
                        @update="(s: ObsScene) => updateScene(s, index)"
                    />
                    <SelectUi
                        class="bg-bg-1 w-1/3 mr-2"
                        :options="getSourcesForScene(obsContainers[index].scene)"
                        label="Container"
                        :value="obsContainers[index].source.name"
                        keyvalue="name"
                        @update="(s: ObsAssetId['source']) => updateSource(s, index)"
                    />
                    <div class="flex-1">
                        <SourcesTree
                            v-if="obsContainers[index].source.id >= 0"
                            :list="getSourcesForScene(obsContainers[index].source.name, false).map(s => s.name)"
                        />
                    </div>
                </div>
                <ButtonUi
                    class="i-round ml-2"
                    @click="() => removeAsset(index)"
                >
                    <BinIcon />
                </ButtonUi>
            </div>
        </div>
    </div>
</template>

<style scoped>
.add-scene-btn {
    justify-content: center !important;
}
</style>