import type { EkoDocument } from '@/types/document'
import type { PersonalizationSessionRecord } from '@/types/commerce'
import type {
  PersistedPersonalizationSession,
  SessionPersistenceProvider,
} from '@/core/platform/providers'

function parseDocumentJson(json: string): EkoDocument {
  return JSON.parse(json) as EkoDocument
}

export interface WooCommercePersistenceProviderOptions {
  /** Absolute REST namespace, e.g. https://loja.example/wp-json/eko-print/v1 */
  restUrl: string
  /** Short-lived token from product-context (or WP nonce when same-origin). */
  token: string
  /** Optional fetch implementation (tests). */
  fetchImpl?: typeof fetch
}

interface SessionWirePayload {
  schema: 'eko.persistence.session/1'
  record: PersonalizationSessionRecord
  documentJson?: string
}

/**
 * Remote SessionPersistenceProvider — WooCommerce REST only.
 * Lives in the adapter layer so Core/SDK never import WordPress specifics.
 */
export class WooCommercePersistenceProvider implements SessionPersistenceProvider {
  readonly id = 'woocommerce'
  readonly backend = 'remote' as const
  private readonly restUrl: string
  private readonly token: string
  private readonly fetchImpl: typeof fetch

  constructor(options: WooCommercePersistenceProviderOptions) {
    this.restUrl = options.restUrl.replace(/\/$/, '')
    this.token = options.token
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
  }

  async save(document: EkoDocument): Promise<EkoDocument> {
    const res = await this.request('PUT', `/documents/${encodeURIComponent(document.id)}`, {
      schema: 'eko.persistence.document/1',
      documentJson: JSON.stringify(document),
    })
    const body = (await res.json()) as { documentJson?: string }
    if (!body.documentJson) return document
    return parseDocumentJson(body.documentJson)
  }

  async load(id: string): Promise<EkoDocument> {
    const res = await this.request('GET', `/documents/${encodeURIComponent(id)}`)
    const body = (await res.json()) as { documentJson?: string }
    if (!body.documentJson) throw new Error(`Remote document not found: ${id}`)
    return parseDocumentJson(body.documentJson)
  }

  async autosave(document: EkoDocument): Promise<void> {
    await this.save(document)
  }

  async saveSession(
    record: PersonalizationSessionRecord,
    document?: EkoDocument,
  ): Promise<PersonalizationSessionRecord> {
    const payload: SessionWirePayload = {
      schema: 'eko.persistence.session/1',
      record,
      documentJson: document ? JSON.stringify(document) : undefined,
    }
    const res = await this.request('PUT', `/sessions/${encodeURIComponent(record.id)}`, payload)
    const body = (await res.json()) as { record?: PersonalizationSessionRecord }
    return body.record ?? record
  }

  async loadSession(sessionId: string): Promise<PersistedPersonalizationSession | null> {
    const res = await this.request('GET', `/sessions/${encodeURIComponent(sessionId)}`, undefined, [
      404,
    ])
    if (res.status === 404) return null
    const body = (await res.json()) as {
      record?: PersonalizationSessionRecord
      documentJson?: string
    }
    if (!body.record) return null
    return {
      record: body.record,
      document: body.documentJson ? parseDocumentJson(body.documentJson) : undefined,
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    await this.request('DELETE', `/sessions/${encodeURIComponent(sessionId)}`, undefined, [404])
  }

  async listSessions(productId?: string): Promise<PersonalizationSessionRecord[]> {
    const qs = productId ? `?productId=${encodeURIComponent(productId)}` : ''
    const res = await this.request('GET', `/sessions${qs}`)
    const body = (await res.json()) as { sessions?: PersonalizationSessionRecord[] }
    return body.sessions ?? []
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    okExtra: number[] = [],
  ): Promise<Response> {
    const res = await this.fetchImpl(`${this.restUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Eko-Persistence-Token': this.token,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
    })
    if (!res.ok && !okExtra.includes(res.status)) {
      const text = await res.text().catch(() => '')
      throw new Error(`WooCommercePersistenceProvider ${method} ${path} → ${res.status} ${text}`)
    }
    return res
  }
}
