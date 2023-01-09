<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { store } from '@src/renderer/src/store/store'

import GabinFace from '@src/renderer/src/components/basics/GabinFace.vue'
import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'

import ChevronLeftIcon from '@src/renderer/src/components/icons/ChevronLeftIcon.vue'
import BurgerMenuIcon from '@src/renderer/src/components/icons/BurgerMenuIcon.vue'
import PlusIcon from '@src/renderer/src/components/icons/PlusIcon.vue'
import QuestionMarkIcon from '@src/renderer/src/components/icons/QuestionMarkIcon.vue'

import { getIcon } from '@src/renderer/src/components/icons/ProfileIcons.vue'

import type { Profile } from '@src/types/protocol'

interface Emits {
    (e: 'isOpen', value: boolean): void
}

const router = useRouter()

const $emit = defineEmits<Emits>()

const open = ref(true)
const profiles = ref<Profile[]>(store.profiles.list)

const toggleOpen = () => {
    open.value = !open.value
    $emit('isOpen', open.value)
}

const changeProfile = async (id: string) => {
    store.profiles.setCurrent(id)

    if (store.profiles.getCurrent()?.settings.autocam.length) {
        await window.api.invoke.setDefaultProfile(id)
    }

    router.push('/home')
}

</script>

<template>
    <div
        class="side-bar transition-all duration-500 relative"
        :class="open? 'open' : 'close'"
    >
        <div class="side-bar-main-container">
            <div
                class="h-10 transition-all delay-100 flex justify-end z-10"
                :class="open? '-mr-6' : 'mr-3'"
            >
                <ButtonUi
                    class="i-round small text-content-2 hover:text-white"
                    @click="toggleOpen"
                >
                    <ChevronLeftIcon v-if="open" />
                    <BurgerMenuIcon v-else />
                </ButtonUi>
            </div>

            <div class="side-bar-container">
                <div class="section">
                    <div class="title">
                        <div class="flex justify-between items-center display-toggle">
                            <div class="whitespace-nowrap">
                                My profiles
                            </div>
                            <ButtonUi
                                class="i-round small ml-4"
                                @click="() => router.push('/onboarding/profile')"
                            >
                                <PlusIcon />
                            </ButtonUi>
                        </div>
                    </div>

                    <div class="buttons">
                        <ButtonUi
                            v-for="profile in profiles"
                            :key="profile.id"
                            class="i-first i-big"
                            :active="(store.profiles.getCurrent()?.id === profile.id)"
                            @click="() => changeProfile(profile.id)"
                        >
                            <component :is="getIcon(profile.icon)" />
                            <div class="display-toggle whitespace-nowrap">
                                {{ profile.id }}
                            </div>
                        </ButtonUi>
                    </div>
                </div>

                <div
                    v-if="false"
                    class="section"
                >
                    <div class="title">
                        <div class="display-toggle whitespace-nowrap">
                            Gabin
                        </div>
                    </div>

                    <div class="buttons">
                        <ButtonUi class="i-first i-big">
                            <QuestionMarkIcon />
                            <div class="display-toggle">
                                Help
                            </div>
                        </ButtonUi>
                    </div>
                </div>
            </div>

            <div class="flex justify-start items-center section mb-2">
                <GabinFace
                    size="xs"
                    class="ml-6"
                />
                <div class="display-toggle flex-1 ml-2 text-xs text-content-2">
                    Gabin v0.1
                    <span
                        v-if="false"
                        class="underline"
                    >About</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.side-bar {
    @apply h-screen bg-bg-2 flex flex-col overflow-hidden;
    @apply w-20;
    -webkit-app-region: drag;
}
.side-bar > .side-bar-main-container {
    @apply flex flex-col flex-1 my-5 mx-2;
}
.side-bar > .side-bar-main-container > div * {
    -webkit-app-region: no-drag;
}
.side-bar.open {
    @apply w-64;
}
.side-bar.open > .side-bar-main-container {
    @apply mx-6;
}
.side-bar > .side-bar-main-container > div:last-of-type {
    margin-top: auto;
}
.side-bar-container {
    @apply flex flex-col z-10 overflow-auto;
}
/* Hide scrollbar for Chrome, Safari and Opera */
.side-bar-container::-webkit-scrollbar {
    @apply hidden;
}

.section {
    @apply mt-10;
}
.section > .title {
    @apply w-full mb-2 h-10;
}
.section > .buttons {
    @apply flex flex-col w-full mt-4;
}
.section > .buttons > button {
    @apply w-full mt-1;
}

.display-toggle {
    @apply transition-all duration-500 whitespace-nowrap overflow-hidden;
}
.open .display-toggle {
    @apply opacity-100;
}
.close .display-toggle {
    @apply opacity-0;
}

</style>