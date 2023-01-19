<script setup lang="ts">

interface Props {
    value: string
}

defineProps<Props>()

</script>

<template>
    <div class="tooltip-slot">
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
    @apply opacity-0;
    @apply absolute z-10 -top-8;
    @apply bg-bg-3 text-content-2 text-sm py-2 px-1 rounded;
    @apply transition-opacity duration-200 ease-in-out;
}
/* .tooltip-slot .tooltip-popover, */
.tooltip-slot:hover .tooltip-popover {
    @apply block opacity-100;
}
</style>