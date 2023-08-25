export class expoAttempt {
    private max: number
    timeout: NodeJS.Timeout = setTimeout(()=>{ return })
    attempts: number
 
    constructor(max?: number) {
        this.attempts = 0;
        this.max = max? max : 12
    }

    getTimeout(): number {
        return Math.round(Math.exp(this.attempts/2))*1000
    }

    incrementAttempts(): void {
        this.attempts = this.attempts === this.max? this.attempts : this.attempts+1
    }

    getAttempts(): number {
        return this.attempts
    }

    resetAttempts(): void {
        this.attempts = 0;
    }

    getHumanTimeout(): string {
        let timeout = ''

        const date = new Date(this.getTimeout());

        if (date.getUTCHours()) timeout += `${date.getUTCHours()} hour(s) `
        if (date.getUTCMinutes()) timeout += `${date.getUTCMinutes()} minute(s) `
        if (date.getUTCSeconds()) timeout += `${date.getUTCSeconds()} second(s) `

        return timeout
    }

    reconnectAfterError(callback: ()=>void): void {
        this.incrementAttempts()
        this.timeout = setTimeout(() => {
            callback()
        }, this.getTimeout())
    }

    reset() {
        this.resetAttempts()
        clearTimeout(this.timeout)
    }

    humanTimeout(): string {
        return this.getHumanTimeout()
    }

    stop() {
        clearTimeout(this.timeout)
        this.attempts = -1
    }
}

export function deepCopy(a: any): any {
    let outObject: any
    let value
    let key

    // Return the value if a is not an object
    if (typeof a !== 'object' || a === null) {
        return a 
    }
    
    // Create an array or object to hold the values
    outObject = Array.isArray(a) ? [] : {}
    
    for (key in a) {
        value = a[key]

        // Recursively (deep) copy for nested objects, including arrays
        outObject[key] = deepCopy(value)
    }
    
    return outObject
}

export class holder {
    private held: string[] = []

    add(elem: string) {
        if (this.held.indexOf(elem) === -1) this.held.push(elem)
    }
    
    remove(elem: string) {
        this.held = this.held.filter(item => (item !== elem))        
    }
    
    isHeld(elem: string) {
        return (this.held.indexOf(elem) !== -1)
    }

    reset() {
        this.held = []
    }
}

export class timer {

    private id: any
    private remaining: number
    private started: Date = new Date()
    private running = false

    private callback: ()=>void

    constructor(callback: ()=>void, delay: number) {
        this.remaining = delay
        this.callback = callback

        this.start()
    }
    
    start() {
        this.running = true
        this.started = new Date()
        this.id = setTimeout(this.callback, this.remaining)
    }

    pause() {
        this.running = false
        clearTimeout(this.id)
        this.remaining -= new Date().getTime() - this.started.getTime()
    }

    getTimeLeft() {
        if (this.running) {
            this.pause()
            this.start()
        }

        return this.remaining
    }

    getStateRunning() {
            return this.running
    }

}

// export function isDev(): boolean {
//     return process.argv[0].includes('electron')
// }

// export function getPath(str: string): string {
//     let strPath = join(__dirname, str)
//     if (!isDev()) strPath = strPath.replace('app.asar', 'app.asar.unpacked')

//     return strPath
// }

export function openUrl(url: string): void {
    var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open')
    require('child_process').exec(start + ' ' + url)
}

export function formatDate(format: string): string {
    const date = new Date()
    let str = format

    str = str.replace('%X', date.getTime().toString().slice(0, -3))
    str = str.replace('%x', date.getTime().toString())

    str = str.replace('%MM', (date.getMonth()+1).toString().padStart(2, '0'))
    str = str.replace('%M', (date.getMonth()+1).toString())

    str = str.replace('%DD', date.getDate().toString().padStart(2, '0'))
    str = str.replace('%D', date.getDate().toString())

    str = str.replace('%YYYY', date.getFullYear().toString())
    str = str.replace('%YY', date.getFullYear().toString().slice(-2))

    str = str.replace('%HH', date.getHours().toString().padStart(2, '0'))
    str = str.replace('%H', date.getHours().toString())

    str = str.replace('%hh', (date.getHours() % 12).toString().padStart(2, '0'))
    str = str.replace('%h', (date.getHours() % 12).toString())

    str = str.replace('%mm', date.getMinutes().toString().padStart(2, '0'))
    str = str.replace('%m', date.getMinutes().toString())

    str = str.replace('%ss', date.getSeconds().toString().padStart(2, '0'))
    str = str.replace('%s', date.getSeconds().toString())

    return str
}


const mulberry32 = () => {
    let a = 1337 ^ 0xDEADBEEF

    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export const random: ()=>number = mulberry32()