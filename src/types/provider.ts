import type { EkoDocument } from './document'

export interface DocumentProvider {
  getDocument(id: string): Promise<EkoDocument>
  saveDocument(document: EkoDocument): Promise<EkoDocument>
  /**
   * Clones a Template Master into a Session Design.
   * The master itself must never be mutated by the customer flow.
   */
  createSession(masterId: string): Promise<EkoDocument>
  listDocuments?(): Promise<EkoDocument[]>
}
