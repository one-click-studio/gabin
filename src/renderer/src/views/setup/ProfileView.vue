<script lang="ts" setup>
import { ref } from 'vue'

import { store } from '@src/renderer/src/store/store'

import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'
import InfoIcon from '@src/renderer/src/components/icons/InfoIcon.vue'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import InputUi from '@src/renderer/src/components/basics/InputUi.vue'

import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

const profile = store.profiles.getCurrent()
const defaultName = profile? profile.name : 'My auto cam #1'

const profileName = ref<string>(defaultName)

const update = (value: string) => {
    profileName.value = value
    updateNextBtn()
}

const availableProfileName = (name: string): boolean => {
    const names = store.profiles.list
        .filter(p => p.id !== store.profiles.current)
        .map(p => p.name )

    if (!name) return false

    return (names.indexOf(name) === -1)
}

const updateNextBtn = () => {
    store.layout.footer.next.disable = !availableProfileName(profileName.value)
}

onEnterPress(() => {
    if (availableProfileName(profileName.value) && store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})

store.layout.footer.next.callback = () => {
    if (profile) {
        store.profiles.updateName(profileName.value)
    } else {
        store.profiles.newProfile(profileName.value)
        store.profiles.newProfileId = store.profiles.current
    }
}
updateNextBtn()

</script>

<template>
    <div class="h-full w-full flex justify-center items-center">
        <div class="w-96 flex flex-col justify-start items-start">
            <Gabin
                msg="Blip blip bloup"
                size="sm"
            />

            <h1 class="my-4">
                {{ store.profiles.list.length > 0? (store.profiles.editProfile? 'My profile':'My new profile') : 'My first profile' }}
            </h1>
            <span class="text-content-2 text-sm">
                Let's create your first Gabin profile.
                <span v-if="false">You can also import an existing profile.</span>
            </span>
            <ButtonUi
                v-if="false"
                class="small w-36 mt-2"
            >
                <InfoIcon /> Import profile
            </ButtonUi>

            <InputUi
                class="min-w-full mt-10"
                label="Profile name"
                :value="profileName"
                :error="!availableProfileName(profileName)"
                @update="update"
            />
        </div>
    </div>
</template>