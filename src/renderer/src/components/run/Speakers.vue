<script lang="ts" setup>

import UserIcon from '@src/renderer/src/components/icons/UserIcon.vue'
import type { SpeakingMic } from '@src/types/protocol'

interface Props {
    mics: SpeakingMic[]
}

const props = defineProps<Props>()

</script>

<template>
    <div class="flex items-center content-evenly">
        <template v-for="mic in props.mics">
            <div class="flex flex-col items-center p-2">
                <UserIcon
                    class="w-10 h-10 mb-1"
                    :class="{
                        'text-white': mic.speaking,
                        'text-gray-500': !mic.speaking,
                    }"
                />
                <span>{{ mic.name }}</span>
            </div>
        </template>
    </div>
</template>

<style scoped>
</style>