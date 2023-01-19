<script lang="ts" setup>
import { useRouter } from 'vue-router'

import { store } from '@src/renderer/src/store/store'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'

import ArrowLeftIcon from '@src/renderer/src/components/icons/ArrowLeftIcon.vue'
import ArrowRightIcon from '@src/renderer/src/components/icons/ArrowRightIcon.vue'
import CrossIcon from '@src/renderer/src/components/icons/CrossIcon.vue'

import type { NavBtn } from '@src/types/protocol'

interface Props {
    back?: NavBtn,
    next?: NavBtn,
}

const icons = {
    'ArrowLeft': ArrowLeftIcon,
    'ArrowRight': ArrowRightIcon,
    'Cross': CrossIcon,
}

const props = defineProps<Props>()
const router = useRouter()

const DEFAULT = {
    back: {
        label: 'Back',
        icon: ArrowLeftIcon,
    },
    next: {
        label: 'Next',
        icon: ArrowRightIcon,
    },
}

const goBack = async () => {
    if (props.back?.callback) {
        await props.back.callback()
    }
    if (props.back?.url) {
        router.push(props.back.url)
    }
}
const goNext = async () => {
    if (props.next?.callback) {
        await props.next.callback()
    }
    if (props.next?.url) {
        router.push(props.next.url)
    }
}

store.layout.footer.next.trigger = () => {
    goNext()
}

store.layout.footer.back.trigger = () => {
    goBack()
}

</script>

<template>
    <header class="w-full h-14 flex justify-between items-center">
        <div>
            <ButtonUi
                v-if="back?.url"
                class="i-first"
                :disabled="back?.disable"
                @click="goBack"
            >
                <component
                    :is="back?.icon && icons[back?.icon]? icons[back?.icon] : DEFAULT.back.icon"
                />

                {{ back?.label? back?.label : DEFAULT.back.label }}
            </ButtonUi>
        </div>
        <div>
            <ButtonUi
                v-if="next?.url"
                class="primary i-last"
                :disabled="next?.disable"
                @click="goNext"
            >
                {{ next?.label? next?.label : DEFAULT.next.label }}
                <component
                    :is="next?.icon && icons[next?.icon]? icons[next?.icon] : DEFAULT.next.icon"
                />
            </ButtonUi>
        </div>
    </header>
</template>