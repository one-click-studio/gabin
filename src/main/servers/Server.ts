import { BehaviorSubject } from 'rxjs'
import { getLogger } from '@src/main/utils/logger'
import type { Logger } from '@src/main/utils/logger'

export class Server {
    reachable$ = new BehaviorSubject(false)
    logger: Logger

    constructor(public name: string) {
        this.logger = getLogger(name)

        this.reachable$.subscribe((reachable) => {
            this.logger.info(
              `${this.name} server ${reachable ? 'connected' : 'disconnected'}`,
            )
        })
    }
    
    listen() {
        this.logger.info(`${this.name} server is listening`)
    }

    clean() {
        this.logger.info(`cleaning ${this.name} server`)
    }

    get isReachable() {
        return this.reachable$.getValue()
    }

}
