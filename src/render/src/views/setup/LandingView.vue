<script lang="ts" setup>

import { ref } from 'vue'
import { useRouter } from 'vue-router'

import ButtonUi from '@src/components/basics/ButtonUi.vue'
import Gabin from '@src/components/basics/GabinFace.vue'
import UploadIcon from '@src/components/icons/UploadIcon.vue'

import { store } from '@src/store/store'

import { onEnterPress } from '@src/components/utils/KeyPress.vue'

import type { Profile } from '../../../../types/protocol'

const router = useRouter()
const fileInput = ref<HTMLElement | null>(null)

const openFile = () => {
    if (!fileInput.value) return
    fileInput.value.click()
}

const uploadFile = async (event: Event) => {
    // @ts-ignore
    const file = event.target && event.target.files? event.target.files[0] : undefined
    if (!file) return

    store.toast.info('Importing profile...')

    const data = await submitFile(file).catch((e) => store.toast.error(e, 'Must be a valid JSON file')) as Profile
    if (!data) return

    if (!store.profiles.isComplete(data as Profile)) {
        store.toast.error('Profile is not valid', 'Missing fields')
        return
    }

    let profileName = getUniqueName(data.name)
    store.profiles.newProfile(profileName)

    const current = store.profiles.getCurrent()
    if (!current) return

    current.settings = data.settings
    current.connections = data.connections
    current.icon = data.icon

    await store.profiles.save()
    store.toast.info('Profile imported !')

    router.push('/home')
}

const submitFile = async (file: File): Promise<object|string> => {
    return new Promise((resolve, reject) => {
        if (!file) return reject('No file selected')

        const reader = new FileReader()
        reader.readAsText(file)

        reader.onload = async () => {
            if (!reader.result) return reject('No result, file may be empty')

            try {
                const data = JSON.parse(reader.result as string)
                return resolve(data)
            } catch (e) {
                return reject('Invalid file')
            }
        }
    })
}

const getUniqueName = (originaleName: string): string => {
    let index = 0
    let count = 0
    let profileName: string = ''
    const names = store.profiles.list.map(p => p.name)
    while (index > -1) {
        profileName = !count? originaleName : originaleName + ` (${count+1})`
        index = names.indexOf(profileName)
        count++
    }

    return profileName
}

onEnterPress(() => {
    if (store.layout.footer.next.trigger) {
        store.layout.footer.next.trigger()
    }
})


store.layout.footer.back.callback = () => {
    if (store.profiles.newProfileId) {
        store.profiles.deleteProfile(store.profiles.newProfileId)
    }
    store.profiles.setDefaultToCurrent()
}

store.layout.footer.back.disable = false
store.layout.footer.next.disable = false

</script>

<template>
    <div class="h-full w-full flex justify-center items-center">
        <div class="w-96 flex flex-col justify-start items-start">
            <Gabin
                msg="Blip bloup"
                size="sm"
            />

            <h1 class="my-4">
                I'm Gabin, your intelligent camera switcher
            </h1>
            <span class="text-content-2 text-sm">
                I will mimic natural camera changes depending on who is speaking.
            </span>

            
            <input
                ref="fileInput"
                class="hidden"
                type="file"
                @change="uploadFile"
            >

            <ButtonUi
                class="small i-first mt-2"
                @click="openFile"
            >
                <UploadIcon class="w-4" /> Import profile
            </ButtonUi>

        </div>
    </div>
</template>
