<script setup lang="ts">


interface Props {
    disabled?: boolean
    active?: boolean
    primary?: boolean
    error?: boolean
    keycode?: string
    customWidth?: boolean
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
}

const getBg = () => {
    if (props.error) {
        return 'bg-content-negative'
    } else if (props.active && props.primary) {
        return 'bg-mainhover'
    } else if (props.active) {
        return 'bg-bg-1'
    } else {
        return 'bg-bg-2'
    }
}

</script>

<template>
    <div
        class="bg-bg-3 flex p-1"
        :class="customWidth? '': 'flex-1'"
        @click="onClick"
    >
        <div
            class="w-full h-full flex justify-center items-center relative"
            :class="getBg()"
        >
            <div
                v-if="keycode && keycode.length > 0"
                class="absolute top-0 right-0 text-content-2 px-3 py-1 z-10"
                :class="(primary && active? 'bg-main' : 'bg-bg-1')"
            >
                {{ keycode }}
            </div>
            <slot />
        </div>
    </div>
</template>