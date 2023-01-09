<script lang="ts" setup>

interface Props {
    list: string[]
}

defineProps<Props>()
</script>

<template>
    <div class="flex items-center w-full">
        <span class="fh-line" />
        <div class="n-line">
            <span
                v-for="source in list"
                :key="'src-'+source"
            >
                <span class="inner-path" />
                <span class="inner-circle" />
                <span class="source-name">{{ source }}</span>
            </span>
        </div>
    </div>
</template>

<style scoped>

.fh-line {
    @apply relative w-5;
}
.fh-line::before {
    content: '';
    @apply absolute h-2 w-2 rounded-full;
    @apply bg-content-2 -left-[1px] -top-[3px];
}
.fh-line::after {
    content: '';
    @apply bg-content-2 h-0.5;
    @apply absolute left-0 right-0 top-0;
}
.n-line {
    @apply flex flex-col relative;
}
.n-line > span {
    @apply relative pl-5 py-1;
}
.n-line > span > .source-name {
    @apply ml-3 py-[5.4px];
    @apply border-y border-content-3
}
.n-line > span:first-child > .source-name {
    @apply border-t-0;
}
.n-line > span:last-child > .source-name {
    @apply border-b-0;
}

.n-line > span > .inner-path::before {
    content: '';
    @apply bg-content-2 w-0.5;
    @apply absolute top-0 bottom-0 left-0;
}
.n-line > span > .inner-path::after {
    content: '';
    @apply bg-content-2 h-0.5 w-2.5;
    @apply absolute left-0 top-4;
}

.n-line > span:first-child > .inner-path::before {
    @apply top-4;
}
.n-line > span:last-child > .inner-path::before {
    @apply bottom-4;
}
.n-line > span > .inner-circle::before {
    content: '';
    @apply absolute h-2 w-2 rounded-full;
    @apply bg-content-2 left-2 top-[13px];
}

</style>
