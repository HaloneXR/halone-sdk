import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

export interface Answer {
  ok: boolean
  code?: string
  message?: string
  [key: string]: unknown
}

/** The simulator, through its dev server (`apps/simulator/server/dev.ts`). */
export async function simulator(base: string, command: Record<string, unknown>): Promise<Answer> {
  const response = await fetch(new URL('/__halone/dev', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(command),
  }).catch((error) => {
    throw new Error(`cannot reach the simulator at ${base}; is \`pnpm dev\` running? (${error.message})`)
  })
  return response.json()
}

/** Where the desktop shell keeps its state, as each OS expects. */
function appData(): string {
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Halone')
  if (process.platform === 'win32') return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Halone')
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'halone')
}

/**
 * The desktop shell on this machine: its dev server on 127.0.0.1, at the port
 * and with the token it leaves in `dev.json` in its app data folder while it runs.
 */
export async function desktop(command: Record<string, unknown>): Promise<Answer> {
  const file = join(appData(), 'dev.json')
  let server: { port: number; token: string }
  try {
    server = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    throw new Error(`Halone is not running on this machine (no ${file})`)
  }
  const response = await fetch(`http://127.0.0.1:${server.port}/dev`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${server.token}` },
    body: JSON.stringify(command),
  }).catch((error) => {
    throw new Error(`cannot reach Halone on this machine; is it running? (${error.message})`)
  })
  return response.json()
}

const PACKAGE = 'dev.halone.app'
const INCOMING = `/sdcard/Android/data/${PACKAGE}/files/incoming`

/** The phone, over adb: the app's `DevReceiver`, which answers in the broadcast's result. */
export class Device {
  constructor(private readonly serial?: string) {}

  adb(...args: string[]): string {
    const full = this.serial ? ['-s', this.serial, ...args] : args
    try {
      return execFileSync('adb', full, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr?.trim()
      throw new Error(`adb ${args.join(' ')} failed${stderr ? `: ${stderr}` : ''}`)
    }
  }

  send(command: string, extras: Record<string, string | boolean> = {}): Answer {
    const args = ['shell', 'am', 'broadcast', '-a', 'dev.halone.DEV', '--es', 'command', command]
    for (const [key, value] of Object.entries(extras)) {
      args.push(typeof value === 'boolean' ? '--ez' : '--es', key, String(value))
    }
    const output = this.adb(...args)
    const data = output.match(/data="(.*)"\s*$/m)?.[1]
    if (!data) {
      throw new Error('Halone did not answer; is the environment running on the phone, with developer mode on in Settings?')
    }
    return JSON.parse(data.replace(/\\"/g, '"'))
  }

  push(file: string): string {
    const target = `${INCOMING}/${basename(file)}`
    this.adb('shell', 'mkdir', '-p', INCOMING)
    this.adb('push', file, target)
    return target
  }

  reverse(port: number) {
    this.adb('reverse', `tcp:${port}`, `tcp:${port}`)
  }

  unreverse(port: number) {
    try {
      this.adb('reverse', '--remove', `tcp:${port}`)
    } catch {
      // Already gone, as when the phone was unplugged.
    }
  }
}
