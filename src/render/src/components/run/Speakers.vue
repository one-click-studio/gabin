<script lang="ts" setup>

import UserIcon from '@src/components/icons/UserIcon.vue'
import SettingsIcon from '@src/components/icons/SettingsIcon.vue'

import type { SpeakingMic } from '../../../../types/protocol'

const props = defineProps<{
    mics: SpeakingMic[]
}>()

</script>

<template>
    <div class="flex items-center content-evenly flex-wrap justify-center">
        <template v-for="mic in props.mics">
            <div class="speaker">
                <!-- <div class="settings-icon">
                    <SettingsIcon />
                </div> -->
                <UserIcon
                    class="w-10 h-10 mb-1"
                    :class="{
                        'text-white': mic.speaking,
                        'text-gray-500': !mic.speaking,
                    }"
                />
                <span>{{ mic.name }}</span>

                <div class="volume-meter w-full h-1 rounded bg-bg-2 overflow-hidden">
                    <div
                        class="volume-meter-bar bg-white h-full transition-all duration-100"
                        :style="{ width: (mic.volume*100/2) + '%' }"
                    />
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.speaker {
    @apply flex flex-col items-center p-5 relative;
}
.speaker > .settings-icon {
    @apply absolute -top-0 -right-0 h-10 w-10 cursor-pointer;
    @apply hidden;
}
.speaker > .settings-icon > svg {
    @apply w-4 h-4 text-bg-2;
}
.speaker:hover > .settings-icon {
    @apply bg-bg-1;
    @apply block;
}

</style>