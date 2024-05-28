<script lang="ts" setup>

import { useRouter } from 'vue-router'
import { store } from '@src/store/store'
import { TimelineSteps } from '@src/components//setup/TimelineSteps.vue'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'

const router = useRouter()

const initStore = async () => {
    const route = router.currentRoute.value
    const step = (route.meta.order as number)

    if (!(step >= 0)) {
        return
    }

    socketEmitter(store.socket, 'setup', true)

    if (route.meta.order !== TimelineSteps.length-1) store.profiles.editProfile = store.profiles.isComplete()

    store.layout.header.title =  TimelineSteps[step].name
    store.layout.timeline.currentStep = step
    const footer = store.layout.footer

    if (route.meta.back) {
        footer.back.url = (route.meta.back as string)
        footer.back.label = (route.meta.order === 0)? 'Cancel' : 'Back'
        footer.back.icon = (route.meta.order === 0)? 'Cross' : 'ArrowLeft'
    }

    if (route.meta.next) {
        footer.next.url = (route.meta.next as string)
        footer.next.label = (route.meta.order === TimelineSteps.length-1)? 'Save profile' : 'Next'
        footer.next.icon = (route.meta.order === TimelineSteps.length-1)? 'Check' : 'ArrowRight' 
    }

    if (store.profiles.editProfile) {
        footer.back.url = '/home'
        footer.back.label = 'Return'
        footer.back.icon = 'Return'

        footer.next.url = route.path
        footer.next.label = 'Save'
        footer.next.icon = 'Check'

        footer.next.callback = async () => {
            await store.profiles.save()
            store.toast.success('Profile saved !')
        }
    }
}

initStore()
</script>

<template>
    <div class="flex w-full h-full">
        <router-view />
    </div>
</template>
