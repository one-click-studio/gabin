import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

import { store } from '@src/renderer/src/store/store'

import App from '@src/renderer/src/App.vue'
import '@src/renderer/src/assets/css/index.css'
import 'uno.css'

import SplashView from '@src/renderer/src/views/SplashView.vue'

import LoadingView from '@src/renderer/src/views/LoadingView.vue'
import HomeView from '@src/renderer/src/views/HomeView.vue'
import RunningView from '@src/renderer/src/views/RunningView.vue'

import SetupView from '@src/renderer/src/views/setup/IndexView.vue'
import SetupLandingView from '@src/renderer/src/views/setup/LandingView.vue'
import SetupProfileView from '@src/renderer/src/views/setup/ProfileView.vue'
import SetupTcpView from '@src/renderer/src/views/setup/TcpView.vue'
import SetupVisionMixerView from '@src/renderer/src/views/setup/VideoMixerView.vue'
import SetupObsView from '@src/renderer/src/views/setup/ObsView.vue'
import SetupAudioView from '@src/renderer/src/views/setup/AudioView.vue'
import SetupContainerView from '@src/renderer/src/views/setup/ContainerView.vue'
import SetupMappingView from '@src/renderer/src/views/setup/MappingView.vue'
import SetupSettingsView from '@src/renderer/src/views/setup/SettingsView.vue'
import SetupSummaryView from '@src/renderer/src/views/setup/SummaryView.vue'

const routes = [
    {
        path: '/',
        component: SplashView,
        meta: { type: 0, order: 0, splash: true },
    },
    {
        path: '/loading',
        component: LoadingView,
        meta: { type: 0, order: 1 },
    },
    {
        path: '/home',
        component: HomeView,
        meta: { type: 2, order: 0, sidebar: true, header: true },
    },
    {
        path: '/running',
        component: RunningView,
        meta: { type: 2, order: 1 },
    },
    {
        path: '/setup',
        component: SetupView,
        meta: { type: 3, order: 0, header: true, footer: true, timeline: true },
        children: [
            {
                path: 'landing',
                component: SetupLandingView,
                meta: { type: 3, order: 0, header: true, footer: true, timeline: true, back: '/home', next: '/setup/profile' },
            },
            {
                path: 'profile',
                component: SetupProfileView,
                meta: { type: 3, order: 1, header: true, footer: true, timeline: true, back: '/setup/landing', next: '/setup/tcp' },
            },
            {
                path: 'tcp',
                component: SetupTcpView,
                meta: { type: 3, order: 2, header: true, footer: true, timeline: true, back: '/setup/profile', next: '/setup/video-mixer' },
            },
            {
                path: 'video-mixer',
                component: SetupVisionMixerView,
                meta: { type: 3, order: 3, header: true, footer: true, timeline: true, back: '/setup/tcp' },
            },
            {
                path: 'obs',
                component: SetupObsView,
                meta: { type: 3, order: 4, header: true, footer: true, timeline: true, back: '/setup/video-mixer', next: '/setup/audio' },
            },
            {
                path: 'audio',
                component: SetupAudioView,
                meta: { type: 3, order: 5, header: true, footer: true, timeline: true, back: '/setup/obs', next: '/setup/container' },
            },
            {
                path: 'container',
                component: SetupContainerView,
                meta: { type: 3, order: 6, header: true, footer: true, timeline: true, back: '/setup/audio', next: '/setup/mapping' },
            },
            {
                path: 'mapping',
                component: SetupMappingView,
                meta: { type: 3, order: 7, header: true, footer: true, timeline: true, back: '/setup/container', next: '/setup/settings' },
            },
            {
                path: 'settings',
                component: SetupSettingsView,
                meta: { type: 3, order: 8, header: true, footer: true, timeline: true, back: '/setup/mapping', next: '/setup/summary' },
            },
            {
                path: 'summary',
                component: SetupSummaryView,
                meta: { type: 3, order: 9, header: true, footer: true, timeline: true, back: '/setup/settings', next: '/loading' },
            },
        ],
    },
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

router.beforeEach(async (to, from) => {
    if (!from.matched.length && (to.meta.type as number) > 0) {
        store.redirect.path = to.path
        return { path: '/loading' }
    }
    store.layout.header.iconEdit = false
    store.layout.header.dotMenu = false
    store.layout.footer.back.url = undefined
    store.layout.footer.next.url = undefined
    store.layout.footer.back.callback = undefined
    store.layout.footer.next.callback = undefined

    return true
})

router.afterEach((to, from) => {
    const toType = (to.meta.type as number)
    const fromType = (from.meta.type as number)
    const toOrder = (to.meta.order as number)
    const fromOrder = (from.meta.order as number)

    if (!from.matched.length) {
        to.meta.transition = 'fade'
    } else if (toType !== fromType) {
        switch (toType) {
            case 0:
                to.meta.transition = 'slide-bottom'
                break;
            case 1:
                to.meta.transition = 'slide-top'
                break;
            case 2:
            default:
                to.meta.transition = 'fade'
                break;
        }
    } else {
        to.meta.transition = toOrder < fromOrder ? 'slide-right' : 'slide-left'
    }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
