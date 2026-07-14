import type { ElementType } from '@/types/element'
import type { ElementDefinition } from '@/core/registry/ObjectRegistry'
import type { ObjectRenderer } from '@/core/render/RendererRegistry'
import type { OverlayContributor } from '@/core/render/OverlaySystem'
import type { RenderPass } from '@/core/render/passes/RenderPass'

export type PluginCapability =
  | 'objects'
  | 'renderers'
  | 'tools'
  | 'panels'
  | 'commands'
  | 'shortcuts'
  | 'menus'
  | 'overlays'
  | 'passes'

export interface PluginToolRegistration {
  id: string
  label: string
  cursor?: string
}

export interface PluginPanelRegistration {
  id: string
  label: string
  region?: 'left' | 'right' | 'top' | 'bottom' | 'modal'
}

export interface PluginCommandRegistration {
  id: string
  label: string
  /** Opaque execute token — host/store binds later. */
  executeKey: string
}

export interface PluginShortcutRegistration {
  id: string
  combo: string
  commandId: string
}

export interface PluginMenuRegistration {
  id: string
  label: string
  parentId?: string
  commandId?: string
}

/**
 * Plugin manifest — Core never imports concrete plugin modules.
 * Hosts call `pluginRegistry.register(plugin)`.
 */
export interface EditorPlugin {
  id: string
  name: string
  version?: string
  capabilities?: PluginCapability[]
  objects?: ElementDefinition[]
  renderers?: ObjectRenderer[]
  tools?: PluginToolRegistration[]
  panels?: PluginPanelRegistration[]
  commands?: PluginCommandRegistration[]
  shortcuts?: PluginShortcutRegistration[]
  menus?: PluginMenuRegistration[]
  overlays?: OverlayContributor[]
  passes?: RenderPass[]
  onRegister?(api: PluginRegistrationApi): void
  onUnregister?(): void
}

export interface PluginRegistrationApi {
  registerObject(definition: ElementDefinition): void
  registerRenderer(renderer: ObjectRenderer): void
  registerOverlay(contributor: OverlayContributor): void
  registerPass(pass: RenderPass): void
}

type RegisteredPlugin = {
  plugin: EditorPlugin
  objectTypes: ElementType[]
}

/**
 * Plugin infrastructure — registers extensions without Core knowing plugin IDs.
 */
export class PluginRegistry {
  private plugins = new Map<string, RegisteredPlugin>()
  private api: PluginRegistrationApi

  constructor(api: PluginRegistrationApi) {
    this.api = api
  }

  register(plugin: EditorPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`)
    }
    const objectTypes: ElementType[] = []
    for (const def of plugin.objects ?? []) {
      this.api.registerObject(def)
      objectTypes.push(def.type)
    }
    for (const renderer of plugin.renderers ?? []) {
      this.api.registerRenderer(renderer)
    }
    for (const overlay of plugin.overlays ?? []) {
      this.api.registerOverlay(overlay)
    }
    for (const pass of plugin.passes ?? []) {
      this.api.registerPass(pass)
    }
    plugin.onRegister?.(this.api)
    this.plugins.set(plugin.id, { plugin, objectTypes })
  }

  unregister(id: string): void {
    const entry = this.plugins.get(id)
    if (!entry) return
    entry.plugin.onUnregister?.()
    this.plugins.delete(id)
  }

  get(id: string): EditorPlugin | undefined {
    return this.plugins.get(id)?.plugin
  }

  list(): EditorPlugin[] {
    return [...this.plugins.values()].map((e) => e.plugin)
  }

  has(id: string): boolean {
    return this.plugins.has(id)
  }
}
