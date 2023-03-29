<script lang="ts" setup>

import { useRouter } from 'vue-router'
import { store } from '@src/store/store'
import { TimelineSteps } from '@src/components//setup/TimelineSteps.vue'

const router = useRouter()

const initStore = () => {
    const route = router.currentRoute.value
    const step = (route.meta.order as number)

    if (!(step >= 0)) {
        return
    }

    if (route.meta.order !== TimelineSteps.length-1) store.profiles.editProfile = store.profiles.isComplete()

    store.layout.header.title =  TimelineSteps[step].name
    store.layout.timeline.currentStep = step

    if (route.meta.back) {
        store.layout.footer.back.url = (route.meta.back as string)
        store.layout.footer.back.label = (route.meta.order === 0)? 'Cancel' : 'Back'
        store.layout.footer.back.icon = (route.meta.order === 0)? 'Cross' : 'ArrowLeft'
    }

    if (route.meta.next) {
        store.layout.footer.next.url = (route.meta.next as string)
        store.layout.footer.next.label = (route.meta.order === TimelineSteps.length-1)? 'Save profile' : 'Next'
        store.layout.footer.next.icon = (route.meta.order === TimelineSteps.length-1)? 'Check' : 'ArrowRight' 
    }

    if (store.profiles.editProfile) {
        store.layout.footer.back.url = '/home'
        store.layout.footer.back.label = 'Return'
        store.layout.footer.back.icon = 'Return'

        store.layout.footer.next.url = route.path
        store.layout.footer.next.label = 'Save'
        store.layout.footer.next.icon = 'Check'

        store.layout.footer.next.callback = async () => {
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
