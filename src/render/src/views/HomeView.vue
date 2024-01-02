<script lang="ts" setup>

import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { store } from '@src/store/store'
import { socketEmitter, downloadFile } from '@src/components/utils/UtilsTools.vue'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import ModalUi from '@src/components/basics/ModalUi.vue'
import ToggleUi from '@src/components/basics/ToggleUi.vue'
import InputUi from '@src/components/basics/InputUi.vue'

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
const recordModal = ref(false)
const recordPath = ref(current?.record || '')

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

const toggleRecord = async () => {
    if (!current) return

    if (!current.record) {
        recordModal.value = true
    } else {
        current.record = undefined
        await socketEmitter(store.socket, 'setRecord', { id: current.id, record: current.record })
    }
}

const saveRecord = async () => {
    if (!current) return

    current.record = recordPath.value.length > 0 ? recordPath.value : undefined
    await socketEmitter(store.socket, 'setRecord', { id: current.id, record: current.record })

    recordModal.value = false
}

const prepareHomeView = () => {
    settings.value = store.profiles.settings()

    const profile = store.profiles.getCurrent()
    store.layout.header.subtitle = ''
    store.layout.header.title = profile?.name || ''
    store.layout.header.iconEdit = true

    store.layout.header.dotMenu = (settings.value.autocam.length > 0)
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
            <ModalUi
                :open="recordModal"
                @close="recordModal = false"
            >
                <div class="flex flex-col w-full">
                    <div class="flex-1 w-full text-m mb-10">
                        <p>The audio will be recorded in the folder :</p>
                        <InputUi
                            class="mt-5"
                            label="Folder path"
                            :value="recordPath"
                            @update="(v) => recordPath = v"
                        />
                        <p class="text-sm mt-5">If the folder does not exist, it will be created. You can use date formatting</p>
                        <div class="time-formatting">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Format</th>
                                        <th>Output</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colspan="2" class="font-bold">
                                            Unix Timestamp
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>%X</td>
                                        <td>1360013296</td>
                                    </tr>
                                    <tr>
                                        <td>%x</td>
                                        <td>1360013296123</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" class="font-bold">Month</td>
                                    </tr>
                                    <tr>
                                        <td>%M</td>
                                        <td>1 2 ... 11 12</td>
                                    </tr>
                                    <tr>
                                        <td>%MM</td>
                                        <td>01 02 ... 11 12</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" class="font-bold">
                                            Day of Month
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>%D</td>
                                        <td>1 2 ... 30 31</td>
                                    </tr>
                                    <tr>
                                        <td>%DD</td>
                                        <td>01 02 ... 30 31</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" class="font-bold">
                                            Year
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>%YY</td>
                                        <td>70 71 ... 29 30</td>
                                    </tr>
                                    <tr>
                                        <td>%YYYY</td>
                                        <td>1970 1971 ... 2029 2030</td>
                                    </tr>
                                </tbody>
                            </table>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Format</th>
                                        <th>Output</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colspan="2" class="font-bold">
                                            Hour
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>%H</td>
                                        <td>0 1 ... 22 23</td>
                                    </tr>
                                    <tr>
                                        <td>%HH</td>
                                        <td>00 01 ... 22 23</td>
                                    </tr>
                                    <tr>
                                        <td>%h</td>
                                        <td>1 2 ... 11 12</td>
                                    </tr>
                                    <tr>
                                        <td>%hh</td>
                                        <td>01 02 ... 11 12</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" class="font-bold">
                                            Minute
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>%m</td>
                                        <td>0 1 ... 58 59</td>
                                    </tr>
                                    <tr>
                                        <td>%mm</td>
                                        <td>00 01 ... 58 59</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" class="font-bold">
                                            Second
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>%s</td>
                                        <td>0 1 ... 58 59</td>
                                    </tr>
                                    <tr>
                                        <td>%ss</td>
                                        <td>00 01 ... 58 59</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="flex justify-between w-full">
                        <ButtonUi
                            class=""
                            @click="recordModal = false"
                        >
                            Cancel
                        </ButtonUi>
                        <ButtonUi
                            class="primary"
                            @click="saveRecord"
                        >
                            Save record path
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

                    <div class="toggle-item">
                        <ToggleUi
                            label="Autostart"
                            :value="current?.autostart || false"
                            @update="toggleAutostart"
                        />
                    </div>

                    <div class="toggle-item">
                        <ToggleUi
                            label="Record audio"
                            :value="current?.record? true : false"
                            @update="toggleRecord"
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

.time-formatting {
    @apply text-sm mt-5 w-full flex justify-evenly;
}

.time-formatting > table {
    @apply w-2/5;
}

.time-formatting > table > thead > tr > th {
    @apply w-1/2;
}
.time-formatting > table > tbody > tr {
    @apply border-solid border-t-0 border-x-0 border-b border-content-3;
}
.time-formatting > table > tbody > tr > td {
    @apply py-1;
}

.toggle-item {
    @apply w-full mx-4 my-2 text-sm;
}
.toggle-item > .toggleui-container {
    @apply flex-row-reverse justify-between;
}
.toggle-item > .toggleui-container > .toggleui-label {
    @apply ml-0;
}
.toggle-item > .toggleui-container > .toggleui-btn {
    @apply mr-8;
}

</style>