import { app } from 'electron'

import JsonDb from 'simple-json-db'

import { join } from 'path'
import deepEqual from 'deep-equal'

import { BehaviorSubject } from 'rxjs'
import { map, distinctUntilChanged, skip } from 'rxjs/operators'
import type { Observable } from 'rxjs'

import { deepCopy } from '@src/main/utils/utils'
import type { ServerConfig } from '@src/types/protocol'

const CONFIG_FILE = join(app.getPath("userData"), 'db.json')

// USAGE
/*
    import configServer from '@src/main/utils/config'

    // SUBSCRIBE TO ALL CHANGES
    console.log("\nExpected : 'all'")
    configServer.config$.subscribe(config => {
        console.log('all')
    })
    
    // SUBSCRIBE TO A SPECIFIC PART OF CONFIGS
    console.log("\nExpected : 'mics'")
    const mics$ = configServer.getSpecific(['autocam', 'mics'])
    mics$.subscribe(mics => {
        console.log('mics')
    })

    // EDIT CONFIGS (only trigger 'all' here)
    let data = configServer.getConfigCopy()
    console.log("\nExpected : nothing")
    configServer.editConfig(data)

    // EDIT CONFIGS (only trigger 'all' here)
    let data1 = configServer.getConfigCopy()
    data1.browser.showLength.reward = 35000
    console.log("\nExpected : 'all'")
    configServer.editConfig(data1)

    // EDIT CONFIGS (trigger 'all' and 'mics' here)
    let data2 = configServer.getConfigCopy()
    data2.autocam.mics.push({
        id: "hostage",
        channelId: 5
    })
    console.log("\nExpected : 'all' && 'mics'")
    configServer.editConfig(data2)


    // EDIT CONFIGS (only trigger 'all' here)
    let data3 = configServer.getConfigCopy()
    data3.browser.showLength.reward = 34000
    console.log("\nExpected : 'all'")
    configServer.editConfig(data3)

    // EDIT CONFIGS (trigger 'all' and 'mics' here)
    let data4 = configServer.getConfigCopy()
    data4.autocam.mics.pop()
    console.log("\nExpected : 'all' && 'mics'")
    configServer.editConfig(data4)
*/

const EMPTY_CONFIG = {
    connections: {
        obs: { ip:''},
        tcp: { ip:''},
    },
    profiles: []
}

export interface SpecificAndDefault {
    configPart$: Observable<any>
    defaultValue: any,
    edit: (data: any) => void
}

class ConfigServer {

    private db: JsonDb
    private _data: ServerConfig
    private _config$: BehaviorSubject<ServerConfig>
    config$: Observable<ServerConfig>

    constructor() {
        this.db = new JsonDb(CONFIG_FILE)

        this._data = this.db.JSON() as ServerConfig
        this._config$ = new BehaviorSubject(<ServerConfig>this._data)

        this.config$ = this._config$.pipe(
            distinctUntilChanged((a, b) => deepEqual(a, b))
        )
    }

    async connect () {
        this._data = this.db.JSON() as ServerConfig

        if (!this._data || !this._data.profiles ) {
            this._data = EMPTY_CONFIG
        }

        this._config$ = new BehaviorSubject(<ServerConfig>this._data)

        this.config$ = this._config$.pipe(
            distinctUntilChanged((a, b) => deepEqual(a, b))
        )

        this._config$
        .pipe(skip(1))
        .subscribe((data) => {
            this.saveConfig(data)
        });
    }

    private getDataFromPath(path: string[], object: any, profile?: boolean): any {
        let data: any = object

        if (profile && data.profiles && data.profiles.length > 0) {

            for (const p of data.profiles) {
                if (p.active) {
                    data = p
                    break
                }
            }
        }

        for (const i in path){
            data = data[path[i]]
        }
        return data
    }

    getSpecific(path: string[], profile?: boolean): Observable<any> {
        return this._config$.pipe(
            map(object => this.getDataFromPath(path, object, profile)),
            distinctUntilChanged((a, b) => deepEqual(a, b))
        )
    }

    getDefaultValue(path: string[], profile?: boolean): any {
        return this.getDataFromPath(path, this.getConfigCopy(), profile)
    }

    async editSpecific(path: string[], data: any) {
        const _config = this.getConfigCopy()
        let _d: any = _config

        let i = 0
        for (i; i < path.length - 1; i++){
            _d = _d[path[i]]
        }
        _d[path[i]] = data

        // await this.saveConfig(_config)
        this.editConfig(_config)
    }

    getSpecificAndDefault(path: string[], profile?: boolean): SpecificAndDefault {
        return { 
            configPart$: this.getSpecific(path, profile),
            defaultValue: this.getDefaultValue(path, profile),
            edit: (data) => this.editSpecific(path, data)
        }
    }

    getConfigCopy(): ServerConfig {
        return deepCopy(this._data)
    }

    editConfig(data: ServerConfig) {
        this._config$.next(data)
    }

    private async saveConfig(data: ServerConfig){
        this._data = data
        this.db.JSON(data)
        this.db.sync()
    }

}

const configServer = new ConfigServer()
export default configServer
