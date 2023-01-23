<script lang="ts" setup>

import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { store } from '@src/renderer/src/store/store'

import Sidebar from '@src/renderer/src/layout/SidebarLayout.vue'
import Timeline from '@src/renderer/src/layout/TimelineLayout.vue'
import Header from '@src/renderer/src/layout/HeaderLayout.vue'
import Footer from '@src/renderer/src/layout/FooterLayout.vue'

interface Options {
    sidebar: boolean
    timeline: boolean
    header: boolean
    footer: boolean
}

const router = useRouter()

const options = ref<Options>({
    sidebar: false,
    timeline: false,
    header: false,
    footer: false,
})

router.beforeResolve((to) => {
    options.value.sidebar = (to.meta.sidebar as boolean)
    options.value.timeline = (to.meta.timeline as boolean)
    options.value.header = (to.meta.header as boolean)
    options.value.footer = (to.meta.footer as boolean)
})

</script>

<template>
    <div
        id="main"
        class="absolute top-0 left-0 h-full w-screen z-10 flex"
    >
        <transition :name="options.sidebar? 'slide-right' : 'slide-left'">
            <div
                v-if="options.sidebar"
                id="sidebar"
                class="h-full z-20"
            >
                <Sidebar />
            </div>
        </transition>

        <transition
            :name="options.timeline? 'slide-right' : 'slide-left'"
        >
            <div
                v-if="options.timeline"
                id="timeline"
                class="h-full z-10 bg-bg-2"
            >
                <Timeline
                    :current-step="store.layout.timeline.currentStep"
                />
            </div>
        </transition>

        <div
            id="main-container"
            class="h-full flex-1 flex flex-col z-20"
            :class="options.timeline? '' : 'timeline-close'"
        >
            <div class="mx-10 flex-1 flex flex-col h-full">
                <div class="pb-5" />

                <transition :name="options.header? 'slide-bottom' : 'slide-top'">
                    <div
                        v-if="options.header"
                        id="header"
                        class="w-full"
                    >
                        <Header
                            :title="store.layout.header.title"
                            :subtitle="store.layout.header.subtitle"
                            :icon-edit="store.layout.header.iconEdit"
                            :dot-menu="store.layout.header.dotMenu"
                        />
                    </div>
                </transition>

                <div
                    id="body"
                    class="w-full flex-1 scroll-bar"
                >
                    <slot />
                </div>

                <transition :name="options.footer? 'slide-top' : 'slide-bottom'">
                    <div
                        v-if="options.footer"
                        id="footer"
                        class="w-full pt-5"
                    >
                        <Footer
                            :back="store.layout.footer.back"
                            :next="store.layout.footer.next"
                        />
                    </div>
                </transition>

                <div class="pb-5" />
            </div>

        </div>
    </div>
</template>
<style scoped>
#timeline {
    -webkit-app-region: drag;
}
</style>