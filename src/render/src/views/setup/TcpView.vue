<script lang="ts" setup>
import { ref } from 'vue'

import { store } from '@src/store/store'

import Gabin from '@src/components/basics/GabinFace.vue'
import InfoIcon from '@src/components/icons/InfoIcon.vue'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import ToggleUi from '@src/components/basics/ToggleUi.vue'
import EditConnection from '@src/components/settings/EditConnection.vue'

import { validURL } from '@src/components/utils/UtilsTools.vue'
import { onEnterPress } from '@src/components/utils/KeyPress.vue'

import type { Connection } from '../../../../types/protocol'

const DEFAUTL_TCP = { ip:'127.0.0.1:6481' }

const useCompanion = ref(store.profiles.connections().tcp? true : false)
const tcpConnection = ref<Connection|undefined>(store.profiles.connections().tcp)

const toggleUseCompanion = () => {
    useCompanion.value = !useCompanion.value
    if (!useCompanion.value) tcpConnection.value = undefined
    else tcpConnection.value = DEFAUTL_TCP

    updateNextBtn()
}

const update = (c: Connection) => {
    tcpConnection.value = c
    updateNextBtn()
}

const updateNextBtn = () => {
    if (!useCompanion.value) {
        store.layout.footer.next.disable = false
    } else if (!tcpConnection.value || !validURL(tcpConnection.value?.ip)) {
        store.layout.footer.next.disable = true
    }
}

onEnterPress(() => {
    if ((!useCompanion.value || (tcpConnection.value && validURL(tcpConnection.value.ip))) && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

store.layout.footer.next.callback = async () => {
    const current = store.profiles.getCurrent()
    if (current) {
        current.connections.tcp = tcpConnection.value
        await store.profiles.save()
        if (store.profiles.editProfile) store.toast.success('Profile saved !')
    }
}

updateNextBtn()

</script>

<template>
    <div class="h-full w-full flex justify-center items-center">
        <div class="w-96 flex flex-col justify-start items-start">
            <Gabin
                msg="My companion?"
                size="sm"
            />

            <h1 class="my-4">
                Companion configuration
            </h1>
            <span class="text-content-2 text-sm">
                In order to communicate with companion software, please choose the tcp port Gabin will expose.
            </span>
            <ButtonUi
                class="small i-first mt-2"
                :href="'https://bitfocus.io/'"
            >
                <InfoIcon class="w-4" /> What is Companion?
            </ButtonUi>

            <ToggleUi
                class="mt-10"
                label="Use companion"
                :value="useCompanion"
                @update="toggleUseCompanion"
            />

            <div class="mt-4 w-full h-14">
                <div
                    v-if="useCompanion && tcpConnection"
                    class="w-full"
                >
                    <EditConnection
                        label="TCP"
                        :connection="tcpConnection"
                        @update="update"
                    />
                </div>
            </div>
        </div>
    </div>
</template>