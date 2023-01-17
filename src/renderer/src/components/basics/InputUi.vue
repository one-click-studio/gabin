<script setup lang="ts">
import { ref } from 'vue'

interface Props {
    label: string
    value?: string
    center?: boolean
    error?: boolean
}

interface Emits {
    (e: 'update', value: string): void
}

const isFocused = ref(false)
const props = defineProps<Props>()
const $emit = defineEmits<Emits>()

const hasValue = (): boolean => {
    if (props.value || isFocused.value) {
        return true
    }
    return false
}

const onFocus = (focus: boolean) => {
    isFocused.value = focus
}

</script>

<template>
    <div
        class="inputui-container"
        :class="{
            'is-focused': isFocused,
            'is-error': props.error,
            'is-centered': props.center
        }"
    >
        <label
            class="inputui-label"
            :class="hasValue()? 'has-value':''"
        >
            {{ label }}
        </label>
        <input
            type="text"
            :value="value? value : ''"
            @input="$emit('update', ($event.target as HTMLInputElement).value)"
            @focusout="() => onFocus(false)"
            @focusin="() => onFocus(true)"
        >
    </div>
</template>

<style scoped>
.inputui-container {
    @apply flex h-14 relative bg-bg-1 border-b-mainhighlight border-solid border-y-0 border-x-0 transition-all;
}
.inputui-container.is-focused {
    @apply border-b-2;
}
.inputui-container.is-error {
    @apply border-b-content-negative border-b-2;
}
.inputui-container > .inputui-label {
    @apply absolute left-3 z-0 transition-all text-content-2;
    top: 17px;
}
.inputui-container > input {
    @apply w-full bg-transparent outline-none z-10 h-9 border-0 color-white mx-3 mt-4 p-0;
}
.inputui-container.is-centered > input {
    @apply text-center mt-0;
}
.inputui-container > .inputui-label.has-value {
    @apply text-xs;
    top: 7px;
}
.inputui-container.is-focused > .inputui-label.has-value {
    @apply text-content-1;
}

</style>