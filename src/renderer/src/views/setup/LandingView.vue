<script lang="ts" setup>

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'
import InfoIcon from '@src/renderer/src/components/icons/InfoIcon.vue'

import { store } from '@src/renderer/src/store/store'

import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

onEnterPress(() => {
    if (store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

store.layout.footer.back.callback = () => {
    if (store.profiles.newProfileId) {
        store.profiles.deleteProfile(store.profiles.newProfileId)
    }
    store.profiles.setDefaultToCurrent()
}

store.layout.footer.back.disable = false
store.layout.footer.next.disable = false

</script>

<template>
    <div class="h-full w-full flex justify-center items-center">
        <div class="w-96 flex flex-col justify-start items-start">
            <Gabin
                msg="Blip bloup"
                size="sm"
            />

            <h1 class="my-4">
                I'm Gabin, your intelligent camera switcher
            </h1>
            <span class="text-content-2 text-sm">
                I will mimic natural camera changes depending on who is speaking.
            </span>

            <ButtonUi
                v-if="false"
                class="small w-36 mt-2"
            >
                <InfoIcon class="w-4" /> What is Gabin?
            </ButtonUi>
            <!-- <ButtonUi
                class="primary w-96 mt-10"
                @click="goNext"
            >
                Let's go! <ArrowRightIcon />
            </ButtonUi> -->
        </div>
    </div>
</template>