<script lang="ts" setup>
import { RouterLink } from 'vue-router'
import { store } from '@src/store/store'

import { TimelineSteps } from '@src/components/setup/TimelineSteps.vue'

interface Props {
    currentStep: number
}

// store.profiles.editProfile

defineProps<Props>()

</script>

<template>
    <div class="mt-10 ml-5">
        <div
            class="timeline-setup"
            :class="{ 'edition': store.profiles.editProfile }"
        >
            <template
                v-for="step in TimelineSteps"
                :key="'step-'+step.order"
            >
                <template
                    v-if="!store.profiles.editProfile || step.edit"
                >
                    <router-link
                        v-if="currentStep > step.order || store.profiles.editProfile"
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
    @apply relative my-4 ml-4 font-bold text-content-2 text-base;
    @apply transition-all duration-500;
    -webkit-app-region: no-drag;
}
.timeline-setup:not(.edition) > .timeline-item {
    @apply ml-10;
}
.timeline-setup > .timeline-item.current {
    @apply text-white;
}

/* VERTICAL BARS */
.timeline-setup:not(.edition)::before {
    content: '';
    left: 19px;
    @apply bg-bg-3 w-0.5;
    @apply absolute top-6 bottom-6;
}
.timeline-setup:not(.edition) > .timeline-item:not(:first-child)::before {
    content: '';
    left: -1.313rem;
    @apply bg-white w-0.5 transition-all duration-500 ;
    @apply absolute -top-10 bottom-20 z-20;
}
.timeline-setup:not(.edition) > .timeline-item.active:not(:first-child)::before {
    @apply bottom-0 z-20;
}

/* CIRCLES */
.timeline-setup:not(.edition) > .timeline-item::after {
    content: '';
    @apply absolute h-2 w-2 rounded-full z-10;
    @apply bg-bg-3 -left-6 top-1;
    @apply transition-all duration-500;
}
.timeline-setup:not(.edition) > .timeline-item.active::after {
    @apply bg-white;
}
.timeline-setup:not(.edition) > .timeline-item.current::after {
    @apply h-4 w-4 -left-7 top-0.5;
}


</style>