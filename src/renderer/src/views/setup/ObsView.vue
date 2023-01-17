<script lang="ts" setup>
import { ref, watch, toRaw } from 'vue'

import { store } from '@src/renderer/src/store/store'

import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'
import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import EditConnection from '@src/renderer/src/components/settings/EditConnection.vue'

import { validURL } from '@src/renderer/src/components//utils/UtilsTools.vue'
import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

import type { Connection } from '@src/types/protocol'

const connections = store.profiles.connections()
if (!connections.obs) {
    connections.obs = { ip:'127.0.0.1:4444' }
}

const obsConnection = ref<Connection>(connections.obs)
const obsConnectionOk = ref(false)
const obsConnectionLoading = ref(false)
const obsConnectionError = ref(false)

const update = (c: Connection) => {
    resetObsConnection()
    obsConnectionError.value = false
    obsConnection.value = c
}

const connectObs = () => {
    obsConnectionLoading.value = true
    window.api.invoke.connectObs(toRaw(obsConnection.value))

    setTimeout(() => {
        if (!store.connections.obs) {
            resetObsConnection()
            obsConnectionError.value = true
        }
    }, 3000)
}

const resetObsConnection = () => {
    obsConnectionLoading.value = false
    obsConnectionOk.value = false
    window.api.invoke.disconnectObs()
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = !store.connections.obs
}

onEnterPress(() => {
    if (validURL(obsConnection.value.ip) && !store.connections.obs) {
        connectObs()
    } else if (store.connections.obs && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

watch(() => store.connections.obs, () => {
    if (obsConnectionLoading.value && store.connections.obs) {
        setTimeout(() => {
            obsConnectionOk.value = true
            obsConnectionLoading.value = false
        }, 1000)
    }
    updateNextBtn()
})

store.layout.footer.next.callback = () => {
    const current = store.profiles.getCurrent()
    if (current) {
        current.connections.obs = obsConnection.value
    }
}

updateNextBtn()

</script>

<template>
    <div class="h-full w-full flex justify-center items-center">
        <div class="w-96 flex flex-col justify-start items-start">
            <Gabin
                msg="My sockets?"
                size="sm"
            />

            <h1 class="my-4">
                Obs websockets configuration
            </h1>
            <span class="text-content-2 text-sm">
                In order to communicate with your streaming software, please let Gabin know your obs websockets ip. (Password is optional)
            </span>

            <div class="mt-10 w-full flex flex-col justify-start items-start">
                <EditConnection
                    label="Obs websocket"
                    :connection="obsConnection"
                    :password="true"
                    :error="obsConnectionError"
                    @update="update"
                />
            </div>

            <ButtonUi
                class="primary txt-only my-4 w-full"
                :class="{ '!bg-green': obsConnectionOk }"
                :loading="obsConnectionLoading"
                :disabled="!validURL(obsConnection.ip) || store.connections.obs"
                @click="connectObs"
            >
                Connect to obs
            </ButtonUi>
        </div>
    </div>
</template>