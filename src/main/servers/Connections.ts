import db from '../../main/utils/db'
import type { SpecificAndDefault } from '../../main/utils/db'

import type {
    ConnectionsConfig,
    ConnectionType,
    Connection,
} from '../../types/protocol'

export class Connections {

    private d: SpecificAndDefault
    private all: ConnectionsConfig

    constructor() {
        this.d = db.getSpecificAndDefault(['connections'], false)
        this.all = this.d.defaultValue
    }

    getAll(): ConnectionsConfig {
        return this.all
    }

    edit(type: ConnectionType, data: Connection) {
        this.all[type] = data
        this.d.edit(this.all)
    }
}
