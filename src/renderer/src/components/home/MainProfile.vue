<script lang="ts" setup>

import { store } from '@src/renderer/src/store/store'
import SettingsTable from '@src/renderer/src/components/setup/SettingsTable.vue'

</script>

<template>
    <div class="mt-8 w-full h-full relative">
        <div class="w-full summary-audio">
            <table class="table-auto">
                <thead>
                    <tr>
                        <th>
                            Audio source
                        </th>
                        <th>
                            Mic name
                        </th>
                        <th>
                            Mic channel
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(device, _i) in store.profiles.settings().mics">
                        <template
                            v-for="(mic, j) in device.micsName.filter((_m,index) => device.mics[index])"
                            :key="`device-${_i}-mic-${j}`"
                        >
                            <tr>
                                <td
                                    v-if="!j"
                                    :rowspan="device.mics.reduce((p,c) => p += c?1:0, 0)"
                                >
                                    {{ device.name }}
                                </td>
                                <td>
                                    {{ mic }}
                                </td>
                                <td>
                                    Channel {{ j + 1 }}
                                </td>
                            </tr>
                        </template>
                    </template>
                </tbody>
            </table>
        </div>

        <div class="w-full relative mt-8">
            <SettingsTable :editable="false" />
        </div>
    </div>
</template>

<style scoped>
.summary-audio > table > tbody > tr > td {
    @apply border-b border-content-3
}
</style>