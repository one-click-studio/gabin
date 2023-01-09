<script lang="ts" setup>
import { klona } from 'klona'
import { store } from '@src/renderer/src/store/store'

import MainProfile from '@src/renderer/src/components/home/MainProfile.vue'

import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

const { invoke } = window.api

store.layout.footer.next.callback = async () => {
    const current = store.profiles.getCurrent()
    if (current) {
        const currentClone = klona(current)
        await window.api.invoke.saveProfile(currentClone)
        invoke.disconnectObs()
    }
}

onEnterPress(() => {
    if (store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})


</script>

<template>
    <div class="flex flex-col w-full scroll-hidden pb-10">
        <div class="flex items-center bg-bg-2 text-content-2 text-sm p-4">
            <span class="emoji">✌️</span>
            <p>Check if everything looks good and run a test! If not feel free to go back using the breadcrumb on the left side.</p>
        </div>
        <MainProfile />
    </div>
</template>