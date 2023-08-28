<script lang="ts" setup>

import Connections from '@src/components/home/Connections.vue'
import Audio from '@src/components/home/Audio.vue'
import SettingsTable from '@src/components/setup/SettingsTable.vue'

</script>

<template>
    <div class="mt-8 w-full h-full relative">
        <div class="w-full relative mt-8">
            <Connections />
        </div>

        <div class="w-full relative mt-12">
            <Audio />
        </div>

        <div class="w-full relative mt-12">
            <SettingsTable :editable="false" />
        </div>
    </div>
</template>
