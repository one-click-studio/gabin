<script lang="ts" setup>
import { onEscapePress } from '@src/renderer/src/components/utils/KeyPress.vue'

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

onEscapePress(() => {
    close()
})

</script>


<template>
    <div
        v-if="open"
        class="pop-up-background"
        @click="close"
    />
</template>

<style scoped>
.pop-up-background {
    @apply h-screen w-screen z-50;
    @apply absolute top-0 left-0;
    background-color: #00000050;
}
</style>