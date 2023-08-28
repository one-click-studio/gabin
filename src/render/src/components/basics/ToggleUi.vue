<script setup lang="ts">

interface Emits {
    (e: 'update', value: boolean): void
}

const props = defineProps<{
    label?: string
    value: boolean
}>()
const $emit = defineEmits<Emits>()

const hasValue = (): boolean => {
    if (props.value) {
        return true
    }
    return false
}

const update = () => {
    $emit('update', !props.value)
}
</script>

<template>
    <div class="toggleui-container">
        <button
            class="toggleui-btn"
            :class="hasValue() ? 'active' : ''"
            @click.stop="update"
        >
            <span
                class="toggleui-circle"
            />
        </button>
        <span
            v-if="label"
            class="toggleui-label cursor-pointer"
            @click.stop="update"
        >
            {{ label }}
        </span>
    </div>
</template>

<style scoped>
.toggleui-container {
    @apply flex justify-start items-center;
}
.toggleui-container > .toggleui-btn {
    @apply relative h-2 w-8 rounded-full bg-content-3 transition-all border-0 cursor-pointer;
}
.toggleui-container > .toggleui-btn.active {
    @apply bg-mainhover;
}

.toggleui-container > .toggleui-btn > .toggleui-circle {
    /* --tw-translate-y: -5px; */
    @apply h-4 w-4 rounded-full inline-block transition-all;
    @apply bg-content-2 -translate-x-2 -translate-y-1;
}
.toggleui-container > .toggleui-btn.active > .toggleui-circle {
    @apply bg-mainhighlight translate-x-2;
}
.toggleui-container > .toggleui-label {
    @apply ml-2;
}


</style>