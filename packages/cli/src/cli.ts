import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { findManifest, pack, readManifest } from './project'
import { Device, simulator, type Answer } from './targets'

const HELP = `halone: build and run Halone apps

  halone dev [--device] [--port 5180]      serve the app with hot reload and run it
  halone pack [--out dir]                  build with Vite and write <id>-<version>.halone
  halone install <file.halone> [--launch]  install a package on the phone
  halone uninstall <id> [--device]         remove an app
  halone list [--device]                   the Halone apps installed

  --device          the phone over adb (needs developer mode); otherwise the simulator
  --serial <s>      which phone, when adb sees several
  --simulator <url> the simulator, http://127.0.0.1:5173 by default
`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    device: { type: 'boolean', default: false },
    serial: { type: 'string' },
    simulator: { type: 'string', default: 'http://127.0.0.1:5173' },
    port: { type: 'string', default: '5180' },
    out: { type: 'string' },
    launch: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

function check(answer: Answer): Answer {
  if (!answer.ok) throw new Error(`${answer.message ?? 'failed'}${answer.code ? ` (${answer.code})` : ''}`)
  return answer
}

/** Vite as the project has it, so the app builds with its own config and plugins. */
async function projectVite(dir: string): Promise<typeof import('vite')> {
  const require = createRequire(join(dir, 'package.json'))
  return import(pathToFileURL(require.resolve('vite')).href)
}

async function dev(dir: string) {
  const manifest = readManifest(findManifest(dir))
  const port = Number(values.port)
  const vite = await projectVite(dir)
  const server = await vite.createServer({ root: dir, server: { host: '127.0.0.1', port, strictPort: true } })
  await server.listen()
  const device = values.device ? new Device(values.serial) : null
  const target = device ? 'the phone' : 'the simulator'
  const url = `http://${device ? 'localhost' : '127.0.0.1'}:${port}/${manifest.entry}`
  const run = async () => {
    if (device) {
      device.reverse(port)
      return check(device.send('dev', { url }))
    }
    return check(await simulator(values.simulator!, { command: 'dev', url }))
  }
  await run()
  console.log(`${manifest.name} is running on ${target} from ${url}; edits reload it. Ctrl+C stops.`)
  let stopping = false
  process.on('SIGINT', async () => {
    if (stopping) process.exit(1)
    stopping = true
    try {
      if (device) {
        device.send('uninstall', { id: manifest.id })
        device.unreverse(port)
      } else {
        await simulator(values.simulator!, { command: 'uninstall', id: manifest.id })
      }
    } catch {
      // The target is gone, and the dev app with it.
    }
    await server.close()
    process.exit(0)
  })
}

async function packCommand(dir: string) {
  const vite = await projectVite(dir)
  const outDir = join(dir, 'dist')
  await vite.build({ root: dir, logLevel: 'error', build: { outDir, emptyOutDir: true } })
  const result = pack(outDir, resolve(values.out ?? dir))
  mkdirSync(resolve(values.out ?? dir), { recursive: true })
  writeFileSync(result.file, result.bytes)
  console.log(`${result.file}: ${result.manifest.name} ${result.manifest.version}, ${(result.bytes.length / 1024).toFixed(0)} KB`)
}

async function main() {
  const [command, argument] = positionals
  const dir = process.cwd()
  if (values.help || !command) return console.log(HELP)
  switch (command) {
    case 'dev':
      return dev(dir)
    case 'pack':
      return packCommand(dir)
    case 'install': {
      if (!argument) throw new Error('which .halone file?')
      if (!values.device) throw new Error('installing a package into the simulator is not supported yet; use `halone dev`, or --device')
      const device = new Device(values.serial)
      const answer = check(device.send('install', { path: device.push(resolve(argument)), launch: values.launch! }))
      return console.log(`installed ${answer.id} ${answer.version}`)
    }
    case 'uninstall': {
      if (!argument) throw new Error('which app id?')
      if (values.device) check(new Device(values.serial).send('uninstall', { id: argument }))
      else check(await simulator(values.simulator!, { command: 'uninstall', id: argument }))
      return console.log(`removed ${argument}`)
    }
    case 'list': {
      const answer = values.device ? check(new Device(values.serial).send('list')) : check(await simulator(values.simulator!, { command: 'list' }))
      return console.log(JSON.stringify(answer.apps, null, 2))
    }
    default:
      throw new Error(`no such command: ${command}\n\n${HELP}`)
  }
}

process.on('unhandledRejection', (error) => {
  if (process.argv[2] === 'dev') console.error(`halone: ${error instanceof Error ? error.message : error}`)
  else throw error
})

main().catch((error) => {
  console.error(`halone: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})
