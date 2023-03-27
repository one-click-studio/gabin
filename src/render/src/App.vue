<script setup lang="ts">

import { store } from '@src/store/store'
import { getOS, socketHandler } from '@src/components/utils/UtilsTools.vue'

import Background from '@src/layout/BackgroundLayout.vue'
import Layout from '@src/layout/GlobalLayout.vue'
import { Asset } from '../../types/protocol'


socketHandler(store.socket, 'handleObsConnected', (reachable: boolean) => {
    if (store.connections.obs !== reachable) {
        store.connections.obs = reachable
    }
})

socketHandler(store.socket, 'handleOscConnected', (reachable: boolean) => {
    if (store.connections.osc !== reachable) {
        store.connections.osc = reachable
    }
})

socketHandler(store.socket, 'handleObsScenes', (scenes: Asset['scene'][]) => {
    store.assets.scenes = scenes
})

socketHandler(store.socket, 'handleMainScene', (scene: Asset['scene']['name']) => {
    store.assets.scene = scene
})

socketHandler(store.socket, 'handleStreamdeckConnected', (reachable: boolean) => {
    if (store.connections.companion !== reachable) {
        store.connections.companion = reachable
    }
})

socketHandler(store.socket, 'handleSimpleString', (data: string) => {
    console.log(data)
})

window.addEventListener('keyup', e => {
    store.keyPress$.next(e.key)
})

</script>

<template>
    <div v-if="getOS() === 'Mac OS'" id="draggable-slide" />

    <Background />

    <Layout>
        <router-view v-slot="{ Component, route }">
            <transition :name="(route.meta.transition as string)">
                <component
                    :is="Component"
                    :key="route.path"
                />
            </transition>
        </router-view>
    </Layout>
</template>

<style>
#draggable-slide {
    @apply absolute top-0 left-0 right-0 h-8 z-50;
    -webkit-app-region: drag;
}

/* TRANSITIONS */
.slide-top-enter-active,
.slide-bottom-enter-active,
.slide-right-enter-active,
.slide-left-enter-active {
    transition: all 0.3s ease-out;
}

.slide-top-leave-active,
.slide-bottom-leave-active,
.slide-right-leave-active,
.slide-left-leave-active {
    transition: all 0.15s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-right-leave-to,
.slide-left-enter-from {
    transform: translateX(100vw);
}
.slide-right-enter-from,
.slide-left-leave-to {
    transform: translateX(-100vw);
}
.slide-bottom-leave-to,
.slide-top-enter-from {
    transform: translateY(100vw);
}
.slide-bottom-enter-from,
.slide-top-leave-to {
    transform: translateY(-100vw);
}

.fade-enter-active {
    transition: all 0.3s ease-out;
    transition-delay: 0.1s;
}
.fade-leave-active {
    transition: all 0.15s cubic-bezier(1, 0.5, 0.8, 1);
}

.fade-leave-to,
.fade-enter-from {
    opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
    opacity: 1;
}

</style>