<script lang="ts" setup>
import { ref, toRaw } from 'vue'
import { store } from '@src/renderer/src/store/store'

import EditConnection from '@src/renderer/src/components/settings/EditConnection.vue'

import ToggleUi from '@src/renderer/src/components/basics/ToggleUi.vue'

import { validURL, deepCopy } from '@src/renderer/src/components//utils/UtilsTools.vue'
import type { ConnectionsConfig, Connection, ConnectionType } from '@src/types/protocol'

const oldConnections = deepCopy(toRaw(store.profiles.connections()))
const connections = ref<ConnectionsConfig>(oldConnections)
const autostart = ref<boolean>(false)

const updateConnexions = (type: ConnectionType, c: Connection) => {
    connections.value[type] = c
    updateNextBtn()
}

const updateAutostart = (value: boolean) => {
    autostart.value = value
    updateNextBtn()
}

const connexionsUpdated = (): boolean => {
    let updated = true

    const old = toRaw(store.profiles.connections())
    if (JSON.stringify(old) === JSON.stringify(toRaw(connections.value))) {
        updated = false
    } else {
        const keys = Object.keys(connections.value) as ConnectionType[]
        for (const type of keys) {
            const c = connections.value[type]
            if (c && !validURL(c.ip)) {
                updated = false
                break
            }
        }
    }

    return updated
}

const autostartUpdated = (): boolean => {
    const profile = store.profiles.getCurrent()
    if (profile) {
        return profile.autostart !== autostart.value
    }
    return false
}

const updateNextBtn = () => {
    let disable = true

    if (connexionsUpdated()) {
        disable = false
    }

    if (autostartUpdated()) {
        disable = false
    }

    store.layout.footer.next.disable = disable
}

const init = () => {
    const profile = store.profiles.getCurrent()

    autostart.value = profile?.autostart || false

    store.layout.header.title = 'Profil settings'
    store.layout.header.subtitle = profile?.id || ''


    store.layout.footer.back.url = '/home'
    store.layout.footer.back.label = 'Back'
    store.layout.footer.back.icon = 'ArrowLeft'

    store.layout.footer.next.url = '/home'
    store.layout.footer.next.label = 'Save settings'
    store.layout.footer.next.icon = 'ArrowRight'

    // SAVE CHOOSEN DEVICE
    store.layout.footer.next.callback = async () => {
        const current = store.profiles.getCurrent()
        if (current) {
            current.connections = connections.value
            if (connexionsUpdated()) {
                await window.api.invoke.saveProfile(toRaw(current))
            }
            if (autostartUpdated()) {
                current.autostart = autostart.value
                await window.api.invoke.setAutostart({ id: current.id, autostart: autostart.value })
            }
        }
    }

    updateNextBtn()
}

init()

</script>


<template>
    <div class="h-full w-full flex flex-col justify-start items-start">
        <div class="w-full flex flex-col justify-start items-start p-5 pb-0">
            <div class="w-full">
                <ToggleUi
                    label="Autostart"
                    :value="autostart"
                    @update="updateAutostart"
                />
            </div>
        </div>
        <div class="h-full w-full flex justify-evenly items-start">
            <div
                v-for="(connection, type) in connections"
                :key="'connection-'+type"
                class="w-full flex flex-col p-5"
            >
                <h3 class="uppercase mb-1">
                    {{ type }}
                </h3>
                <EditConnection
                    v-if="connection"
                    label="OBS websocket"
                    :connection="connection"
                    :password="(type !== 'tcp')"
                    @update="(c: Connection) => updateConnexions(type, c)"
                />
            </div>
        </div>
    </div>
</template>