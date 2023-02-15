<script lang="ts" setup>
import { ref, watch } from 'vue'

import { store } from '@src/store/store'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import { PopUpContainer, PopUpBackground } from '@src/components/basics/PopUp/PopUp.vue'
import { getIcon, iconsComponents } from '@src/components/icons/ProfileIcons.vue'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'

import type { IconName, Profile } from '../../../../types/protocol'

const open = ref<boolean>(false)
const profile = ref<Profile | undefined>(store.profiles.getCurrent())

const onClick = async (iconName: IconName) => {
    store.profiles.updateIcon(iconName)

    const current = store.profiles.getCurrent()
    if (current && current.active !== undefined) {
        await socketEmitter(store.socket, 'setProfileIcon', {id:current.id, icon:current.icon})
    }

    close()
}

const close = () => {
    open.value = false
}

watch(() => store.profiles.current, () => {
    profile.value = store.profiles.getCurrent()
})

</script>

<template>
    <PopUpBackground
        :open="open"
        @close="close"
    />

    <div class="relative">
        <h2 class="flex justify-start items-center w-full h-10">
            <ButtonUi
                class="i-round mr-2"
                @click="open = true"
            >
                <component :is="getIcon(profile?.icon)" />
            </ButtonUi>
        </h2>

        <PopUpContainer
            :open="open"
            class="top-12 left-0 w-32"
        >
            <div class="icons-container">
                <div
                    v-for="[name, icon] in iconsComponents"
                    :key="name"
                    class="m-2"
                >
                    <ButtonUi
                        class="i-round"
                        @click="() => onClick(name)"
                    >
                        <component :is="icon" />
                    </ButtonUi>
                </div>
            </div>
        </PopUpContainer>
    </div>
</template>

<style scoped>
.icons-container {
    @apply flex flex-wrap justify-center w-full;
}

</style>