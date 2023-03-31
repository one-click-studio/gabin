<script lang="ts" setup>

import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { store } from '@src/store/store'
import { socketEmitter, downloadFile } from '@src/components/utils/UtilsTools.vue'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import ModalUi from '@src/components/basics/ModalUi.vue'
import ToggleUi from '@src/components/basics/ToggleUi.vue'

import MainProfile from '@src/components/home/MainProfile.vue'
import Gabin from '@src/components/basics/GabinFace.vue'

import DownloadIcon from '@src/components/icons/DownloadIcon.vue'
import PenIcon from '@src/components/icons/PenIcon.vue'
import PlayIcon from '@src/components/icons/PlayIcon.vue'
import BinIcon from '@src/components/icons/BinIcon.vue'

const router = useRouter()

const current = store.profiles.getCurrent()

const settings = ref(store.profiles.settings())
const deleteModal = ref(false)

store.profiles.editProfile = false

const run = async () => {
    await socketEmitter(store.socket, 'togglePower', !store.power)
}

const setup = (edit: 0|1=0) => {
    if (edit === 1) {
        store.profiles.editProfile = true
        router.push('/setup/settings')
    } else {
        router.push('/setup/landing')
    }
}

const downloadConfig = () => {
    downloadFile('profile.json', JSON.stringify(current, null, 4))
}

const deleteProfile = async () => {
    await socketEmitter(store.socket, 'deleteProfile', store.profiles.current)

    store.profiles.deleteProfile(store.profiles.current)
    store.profiles.setDefaultToCurrent()

    if (!store.profiles.current) {
        router.push('/setup/profile')
    }

    deleteModal.value = false
}

const toggleAutostart = async () => {
    if (!current) return

    current.autostart = !current.autostart
    await socketEmitter(store.socket, 'setAutostart', { id: current.id, autostart: current.autostart })
}

const prepareHomeView = () => {
    settings.value = store.profiles.settings()

    const profile = store.profiles.getCurrent()
    store.layout.header.subtitle = ''
    store.layout.header.title = profile?.name || ''
    store.layout.header.iconEdit = true

    store.layout.header.dotMenu = (settings.value.autocam.length > 0)

    if (settings.value.autocam.length > 0 && store.isFirstRun && profile?.autostart) {
        run()
    }
}

watch(() => store.profiles.current, () => {
    prepareHomeView()
})

socketEmitter(store.socket, 'setup', false)
prepareHomeView()

</script>

<template>
    <div class="flex w-full h-full flex-col scroll-bar">
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
                    class="i-first mx-1 whitespace-nowrap"
                    @click="() => setup(1)"
                >
                    <PenIcon />
                    Edit
                </ButtonUi>

                <ButtonUi
                    class="i-first mx-1 primary mr-5 whitespace-nowrap"
                    @click="run"
                >
                    <PlayIcon />
                    Start Gabin
                </ButtonUi>
            </Teleport>

            <Teleport to="#header-dotmenu-slot">
                <div class="w-full flex flex-col">

                    <div class="toggle-autostart">
                        <ToggleUi
                            label="Autostart"
                            :value="current?.autostart || false"
                            @update="toggleAutostart"
                        />
                    </div>

                    <div class="w-[80%] mx-[10%] my-2 border-solid border-0 border-b-2 border-content-3" />

                    <ButtonUi
                        class="mx-1 small"
                        @click="downloadConfig"
                    >
                        Download profile
                        <DownloadIcon />
                    </ButtonUi>

                    <ButtonUi
                        class="mx-1 small"
                        @click="deleteModal = true"
                    >
                        Delete profile
                        <BinIcon />
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

<style>

.toggle-autostart {
    @apply w-full mx-4 my-2 text-sm;
}
.toggle-autostart > .toggleui-container {
    @apply flex-row-reverse justify-between;
}
.toggle-autostart > .toggleui-container > .toggleui-label {
    @apply ml-0;
}
.toggle-autostart > .toggleui-container > .toggleui-btn {
    @apply mr-8;
}

</style>