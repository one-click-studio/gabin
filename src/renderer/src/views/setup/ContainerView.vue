<script lang="ts" setup>

import { ref } from 'vue'

import { store } from '@src/renderer/src/store/store'

import ToggleUi from '@src/renderer/src/components/basics/ToggleUi.vue'

import ObsContainerImg from '@src/renderer/src/assets/pictures/obs/obs-container.png'
import ObsContainersImg from '@src/renderer/src/assets/pictures/obs/obs-containers.png'
import ObsNewSceneImg from '@src/renderer/src/assets/pictures/obs/obs-new-scene.png'
import ObsAddSceneImg from '@src/renderer/src/assets/pictures/obs/obs-add-scene.png'
import ObsScenesImg from '@src/renderer/src/assets/pictures/obs/obs-scenes.png'

import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

const splitview = ref(false)

const update = (value: boolean) => {
    splitview.value = value
}

onEnterPress(() => {
    if (store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

store.layout.footer.back.disable = false
store.layout.footer.next.disable = false

</script>

<template>
    <div class="w-full scroll-hidden">
        <div class="w-full">
            <ToggleUi
                label="I need a split view with several simultaneous cameras"
                :value="splitview"
                @update="update"
            />
        </div>

        <div class="obs-container-info">
            <div v-show="!splitview">
                <h3 class="text-content-2">
                    Step 1
                </h3>
                <p class="text-sm text-content-2 my-5">
                    Go to OBS and create an scene in which you will overlay all your camera sources on top of each other.<br>
                    Gabin will <span class="text-white font-bold">automatically</span> toggle their visibility.
                </p>
                <div class="flex justify-between items-stretch w-full">
                    <div class="w-1/2 pr-2">
                        <img
                            class="w-full"
                            :src="ObsContainerImg"
                        >
                    </div>

                    <div class="w-1/4 px-2 py-[3%]">
                        <div class="obs-scene relative w-full h-full">
                            <div class="obs-container w-full h-full">
                                <span>Container</span>
                            </div>
                        </div>
                    </div>
                    <div class="w-1/4 pl-2 py-[3%]">
                        <div class="obs-scene w-full h-full flex justify-start items-end">
                            <div class="obs-container w-1/2 h-1/2">
                                <span>Container</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-show="splitview">
                <h3 class="text-content-2">
                    Step 1
                </h3>
                <p class="text-sm text-content-2 my-5">
                    If you need a split view with several simultaneous camera views you can create several Containers.
                </p>

                <div class="flex justify-between items-stretch w-full">
                    <img
                        class="w-1/2 pr-2"
                        :src="ObsContainersImg"
                    >
                    <div class="w-1/4 px-2 py-[3%]">
                        <div class="obs-scene w-full h-full flex">
                            <div class="obs-container w-1/2 h-full">
                                <span>Container A</span>
                            </div>
                            <div class="obs-container w-1/2 h-full">
                                <span>Container B</span>
                            </div>
                        </div>
                    </div>
                    <div class="w-1/4 px-2 py-[3%]">
                        <div class="obs-scene relative w-full h-full flex flex-col justify-start items-start">
                            <div class="obs-container w-1/2 h-1/2">
                                <span>Container A</span>
                            </div>
                            <div class="obs-container w-1/2 h-1/2">
                                <span>Container B</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 class="text-content-2">
                    Step 2
                </h3>
                <p class="text-sm text-content-2 my-5">
                    You can now embed and place your Container scene in your main scenes.<br>
                    Create <span class="text-white font-bold">at least one main scene</span> before next step.
                </p>
                <div class="flex justify-between items-stretch w-full h-44">
                    <img
                        class="h-full"
                        :src="ObsNewSceneImg"
                    >
                    <img
                        class="h-full"
                        :src="ObsAddSceneImg"
                    >
                    <img
                        class="h-full"
                        :src="ObsScenesImg"
                    >
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>

.obs-container-info {
    @apply w-full flex flex-wrap items-start my-5;
}
.obs-container-info > div {
    @apply bg-bg-2 p-4 my-5 min-w-[35rem] w-full;
}

.obs-scene {
    @apply bg-bg-3 p-1;
}
.obs-container {
    @apply border-mainhighlight border-dashed flex border;
}
.obs-container > span {
    @apply bg-main m-auto text-xxs p-0.5;
}

</style>