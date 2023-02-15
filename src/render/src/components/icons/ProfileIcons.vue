<script lang="ts">

import type { Component } from 'vue'

import FolderIcon from '@src/components/icons/FolderIcon.vue'
import PizzaIcon from '@src/components/icons/PizzaIcon.vue'
import RocketIcon from '@src/components/icons/RocketIcon.vue'
import SmileIcon from '@src/components/icons/SmileIcon.vue'
import PaperClipIcon from '@src/components/icons/PaperClipIcon.vue'
import SandwichIcon from '@src/components/icons/SandwichIcon.vue'

import type { IconName } from '../../../../types/protocol'


export const iconsComponents = new Map<IconName, Component>([
    ['folder', FolderIcon],
    ['pizza', PizzaIcon],
    ['rocket', RocketIcon],
    ['smile', SmileIcon],
    ['paperclip', PaperClipIcon],
    ['sandwich', SandwichIcon],
])

const DEFAULT_ICON = FolderIcon

export const getIcon = (iconName: IconName | undefined): Component => {
    let icon

    if (iconName) {
        icon = iconsComponents.get(iconName)
    }

    if (!icon) {
        return DEFAULT_ICON
    }

    return icon
}

export default { 
    iconComponents: iconsComponents,
    getIcon
}
</script>
