<script lang="ts">

import { store } from '@src/renderer/src/store/store'
import type { Callback } from '@src/types/protocol'

export const fetchProfiles = async (callback?: Callback, minDelay= 3000) => {
    const date = new Date()
    store.profiles.list = await window.api.invoke.getProfiles()

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
