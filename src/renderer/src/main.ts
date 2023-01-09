import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

import { store } from '@src/renderer/src/store/store'

import App from '@src/renderer/src/App.vue'
import '@src/renderer/src/assets/css/index.css'
import 'uno.css'

import SplashView from '@src/renderer/src/views/SplashView.vue'

import OnboardingView from '@src/renderer/src/views/onboarding/IndexView.vue'
import OnboardingLandingView from '@src/renderer/src/views/onboarding/LandingView.vue'
import OnboardingProfileView from '@src/renderer/src/views/onboarding/ProfileView.vue'
import OnboardingTcpView from '@src/renderer/src/views/onboarding/TcpView.vue'
import OnboardingVisionMixerView from '@src/renderer/src/views/onboarding/VisionMixerView.vue'
import OnboardingObsView from '@src/renderer/src/views/onboarding/ObsView.vue'

import LoadingView from '@src/renderer/src/views/LoadingView.vue'
import HomeView from '@src/renderer/src/views/HomeView.vue'
import RunningView from '@src/renderer/src/views/RunningView.vue'
import SettingsView from '@src/renderer/src/views/SettingsView.vue'

import SetupView from '@src/renderer/src/views/setup/IndexView.vue'
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
        path: '/onboarding',
        component: OnboardingView,
        meta: { type: 1, order: 0 },
        children: [
            {
                path: 'landing',
                component: OnboardingLandingView,
                meta: { type: 1, order: 0 },
            },
            {
                path: 'profile',
                component: OnboardingProfileView,
                meta: { type: 1, order: 1 },
            },
            {
                path: 'tcp',
                component: OnboardingTcpView,
                meta: { type: 1, order: 2 },
            },
            {
                path: 'vision-mixer',
                component: OnboardingVisionMixerView,
                meta: { type: 1, order: 3 },
            },
            {
                path: 'obs',
                component: OnboardingObsView,
                meta: { type: 1, order: 4 },
            },
        ],
    },
    {
        path: '/home',
        component: HomeView,
        meta: { type: 2, order: 0, sidebar: true, header: true },
    },
    {
        path: '/running',
        component: RunningView,
        meta: { type: 2, order: 1, footer: true },
    },
    {
        path: '/settings',
        component: SettingsView,
        meta: { type: 2, order: 1, sidebar: true, header: true, footer: true },
    },
    {
        path: '/setup',
        component: SetupView,
        meta: { type: 3, order: 0, header: true, footer: true, timeline: true, sidebar: true },
        children: [
            {
                path: 'audio',
                component: SetupAudioView,
                meta: { type: 3, order: 0, header: true, footer: true, timeline: true, sidebar: true, back: '/home', next: '/setup/container' },
            },
            {
                path: 'container',
                component: SetupContainerView,
                meta: { type: 3, order: 1, header: true, footer: true, timeline: true, sidebar: true, back: '/setup/audio', next: '/setup/mapping' },
            },
            {
                path: 'mapping',
                component: SetupMappingView,
                meta: { type: 3, order: 2, header: true, footer: true, timeline: true, sidebar: true, back: '/setup/container', next: '/setup/settings' },
            },
            {
                path: 'settings',
                component: SetupSettingsView,
                meta: { type: 3, order: 3, header: true, footer: true, timeline: true, sidebar: true, back: '/setup/mapping', next: '/setup/summary' },
            },
            {
                path: 'summary',
                component: SetupSummaryView,
                meta: { type: 3, order: 4, header: true, footer: true, timeline: true, sidebar: true, back: '/setup/settings', next: '/home' },
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
