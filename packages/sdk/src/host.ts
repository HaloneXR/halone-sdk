import {
  HaloneError,
  decode,
  type EventName,
  type Events,
  type MethodName,
  type Params,
  type RequestMessage,
  type ResponseMessage,
  type Result,
  type WindowId,
  type WireMessage,
} from './protocol'

export interface CallContext {
  windowId: WindowId
}

export type Handlers = {
  [M in MethodName]: (params: Params<M>, context: CallContext) => Result<M> | Promise<Result<M>>
}

export type TrafficDirection = 'in' | 'out'

export type TrafficListener = (windowId: WindowId, direction: TrafficDirection, message: WireMessage) => void

/** What a window that is not the shell's own may call and hear. */
export interface EndpointGuard {
  /** Throws to refuse a call. */
  check(method: string, params: unknown): void
  hears(name: string): boolean
}

export class HostEndpoint {
  constructor(
    private readonly port: MessagePort,
    readonly windowId: WindowId,
    private readonly handlers: Partial<Handlers>,
    private readonly traffic?: TrafficListener,
    private readonly guard?: EndpointGuard,
  ) {
    port.onmessage = (event) => void this.receive(decode(event.data))
  }

  emit<E extends EventName>(name: E, data: Events[E]) {
    if (this.guard && !this.guard.hears(name)) return
    this.send({ type: 'evt', name, data })
  }

  close() {
    this.port.close()
  }

  private async receive(message: WireMessage) {
    this.traffic?.(this.windowId, 'in', message)
    if (message.type !== 'req') return
    this.send(await this.dispatch(message))
  }

  private async dispatch({ id, method, params }: RequestMessage): Promise<ResponseMessage> {
    const handler = this.handlers[method as MethodName] as
      | ((params: unknown, context: CallContext) => unknown)
      | undefined
    if (!handler) return { type: 'res', id, ok: false, error: { code: 'unknown-method', message: `no such method: ${method}` } }
    try {
      this.guard?.check(method, params)
      const result = await handler(params, { windowId: this.windowId })
      return { type: 'res', id, ok: true, result: result ?? null }
    } catch (error) {
      const code = error instanceof HaloneError ? error.code : 'internal'
      const text = error instanceof Error ? error.message : String(error)
      return { type: 'res', id, ok: false, error: { code, message: text } }
    }
  }

  private send(message: WireMessage) {
    this.traffic?.(this.windowId, 'out', message)
    this.port.postMessage(JSON.stringify(message))
  }
}
