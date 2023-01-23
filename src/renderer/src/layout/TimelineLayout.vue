<script lang="ts" setup>
import { RouterLink } from 'vue-router'

import { TimelineSteps } from '@src/renderer/src/components/setup/TimelineSteps.vue'

interface Props {
    currentStep: number
}

defineProps<Props>()

</script>

<template>
    <div class="mt-10 ml-5">
        <div class="timeline-setup">
            <template
                v-for="step in TimelineSteps"
                :key="'step-'+step.order"
            >
                <router-link
                    v-if="currentStep > step.order"
                    :to="'/setup/'+step.path"
                    class="timeline-item"
                    :class="{
                        'active': currentStep >= step.order,
                        'current': currentStep === step.order,
                    }"
                >
                    {{ step.name }}
                </router-link>
                <div
                    v-else
                    class="timeline-item"
                    :class="{
                        'active': currentStep >= step.order,
                        'current': currentStep === step.order,
                    }"
                >
                    {{ step.name }}
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>

.timeline-setup {
    @apply flex flex-col justify-start items-start;
    @apply relative w-60;
}
.timeline-setup > .timeline-item {
    @apply relative ml-10 my-4 font-bold text-content-2 text-base;
    @apply transition-all duration-500;
}
.timeline-setup > .timeline-item.current {
    @apply text-white;
}

/* VERTICAL BARS */
.timeline-setup::before {
    content: '';
    left: 19px;
    @apply bg-bg-3 w-0.5;
    @apply absolute top-8 bottom-4;
}
.timeline-setup > .timeline-item:not(:first-child)::before {
    content: '';
    left: -1.313rem;
    @apply bg-white w-0.5 transition-all duration-500 ;
    @apply absolute -top-8 bottom-20 z-20;
}
.timeline-setup > .timeline-item.active:not(:first-child)::before {
    @apply bottom-0 z-20;
}

/* CIRCLES */
.timeline-setup > .timeline-item::after {
    content: '';
    @apply absolute h-2 w-2 rounded-full z-10;
    @apply bg-bg-3 -left-6 top-2;
    @apply transition-all duration-500;
}
.timeline-setup > .timeline-item.active::after {
    @apply bg-white;
}
.timeline-setup > .timeline-item.current::after {
    @apply h-4 w-4 -left-7 top-0.5;
}


</style>