import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { io, Manager } from "socket.io-client"

import { store } from '@src/store/store'

import App from '@src/App.vue'
import '@src/assets/css/index.css'
import 'uno.css'

import SplashView from '@src/views/SplashView.vue'

import LoadingView from '@src/views/LoadingView.vue'
import HomeView from '@src/views/HomeView.vue'
import RunningView from '@src/views/RunningView.vue'
import DisconnectView from '@src/views/DisconnectView.vue'

import SetupView from '@src/views/setup/IndexView.vue'
import SetupLandingView from '@src/views/setup/LandingView.vue'
import SetupProfileView from '@src/views/setup/ProfileView.vue'
import SetupTcpView from '@src/views/setup/TcpView.vue'
import SetupVisionMixerView from '@src/views/setup/VideoMixerView.vue'
import SetupObsView from '@src/views/setup/ObsView.vue'
import SetupOscView from '@src/views/setup/OscView.vue'
import SetupAudioView from '@src/views/setup/AudioView.vue'
import SetupContainerView from '@src/views/setup/ContainerView.vue'
import SetupMappingObsView from '@src/views/setup/MappingObsView.vue'
import SetupMappingOscView from '@src/views/setup/MappingOscView.vue'
import SetupSettingsView from '@src/views/setup/SettingsView.vue'
import SetupSummaryView from '@src/views/setup/SummaryView.vue'

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
        path: '/disconnect',
        component: DisconnectView,
        meta: { type: 1, order: 1 },
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
                path: 'vm-choice',
                component: SplashView,
                meta: { redirect: true },
            },
            {
                path: 'obs',
                component: SetupObsView,
                meta: { type: 3, order: 4, header: true, footer: true, timeline: true, back: '/setup/video-mixer', next: '/setup/audio' },
            },
            {
                path: 'osc',
                component: SetupOscView,
                meta: { type: 3, order: 4, header: true, footer: true, timeline: true, back: '/setup/video-mixer', next: '/setup/audio' },
            },
            {
                path: 'audio',
                component: SetupAudioView,
                meta: { type: 3, order: 5, header: true, footer: true, timeline: true, back: '/setup/vm-choice', next: '/setup/mapping' },
            },
            {
                path: 'mapping',
                component: SplashView,
                meta: { redirect: true },
            },
            {
                path: 'mapping-obs',
                component: SetupMappingObsView,
                meta: { type: 3, order: 6, header: true, footer: true, timeline: true, back: '/setup/audio', next: '/setup/settings' },
            },
            {
                path: 'mapping-osc',
                component: SetupMappingOscView,
                meta: { type: 3, order: 6, header: true, footer: true, timeline: true, back: '/setup/audio', next: '/setup/settings' },
            },
            {
                path: 'settings',
                component: SetupSettingsView,
                meta: { type: 3, order: 7, header: true, footer: true, timeline: true, back: '/setup/mapping', next: '/setup/summary' },
            },
            {
                path: 'summary',
                component: SetupSummaryView,
                meta: { type: 3, order: 8, header: true, footer: true, timeline: true, back: '/setup/settings', next: '/loading' },
            },
        ],
    },
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

const redirection = (to: string) => {
    const connections = store.profiles.connections()
    const redirect = { path: to }

    switch (to) {
        case '/setup/vm-choice':
            redirect.path = connections.type === 'osc' ? '/setup/osc' : '/setup/obs'
            break
        case '/setup/mapping':
            redirect.path = connections.type === 'osc' ? '/setup/mapping-osc' : '/setup/mapping-obs'
            break
    }

    return redirect
}

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

    if (to.meta.redirect) {
        return redirection(to.path)
    }

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

const url = window.location
const baseUrl = url.pathname.split('/')[1]

let address = `${url.protocol}//${url.host}/${baseUrl}`
if (import.meta.env.DEV) {
    address = `${url.protocol}//${url.hostname}:1510/${baseUrl}`
}

const ioPath = (baseUrl? `/${baseUrl}`: '') + '/socket.io'
const manager = new Manager(address, {
    path: ioPath
})

const socket = manager.socket("/")

store.socket = socket

socket.on("connect", () => {
    if (store.redirect.path && router.currentRoute.value.path === '/disconnect') {
        router.push(store.redirect.path)
    }
})

socket.on("disconnect", (reason) => {
    if (router.currentRoute.value.path !== '/disconnect') store.redirect.path = router.currentRoute.value.path
    router.push('/disconnect')
    if (reason === "io server disconnect") {
        socket.connect()
    }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
