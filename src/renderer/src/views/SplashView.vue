<script lang="ts" setup>
import { useRouter } from 'vue-router'

// import { store } from '@src/renderer/src/store/store'
import Gabin from '@src/renderer/src/components/basics/GabinFace.vue'
import { fetchProfiles } from '@src/renderer/src/components//setup/FetchProfile.vue';

const router = useRouter()
const version = __APP_VERSION__

fetchProfiles(() => {
    router.push('/home')
})

</script>


<template>
    <div class="h-full w-full flex justify-center items-center">
        <div class="w-36 h-80 flex flex-col justify-start items-start">
            <Gabin size="lg" />
            <h1 class="my-4">
                Gabin
            </h1>
            <span class="text-content-2 text-sm">Version beta {{ version }}</span>
            <span class="text-content-2 text-sm">© {{ (new Date()).getFullYear() }} OneClickStudio</span>
        </div>
    </div>
</template>