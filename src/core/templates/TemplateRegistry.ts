import type { EkoDocument } from '@/types/document'
import type { TemplateMasterInfo, TemplateMasterRecord, TemplateMasterStatus } from './types'

/**
 * Official Template Master registry for the editor.
 * DocumentProvider and hosts consult this — never import sample documents ad hoc.
 */
class TemplateRegistryImpl {
  private readonly byId = new Map<string, TemplateMasterRecord>()

  register(record: TemplateMasterRecord): void {
    if (record.document.type !== 'template') {
      throw new Error(`TemplateRegistry: "${record.id}" must be a template master`)
    }
    if (record.document.id !== record.id) {
      throw new Error(`TemplateRegistry: document.id (${record.document.id}) must match registry id (${record.id})`)
    }
    this.byId.set(record.id, {
      ...record,
      document: structuredClone(record.document),
    })
  }

  has(id: string): boolean {
    return this.byId.has(id)
  }

  get(id: string): TemplateMasterRecord | null {
    const record = this.byId.get(id)
    return record ? { ...record, document: structuredClone(record.document) } : null
  }

  getDocument(id: string): EkoDocument | null {
    return this.get(id)?.document ?? null
  }

  /** Catalog view (no document payloads) — for hosts / WooCommerce. */
  listCatalog(options?: { status?: TemplateMasterStatus | TemplateMasterStatus[] }): TemplateMasterInfo[] {
    const statuses = options?.status
      ? Array.isArray(options.status)
        ? options.status
        : [options.status]
      : null

    return [...this.byId.values()]
      .filter((r) => !statuses || statuses.includes(r.status))
      .map(({ id, name, category, thumbnail, status }) => ({
        id,
        name,
        category,
        thumbnail,
        status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  listPublished(): TemplateMasterInfo[] {
    return this.listCatalog({ status: 'published' })
  }

  /** All registered master documents (for DocumentProvider seeding). */
  listDocuments(options?: { status?: TemplateMasterStatus | TemplateMasterStatus[] }): EkoDocument[] {
    const catalog = this.listCatalog(options)
    return catalog
      .map((entry) => this.getDocument(entry.id))
      .filter((doc): doc is EkoDocument => Boolean(doc))
  }

  clear(): void {
    this.byId.clear()
  }
}

export const templateRegistry = new TemplateRegistryImpl()
