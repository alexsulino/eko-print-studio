import { useState, type ReactNode } from 'react'
import { EmptyState, Tabs } from '@/ui'

export type LeftSidebarTab =
  | 'templates'
  | 'text'
  | 'shapes'
  | 'images'
  | 'uploads'
  | 'assets'
  | 'layers'
  | 'projects'
  | 'brand'
  | 'apps'

export interface LeftSidebarProps {
  layersContent?: ReactNode
  assetsContent?: ReactNode
  textContent?: ReactNode
  shapesContent?: ReactNode
  imagesContent?: ReactNode
  templatesContent?: ReactNode
  uploadsContent?: ReactNode
  projectsContent?: ReactNode
  brandContent?: ReactNode
  appsContent?: ReactNode
  defaultTab?: LeftSidebarTab
}

const TABS: { id: LeftSidebarTab; label: string }[] = [
  { id: 'templates', label: 'Templates' },
  { id: 'text', label: 'Text' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'images', label: 'Images' },
  { id: 'uploads', label: 'Uploads' },
  { id: 'assets', label: 'Assets' },
  { id: 'layers', label: 'Layers' },
  { id: 'projects', label: 'Projects' },
  { id: 'brand', label: 'Brand' },
  { id: 'apps', label: 'Apps' },
]

/**
 * Left rail — section infrastructure for Creator MVP.
 * Populated slots win; otherwise EmptyState placeholders.
 */
export function LeftSidebar({
  layersContent,
  assetsContent,
  textContent,
  shapesContent,
  imagesContent,
  templatesContent,
  uploadsContent,
  projectsContent,
  brandContent,
  appsContent,
  defaultTab = 'layers',
}: LeftSidebarProps) {
  const [tab, setTab] = useState<LeftSidebarTab>(defaultTab)

  const body: Record<LeftSidebarTab, ReactNode> = {
    templates:
      templatesContent ?? (
        <EmptyState title="Templates" hint="Abrir mestres de produto — preparado para o host." />
      ),
    text:
      textContent ?? (
        <EmptyState title="Text" hint="Inserir títulos e corpos de texto em poucos cliques." />
      ),
    shapes:
      shapesContent ?? (
        <EmptyState title="Shapes" hint="Retângulos, elipses e linhas da Object Registry." />
      ),
    images:
      imagesContent ?? (
        <EmptyState title="Images" hint="Atalho para imagens da biblioteca do documento." />
      ),
    uploads:
      uploadsContent ?? (
        <EmptyState title="Uploads" hint="UploadProvider — integração futura com a loja." />
      ),
    assets: assetsContent ?? <EmptyState title="Assets" hint="Catálogo do Asset Engine." />,
    layers: layersContent ?? <EmptyState title="Layers" hint="Árvore de camadas do documento." />,
    projects:
      projectsContent ?? (
        <EmptyState title="Projects" hint="Sessões recentes do PersistenceProvider." />
      ),
    brand:
      brandContent ?? (
        <EmptyState title="Brand" hint="Cores e logos protegidos do template." />
      ),
    apps:
      appsContent ?? (
        <EmptyState title="Apps" hint="Extensões via Plugin Registry." />
      ),
  }

  return (
    <div className="eko-left-sidebar" data-testid="left-sidebar">
      <nav className="eko-left-sidebar__tabs" aria-label="Left sidebar">
        <Tabs items={TABS} value={tab} onChange={setTab} ariaLabel="Seções da biblioteca" />
      </nav>
      <div className="eko-left-sidebar__body">{body[tab]}</div>
    </div>
  )
}
