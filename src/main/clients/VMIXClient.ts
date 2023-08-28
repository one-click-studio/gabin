import net from 'net'
import { XMLParser } from "fast-xml-parser"
import { BehaviorSubject } from 'rxjs'

import { Client } from './Client'
import db from '../../main/utils/db'

import type {
    Asset,
    Connection
} from '../../types/protocol'

type ResponseVmixInput = {
    title: string
    index: number
    id: string
    sources: string[]
}

export class VmixClient extends Client {

    scenes$: BehaviorSubject<Asset['scene'][]>
    mainScene$: BehaviorSubject<Asset['scene']['name']|undefined>

    private tally$: BehaviorSubject<string>
    private xml$: BehaviorSubject<string>

    private client: net.Socket | undefined
    private setup: boolean
    private config: Connection | undefined
    private mainScenes: Asset['scene']['name'][]

    constructor(setup: boolean=false) {
        super('osc-client')

        this.tally$ = new BehaviorSubject('')
        this.xml$ = new BehaviorSubject('')
        this.scenes$ = new BehaviorSubject<Asset['scene'][]>([])
        this.mainScene$ = new BehaviorSubject<Asset['scene']['name']|undefined>(undefined)

        this.setup = setup
        if (!setup) this.getConfigFromProfile()

        this.mainScenes = []
        if (!setup) this.getMainScenes()
    }

    private getConfigFromProfile() {
        const config = db.getSpecificAndDefault(['connections', 'vmix'], true)
        this.config = config.defaultValue
    }

    private getMainScenes() {
        const scenes = db.getSpecificAndDefault(['settings', 'containers'], true)
        this.mainScenes = scenes.defaultValue.map((scene: Asset['scene']) => scene.name)
    }

    private splitIp(ip: string) {
        const c = ip.split(':')
        return {
            host: c[0],
            port: parseInt(c[1])
        }
    }

    override connect(connection?: Connection) {
        if (connection) {
            this.config = connection
        }

        if (!this.config) return

        super.connect()

        const clientIp = this.splitIp(this.config.ip)
        this.client = net.createConnection({ port: clientIp.port, host: clientIp.host }, () => {
            if (!this.client) return
            this.reachable$.next(true)

            this.client.on('data', (buffer) => {
                const data = buffer.toString()
                // this.logger.debug('On client data :', {data})

                if (data.includes('TALLY OK')) {
                    const matches = data.match(/TALLY OK ([0-2]+)\r/)
                    if (!matches || !matches[1] || !matches[1].length) return
                    const tally = matches[1]
                    this.tally$.next(tally)
                    return
                } else if (data.includes('<vmix>') && data.includes('</vmix>')) {
                    const xml = data.match(/<vmix>[\s\S]*<\/vmix>/g)?.[0]
                    if (xml) this.xml$.next(xml)
                    return
                }
            })
            this.client.on('close', () => {
                this.logger.debug(`Client disconnected`)
                this.reachable$.next(false)
            })
            this.client.on('error', (error) => {
                this.logger.error(`Connection Error`, error.stack)
                this.reachable$.next(false)
            })                
        })

        this.tally$.subscribe((tally) => {
            if (!tally) return

            const scenesLength = this.scenes$.getValue().length
            if (this.setup || scenesLength !== tally.length) {
                this.getXML()
            } if (!this.setup && scenesLength === tally.length) {
                this.parseTally()
            }
        })

        this.xml$.subscribe((xml) => {
            if (!xml) return

            const scenes = this.parseXML(xml)
            this.scenes$.next(scenes)
            this.parseTally()
        })

        this.subscribeTally()
    }

    override clean() {
        this.reachable$.next(false)

        this.unsubscribeTally()
        this.client?.destroy()

        super.clean()
    }

    private getScenes(inputs: Map<ResponseVmixInput['id'], ResponseVmixInput>): Asset['scene'][] {
        const data: Asset['scene'][] = []

        const getSources = (keys: ResponseVmixInput['id'][]): Asset['source'][] => {
            if (!keys || !keys.length) return []

            const sources: Asset['source'][] = []

            this.logger.debug('getSources from keys', {keys})
            for (const index in keys) {
                const source = inputs.get(keys[index])
                if (!source) continue
                
                this.logger.debug('source', {source, index:parseInt(index)+1})
                sources.push({
                    name: source.title,
                    options: {
                        index: parseInt(index)+1,
                        id: source.id,
                    }
                })
            }
            
            this.logger.debug('extracted sources', {sources})
            return sources
        }

        for (const [_key, input] of inputs){
            data.push({
                name: input.title,
                options: {
                    index: input.index,
                    id: input.id,
                },
                containers: [{
                    name: 'root',
                    sources: getSources(input.sources),
                }]
            })
        }

        return data
    }
    private parseXML(xml: string): Asset['scene'][] {
        const parser = new XMLParser({ignoreAttributes : false})
        const doc = parser.parse(xml)

        if (!doc?.vmix?.inputs?.input) {
            this.logger.error('No inputs found')
            return []
        }

        const getSources = (overlay: any): string[] => {
            if (!overlay) return []

            if (!Array.isArray(overlay)) {
                overlay = [overlay]
            }

            return overlay.map((source: any) => source['@_key'])
        }

        const inputs: Map<ResponseVmixInput['id'], ResponseVmixInput> = new Map()
        doc.vmix.inputs.input.forEach((input: any) => {
            const i = {
                title: input['@_title'],
                index: parseInt(input['@_number']),
                id: input['@_key'],
                sources: getSources(input.overlay),
            }
            inputs.set(i.id, i)
        })

        return this.getScenes(inputs)
    }
    private parseTally() {
        const tally = this.tally$.getValue()
        const scenes = this.scenes$.getValue()
        if (!tally || !scenes.length) return

        const tallyArray = tally.split('').map((t) => parseInt(t))
        for (const i in tallyArray) {
            if (tallyArray[i] === 1 && this.mainScenes.indexOf(scenes[i].name) !== -1) {
                this.mainScene$.next(scenes[i].name)
                break
            }
        }
    }

    private subscribeTally() {
        this.client?.write('SUBSCRIBE TALLY\r\n')
    }
    private unsubscribeTally() {
        this.client?.write('UNSUBSCRIBE TALLY\r\n')
    }
    private getXML() {
        this.client?.write('XML\r\n')
    }

    private layerOn(container: string, index: number) {
        this.client?.write(`FUNCTION LayerOn Input=${container}&Value=${index}\r\n`)
    }
    private layerOff(container: string, index: number) {
        this.client?.write(`FUNCTION LayerOff Input=${container}&Value=${index}\r\n`)
    }

    shoot(container: Asset['container'], source: Asset['source']) {
        if (!this.isReachable || !this.client) {
            this.logger.error('Can\'t shoot, vmix not connected')
        }

        const container_ = this.scenes$.getValue().find(s => s.name === container.name)
        if (!container_) {
            this.logger.error('This container does not exist', { container: container.name } )
            return
        }

        const shots = container_.containers[0].sources
        const shot = shots.find(s => s.name === source.name)

        if (!shot) {
            this.logger.error('This shot does not exist', { source: source.name } )
            return
        }

        this.layerOn(container.name, shot.options.index)

        for (const shot_ of shots) {
            if (shot_.name === source.name) continue
            this.layerOff(container.name, shot_.options.index)
        }
    }

}