<script lang="ts" setup>

import { store } from '@src/store/store'

</script>

<template>
    <div class="w-full summary-audio">
        <table class="table-auto">
            <thead>
                <tr>
                    <th>Audio source</th>
                    <th>Mic name</th>
                    <th>Mic channel</th>
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
                            >{{ device.name }}</td>
                            <td>{{ mic }}</td>
                            <td>Channel {{ device.micsName.indexOf(mic) + 1 }}</td>
                        </tr>
                    </template>
                </template>
            </tbody>
        </table>
    </div>
</template>
