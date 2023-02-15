<script lang="ts">

import { store } from '@src/store/store'
import { socketEmitter } from '@src/components/utils/UtilsTools.vue'

import type { Callback, Profile } from '../../../../types/protocol'

export const fetchProfiles = async (callback?: Callback, minDelay= 3000) => {
    const date = new Date()
    store.profiles.list = await socketEmitter(store.socket, 'getProfiles', {}) as Profile[]

    store.profiles.setDefaultToCurrent()

    const delay = minDelay - ((new Date()).getTime() - date.getTime())
    setTimeout(() => {
        if (callback) {
            callback()
        }
    }, delay > 0? delay : 0)
}

export default {
    fetchProfiles
}

</script>
