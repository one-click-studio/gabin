<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { store } from '@src/store/store'

const router = useRouter()

const interval = setInterval(() => {
    if (!store.socket?.connected) return

    const path = (store.redirect.path && store.redirect.path !== '/disconnect')? store.redirect.path : '/home'
    router.push(path)
    clearInterval(interval)
}, 1000)

</script>

<template>
    <div class="h-full w-full flex justify-center items-center">
        <div class="h-80 flex flex-col justify-start items-center">
            <h2 class="mt-16 mb-4">
                Oh no! Gabin is disconnected! 😥
            </h2>
            <span class="text-content-2 text-sm">relaunch the app and come back!</span>
        </div>
    </div>
</template>