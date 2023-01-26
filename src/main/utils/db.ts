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
