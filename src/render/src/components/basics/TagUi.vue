<script setup lang="ts">
import PlusIcon from '@src/components/icons/PlusIcon.vue'

interface Emits {
    (e: 'update', value: boolean): void
}

const props = defineProps<{
    label: string
    value?: boolean
}>()
const $emit = defineEmits<Emits>()

const update = () => {
    $emit('update', !props.value)
}
</script>

<template>
    <div
        class="tagui-container"
        :class="value? 'active' : ''"
        @click="update"
    >
        <div class="circle">
            <PlusIcon class="plus-icon" />
        </div>
        <p>{{ label }}</p>
    </div>
</template>

<style scoped>
.tagui-container {
    @apply h-8 p-2 cursor-pointer rounded;
    @apply flex justify-start items-center;
    @apply text-base overflow-hidden whitespace-nowrap;
    @apply bg-bg-1 text-content-2;
    @apply hover:bg-bg-3;
    max-width: 10rem;
    min-width: 3rem;
}
.tagui-container > .circle {
    @apply rounded-full w-4 h-4 bg-content-2 mr-2 flex;
    min-height: 1rem;
    min-width: 1rem;
}
.tagui-container.active {
    @apply bg-white text-bg-3;
}
.tagui-container.active > .circle {
    @apply bg-green;
}
.tagui-container > .circle > .plus-icon {
    @apply hidden text-bg-3 h-2 w-2 m-auto transition-all;
}
.tagui-container.active > .circle > .plus-icon {
    @apply rotate-45;
}
.tagui-container:hover > .circle > .plus-icon {
    @apply block;
}


</style>