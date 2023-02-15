import { BehaviorSubject } from 'rxjs'
import { getLogger } from '../../main/utils/logger'

import type { Subscription } from 'rxjs'
import type { Logger } from '../../main/utils/logger'

export class Server {
    reachable$ = new BehaviorSubject(false)
    logger: Logger
    private serverSubscriptions: Subscription[] = []

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
        this.cleanServerSubscriptions()
    }

    protected addSubscription(subscription: Subscription) {
        this.serverSubscriptions.push(subscription)
    }

    private cleanServerSubscriptions() {
        for (const s of this.serverSubscriptions) {
            s.unsubscribe()
        }
    }

    get isReachable() {
        return this.reachable$.getValue()
    }

}
