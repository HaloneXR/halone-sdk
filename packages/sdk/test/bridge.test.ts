import { afterEach, describe, expect, it } from 'vitest'
import { Connection, HaloneError, createClient } from '../src/index'
import { HostEndpoint, type Handlers } from '../src/host'

const open: { close(): void }[] = []

function pair(handlers: Partial<Handlers>) {
  const channel = new MessageChannel()
  const host = new HostEndpoint(channel.port1, 'w1', handlers)
  const connection = new Connection(channel.port2, 'w1')
  open.push(host, connection)
  return { host, connection, client: createClient(Promise.resolve(connection)) }
}

afterEach(() => {
  for (const endpoint of open.splice(0)) endpoint.close()
})

describe('bridge', () => {
  it('routes a call to its handler and returns the result', async () => {
    const { client } = pair({ 'windows.setTitle': () => undefined, 'scene.headPose': () => ({ yawDegrees: 12, pitchDegrees: -3 }) })
    expect(await client.scene.headPose()).toEqual({ yawDegrees: 12, pitchDegrees: -3 })
  })

  it('passes the calling window to the handler', async () => {
    let seen = ''
    const { client } = pair({ 'windows.close': (_, { windowId }) => void (seen = windowId) })
    await client.windows.close()
    expect(seen).toBe('w1')
  })

  it('surfaces handler errors with their code', async () => {
    const { client } = pair({
      'apps.launch': ({ appId }) => {
        throw new HaloneError('no-such-app', `unknown app ${appId}`)
      },
    })
    await expect(client.apps.launch('nope')).rejects.toMatchObject({ code: 'no-such-app', message: 'unknown app nope' })
  })

  it('rejects methods the host does not implement', async () => {
    const { client } = pair({})
    await expect(client.system.info()).rejects.toMatchObject({ code: 'unknown-method' })
  })

  it('delivers events to subscribers until they unsubscribe', async () => {
    const { host, client } = pair({ 'system.ping': ({ sentAt }) => ({ sentAt, receivedAt: 0 }) })
    const seen: boolean[] = []
    const off = client.on('window.focusChanged', ({ focused }) => seen.push(focused))
    await client.ready
    host.emit('window.focusChanged', { focused: true })
    await client.system.ping()
    off()
    host.emit('window.focusChanged', { focused: false })
    await client.system.ping()
    expect(seen).toEqual([true])
  })

  it('fails pending calls when the connection closes', async () => {
    const { connection, client } = pair({ 'scene.recenter': () => new Promise<void>(() => {}) })
    const call = client.scene.recenter()
    await Promise.resolve()
    connection.close()
    await expect(call).rejects.toMatchObject({ code: 'closed' })
  })
})
