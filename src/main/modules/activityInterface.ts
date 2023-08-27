export interface ActivityInterface {
    // getName(): string
    start(): Promise<any>
    stop(): void
}