import { Subject } from 'rxjs'

import db from '../utils/db'
import type { SpecificAndDefault } from '../utils/db'

import type {
    Profile,
    AudioDevice,
    Thresholds,
} from '../../types/protocol'

export class Profiles {

    default$: Subject<Profile['id']>
    private profiles: SpecificAndDefault

    constructor() {
        this.profiles = db.getSpecificAndDefault(['profiles'], false)

        this.profiles.configPart$.subscribe(v => {
            this.profiles.defaultValue = v
        })

        this.default$ = new Subject()
    }

    private getProfiles(): Profile[] {
        const profiles = this.profiles.defaultValue
        return profiles || []
    }

    private getIndex(id: Profile['id'], profiles: Profile[]): number {
        const ids = profiles.map(p => p.id)
        return ids.indexOf(id)
    }

    private save(profiles: Profile[]) {
        this.profiles.edit(profiles)
    }

    getAll(): Profile[] {
        return this.getProfiles()
    }

    set(profile: Profile) {
        const profiles = this.getProfiles()

        const index = this.getIndex(profile.id, profiles)

        // new profile
        if (index === -1) {
            profiles.push(profile)
        } else {
            profiles[index] = profile
        }

        this.save(profiles)
        this.setDefault(profile.id)
    }

    delete(id: Profile['id']) {
        const profiles = this.getProfiles()

        const index = this.getIndex(id, profiles)

        if (index > -1) {
            profiles.splice(index, 1)
        }

        this.save(profiles)
        if (profiles.length > 0){
            this.setDefault(profiles[0].id)
        }
    }

    setDefault(id: Profile['id']) {
        const profiles = this.getProfiles()
        if (this.getIndex(id, profiles) === -1) return

        for (const i in profiles) {
            profiles[i].active = (profiles[i].id === id)
        }
        
        this.default$.next(id)
        this.save(profiles)
    }

    setDefaultByName(name: Profile['name']) {
        const profiles = this.getProfiles()
        const profile = profiles.find(p => p.name === name)
        if (!profile) return

        for (const i in profiles) {
            profiles[i].active = (profiles[i].name === name)
        }

        this.default$.next(profile.id)
        this.save(profiles)
    }

    setName(id: Profile['id'], name: Profile['name']) {
        const profiles = this.getProfiles()

        const index = this.getIndex(id, profiles)
        if (index > -1) {
            profiles[index].name = name
        }

        this.save(profiles)
    }

    setIcon(id: Profile['id'], icon: Profile['icon']) {
        const profiles = this.getProfiles()

        const index = this.getIndex(id, profiles)
        if (index > -1) {
            profiles[index].icon = icon
        }

        this.save(profiles)
    }

    setAutostart(id: Profile['id'], autostart: Profile['autostart']) {
        const profiles = this.getProfiles()
        const index = this.getIndex(id, profiles)

        if (index > -1) {
            profiles[index].autostart = autostart
        }

        this.save(profiles)
    }

    setThresholds(id: Profile['id'], deviceName: AudioDevice['name'], thresholds: Thresholds) {
        const profiles = this.getProfiles()
        const index = this.getIndex(id, profiles)

        if (index > -1) {
            for (const i in profiles[index].settings.mics) {
                if (profiles[index].settings.mics[i].name === deviceName) {
                    profiles[index].settings.mics[i].thresholds = thresholds
                    break
                }
            }
        }

        this.save(profiles)
    }

}
