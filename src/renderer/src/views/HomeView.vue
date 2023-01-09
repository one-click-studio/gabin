<script lang="ts" setup>

import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { store } from '@src/renderer/src/store/store'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import ModalUi from '@src/renderer/src/components/basics/ModalUi.vue'

import MainProfile from '@src/renderer/src/components/home/MainProfile.vue'
import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'

import PenIcon from '@src/renderer/src/components/icons/PenIcon.vue'
import SettingsIcon from '@src/renderer/src/components/icons/SettingsIcon.vue'
import PlayIcon from '@src/renderer/src/components/icons/PlayIcon.vue'
import BinIcon from '@src/renderer/src/components/icons/BinIcon.vue'

const router = useRouter()
const settings = ref(store.profiles.settings())
const deleteModal = ref(false)

const run = () => {
    router.push('/running')
}

const setup = () => {
    router.push('/setup/audio')
}

const goSettings = () => {
    router.push('/settings')
}

const deleteProfile = async () => {
    await window.api.invoke.deleteProfile(store.profiles.current)
    store.profiles.deleteProfile(store.profiles.current)
    store.profiles.setDefaultToCurrent()

    if (!store.profiles.current) {
        router.push('/onboarding/profile')
    }

    deleteModal.value = false
}

const prepareHomeView = () => {
    settings.value = store.profiles.settings()

    const profile = store.profiles.getCurrent()
    store.layout.header.subtitle = ''
    store.layout.header.title = profile?.id || ''
    store.layout.header.iconEdit = true

    store.layout.header.dotMenu = (settings.value.autocam.length > 0)
}

watch(() => store.profiles.current, () => {
    prepareHomeView()
})

prepareHomeView()

</script>

<template>
    <div class="flex w-full h-full flex-col scroll-hidden">
        <template v-if="settings.autocam.length > 0">
            <ModalUi
                :open="deleteModal"
                @close="deleteModal = false"
            >
                <div class="flex flex-col w-full">
                    <div class="flex-1 w-full text-m mb-10">
                        <p>Are you sure about that ?</p>
                    </div>
                    <div class="flex justify-between w-full">
                        <ButtonUi
                            class=""
                            @click="deleteModal = false"
                        >
                            Cancel
                        </ButtonUi>
                        <ButtonUi
                            class="danger"
                            @click="deleteProfile"
                        >
                            Delete profile
                        </ButtonUi>
                    </div>
                </div>
            </ModalUi>

            <Teleport to="#header-btn-slot">
                <ButtonUi
                    class="i-first mx-1"
                    @click="setup"
                >
                    <PenIcon />
                    Edit
                </ButtonUi>

                <ButtonUi
                    class="i-first mx-1 primary mr-5"
                    @click="run"
                >
                    <PlayIcon />
                    Start Gabin
                </ButtonUi>
            </Teleport>

            <Teleport to="#header-dotmenu-slot">
                <div class="w-full flex flex-col">
                    <ButtonUi
                        class="i-first mx-1 small"
                        @click="goSettings"
                    >
                        <SettingsIcon />
                        Edit settings
                    </ButtonUi>

                    <ButtonUi
                        class="i-first mx-1 small"
                        @click="deleteModal = true"
                    >
                        <BinIcon />
                        Delete profile
                    </ButtonUi>
                </div>
            </Teleport>

            <MainProfile />
        </template>
        <template v-else>
            <div class="flex flex-col items-center w-60 m-auto">
                <Gabin
                    size="lg"
                    msg="It's quiet & empty here"
                    class="mb-8"
                />

                <p class="mb-8 text-center text-content-2 text-sm">
                    ⚠️ the profile will be saved after the configuration.
                </p>

                <ButtonUi
                    class="m-auto w-full primary txt-only"
                    @click="setup"
                >
                    Start the configuration
                </ButtonUi>
            </div>
        </template>
    </div>
</template>