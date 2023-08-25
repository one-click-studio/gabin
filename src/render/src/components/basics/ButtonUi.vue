<script setup lang="ts">

interface Emits {
    (e: 'click'): void
}

const props = defineProps<{
    disabled?: boolean
    active?: boolean
    loading?: boolean
    href?: string
}>()
const $emit = defineEmits<Emits>()

const onClick = () => {
    if (!props.disabled) {
        $emit('click')
    }
    if (props.href) {
        window.open(props.href, "_blank")
    }
}
</script>

<template>
    <button
        class="btn"
        :class="{
            'disable': (props.disabled || props.loading),
            'active': props.active,
            'loading': props.loading
        }"
        @click="onClick"
    >
        <slot />
    </button>
</template>