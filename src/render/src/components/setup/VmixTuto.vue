<script lang="ts" setup>

import VmixCreateContainerImg from '@src/assets/pictures/vmix/vmix-create-container.png'
import VmixOverlaySourcesImg from '@src/assets/pictures/vmix/vmix-overlay-sources.png'
import VmixAddContainerImg from '@src/assets/pictures/vmix/vmix-add-container.png'

</script>

<template>
    <div class="obs-container-info">
        <h2 class="text-content-2">
            Vmix setup
        </h2>

        <div>
            <h3 class="text-content-2">
                Setup a container
            </h3>
            <p class="text-sm text-content-2 my-5">
                Go to Vmix and create add a transparent color input in which you will overlay all your camera inputs on top of each other.<br>
                Gabin will <span class="text-white font-bold">automatically</span> toggle their visibility.<br>
                If you need a split view with several simultaneous camera views you can create several Containers.
            </p>

            <div class="flex flex-wrap justify-between items-stretch">
                <div class="w-1/2 min-w-[18rem] min-h-[6rem] pr-2">
                    <img
                        class="w-full"
                        :src="VmixCreateContainerImg"
                    >
                </div>
                <div class="w-1/4 min-w-[9rem] min-h-[6rem] px-2 py-[3%]">
                    <div class="obs-scene relative w-full h-full">
                        <div class="obs-container w-full h-full">
                            <span>Container</span>
                        </div>
                    </div>
                </div>
                <div class="w-1/4 min-w-[9rem] min-h-[6rem] pl-2 py-[3%]">
                    <div class="obs-scene w-full h-full flex justify-start items-end">
                        <div class="obs-container w-1/2 h-1/2">
                            <span>Container</span>
                        </div>
                    </div>
                </div>
                <div class="w-1/2 min-w-[18rem] min-h-[6rem] pr-2 pt-2">
                    <img
                        class="w-full"
                        :src="VmixOverlaySourcesImg"
                    >
                </div>
                <div class="w-1/4 min-w-[9rem] min-h-[6rem] px-2 py-[3%]">
                    <div class="obs-scene w-full h-full flex">
                        <div class="obs-container w-1/2 h-full">
                            <span>Container A</span>
                        </div>
                        <div class="obs-container w-1/2 h-full">
                            <span>Container B</span>
                        </div>
                    </div>
                </div>
                <div class="w-1/4 min-w-[9rem] min-h-[6rem] pl-2 py-[3%]">
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
                Adding the container(s) to your main scene
            </h3>
            <p class="text-sm text-content-2 my-5">
                You can now embed and place your Container scene in your main scenes.<br>
                Create <span class="text-white font-bold">at least one main scene</span> before next step.
            </p>
            <div class="flex flex-wrap justify-between items-center w-full">
                <img
                    class="h-full max-h-50 pr-4 pb-4"
                    :src="VmixAddContainerImg"
                >
            </div>
        </div>
    </div>
</template>

<style scoped>

.obs-container-info {
    @apply w-full flex flex-wrap items-start my-5;
}
.obs-container-info > div {
    @apply bg-bg-1 p-4 my-5 w-full;
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