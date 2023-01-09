<script setup lang="ts">

interface Props {
    disabled?: boolean
    active?: boolean
    loading?: boolean
    href?: string
}

interface Emits {
    (e: 'click'): void
}

const props = defineProps<Props>()
const $emit = defineEmits<Emits>()

const onClick = () => {
    if (!props.disabled) {
        $emit('click')
    }
    if (props.href) {
        window.api.invoke.openLink(props.href)
    }
}
</script>

<template>
    <button
        class="btn"
        :class="(disabled? 'disable' : '') + (active? ' active' : '') + (loading? ' loading disable' : '')"
        @click="onClick"
    >
        <slot />
    </button>
</template>