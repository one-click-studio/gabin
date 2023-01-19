<script lang="ts" setup>
import { ref } from 'vue'

import { store } from '@src/renderer/src/store/store'

import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'
import InfoIcon from '@src/renderer/src/components/icons/InfoIcon.vue'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import EditConnection from '@src/renderer/src/components/settings/EditConnection.vue'

import { validURL } from '@src/renderer/src/components//utils/UtilsTools.vue'
import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

import type { Connection } from '@src/types/protocol'

const tcpConnection = ref<Connection>(store.profiles.connections().tcp)

const update = (c: Connection) => {
    tcpConnection.value = c
    updateNextBtn()
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = !validURL(tcpConnection.value.ip)
}

onEnterPress(() => {
    if (validURL(tcpConnection.value.ip) && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

store.layout.footer.next.callback = () => {
    const current = store.profiles.getCurrent()
    if (current) {
        current.connections.tcp = tcpConnection.value
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
                (if you don't know what we're talking about, just leave it has it is)
            </span>
            <ButtonUi
                class="small w-44 mt-2"
                :href="'https://bitfocus.io/'"
            >
                <InfoIcon class="w-4" /> What is Companion?
            </ButtonUi>

            <div class="mt-10 w-full">
                <EditConnection
                    label="TCP"
                    :connection="tcpConnection"
                    @update="update"
                />
            </div>
        </div>
    </div>
</template>