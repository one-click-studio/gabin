<script lang="ts" setup>

interface Props {
    open: boolean
}
interface Emits {
    (e: 'close'): void
}

defineProps<Props>()
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
        <div
            class="modal-background"
            @click="close"
        />

        <div
            class="modal-container"
        >
            <slot />
        </div>
    </Teleport>
</template>

<style scoped>
.modal-background {
    @apply h-screen w-screen bg-black-disable z-30;
    @apply absolute top-0 left-0;
}

.modal-container {
    @apply flex justify-center items-center p-8 z-50;
    @apply bg-bg-2 border-bg-1 border rounded-lg;
    @apply absolute w-1/2 mx-[25%] mt-[15%];
}
</style>