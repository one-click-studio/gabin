<script lang="ts" setup>
import { useRouter } from 'vue-router'

import noise from '@src/renderer/src/assets/pictures/noise.png'
import deco from '@src/renderer/src/assets/pictures/deco.png'

const router = useRouter()

router.currentRoute.value.meta.splash

</script>

<template>
    <div class="bg-container">
        <img
            class="mix-blend-overlay opacity-60 z-50 noisy-overlay"
            :src="noise"
        >
        <img
            v-if="router.currentRoute.value.meta.splash"
            class="mix-blend-color-dodge blur z-0"
            :src="deco"
        >
    </div>
</template>

<style scoped>
.bg-container {
    @apply absolute;
    top: -10vh;
    left: -10vw;
    height: 110vh;
    width: 110vw;
}
.bg-container > img {
    @apply absolute left-0 top-0 w-full h-full;
}

.bg-container > .noisy-overlay {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
}
</style>