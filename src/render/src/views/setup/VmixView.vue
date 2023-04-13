<script lang="ts" setup>
import { ref, watch, toRaw } from 'vue'

import { store } from '@src/store/store'

import Gabin from '@src/components/basics/GabinFace.vue'
import ButtonUi from '@src/components/basics/ButtonUi.vue'
import EditConnection from '@src/components/settings/EditConnection.vue'

import { validURL, socketEmitter } from '@src/components/utils/UtilsTools.vue'
import { onEnterPress } from '@src/components/utils/KeyPress.vue'

import type { Connection } from '../../../../types/protocol'

const VMIX_PORT = 8099

const connections = store.profiles.connections()
if (!connections.vmix) {
    connections.vmix = { ip:'127.0.0.1:'+VMIX_PORT }
}

const vmixConnection = ref<Connection>(connections.vmix)
const vmixConnectionOk = ref(store.connections.vmix ? true : false)
const vmixConnectionLoading = ref(false)
const vmixConnectionError = ref(false)

store.profiles.connections().type = 'vmix'

const update = (c: Connection) => {
    resetVmixConnection()
    vmixConnectionError.value = false

    if (c.ip.split(':').length === 1) c.ip += ':'+VMIX_PORT
    vmixConnection.value = c
}

const connectVmix = () => {
    vmixConnectionLoading.value = true
    socketEmitter(store.socket, 'connectVmix', toRaw(vmixConnection.value))

    setTimeout(() => {
        if (!store.connections.vmix) {
            resetVmixConnection()
            vmixConnectionError.value = true
        }
    }, 3000)
}

const resetVmixConnection = () => {
    vmixConnectionLoading.value = false
    vmixConnectionOk.value = false
    socketEmitter(store.socket, 'disconnectVmix')
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = !vmixConnectionOk.value
}

onEnterPress(() => {
    if (validURL(vmixConnection.value.ip) && !store.connections.vmix) {
        connectVmix()
    } else if (store.connections.vmix && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

watch(() => store.connections.vmix, () => {
    if (vmixConnectionLoading.value && store.connections.vmix) {
        setTimeout(() => {
            vmixConnectionOk.value = true
            vmixConnectionLoading.value = false
            updateNextBtn()
        }, 1000)
    }
    updateNextBtn()
})

store.layout.footer.next.callback = async () => {
    const current = store.profiles.getCurrent()
    if (current) {
        current.connections.vmix = vmixConnection.value
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
                Vmix TCP configuration
            </h1>
            <span class="text-content-2 text-sm">
                In order to communicate with your streaming software, please let Gabin know your vmix host ip. (the port is fixed on 8099)
            </span>

            <div class="mt-10 w-full flex flex-col justify-start items-start">
                <span
                    v-if="vmixConnectionError"
                    class="text-content-negative text-sm pb-2"
                >
                    Connection failed, please check your host ip.
                </span>
                <EditConnection
                    label="Vmix TCP"
                    :connection="vmixConnection"
                    :password="false"
                    :error="vmixConnectionError"
                    @update="update"
                />
            </div>

            <ButtonUi
                class="primary txt-only my-4 w-full"
                :class="{ '!bg-green': vmixConnectionOk }"
                :loading="vmixConnectionLoading"
                :disabled="!validURL(vmixConnection.ip) || store.connections.vmix"
                @click="connectVmix"
            >
                Connect to vmix
            </ButtonUi>
        </div>
    </div>
</template>