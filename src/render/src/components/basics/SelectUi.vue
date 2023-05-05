<script setup lang="ts">
import { watch, ref } from 'vue'

import ChevronBottomIcon from '@src/components/icons/ChevronBottomIcon.vue'

interface Emits {
    (e: 'update', value: any|string): void
}

const props = defineProps<{
    label: string
    options: any[]
    value?: any
    keyvalue?: string
    create?: boolean
    noAutoselect?: boolean
}>()
const $emit = defineEmits<Emits>()

const filter_ = ref(props.value)
const filtredOptions_ = ref<any[]>([])
const open_ = ref(false)

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

const createOption = () => {
    close(filter_.value)
    $emit('update', filter_.value)
}

const update = (select: any) => {
    close(displayOption(select))
    $emit('update', select)
}

const updateInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    filter_.value = target.value
    filterOptions()
}

const prefilterOptions = () => {
    return props.options.filter((option: any) => option)
}

const initOptions = () => {
    const options = prefilterOptions()
    console.log('initOptions', options)
    if (!props.noAutoselect && options.length === 1 && !props.value) {
        update(options[0])
    }
    filterOptions()
}

const filterOptions = () => {
    const options = prefilterOptions()

    if (filter_.value) {
        filtredOptions_.value = options.filter((option: any) => {
            const displayed = displayOption(option)
            return displayed.toLowerCase().includes(filter_.value.toLowerCase())
        })
    } else {
        filtredOptions_.value = options
    }
}

const handleFocusOut = ($el: any) => {
    if (!$el.relatedTarget) close(props.value)
}

const canCreate = (): boolean => {
    if (!props.create || !filter_.value) return false

    const options = prefilterOptions()

    const opts = options.map((option: any) => displayOption(option).toLowerCase())
    if (opts.indexOf(filter_.value.toLowerCase()) === -1) return true

    return false
}

const open = () => {
    open_.value = true
    filter_.value = props.value
    initOptions()    
}

const close = (val: string) => {
    open_.value = false
    filter_.value = val
}

initOptions()

</script>

<template>
    <div
        class="selectui"
        @focusout="handleFocusOut"
        tabindex="0"
    >
        <div
            class="selectui-container"
            :class="open_? 'z-12' :'z-0'"
        >
            <div
                class="selectui-label"
                :class="hasValue() || open_? 'has-value':''"
            >
                {{ label }}
            </div>

            <div
                class="selectui-btn"
                @click="open"
            >
                <input
                    type="text"
                    :value="filter_"
                    @input="updateInput"
                >
                <ChevronBottomIcon
                    class="absolute right-0 top-1/4"
                />
            </div>
            <div
                class="selectui-opts scroll-bar"
                v-if="open_"
            >
                <div
                    v-if="canCreate()"
                    class="selectui-opt create"
                    @click="() => createOption()"
                >
                    Create "{{ filter_ }}"
                </div>
                <div
                    v-if="!filtredOptions_.length"
                    class="selectui-opt empty"
                    value="Empty"
                >
                    Empty
                </div>

                <div
                    v-for="option in filtredOptions_"
                    :key="option"
                    class="selectui-opt"
                    :class="isSelected(option)? 'selected' : ''"
                    :value="option"
                    @click="() => update(option)"
                >
                    {{ displayOption(option) }}
                </div>
            </div>
        </div>
    </div>
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
.selectui-btn > div {
    @apply text-ellipsis whitespace-nowrap overflow-hidden;
    width: calc(100% - 29px);
}
.selectui-btn > svg {
    @apply color-white;
}
.selectui-opts {
    @apply bg-bg-2 z-12;
    @apply absolute top-full left-0 max-h-60 w-full overflow-auto py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5;
}
.selectui-opt {
    @apply bg-bg-2 w-full p-3 text-content-2 relative z-12;
}
.selectui-opt:not(.empty) {
    @apply hover:bg-bg-1 cursor-pointer;
}
.selectui-opt.selected {
    @apply font-bold;
}

.selectui-btn > input {
    @apply w-full bg-transparent outline-none z-10 h-full border-0 color-white p-0;
}

</style>