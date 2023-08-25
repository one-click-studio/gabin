<script setup lang="ts">

interface Props {
    value: string
    position?: string
}

defineProps<Props>()

</script>

<template>
    <div class="tooltip-slot" :class="position? position:'top left'">
        <slot />

        <div class="tooltip-popover">
            <span>{{ value }}</span>
        </div>
    </div>
</template>

<style scoped>
.tooltip-slot {
    position: relative;
}
.tooltip-popover {
    @apply opacity-0 invisible;
    @apply absolute z-20 whitespace-break-spaces min-w-36;
    @apply bg-bg-3 text-content-2 text-sm font-normal py-2 px-1 rounded;
    @apply transition-opacity duration-200 ease-in-out;
}
.tooltip-slot.bottom .tooltip-popover {
    top: 100%;
}
.tooltip-slot.top .tooltip-popover {
    bottom: 100%;
}
.tooltip-slot.left .tooltip-popover {
    right: 50%;
}
.tooltip-slot.right .tooltip-popover {
    left: 50%;
}

/* .tooltip-slot .tooltip-popover, */
.tooltip-slot:hover .tooltip-popover {
    @apply opacity-100 visible;
}
</style>