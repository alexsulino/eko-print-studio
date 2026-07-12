import type { EkoDocument } from '@/types/document'
import { createId } from '@/utils/id'
import { defaultPermissions } from './createDocument'

/**
 * Clone a Template Master into a Session Design.
 * The master is never mutated.
 */
export function cloneToSession(master: EkoDocument): EkoDocument {
  if (master.type !== 'template') {
    throw new Error(`createSession expects a template master, received type "${master.type}"`)
  }

  const now = new Date().toISOString()
  const clone = structuredClone(master) as EkoDocument

  return {
    ...clone,
    id: createId('session'),
    type: 'session',
    metadata: {
      ...clone.metadata,
      masterId: master.id,
      name: `${clone.metadata.name} (session)`,
      createdAt: now,
      updatedAt: now,
    },
    permissions: defaultPermissions({
      ...clone.permissions,
      lockMaster: false,
      canEdit: true,
      canSave: true,
    }),
  }
}
