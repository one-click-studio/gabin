import { reactive } from 'vue'
import { Subject } from 'rxjs'

import type { 
    IconName,
    Profile,
    ProfileSettings,
    NavBtn,
    ObsScene,
    AudioDevice,
    ConnectionsConfig,
} from '@src/types/protocol'

const DEFAULT_SETTINGS = (): ProfileSettings => {
    return {
        mics: [],
        containers: [],
        autocam: [],
    }
}

const DEFAULT_CONNECTIONS = (): ConnectionsConfig => {
    return {
        tcp: { ip:'127.0.0.1:6481' },
    }
}

export const store = reactive({
    keyPress$: new Subject<string>(),
    isFirstRun: true,
    layout: {
        sidebar: {
            open: true,
        },
        timeline: {
            currentStep: 0,
        },
        header: {
            title: 'Title',
            subtitle: 'Subtitle',
            iconEdit: false,
            dotMenu: false,
        },
        footer: {
            back: <NavBtn>{
                url: '',
                label: 'Back',
                icon: undefined,
                disable: false,
            },
            next: <NavBtn>{
                url: '',
                label: 'Next',
                icon: undefined,
                disable: false,
            },
        },
    },
    profiles: {
        list: <Profile[]>[],
        current: <Profile['id']>'',
        newProfileId: '',
        ids: () => {
            return store.profiles.list.map(p => p.id)
        },
        newProfile: (id: string) => {
            store.profiles.list.push({ 
                id,
                icon:'folder',
                settings: DEFAULT_SETTINGS(),
                connections: DEFAULT_CONNECTIONS(),
            })
            store.profiles.current = id
        },
        deleteProfile: (id: string) => {
            const ids = store.profiles.ids()
            const index = ids.indexOf(id)
            if (index > -1) {
                store.profiles.list.splice(index, 1)
            }
        },
        setDefaultToCurrent: () => {
            store.profiles.current = ''
            for (const p of store.profiles.list) {
                if (p.active) {
                    store.profiles.setCurrent(p.id)
                    break
                }
            }
            if (!store.profiles.current && store.profiles.list.length > 0) {
                store.profiles.setCurrent(store.profiles.list[0].id)
            }
        },
        setCurrent: (id: string) => {
            const ids = store.profiles.ids()
            if (ids.indexOf(id) > -1) {
                store.profiles.current = id
            }
        },
        getCurrent: (): Profile | undefined => {
            const ids = store.profiles.ids()
            const index = ids.indexOf(store.profiles.current)

            if (index > -1) {
                return store.profiles.list[index]
            }

            return undefined
        },
        updateId: (old: string, id: string) => {
            const ids = store.profiles.ids()
            const index = ids.indexOf(old)

            if (index > -1) {
                store.profiles.list[index].id = id
                store.profiles.setCurrent(id)
            }
        },
        updateIcon: (iconName: IconName) => {
            const ids = store.profiles.ids()
            const index = ids.indexOf(store.profiles.current)

            if (index > -1) {
                store.profiles.list[index].icon = iconName
            }
        },
        settings: (): ProfileSettings => {
            const current = store.profiles.getCurrent()
            return (current? current.settings : DEFAULT_SETTINGS())
        },
        connections: (): ConnectionsConfig => {
            const current = store.profiles.getCurrent()
            return (current? current.connections : DEFAULT_CONNECTIONS())
        },
    },
    assets: {
        scenes: <ObsScene[]>[],
        audios: <AudioDevice[]>[],
    },
    connections: {
        obs: false,
        companion: false,
    },
    redirect: {
        path: '',
    },
    power: false,
})