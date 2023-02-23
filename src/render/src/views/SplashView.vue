<script lang="ts" setup>
import { useRouter } from 'vue-router'

// import { store } from '@src/store/store'
import Gabin from '@src/components/basics/GabinFace.vue'
import { fetchProfiles } from '@src/components//setup/FetchProfile.vue';

const router = useRouter()

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
            <span class="text-content-2 text-sm">© {{ (new Date()).getFullYear() }} OneClickStudio</span>
        </div>
    </div>
</template>