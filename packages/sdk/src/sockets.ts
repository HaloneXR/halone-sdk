import type { Connection } from './connection'

function toBase64(bytes: Uint8Array): string {
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}

function fromBase64(data: string): Uint8Array {
  const text = atob(data)
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i)
  return bytes
}

export interface ConnectOptions {
  timeoutMs?: number
  tls?: boolean
}

/** A TCP connection through the shell; needs the `network.tcp` permission. */
export class TcpSocket {
  private readonly dataListeners = new Set<(bytes: Uint8Array) => void>()
  private readonly closeListeners = new Set<(error: string | null) => void>()
  private readonly offs: (() => void)[] = []
  private open = true

  /** Bytes that arrived before anyone listened, so nothing is lost between connecting and `onData`. */
  private early: Uint8Array[] = []

  private constructor(
    private readonly connection: Connection,
    readonly id: number,
  ) {
    this.offs.push(
      connection.on('socket.data', ({ socketId, data }) => {
        if (socketId !== this.id) return
        const bytes = fromBase64(data)
        if (this.dataListeners.size) this.dataListeners.forEach((listener) => listener(bytes))
        else this.early.push(bytes)
        connection.call('sockets.ack', { socketId }).catch(() => {})
      }),
      connection.on('socket.closed', ({ socketId, error }) => {
        if (socketId === this.id) this.finish(error)
      }),
    )
  }

  static async connect(connection: Connection, host: string, port: number, options: ConnectOptions = {}): Promise<TcpSocket> {
    const { socketId } = await connection.call('sockets.connect', { host, port, ...options })
    return new TcpSocket(connection, socketId)
  }

  get closed() {
    return !this.open
  }

  onData(listener: (bytes: Uint8Array) => void): () => void {
    this.dataListeners.add(listener)
    const early = this.early
    this.early = []
    early.forEach((bytes) => listener(bytes))
    return () => this.dataListeners.delete(listener)
  }

  onClose(listener: (error: string | null) => void): () => void {
    this.closeListeners.add(listener)
    return () => this.closeListeners.delete(listener)
  }

  /** Resolves once the bytes are handed to the network, which is the signal to send more. */
  write(data: Uint8Array | string): Promise<void> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    return this.connection.call('sockets.write', { socketId: this.id, data: toBase64(bytes) })
  }

  async close() {
    if (!this.open) return
    await this.connection.call('sockets.close', { socketId: this.id }).catch(() => {})
    this.finish(null)
  }

  private finish(error: string | null) {
    if (!this.open) return
    this.open = false
    this.offs.forEach((off) => off())
    this.closeListeners.forEach((listener) => listener(error))
  }
}
