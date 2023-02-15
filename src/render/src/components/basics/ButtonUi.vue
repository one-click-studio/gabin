<script setup lang="ts">

import { store } from '@src/store/store'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'

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
        socketEmitter(store.socket, 'openLink', props.href)
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