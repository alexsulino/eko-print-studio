/**
 * ADR-0002 — WordPress JSON meta slash invariant (regression shield).
 *
 * Simulates PHP addslashes / stripslashes (wp_slash / wp_unslash) in Node so CI
 * proves the corruption mode without booting WordPress.
 *
 * Covers the payload shapes that broke production: large base64 preview, quotes,
 * backslashes, unicode, emoji — for save / autosave / finalize / resume / PUT / GET
 * equivalent records.
 */
import { describe, expect, it } from 'vitest'

/** PHP addslashes / wp_slash for strings. */
function phpAddslashes(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const code = input.charCodeAt(i)
    if (ch === '\\' || ch === '"' || ch === "'" || code === 0) {
      out += '\\'
      out += code === 0 ? '0' : ch
    } else {
      out += ch
    }
  }
  return out
}

/** PHP stripslashes / wp_unslash for strings. */
function phpStripslashes(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '\\' && i + 1 < input.length) {
      const next = input[i + 1]
      if (next === '\\' || next === '"' || next === "'") {
        out += next
        i++
        continue
      }
      if (next === '0') {
        out += '\0'
        i++
        continue
      }
    }
    out += input[i]
  }
  return out
}

/** Official persist path: encode → wp_slash → (WP stores after wp_unslash) → decode. */
function persistRoundTrip(value: unknown): unknown {
  const encoded = JSON.stringify(value)
  JSON.parse(encoded) // encode must be valid
  const prepared = phpAddslashes(encoded) // JsonMetaPersistence::prepare_for_metadata
  const stored = phpStripslashes(prepared) // update_metadata internal wp_unslash
  expect(stored).toBe(encoded)
  return JSON.parse(stored)
}

/** Forbidden path that caused production Syntax error. */
function forbiddenRoundTrip(value: unknown): unknown {
  const encoded = JSON.stringify(value)
  const stored = phpStripslashes(encoded) // update_post_meta without wp_slash
  return JSON.parse(stored)
}

function largeBase64Preview(kib = 32): string {
  // Pseudo-base64 alphabet + padding; size similar to production ~44KB records.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let body = ''
  const target = kib * 1024
  while (body.length < target) {
    body += alphabet[body.length % alphabet.length]
  }
  return `data:image/png;base64,${body}`
}

function sessionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'psess_regression_1',
    customizationId: 'psess_regression_1',
    lifecycle: 'finalized',
    status: 'finalized',
    documentId: 'doc_1',
    masterId: 'template_caneca-brasil',
    product: { productId: '42', templateId: 'template_caneca-brasil' },
    preview: {
      fidelity: 'raster',
      filename: 'preview.png',
      mimeType: 'image/png',
      data: largeBase64Preview(24),
    },
    label: 'Quote "inside" and path C:\\Users\\eko\\art.png',
    note: 'Unicode café — emoji 🎨 — special <>&',
    ...overrides,
  }
}

describe('ADR-0002 JsonMetaPersistence slash invariant', () => {
  it('forbidden path corrupts JSON with quotes/backslashes (documents the bug)', () => {
    const record = {
      text: 'say "hello"',
      path: 'C:\\temp\\file',
    }
    expect(() => forbiddenRoundTrip(record)).toThrow()
  })

  it('official path round-trips large base64 preview', () => {
    const record = sessionRecord()
    const decoded = persistRoundTrip(record) as typeof record
    expect(decoded).toEqual(record)
    expect(decoded.preview.data.startsWith('data:image/png;base64,')).toBe(true)
    expect(decoded.preview.data.length).toBeGreaterThan(20_000)
  })

  it('official path round-trips quotes, backslashes, unicode, emoji', () => {
    const record = sessionRecord({
      quotes: 'He said "hi" and \'bye\'',
      backslashes: 'a\\b\\c',
      unicode: 'São Paulo — 日本語',
      emoji: '🔥✨🎨',
      special: '<>&\'"',
    })
    expect(persistRoundTrip(record)).toEqual(record)
  })

  it('covers save / autosave / finalize / resume shaped records', () => {
    for (const lifecycle of ['editing', 'saved', 'finalized', 'cart_attached'] as const) {
      const record = sessionRecord({ lifecycle, status: lifecycle === 'editing' ? 'active' : lifecycle })
      expect(persistRoundTrip(record)).toEqual(record)
    }
  })

  it('documentJson-shaped payload (PUT body companion) survives', () => {
    const document = {
      id: 'doc_1',
      schemaVersion: '1.0.0',
      metadata: { name: 'Arte "Premium" \\ draft' },
      elements: [{ id: 'el_1', type: 'text', content: 'Olá 🌎' }],
      pages: [{ id: 'page_1', name: 'Frente' }],
    }
    expect(persistRoundTrip(document)).toEqual(document)
  })

  it('order payload + preview meta shapes survive encode_for_metadata path', () => {
    const orderPayload = {
      schema: 'eko.commerce.order/1',
      orderId: '100',
      cart: sessionRecord({ lifecycle: 'ordered' }),
      allowAdminReedit: true,
    }
    expect(persistRoundTrip(orderPayload)).toEqual(orderPayload)
    const preview = sessionRecord().preview
    expect(persistRoundTrip(preview)).toEqual(preview)
  })
})
