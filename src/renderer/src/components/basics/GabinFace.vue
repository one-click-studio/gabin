<script lang="ts" setup>
import gabin from '@src/renderer/src/assets/pictures/gabin.png'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  msg?: string
  mainMsg?: string
}

const props = defineProps<Props>()

const classToAdd = (props.size || 'md') + (props.msg? ' has-msg' : '')

</script>


<template>
    <div
        class="gabin-container flex"
        :class="classToAdd"
    >
        <img
            class="max-h-full max-w-full mix-blend-screen"
            :src="gabin"
        >
        <div
            v-if="msg"
            class="message"
        >
            {{ msg }}
            <span v-if="msg">{{ mainMsg }}</span>
            <div class="triangle" />
        </div>
    </div>
</template>

<style scoped>
.gabin-container.xs {
    @apply h-5;
}
.gabin-container.sm {
    @apply h-12;
}
.gabin-container.md {
    @apply h-20;
}
.gabin-container.lg {
    @apply h-24;
}
.gabin-container.xl {
    @apply h-52;
}
.message {
    @apply bg-white h-5 rounded-3xl text-bg-3 text-sm px-2 py-1 font-bold relative;
    @apply flex flex-col items-center;
}
.message > span {
    @apply text-main;
}
.triangle {
    border-top: 8px solid #fff;
    border-right: 8px solid transparent;
    border-left: 8px solid transparent;
    width: 0;
    height: 0;
    transform: rotate(135deg);
    position: absolute;
    top: 18px;
}
.gabin-container.xl.has-msg,
.gabin-container.lg.has-msg {
    @apply flex-col-reverse items-center;
}
.gabin-container.xl.has-msg > .message,
.gabin-container.lg.has-msg > .message {
    @apply mb-8 px-3;
}
.gabin-container.xl.has-msg > .message > .triangle,
.gabin-container.lg.has-msg > .message > .triangle {
    left: 60%;
}
.gabin-container.lg.has-msg > img {
    @apply w-24 m-auto;
}

.gabin-container.xl.has-msg > .message {
    @apply h-16 text-base text-center py-2;
    @apply w-3/4;
}
.gabin-container.xl.has-msg > .message > .triangle {
    bottom: -6px;
    top: unset;
}
.gabin-container.xl.has-msg > img {
    @apply w-52 m-auto;
}

</style>