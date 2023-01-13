<script setup lang="ts">
import { watch } from 'vue'
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, ListboxLabel } from '@headlessui/vue'

import ChevronBottomIcon from '@src/renderer/src/components/icons/ChevronBottomIcon.vue'

interface Props {
    label: string
    options: any[]
    value?: any
    keyvalue?: string
}

interface Emits {
    (e: 'update', value: any): void
}

const props = defineProps<Props>()
const $emit = defineEmits<Emits>()

watch(() => props.options, (newO, oldO) => {
    if (newO.length !== oldO.length) {
        initOptions()
    }
})

const hasValue = (): boolean => {
    if (props.value) {
        return true
    }
    return false
}

const displayOption = (option: any) => {
    if (props.keyvalue) {
        const values: string[] = []
        for (const key of props.keyvalue.split(',')) {
            values.push(option[key])
        }
        return values.join(' - ')
    }
    return option
}

const isSelected = (option: any) => {
    const displayed = displayOption(option)
    return (displayed === props.value)
}

const update = (select: any) => {
    $emit('update', select)
}

const initOptions = () => {
    if (props.options.length === 1 && !props.value) {
        update(props.options[0])
    }
}

initOptions()

</script>

<template>
    <Listbox
        v-slot="{ open }"
        @update:model-value="update"
    >
        <div
            class="selectui-container"
            :class="open? 'z-12' :'z-0'"
        >
            <ListboxLabel
                class="selectui-label"
                :class="hasValue()? 'has-value':''"
            >
                {{ label }}
            </ListboxLabel>

            <ListboxButton class="selectui-btn">
                {{ value || '' }}
                <ChevronBottomIcon
                    class="absolute right-0 top-1/4"
                />
            </ListboxButton>
            <ListboxOptions class="selectui-opts scroll-hidden">
                <ListboxOption
                    v-for="option in options"
                    :key="option"
                    class="selectui-opt"
                    :class="isSelected(option)? 'selected' : ''"
                    :value="option"
                >
                    {{ displayOption(option) }}
                </ListboxOption>
            </ListboxOptions>
        </div>
    </Listbox>
</template>

<style scoped>
.selectui-container {
    @apply flex h-14 relative bg-bg-1 transition-all;
}
.selectui-label {
    @apply absolute left-3 transition-all text-content-2;
    top: 17px;
}
.selectui-label.has-value {
    @apply text-xs;
    top: 7px;
}
.selectui-btn {
    @apply w-full bg-transparent outline-none h-9 mx-3 mt-4 p-0 text-left relative border-0 cursor-pointer color-white;
}
.selectui-btn > svg {
    @apply color-white;
}
.selectui-opts {
    @apply bg-bg-2 z-12;
    @apply absolute top-full left-0 max-h-60 w-full overflow-auto py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5;
}
.selectui-opt {
    @apply bg-bg-2 w-full p-3 hover:bg-bg-1 cursor-pointer text-content-2 relative z-12;
}
.selectui-opt.selected {
    @apply font-bold;
}

</style>