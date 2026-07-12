import {
  exportDocument as exportDocumentJson,
  importDocument as importDocumentJson,
  serializeDocument,
} from '@/core/document/serializeDocument'
import type { EkoDocument } from '@/types/document'
import type { DocumentProvider } from '@/types/provider'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'

export async function loadDocument(
  id: string,
  provider: DocumentProvider = localDocumentProvider,
): Promise<EkoDocument> {
  return provider.getDocument(id)
}

export async function saveDocument(
  document: EkoDocument,
  provider: DocumentProvider = localDocumentProvider,
): Promise<EkoDocument> {
  return provider.saveDocument(serializeDocument(document))
}

export async function createSessionDocument(
  masterId: string,
  provider: DocumentProvider = localDocumentProvider,
): Promise<EkoDocument> {
  return provider.createSession(masterId)
}

export function exportDocument(document: EkoDocument): string {
  return exportDocumentJson(document)
}

export function importDocument(json: string): EkoDocument {
  return importDocumentJson(json)
}

export function downloadDocumentJson(document: EkoDocument, filename?: string): void {
  const blob = new Blob([exportDocument(document)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = filename ?? `${document.metadata.name || document.id}.eko.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
