import { BehaviorSubject } from 'rxjs'
import type { Logger } from '@src/main/utils/logger'
import { getLogger } from '@src/main/utils/logger'

export class Client {
    reachable$ = new BehaviorSubject(false)
    logger: Logger

    constructor(public name: string) {
        this.logger = getLogger(name)

        this.reachable$.subscribe((reachable) => {
            this.logger.info(
                `${this.name} client ${reachable ? 'connected' : 'disconnected'}`,
            )
        })
    }

    connect() {
        this.logger.info(`connecting ${this.name} client`)
    }

    clean() {
        this.logger.info(`cleaning ${this.name} client`)
    }

    get isReachable() {
        return this.reachable$.getValue()
    }
}
