<script lang="ts">
import { onBeforeUnmount } from 'vue'
import { store } from '@src/store/store'

export const onEnterPress = (callback: ()=>void) => {
    const subscription = store.keyPress$.subscribe(key => {
        if (key === 'Enter') {
            callback()
        }
    })

    onBeforeUnmount(() => {
        subscription.unsubscribe()
    })
}

export const onSpacePress = (callback: ()=>void) => {
    const subscription = store.keyPress$.subscribe(key => {
        if (key === ' ') {
            callback()
        }
    })

    onBeforeUnmount(() => {
        subscription.unsubscribe()
    })
}

export const onEscapePress = (callback: ()=>void) => {
    const subscription = store.keyPress$.subscribe(key => {
        if (key === 'Escape') {
            callback()
        }
    })

    onBeforeUnmount(() => {
        subscription.unsubscribe()
    })
}

export const onAlphaNumPress = (callback: (n: string)=>void) => {
    const subscription = store.keyPress$.subscribe(key => {
        if (key.match(/^[a-z0-9]+$/i)) {
            callback(key)
        }
    })

    onBeforeUnmount(() => {
        subscription.unsubscribe()
    })
}

export const onNumPress = (callback: (n: number)=>void) => {
    const subscription = store.keyPress$.subscribe(key => {
        const num = parseInt(key)
        if (0 <= num && num <= 9) {
            callback(num)
        }
    })

    onBeforeUnmount(() => {
        subscription.unsubscribe()
    })
}

export default {
    onEnterPress,
    onSpacePress,
    onEscapePress,
    onAlphaNumPress,
    onNumPress
}

</script>
