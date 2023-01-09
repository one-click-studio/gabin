<script lang="ts" setup>
import { ref, toRaw } from 'vue'
import { useRouter } from 'vue-router'

import { store } from '@src/renderer/src/store/store'

import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'
import ArrowLeftIcon from '@src/renderer/src/components/icons/ArrowLeftIcon.vue'
import ArrowRightIcon from '@src/renderer/src/components/icons/ArrowRightIcon.vue'
import InfoIcon from '@src/renderer/src/components/icons/InfoIcon.vue'

import ButtonUi from '@src/renderer/src/components/basics/ButtonUi.vue'
import InputUi from '@src/renderer/src/components/basics/InputUi.vue'

import { onEnterPress } from '@src/renderer/src/components/utils/KeyPress.vue'

const router = useRouter()
let defaultId = 'My auto cam #1'
if (store.profiles.newProfileId) {
    store.profiles.deleteProfile(store.profiles.newProfileId)
    defaultId = toRaw(store.profiles.newProfileId)
}
const profileName = ref<string>(defaultId)

const update = (value: string) => {
    profileName.value = value
}

const availableProfileId = (id: string): boolean => {
    const ids = store.profiles.ids()
    if (!id) {
        return false
    }
    if (id !== store.profiles.newProfileId) {
        return (ids.indexOf(id) === -1)
    }

    return true
}

const goBack = () => {
    if (store.profiles.list.length > 0) {
        if (store.profiles.newProfileId) {
            store.profiles.deleteProfile(store.profiles.newProfileId)
            store.profiles.setDefaultToCurrent()
        }

        store.profiles.newProfileId = ''

        router.push('/home')
    } else {
        router.push('/onboarding/landing')
    }
}
const goNext = async () => {
    store.profiles.newProfileId = profileName.value
    store.profiles.newProfile(profileName.value)
    router.push('/onboarding/tcp')
}

onEnterPress(() => {
    if (availableProfileId(profileName.value)) {
        goNext()
    }
})

</script>

<template>
    <div class="h-full w-full flex justify-center items-center">
        <div class="w-96 flex flex-col justify-start items-start">
            <Gabin
                msg="Blip blip bloup"
                size="sm"
            />

            <h1 class="my-4">
                {{ store.profiles.list.length > 0? 'My new profile' : 'My first profile' }}
            </h1>
            <span class="text-content-2 text-sm">
                A profile allows you to save your settings in Gabin. 
                You will be able to save several profiles later on. 
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
                :error="!availableProfileId(profileName)"
                @update="update"
            />

            <div class="mt-5 w-full flex justify-between">
                <ButtonUi
                    class="w-1/3 "
                    @click="goBack"
                >
                    <ArrowLeftIcon />
                    Back
                </ButtonUi>
                <ButtonUi
                    class="primary flex-1 ml-5"
                    :disabled="!availableProfileId(profileName)"
                    @click="goNext"
                >
                    Next <ArrowRightIcon />
                </ButtonUi>
            </div>
        </div>
    </div>
</template>