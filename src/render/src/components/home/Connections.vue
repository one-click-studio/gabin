<script lang="ts" setup>

import { ref } from 'vue'
import { store } from '@src/store/store'

import EyeIcon from '@src/components/icons/EyeIcon.vue'

import type { 
    Connection
} from '../../../../types/protocol'

type ConnectionType = 'obs' | 'osc'

const showPassword = ref<ConnectionType>()

const getConnections = (): Map<ConnectionType, Connection> => {
    const connections = store.profiles.connections()
    const result: Map<ConnectionType, Connection> = new Map()

    let cType: keyof typeof connections
    for (cType in connections) {
        if (cType === 'type' || !connections[cType]) continue
        result.set(cType as ConnectionType, connections[cType] as Connection)
    }

    return result
}

</script>

<template>
    <div class="w-full">
        <table>
            <thead>
                <tr>
                    <th>Connection type</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th v-if="store.profiles.connections().type === 'obs'" class="w-1/4">Password</th>
                </tr>
            </thead>
            <tbody>
                <template v-for="[type, connection] in getConnections()">
                    <tr>
                        <td>{{ type }}</td>
                        <td>{{ connection.ip.split(':')[0] }}</td>
                        <td>{{ connection.ip.split(':')[1] }}</td>
                        <td
                            v-if="store.profiles.connections().type === 'obs'"
                            class="flex justify-between items-center"
                        >
                            {{ showPassword === type? connection.password : connection.password?.replace(/./g, '*') }}
                            <EyeIcon
                                v-if="connection.password"
                                class="w-4 h-4 cursor-pointer"
                                @mousedown="showPassword = type"
                                @mouseup="showPassword = undefined"
                                @mouseleave="showPassword = undefined"
                            />
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
</style>