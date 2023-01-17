<script lang="ts" setup>

import { ref, watch } from 'vue'
import { store } from '@src/renderer/src/store/store'

import InputUi from '@src/renderer/src/components/basics/InputUi.vue'
import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'

import { PopUpContainer, PopUpBackground } from '@src/renderer/src/components/basics/PopUp/PopUp.vue'

import DotsIcon from '@src/renderer/src/components/icons/DotsIcon.vue'
import EditIcon from '@src/renderer/src/components/home/EditIcon.vue'

interface Props {
    title: string
    subtitle?: string
    iconEdit: boolean
    dotMenu: boolean
}

const open = ref<boolean>(false)
const props = defineProps<Props>()
const eTitle = ref(props.title)

watch(() => props.title, (v) => {
    eTitle.value = v
})

const close = () => {
    open.value = false
}

const editTitle = (v: string) => {
    eTitle.value = v
}

const submitProfileId = async () => {
    if (eTitle.value.trim() === props.title) {
        return
    }

    if (!eTitle.value.trim()) {
        eTitle.value = props.title
        return
    }


    store.profiles.updateId(props.title, eTitle.value.trim())
    await window.api.invoke.setProfileId({old:props.title, id:eTitle.value.trim()})
}

</script>

<template>
    <PopUpBackground
        v-if="dotMenu"
        :open="open"
        @close="close"
    />

    <div class="flex w-full justify-between items-center z-20 mb-4">
        <div class="flex flex-col justify-start items-start">
            <p v-if="subtitle">
                {{ subtitle }}
            </p>
            <h2
                v-if="iconEdit"
                class="flex justify-start items-center w-full h-10"
            >
                <EditIcon />
                <InputUi
                    id="header-title-input"
                    label=""
                    :value="eTitle"
                    @update="editTitle"
                    @focusout="submitProfileId"
                />
            </h2>
            <h2
                v-else
                class="flex justify-start items-center w-full h-10"
            >
                {{ title }}
            </h2>
        </div>

        <div class="flex items-center relative">
            <div
                id="header-btn-slot"
                class="flex items-center"
            />
            <ButtonUi
                v-if="dotMenu"
                class="i-round"
                @click="open = true"
            >
                <DotsIcon />
            </ButtonUi>
            <PopUpContainer
                id="header-dotmenu-slot"
                :open="open"
                class="top-12 right-0 w-40"
                @close="close"
            />
        </div>
    </div>
</template>

<style scoped>
#header-title-input {
    @apply bg-transparent pl-0 pb-4 items-center;
}
</style>
<style>
#header-title-input > input {
    @apply text-lg font-bold;
}
</style>