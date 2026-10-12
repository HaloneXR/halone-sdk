import {
  HaloneError,
  decode,
  type EventName,
  type Events,
  type MethodName,
  type Params,
  type RequestMessage,
  type Result,
  type WireMessage,
} from './protocol'

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void }

export class Connection {
  private nextId = 1
  private readonly pending = new Map<number, Pending>()
  private readonly listeners = new Map<string, Set<(data: unknown) => void>>()
  private closed = false

  constructor(
    private readonly port: MessagePort,
    readonly windowId: string,
  ) {
    port.onmessage = (event) => this.receive(decode(event.data))
  }

  call<M extends MethodName>(method: M, ...args: Params<M> extends void ? [] : [Params<M>]): Promise<Result<M>> {
    if (this.closed) return Promise.reject(new HaloneError('closed', 'connection closed'))
    const id = this.nextId++
    const message: RequestMessage = { type: 'req', id, method, params: args[0] }
    return new Promise<Result<M>>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
      this.port.postMessage(JSON.stringify(message))
    })
  }

  on<E extends EventName>(name: E, listener: (data: Events[E]) => void): () => void {
    let set = this.listeners.get(name)
    if (!set) this.listeners.set(name, (set = new Set()))
    const wrapped = listener as (data: unknown) => void
    set.add(wrapped)
    return () => set.delete(wrapped)
  }

  close() {
    this.closed = true
    this.port.close()
    for (const { reject } of this.pending.values()) reject(new HaloneError('closed', 'connection closed'))
    this.pending.clear()
  }

  private receive(message: WireMessage) {
    if (message.type === 'res') {
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.ok) pending.resolve(message.result)
      else pending.reject(new HaloneError(message.error.code, message.error.message))
    } else if (message.type === 'evt') {
      for (const listener of this.listeners.get(message.name) ?? []) listener(message.data)
    }
  }
}
