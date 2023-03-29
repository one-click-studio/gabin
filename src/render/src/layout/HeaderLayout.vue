<script lang="ts" setup>

import { ref, watch } from 'vue'
import { store } from '@src/store/store'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'

import InputUi from '@src/components/basics/InputUi.vue'
import ButtonUi from '@src/components/basics/ButtonUi.vue'

import { PopUpContainer, PopUpBackground } from '@src/components/basics/PopUp/PopUp.vue'

import DotsIcon from '@src/components/icons/DotsIcon.vue'
import EditIcon from '@src/components/home/EditIcon.vue'

const props = defineProps<{
    title: string
    subtitle?: string
    iconEdit: boolean
    dotMenu: boolean
}>()

const open = ref<boolean>(false)
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

const availableProfileName = (name: string): boolean => {
    const names = store.profiles.list
        .filter(p => p.id !== store.profiles.current)
        .map(p => p.name )

    if (!name) return false

    return (names.indexOf(name) === -1)
}

const submitProfileId = async () => {
    if (eTitle.value.trim() === props.title) {
        return
    }

    if (!eTitle.value.trim() || !availableProfileName(eTitle.value.trim())) {
        eTitle.value = props.title
        return
    }

    store.profiles.updateName(eTitle.value.trim())
    await socketEmitter(store.socket, 'setProfileName', {id:store.profiles.current, name:eTitle.value.trim()})
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
            <template v-if="props.title">
                <h2
                    v-if="iconEdit"
                    class="flex justify-start items-center w-full h-10"
                >
                    <EditIcon />
                    <InputUi
                        id="header-title-input"
                        label=""
                        :value="eTitle"
                        :error="!availableProfileName(eTitle)"
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
            </template>
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
                class="top-12 right-0 w-50"
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