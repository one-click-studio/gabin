<script lang="ts" setup>

import { ref } from 'vue'
import { store } from '@src/renderer/src/store/store'
import SettingsTable from '@src/renderer/src/components/setup/SettingsTable.vue'

import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

import type { AutocamSettings } from '@src/types/protocol'

const acSettings = ref<AutocamSettings[]>([])

const update = (v: AutocamSettings[]) => {
    acSettings.value = v
}

// SAVE CHOOSEN DEVICE
store.layout.footer.next.callback = () => {
    store.profiles.settings().autocam = acSettings.value
    store.layout.footer.next.callback = undefined
}

onEnterPress(() => {
    if (store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})


</script>

<template>
    <div class="flex flex-col w-full pb-10">
        <div class="flex items-center bg-bg-2 text-content-2 text-sm p-4">
            <span class="emoji">🤖</span>
            <p>Now let's setup Gabin! For each scene and each microphone choose the display rate of a camera and the minimum and maximum display time.</p>
        </div>

        <div class="mt-8 w-full h-full relative">
            <SettingsTable
                :editable="true"
                @update="update"
            />
        </div>
    </div>
</template>