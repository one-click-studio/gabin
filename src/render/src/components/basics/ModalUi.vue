<script lang="ts" setup>

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import CrossIcon from '@src/components/icons/CrossIcon.vue'

interface Emits {
    (e: 'close'): void
}

defineProps<{
    open: boolean
}>()
const $emit = defineEmits<Emits>()

const close = () => {
    $emit('close')
}
</script>

<template>
    <Teleport
        v-if="open"
        to="#main"
    >
        <div class="h-screen w-screen z-50 absolute top-0 left-0">
            <div
                class="modal-background"
                @click="close"
            />

            <div class="modal-container scroll-bar">
                <div class="absolute top-4 right-4">
                    <ButtonUi
                        @click="close"
                    >
                        <CrossIcon />
                    </ButtonUi>
                </div>
                <slot />
            </div>
        </div>

    </Teleport>
</template>

<style scoped>
.modal-background {
    @apply h-screen w-screen z-30;
    @apply absolute top-0 left-0;
    background-color: #00000080;
}

.modal-container {
    @apply p-8 z-50;
    @apply bg-bg-2 border-bg-1 border rounded-lg;
    @apply relative w-1/2 mx-[25%] mt-[10%] max-h-[70%];
}
</style>