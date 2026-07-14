/**
 * Host ↔ Editor communication contracts.
 * Core never depends on browser `window`, `postMessage`, or DOM CustomEvent.
 * Host adapters bind these interfaces to concrete transports.
 */

export type HostMessageKind =
  | 'rpc.request'
  | 'rpc.response'
  | 'rpc.error'
  | 'event'
  | 'callback'

export interface HostMessage<T = unknown> {
  id?: string
  kind: HostMessageKind
  channel: string
  type: string
  payload: T
}

export type HostMessageHandler = (message: HostMessage) => void

/** Transport-agnostic message bus. */
export interface MessageBus {
  publish(message: HostMessage): void
  subscribe(channel: string, handler: HostMessageHandler): () => void
  clear?(): void
}

/** Request / response RPC over any MessageBus. */
export interface RpcChannel {
  call<TReq, TRes>(method: string, request: TReq, timeoutMs?: number): Promise<TRes>
  handle<TReq, TRes>(method: string, handler: (request: TReq) => Promise<TRes> | TRes): () => void
}

/** Callback registry for host integrations (React / Vue / vanilla). */
export interface CallbackBridge {
  on(event: string, callback: (payload: unknown) => void): () => void
  off(event: string, callback: (payload: unknown) => void): void
  emit(event: string, payload: unknown): void
}

/**
 * Adapter hooks for future host bindings:
 * postMessage / CustomEvent / Callbacks / MessageBus / RPC.
 */
export interface HostBridge {
  bus: MessageBus
  rpc: RpcChannel
  callbacks: CallbackBridge
}

/** In-memory MessageBus — no browser APIs. */
export class InMemoryMessageBus implements MessageBus {
  private handlers = new Map<string, Set<HostMessageHandler>>()

  publish(message: HostMessage): void {
    const set = this.handlers.get(message.channel)
    if (!set) return
    for (const handler of set) handler(message)
  }

  subscribe(channel: string, handler: HostMessageHandler): () => void {
    const set = this.handlers.get(channel) ?? new Set()
    set.add(handler)
    this.handlers.set(channel, set)
    return () => set.delete(handler)
  }

  clear(): void {
    this.handlers.clear()
  }
}

export class InMemoryCallbackBridge implements CallbackBridge {
  private listeners = new Map<string, Set<(payload: unknown) => void>>()

  on(event: string, callback: (payload: unknown) => void): () => void {
    const set = this.listeners.get(event) ?? new Set()
    set.add(callback)
    this.listeners.set(event, set)
    return () => this.off(event, callback)
  }

  off(event: string, callback: (payload: unknown) => void): void {
    this.listeners.get(event)?.delete(callback)
  }

  emit(event: string, payload: unknown): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const cb of set) cb(payload)
  }
}

export class InMemoryRpcChannel implements RpcChannel {
  private handlers = new Map<string, (request: unknown) => Promise<unknown> | unknown>()

  call<TReq, TRes>(method: string, request: TReq): Promise<TRes> {
    const handler = this.handlers.get(method)
    if (!handler) {
      return Promise.reject(new Error(`RPC method not registered: ${method}`))
    }
    return Promise.resolve(handler(request) as TRes)
  }

  handle<TReq, TRes>(method: string, handler: (request: TReq) => Promise<TRes> | TRes): () => void {
    this.handlers.set(method, handler as (request: unknown) => Promise<unknown> | unknown)
    return () => this.handlers.delete(method)
  }
}

export function createHostBridge(): HostBridge {
  return {
    bus: new InMemoryMessageBus(),
    rpc: new InMemoryRpcChannel(),
    callbacks: new InMemoryCallbackBridge(),
  }
}
