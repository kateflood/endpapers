import {
  IconLayers,
  IconLayoutGrid,
  IconTarget,
  IconDownload,
  IconFolderOpen,
  IconFilePen,
} from '../shared/icons'

const FEATURES: { icon: typeof IconLayers; title: string; description: string }[] = [
  {
    icon: IconFilePen,
    title: 'Distraction-Free Editor',
    description: 'A clean writing environment that gets out of your way. Focus mode, dark mode, customizable typography, and rich formatting.',
  },
  {
    icon: IconFolderOpen,
    title: 'Local-First & Private',
    description: 'Your writing never leaves your machine unless you choose. No accounts, no cloud, no third-party servers.',
  },
  {
    icon: IconLayers,
    title: 'Sections & Groups',
    description: 'Structure your work with chapters, scenes, and sections. Drag and drop to reorder anytime.',
  },
  {
    icon: IconTarget,
    title: 'Writing Goals',
    description: 'Set word targets and track daily, weekly, and session progress. Build a consistent writing habit.',
  },
  {
    icon: IconLayoutGrid,
    title: 'Reference Board',
    description: 'Characters, locations, and plot details on an interactive canvas. Keep research alongside your manuscript.',
  },
  {
    icon: IconDownload,
    title: 'Export Anywhere',
    description: 'Export to PDF, plain text, or standard manuscript format. Your writing in open formats, ready when you are.',
  },
]

function ScreenshotFrame({ icon: Icon }: { icon: typeof IconLayers }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.07)]">
      <div className="flex items-center gap-1.5 px-3.5 h-9 bg-navy shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-white/20 block" />
        <span className="w-2.5 h-2.5 rounded-full bg-white/20 block" />
        <span className="w-2.5 h-2.5 rounded-full bg-white/20 block" />
      </div>
      <div className="aspect-[16/10] bg-bg flex items-center justify-center">
        <Icon size={44} className="text-border" />
      </div>
    </div>
  )
}

export default function FeatureShowcase() {
  return (
    <div className="flex flex-col">
      {FEATURES.map((f, i) => (
        <div
          key={f.title}
          className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center py-14${i < FEATURES.length - 1 ? ' border-b border-border' : ''}`}
        >
          <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
            <ScreenshotFrame icon={f.icon} />
          </div>
          <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-5">
              <f.icon size={20} className="text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-text mb-3">{f.title}</h3>
            <p className="text-text-secondary leading-relaxed">{f.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
