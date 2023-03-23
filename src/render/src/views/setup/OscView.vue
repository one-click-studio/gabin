<script lang="ts" setup>
import { ref, watch, toRaw } from 'vue'

import { store } from '@src/store/store'

import Gabin from '@src/components/basics/GabinFace.vue'
import ButtonUi from '@src/components/basics/ButtonUi.vue'
import EditConnection from '@src/components/settings/EditConnection.vue'

import { validURL, socketEmitter } from '@src/components/utils/UtilsTools.vue'
import { onEnterPress } from '@src/components/utils/KeyPress.vue'

import type {
    Connection,
    ConnectionsConfig
} from '../../../../types/protocol'

const connections = store.profiles.connections()
if (!connections.osc) connections.osc = {
    server: { ip:'127.0.0.1:32123' },
    client: { ip:'127.0.0.1:12321' }
}

const oscConnection = ref<ConnectionsConfig['osc']>(connections.osc)
const oscConnectionOk = ref(store.connections.osc ? true : false)
const oscConnectionLoading = ref(false)
const oscConnectionError = ref(false)

const update = (c: Connection, type: 'client'|'server') => {
    if (!oscConnection.value) return
    resetOscConnection()
    oscConnectionError.value = false
    oscConnection.value[type] = c
}

const connectOsc = () => {
    if (!oscConnection.value) return

    oscConnectionLoading.value = true
    socketEmitter(store.socket, 'connectOsc', toRaw(oscConnection.value))

    setTimeout(() => {
        if (!store.connections.osc) {
            resetOscConnection()
            oscConnectionError.value = true
        }
    }, 3000)
}

const resetOscConnection = () => {
    oscConnectionLoading.value = false
    oscConnectionOk.value = false
    socketEmitter(store.socket, 'disconnectOsc')
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = false
}

onEnterPress(() => {
    if (!oscConnection.value) return

    if (validURL(oscConnection.value.client.ip) && validURL(oscConnection.value.server.ip) && !store.connections.osc) {
        connectOsc()
    } else if (store.connections.osc && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

watch(() => store.connections.osc, () => {
    if (oscConnectionLoading.value && store.connections.osc) {
        setTimeout(() => {
            oscConnectionOk.value = true
            oscConnectionLoading.value = false
            updateNextBtn()
        }, 1000)
    }
    updateNextBtn()
})

store.layout.footer.next.callback = async () => {
    const current = store.profiles.getCurrent()
    if (current) {
        current.connections.osc = oscConnection.value
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
                msg="My sockets?"
                size="sm"
            />

            <h1 class="my-4">
                Osc configuration
            </h1>
            <span class="text-content-2 text-sm">
                In order to trigger the right shots, please let Gabin know your osc ip.
            </span>

            <div
                v-if="oscConnection"
                class="mt-10 w-full flex flex-col justify-start items-start"
            >
                <span
                    v-if="oscConnectionError"
                    class="text-content-negative text-sm pb-2"
                >
                    Connection failed, please check the client ip.
                </span>
                <EditConnection
                    label="OSC server (the port Gabin will open)"
                    :connection="oscConnection.server"
                    :password="false"
                    :error="oscConnectionError"
                    @update="(v) => update(v, 'server')"
                />
                <div class="mt-4" />
                <EditConnection
                    label="OSC client (the port Gabin will reach)"
                    :connection="oscConnection.client"
                    :password="false"
                    :error="oscConnectionError"
                    @update="(v) => update(v, 'client')"
                />
            </div>

            <ButtonUi
                v-if="oscConnection"
                class="primary txt-only my-4 w-full"
                :class="{ '!bg-green': oscConnectionOk }"
                :loading="oscConnectionLoading"
                :disabled="!validURL(oscConnection.client.ip) || !validURL(oscConnection.server.ip) || store.connections.osc"
                @click="connectOsc"
            >
                Connect to osc client
            </ButtonUi>
        </div>
    </div>
</template>