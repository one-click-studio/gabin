<script lang="ts" setup>

import { ref, watch } from 'vue'
import { store } from '@src/store/store'
import type { Toast } from '../../../../types/protocol'


const message = ref<Toast|undefined>()
const timeout = ref<ReturnType<typeof setTimeout>>()

const close = () => {
    if (timeout.value) clearTimeout(timeout.value)

    message.value = undefined
    timeout.value = undefined
}

watch(() => store.toast.data, () => {
    let delay = 0
    if (message.value) {
        close()
        delay = 250
    }

    setTimeout(() => {
        if (store.toast.data && store.toast.data.title)
        message.value = store.toast.data
    
        timeout.value = setTimeout(() => {
            close()
        }, store.toast.data?.duration || 5000)
    }, delay)
})

</script>

<template>
    <Transition name="toast">
        <div
            v-if="message?.title"
            class="toast-container"
            :class="message?.type"
            @click="close"
        >
            <span>{{ message?.title }}</span>
            <p>{{ message?.description }}</p>
        </div>
    </Transition>
</template>

<style scoped>
.toast-container {
    @apply flex flex-col justify-start items-start py-2 px-2 z-100;
    @apply bg-bg-2 border-bg-1 border;
    @apply absolute top-2 right-2 w-40;
    @apply text-sm;
}
.toast-container.success {
    @apply bg-green;
}
.toast-container.error {
    @apply bg-content-negative;
}
.toast-container.info {
    @apply bg-mainhighlight;
}

.toast-container > span {
    @apply font-bold;
}

.toast-enter-active {
    transition: all 0.25s ease-out;
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}

.toast-enter-from,
.toast-leave-to {
    transform: translateX(10rem);
    opacity: 0;
}
</style>