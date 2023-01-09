<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { store } from '@src/renderer/src/store/store'

import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'
import ArrowLeftIcon from '@src/renderer/src/components/icons/ArrowLeftIcon.vue'
import ArrowRightIcon from '@src/renderer/src/components/icons/ArrowRightIcon.vue'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import EditConnection from '@src/renderer/src/components/settings/EditConnection.vue'

import { validURL } from '@src/renderer/src/components//utils/UtilsTools.vue'
import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

import type { Connection } from '@src/types/protocol'

const router = useRouter()

const connections = store.profiles.connections()
if (!connections.obs) {
    connections.obs = { ip:'127.0.0.1:4444' }
}

const obsConnection = ref<Connection>(connections.obs)

const update = (c: Connection) => {
    obsConnection.value = c
}

const goBack = () => {
    router.push('/onboarding/tcp')
}
const goNext = async () => {
    const current = store.profiles.getCurrent()
    if (current) {
        current.connections.obs = obsConnection.value
    }

    store.profiles.newProfileId = ''
    router.push('/home')
}

onEnterPress(() => {
    if (validURL(obsConnection.value.ip)) {
        goNext()
    }
})

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
                    @update="update"
                />
            </div>

            <div class="mt-5 w-full flex justify-between">
                <ButtonUi
                    class="w-1/3 "
                    @click="goBack"
                >
                    <ArrowLeftIcon />
                    Back
                </ButtonUi>
                <ButtonUi
                    class="primary flex-1 ml-5"
                    :disabled="!validURL(obsConnection.ip)"
                    @click="goNext"
                >
                    Next <ArrowRightIcon />
                </ButtonUi>
            </div>
        </div>
    </div>
</template>