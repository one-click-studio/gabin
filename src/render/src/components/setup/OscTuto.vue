<script lang="ts" setup>
</script>

<template>
    <div class="obs-container-info">
        <h2 class="text-content-2">
            OSC setup
        </h2>

        <div>
            <h3 class="text-content-2">
                Setup containers
            </h3>
            <p class="text-sm text-content-2 my-5">
                You have to think in terms of <i>containers</i>.<br>
                You have your main scenes (fullscreen, splitscreen, etc.) and they will have a nested block called a container.<br>
                The container will be the one that contains all your camera sources.<br>
                Gabin will <span class="text-white font-bold">automatically</span> trigger the osc path you provide.
            </p>
            <div class="flex flex-wrap justify-center items-stretch">
                <div class="w-1/3 min-w-[9rem] min-h-[12rem] px-2 py-[3%]">
                    <div class="obs-scene relative w-full h-full">
                        <div class="obs-container w-full h-full">
                            <span>Container</span>
                        </div>
                    </div>
                </div>
                <div class="w-1/3 min-w-[9rem] min-h-[12rem] pl-2 py-[3%]">
                    <div class="obs-scene w-full h-full flex justify-start items-end">
                        <div class="obs-container w-1/2 h-1/2">
                            <span>Container</span>
                        </div>
                    </div>
                </div>
            </div>
            <p class="text-sm text-content-2 my-5">
                If you need a split view with several simultaneous camera views you can create several containers.
            </p>

            <div class="flex flex-wrap justify-center items-stretch w-full">
                <div class="w-1/3 min-w-[9rem] min-h-[12rem] px-2 py-[3%]">
                    <div class="obs-scene w-full h-full flex">
                        <div class="obs-container w-1/2 h-full">
                            <span>Container A</span>
                        </div>
                        <div class="obs-container w-1/2 h-full">
                            <span>Container B</span>
                        </div>
                    </div>
                </div>
                <div class="w-1/3 min-w-[9rem] min-h-[12rem] pl-2 py-[3%]">
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
                Main scene path
            </h3>
            <p class="text-sm text-content-2 my-5">
                If you have multiple scenes, you have to tell Gabin when you switch between them.<br>
                In order to do that call this route <code>/scene/$NAME_OF_YOUR_SCENE</code>.<br>
            </p>

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
code {
    @apply bg-bg-3 text-content-2 text-sm p-1;
}
</style>