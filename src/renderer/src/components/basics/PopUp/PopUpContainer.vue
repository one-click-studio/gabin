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
    <div
        v-show="open"
        class="pop-up-container"
        @click="close"
    >
        <slot />
    </div>
</template>

<style scoped>
.pop-up-container {
    @apply flex justify-center items-center py-2 z-50;
    @apply bg-bg-2 border-bg-1 border rounded-lg;
    @apply absolute;
}
</style>