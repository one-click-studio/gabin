import { BehaviorSubject } from 'rxjs'
import { getLogger } from '../../main/utils/logger'

import type { Subscription } from 'rxjs'
import type { Logger } from '../../main/utils/logger'

export class Client {
    reachable$ = new BehaviorSubject(false)
    logger: Logger
    private clientSubscriptions: Subscription[] = []

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
        this.cleanClientSubscriptions()
    }

    protected addSubscription(subscription: Subscription) {
        this.clientSubscriptions.push(subscription)
    }

    private cleanClientSubscriptions() {
        for (const s of this.clientSubscriptions) {
            s.unsubscribe()
        }
    }

    get isReachable() {
        return this.reachable$.getValue()
    }
}
