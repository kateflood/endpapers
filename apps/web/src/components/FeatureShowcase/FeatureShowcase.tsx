import {
  IconLayers,
  IconLayoutGrid,
  IconTarget,
  IconDownload,
  IconFolderOpen,
  IconFilePen,
} from '../icons'

const FEATURES: { icon: typeof IconLayers; title: string; description: string; iconBg: string; iconColor: string }[] = [
  {
    icon: IconFilePen,
    title: 'Distraction-Free Editor',
    description: 'A clean writing environment that gets out of your way. Focus mode, customizable typography, and rich formatting.',
    iconBg: '#EBF8FF',
    iconColor: '#2B6CB0',
  },
  {
    icon: IconFolderOpen,
    title: 'Local-First & Private',
    description: 'Your writing never leaves your machine unless you choose. No accounts, no cloud, no third-party servers.',
    iconBg: '#FAF5FF',
    iconColor: '#553C9A',
  },
  {
    icon: IconLayers,
    title: 'Sections & Groups',
    description: 'Structure your work with chapters, scenes, and sections. Drag and drop to reorder anytime.',
    iconBg: '#F0FFF4',
    iconColor: '#276749',
  },
  {
    icon: IconTarget,
    title: 'Writing Goals',
    description: 'Set word targets and track daily, weekly, and session progress. Build a consistent writing habit.',
    iconBg: '#FFFFF0',
    iconColor: '#744210',
  },
  {
    icon: IconLayoutGrid,
    title: 'Reference Board',
    description: 'Characters, locations, and plot details on an interactive canvas. Keep research alongside your manuscript.',
    iconBg: '#FFF5F5',
    iconColor: '#C53030',
  },
  {
    icon: IconDownload,
    title: 'Export Anywhere',
    description: 'Export to PDF, plain text, or standard manuscript format. Your writing in open formats, ready when you are.',
    iconBg: '#E6FFFA',
    iconColor: '#2C7A7B',
  },
]

export default function FeatureShowcase() {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          className="bg-surface border border-border rounded-[14px] p-7 transition-all hover:shadow-[0_6px_24px_rgba(43,108,176,0.08)] hover:-translate-y-0.5"
        >
          <div
            className="w-[46px] h-[46px] rounded-xl flex items-center justify-center mb-4"
            style={{ background: f.iconBg }}
          >
            <f.icon size={22} style={{ color: f.iconColor }} />
          </div>
          <h3 className="text-[1rem] font-semibold text-text mb-2">{f.title}</h3>
          <p className="text-[0.875rem] text-text-secondary leading-relaxed">{f.description}</p>
        </div>
      ))}
    </div>
  )
}
