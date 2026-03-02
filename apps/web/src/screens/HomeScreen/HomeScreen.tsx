import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../../contexts/ProjectContext'
import { getAllRecents, upsertRecent } from '../../db/recents'
import type { RecentProject } from '../../db/recents'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  createProjectStructure,
  cloneProjectFromSource,
  validateProjectDirectory,
  readProjectJson,
  readWritingLog,
} from '../../fs/projectFs'
import type { TemplateOptions } from '../../fs/projectFs'
import type { ProjectType } from '@endpapers/types'
import NewProjectDialog from '../../components/NewProjectDialog/NewProjectDialog'
import RecentProjectsList from '../../components/RecentProjectsList/RecentProjectsList'
import FeatureShowcase from '../../components/FeatureShowcase/FeatureShowcase'
import { IconPlus, IconFolderOpen, IconShield, IconCheckCircle, IconArrowRight, IconSparkles } from '../../components/icons'
import { logoFullWhite } from '@endpapers/assets'

export default function HomeScreen() {
  const navigate = useNavigate()
  const { openProject, openDemoProject } = useProject()
  const [recents, setRecents] = useState<RecentProject[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const supported = isFileSystemAccessSupported()

  const loadRecents = useCallback(() => {
    void getAllRecents().then(setRecents)
  }, [])

  useEffect(() => {
    loadRecents()
  }, [loadRecents])

  async function handleNewProject(
    title: string,
    type: ProjectType,
    customTypeLabel?: string,
    template?: { sourceHandle: FileSystemDirectoryHandle; options: TemplateOptions },
  ) {
    setShowDialog(false)
    setIsBusy(true)
    setError(null)
    try {
      const handle = await pickDirectory()
      if (!handle) return
      if (template && await handle.isSameEntry(template.sourceHandle)) {
        setError('The destination folder cannot be the same as the source project. Please choose a different folder.')
        return
      }
      let project, writingLog
      if (template) {
        const result = await cloneProjectFromSource(template.sourceHandle, handle, title, type, customTypeLabel, template.options)
        project = result.project
        writingLog = result.writingLog
      } else {
        project = await createProjectStructure(handle, title, '', type, customTypeLabel)
        writingLog = { goals: {}, log: [] }
      }
      const recent: RecentProject = {
        id: project.id,
        handle,
        title: project.title,
        lastOpened: new Date().toISOString().split('T')[0],
      }
      await upsertRecent(recent)
      openProject(handle, project, project.id, writingLog)
      navigate('/editor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleOpenProject() {
    setIsBusy(true)
    setError(null)
    try {
      const handle = await pickDirectory()
      if (!handle) return
      const isValid = await validateProjectDirectory(handle)
      if (!isValid) {
        setError("This folder doesn't appear to be an Endpapers project.")
        return
      }
      const [project, writingLog] = await Promise.all([readProjectJson(handle), readWritingLog(handle)])
      const recent: RecentProject = {
        id: project.id,
        handle,
        title: project.title,
        lastOpened: new Date().toISOString().split('T')[0],
      }
      await upsertRecent(recent)
      openProject(handle, project, project.id, writingLog)
      navigate('/editor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-bg">

      {/* ── NAV ── */}
      <nav className="dark-nav sticky top-0 z-50 h-[60px] flex items-center justify-between px-6 sm:px-10 border-b border-white/7">
        <a href="#" className="flex items-center gap-3 no-underline">
          <img src={logoFullWhite} alt="Endpapers" className="h-8" />
        </a>
        <div className="flex items-center gap-7">
          <a href="#features" className="text-[0.8125rem] text-white/65 hover:text-white no-underline transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-[0.8125rem] text-white/65 hover:text-white no-underline transition-colors">
            Pricing
          </a>
          <button
            className="text-[0.8125rem] text-white/65 hover:text-white transition-colors cursor-pointer"
            onClick={() => navigate('/help')}
          >
            Docs
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="dark-hero relative overflow-hidden px-6 pt-20 pb-16 text-center animate-in animate-in-1">
        {/* Radial glow */}
        <div className="dark-hero-glow absolute inset-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[0.75rem] tracking-wide mb-7 bg-[#4299E1]/15 border border-[#4299E1]/30 text-[#90CDF4]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#63B3ED] block" />
            Private by design
          </div>

          <h1
            className="font-serif font-normal text-white leading-[1.15] tracking-tight mb-5 max-w-[700px]"
            style={{ fontSize: 'clamp(38px, 5vw, 62px)', letterSpacing: '-0.5px' }}
          >
            Writing that stays <em className="not-italic text-[#63B3ED]">yours.</em>
          </h1>

          <p className="text-[1.0625rem] leading-relaxed max-w-[480px] mb-10 text-white/60">
            A focused writing environment for fiction, non-fiction, and essays.
            Your files live on your machine — no cloud, no subscriptions, no compromise.
          </p>

          {/* Hero buttons */}
          <div className="flex gap-3.5 flex-wrap justify-center">
            {supported ? (
              <>
                <button
                  className="btn-cta inline-flex items-center gap-2 rounded-[10px] px-7 py-3.5 text-[0.9375rem] font-medium text-white cursor-pointer transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setShowDialog(true)}
                  disabled={isBusy}
                >
                  <IconPlus size={16} />
                  New Project
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-[10px] px-7 py-3.5 text-[0.9375rem] font-medium text-white cursor-pointer transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed bg-white/8 border border-white/18"
                  onClick={() => { void handleOpenProject() }}
                  disabled={isBusy}
                >
                  <IconFolderOpen size={16} />
                  Open Existing
                </button>
              </>
            ) : (
              <p className="text-[0.8125rem] text-center text-white/50">
                Endpapers requires Chrome or Edge for local file access.
              </p>
            )}
            {recents.length === 0 && (
              <button
                className="inline-flex items-center gap-2 rounded-[10px] px-7 py-3.5 text-[0.9375rem] font-medium text-white cursor-pointer transition-all hover:-translate-y-px bg-white/8 border border-white/18"
                onClick={() => { openDemoProject(); navigate('/editor') }}
              >
                Try the Demo
              </button>
            )}
          </div>

          {error && (
            <p className="text-[0.8125rem] text-red-300 text-center mt-4">{error}</p>
          )}
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-[1100px] mx-auto px-6 sm:px-10 py-14">

        {/* Recent projects */}
        <div className="animate-in animate-in-2">
          {recents.length > 0 ? (
            <div className="mb-14">
              <p className="text-[0.8125rem] font-semibold tracking-[1.5px] uppercase text-text-secondary mb-5">
                Recent Projects
              </p>
              <RecentProjectsList recents={recents} onRecentsChanged={loadRecents} />
            </div>
          ) : supported ? (
            <p className="text-[0.875rem] text-text-placeholder text-center py-8 mb-8">
              Create a new project or open an existing folder to get started.
            </p>
          ) : null}
        </div>

        {/* Features */}
        <div id="features" className="scroll-mt-[76px] animate-in animate-in-3 mb-14">
          <p className="text-[0.8125rem] font-semibold tracking-[1.5px] uppercase text-text-secondary mb-5">
            Features
          </p>
          <FeatureShowcase />
        </div>

        {/* Pricing */}
        <div id="pricing" className="scroll-mt-[76px] mb-14">
          <p className="text-[0.8125rem] font-semibold tracking-[1.5px] uppercase text-text-secondary mb-5">
            Pricing
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Free tier */}
            <div className="bg-surface border border-border rounded-[14px] p-7 flex flex-col">
              <p className="text-[0.75rem] font-semibold tracking-wider uppercase text-accent mb-2">Free</p>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-semibold text-text">$0</span>
                <span className="text-[0.875rem] text-text-secondary">/ forever</span>
              </div>
              <p className="text-[0.875rem] text-text-secondary leading-relaxed mb-6">
                Everything you need to write, organize, and export your work. No account required.
              </p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  'Unlimited projects',
                  'Distraction-free editor',
                  'Sections, groups & drag-and-drop',
                  'Reference board',
                  'Writing goals & statistics',
                  'Export to PDF and plain text',
                  'Fully offline — no internet required',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.875rem] text-text-secondary">
                    <IconCheckCircle size={16} className="text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className="btn-cta w-full rounded-[10px] px-6 py-3 text-[0.9375rem] font-medium text-white cursor-pointer transition-all hover:-translate-y-px"
                onClick={() => setShowDialog(true)}
              >
                Get Started
              </button>
            </div>

            {/* Premium tier */}
            <div className="relative bg-surface border border-border rounded-[14px] p-7 flex flex-col overflow-hidden">
              <div className="absolute top-4 right-4 rounded-full px-3 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase bg-[#EBF8FF] text-accent">
                Coming soon
              </div>
              <p className="text-[0.75rem] font-semibold tracking-wider uppercase text-text-secondary mb-2">Premium</p>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-semibold text-text">TBD</span>
              </div>
              <p className="text-[0.875rem] text-text-secondary leading-relaxed mb-6">
                Advanced tools for serious writers. Cloud sync, version history, and on device AI-powered editing.
              </p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  'Everything in Free',
                  'Cloud sync via Google Drive',
                  'Version history with named snapshots',
                  'AI-powered change summaries',
                  'ePub export',
                  'AI editor & reviewer agents',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.875rem] text-text-placeholder">
                    <IconCheckCircle size={16} className="text-text-placeholder shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className="w-full rounded-[10px] px-6 py-3 text-[0.9375rem] font-medium cursor-default opacity-50 bg-border text-text-secondary"
                disabled
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* AI Tools */}
        <div className="mb-14">
          <div className="bg-surface border border-border rounded-[14px] p-7 flex flex-col sm:flex-row items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-accent/[0.08] flex items-center justify-center shrink-0">
              <IconSparkles size={22} className="text-accent" />
            </div>
            <div>
              <h3 className="text-[1.0625rem] font-semibold text-text mb-1.5">A word about AI</h3>
              <p className="text-[0.875rem] text-text-secondary leading-relaxed mb-3">
                We believe in privacy and protecting your IP but we also believe you should have access to the tools 
                and technology that AI can support - which is why we support private, on device AI.
                Proofread your spelling and grammar, summarize sections, and more — all using
                AI models that run entirely on your device. Your text never leaves your machine.
              </p>
              <button
                className="text-[0.875rem] text-accent hover:underline cursor-pointer transition-colors flex items-center gap-1"
                onClick={() => navigate('/ai')}
              >
                Learn more
                <IconArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy banner */}
        <div className="dark-privacy rounded-2xl px-8 sm:px-12 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-14 animate-in animate-in-4">
          <div>
            <h2 className="font-serif text-2xl font-normal text-white mb-2">
              Built for writers by writers.
            </h2>
            <p className="text-[0.875rem] leading-relaxed mb-4 text-white/60">
              We believe your writing is yours and only yours until you choose otherwise. Your manuscript is stored on your computer — in plain files you can
              open in any editor, back up any way you like, and keep forever.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {[
                { icon: IconShield, label: 'No cloud storage' },
                { icon: IconCheckCircle, label: 'No account required' },
                { icon: IconArrowRight, label: 'Open file formats' },
                { icon: IconSparkles, label: 'AI only when and how you want it' },
              ].map((pill) => (
                <div
                  key={pill.label}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] bg-white/8 border border-white/15 text-white/75"
                >
                  <pill.icon size={12} />
                  {pill.label}
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 sm:px-10 bg-navy border-t border-white/7">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-10 mb-10">
            {/* Brand */}
            <div>
              <img src={logoFullWhite} alt="Endpapers" className="h-6 mb-3" />
              <p className="text-[0.8125rem] leading-relaxed max-w-[260px] text-white/45">
                A private, local-first writing app for fiction, non-fiction, essays and more.
                Your words. Your files. Your control.
              </p>
            </div>
            {/* Product links */}
            <div>
              <h4 className="text-[0.6875rem] font-semibold tracking-[1.5px] uppercase mb-3.5 text-white/35">
                Product
              </h4>
              <div className="flex flex-col gap-2.5">
                <FooterLink href="#features">Features</FooterLink>
                <FooterLink href="#pricing">Pricing</FooterLink>
                <FooterLink onClick={() => navigate('/help')}>Docs</FooterLink>
                <FooterLink onClick={() => navigate('/ai')}>AI Tools</FooterLink>
              </div>
            </div>
            {/* Company links */}
            <div>
              <h4 className="text-[0.6875rem] font-semibold tracking-[1.5px] uppercase mb-3.5 text-white/35">
                Company
              </h4>
              <div className="flex flex-col gap-2.5">
                <FooterLink onClick={() => navigate('/about')}>About</FooterLink>
                <FooterLink onClick={() => navigate('/contact')}>Contact</FooterLink>
              </div>
            </div>
          </div>
          <div className="border-t border-white/7 pt-6 flex items-center justify-between flex-wrap gap-3">
            <p className="text-[0.75rem] text-white/30">
              &copy; {new Date().getFullYear()} Endpapers. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {showDialog && (
        <NewProjectDialog
          onConfirm={(title, type, customTypeLabel, template) => { void handleNewProject(title, type, customTypeLabel, template) }}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  )
}

function FooterLink({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }) {
  if (onClick) {
    return (
      <button
        className="text-left text-[0.8125rem] text-white/55 hover:text-white transition-colors cursor-pointer"
        onClick={onClick}
      >
        {children}
      </button>
    )
  }
  return (
    <a
      href={href}
      className="text-[0.8125rem] text-white/55 hover:text-white no-underline transition-colors"
    >
      {children}
    </a>
  )
}
