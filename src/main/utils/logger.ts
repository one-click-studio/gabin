import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

const COLORS = {
    Reset : '\x1b[0m',
    Bright : '\x1b[1m',
    Dim : '\x1b[2m',
    Underscore : '\x1b[4m',
    Blink : '\x1b[5m',
    Reverse : '\x1b[7m',
    Hidden : '\x1b[8m',

    FgBlack : '\x1b[30m',
    FgRed : '\x1b[31m',
    FgGreen : '\x1b[32m',
    FgYellow : '\x1b[33m',
    FgBlue : '\x1b[34m',
    FgMagenta : '\x1b[35m',
    FgCyan : '\x1b[36m',
    FgWhite : '\x1b[37m',

    BgBlack : '\x1b[40m',
    BgRed : '\x1b[41m',
    BgGreen : '\x1b[42m',
    BgYellow : '\x1b[43m',
    BgBlue : '\x1b[44m',
    BgMagenta : '\x1b[45m',
    BgCyan : '\x1b[46m',
    BgWhite : '\x1b[47m',
}

type LogType = 'info' | 'debug' | 'warn' | 'error'
type logFn = (obj: any, obj2?: any) => void
export type Logger = {
    info : logFn
    debug : logFn
    warn : logFn
    error : logFn
}

export type Log = {
    type: LogType
    time: string
    context: string
    value: string
}

dotenv.config()

// default app data folder
const APP_DATA_FOLDER = path.join(process.env.APPDATA || (process.platform === 'darwin'? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share"), 'gabin')

// @ts-ignore
const LOG_FILE = path.join((process.env.GABIN_LOGS_FOLDER || (process.pkg? APP_DATA_FOLDER : '')), './gabin.log')
// create folder if not exists
if (!fs.existsSync(path.dirname(LOG_FILE))) fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
// create file if not exists
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '')

const regulateLogSize = () => {
    const MAX_LOG_SIZE = 1000000 // 1MB
    const logSize = fs.statSync(LOG_FILE).size
    if (logSize > MAX_LOG_SIZE) {
        const data = fs.readFileSync(LOG_FILE, 'utf8')
        const lines = data.split('\n')

        const avg = logSize / lines.length
        const toDel = logSize - (MAX_LOG_SIZE/2)
        const delLines = Math.floor(toDel / avg)

        lines.splice(0, delLines)
        fs.writeFileSync(LOG_FILE, lines.join('\n'))
    }
}

regulateLogSize()

const getTypeColor = (type: LogType): string => {
    switch (type) {
        case 'info':
            return COLORS.FgGreen
        case 'debug':
            return COLORS.FgBlue
        case 'error':
            return COLORS.FgRed
        case 'warn':
            return COLORS.FgYellow
    }

    return ''
}

const toString = (obj: any) => {
    if (!obj) {
        return ''
    } else if (obj instanceof Map){
        return JSON.stringify(Array.from(obj.entries()), null, '\t')
    } else if (typeof obj === 'object' || typeof obj === 'function') {
        return JSON.stringify(obj, null, '\t')
    }

    return obj
}

export const getLogger = (name: string) => {

    const logger = (type: LogType, obj: any, obj2?: any) => {
        const d = new Date()
        const time = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2)

        const log: Log = {
            type,
            time,
            context: name,
            value: `${toString(obj)} ${toString(obj2)}`,
        }

        if (process.env.DEBUG !== 'true' && type === 'debug') return

        if (process.env.SILENT !== 'true') {
            process.stdout.write(`\n${getTypeColor(log.type)}${log.time}${COLORS.Bright} [${log.context}]${COLORS.Reset} ${log.value}`)
        }
        fs.appendFileSync(LOG_FILE, `\n${log.time} [${log.context}] : ${log.value}`)
    }

    const info = (obj: any, obj2?: any) => {
        logger('info', obj, obj2)
    }

    const debug = (obj: any, obj2?: any) => {
        logger('debug', obj, obj2)
    }

    const error = (obj: any, obj2?: any) => {
        logger('error', obj, obj2)
    }

    const warn = (obj: any, obj2?: any) => {
        logger('warn', obj, obj2)
    }

    return { info, debug, error, warn }
}