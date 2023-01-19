import net from 'net'
import type { Subject } from 'rxjs'

import { Server } from '@src/main/servers/Server'
import type {
    Connection,
    TcpClient,
    TcpRequest,
} from '@src/types/protocol'

import db from '@src/main/utils/db'

const HEADER = '__gabin0istryingtocommunicate__'

export class TcpServer extends Server {
    private tcpConfig: Connection
    private server: net.Server | undefined
    private sockets: Map<string, net.Socket> = new Map()
    private clients: TcpClient[]

    constructor(clients: TcpClient[]) {
        super('tcp')

        this.clients = clients

        const tcpConfig = db.getSpecificAndDefault(['connections', 'tcp'], true)
        this.tcpConfig = tcpConfig.defaultValue

        this.addSubscription(
            tcpConfig.configPart$.subscribe((config: Connection) => {
                this.tcpConfig = config

                if (this.server){
                    this.clean()
                    this.listen()
                }
            })
        )
    }

    override listen() {
        super.listen()

        this.server = net.createServer((socket) => this.onConnect(socket));
        const c = this.tcpConfig.ip.split(':')
        this.server.listen(parseInt(c[1]), c[0]);

        for (const client of this.clients){
            if (client.send$){
                this.clientListener(client.send$, client.sockets)
            }
        }
    }

    private clientListener(emit$: Subject<TcpRequest>, socketsId: string[] = []) {
        emit$.subscribe((data) => {
            this.sockets.forEach((socket) => {
                if (socketsId.indexOf(this.getSocketId(socket)) !== -1){
                    this.logger.debug('send data to socket', data)
                    socket.write(HEADER+JSON.stringify(data));
                }
            })
        })
    }

    private sendRequestToClients(request: TcpRequest) {
        for (const client of this.clients){
            if (client.types.indexOf(request.type) !== -1){
                client.handler(request)
            }
        }
    }
    
    override clean() {
        this.sockets.forEach((socket) => {
            socket.destroy()
        })
        this.sockets = new Map()

        this.server?.close()
        super.clean()
    }

    private getSocketId(socket: net.Socket): string {
        return `${socket.remoteAddress}:${socket.remotePort}`
    }

    private addSocket(socket: net.Socket) {
        const socketId = this.getSocketId(socket)
        if (!this.sockets.has(socketId)){
            this.sockets.set(socketId, socket)
        }
    }

    private removeSocket(socket: net.Socket) {
        const socketId = this.getSocketId(socket)
        if (this.sockets.has(socketId)){
            this.sockets.delete(socketId)
        }
    }

    private newConnectionEvent(socket: net.Socket) {
        const newTcpConnection: TcpRequest = {
            type: 'new_tcp_client',
            data: { socketId: this.getSocketId(socket) }
        }
        this.sendRequestToClients(newTcpConnection)
    }

    private lostConnectionEvent(socket: net.Socket) {
        const lostTcpConnection: TcpRequest = {
            type: 'lost_tcp_client',
            data: { socketId: this.getSocketId(socket) }
        }
        this.sendRequestToClients(lostTcpConnection)
    }

    private onConnect (socket: net.Socket) {
        this.logger.info(`New client connected at ${this.getSocketId(socket)}`)
        this.addSocket(socket)

        this.newConnectionEvent(socket)

        socket.on('data', (data: Buffer) => {
            const request: TcpRequest = JSON.parse(data.toString())
            if (!request.type){
                this.logger.error('received request without type', request)
                return
            }
            this.logger.debug('received request', request)
            this.sendRequestToClients(request)
        });
        socket.on('close',() => {
            this.logger.info(`Client disconnected at ${this.getSocketId(socket)}`)
            this.lostConnectionEvent(socket)
            this.removeSocket(socket)
        });
        socket.on('error', (error) => {
            this.logger.info(`Connection Error at ${this.getSocketId(socket)}`, error)
        });
    }
}
