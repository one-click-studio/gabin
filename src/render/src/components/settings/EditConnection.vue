<script lang="ts" setup>
import InputUi from '@src/components/basics/InputUi.vue'

import { validURL } from '@src/components/utils/UtilsTools.vue'
import type { Connection } from '../../../../types/protocol'

interface Props {
    connection: Connection
    label: string
    password?: boolean
    error?: boolean
}
interface Emits {
    (e: 'update', connection: Connection): void
}

const props = defineProps<Props>()
const $emit = defineEmits<Emits>()

const getConnectionCopy = (): Connection => {
    return JSON.parse(JSON.stringify(props.connection))
}
const updateIp = (value: string) => {
    const c = getConnectionCopy()
    c.ip = value
    update(c)
}
const updatePsw = (value: string) => {
    const c = getConnectionCopy()
    c.password = value
    update(c)
}
const update = (c: Connection) => {
    $emit('update', c)
}
</script>

<template>
    <InputUi
        class="min-w-full"
        :label="label + ' IP'"
        :value="connection.ip"
        :error="!validURL(connection.ip) || error"
        @update="updateIp"
    />
    <InputUi
        v-if="password"
        class="min-w-full mt-4"
        :label="label + ' password'"
        :value="connection.password"
        @update="updatePsw"
    />
</template>