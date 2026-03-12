import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { getAllRecents, upsertRecent } from '../db/recents'
import type { RecentProject } from '../db/recents'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  createProjectStructure,
  cloneProjectFromSource,
  validateProjectDirectory,
  readProjectJson,
  readWritingLog,
} from '../fs/projectFs'
import type { TemplateOptions } from '../fs/projectFs'
import type { ProjectType } from '@endpapers/types'
import NewProjectDialog from '../components/dialogs/NewProjectDialog'
import RecentProjectsList from '../components/home/RecentProjectsList'
import FeatureShowcase from '../components/home/FeatureShowcase'
import { IconPlus, IconFolderOpen, IconShield, IconCheckCircle, IconArrowRight, IconSparkles } from '../components/shared/icons'
import { logoFullWhite } from '@endpapers/assets'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
          <button
            className="text-[0.8125rem] text-white/65 hover:text-white transition-colors cursor-pointer"
            onClick={() => navigate('/pricing')}
          >
            Pricing
          </button>
          <button
            className="text-[0.8125rem] text-white/65 hover:text-white transition-colors cursor-pointer"
            onClick={() => navigate('/help')}
          >
            Docs
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="dark-hero relative overflow-hidden px-6 pt-16 pb-14 text-center animate-in animate-in-1 shadow-[0_6px_24px_rgba(0,0,0,0.18)]">
        {/* Repeating logo mark pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="hero-book-pattern" x="0" y="0" width="110" height="110" patternUnits="userSpaceOnUse" patternTransform="rotate(-15 0 0)">
              <g transform="translate(28, 25) scale(0.52)" opacity="0.07">
                <path d="M0 5 Q0 0 5 0 L45 0 L45 80 Q22.5 92 0 80 Z" fill="white"/>
                <path d="M55 0 L95 0 Q100 0 100 5 L100 80 Q77.5 92 55 80 L55 0 Z" fill="white"/>
                <line x1="50" y1="2" x2="50" y2="80" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                <path d="M50 13 Q41 18 50 23" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M50 30 Q59 35 50 40" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M50 47 Q41 52 50 57" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M50 64 Q59 69 50 74" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-book-pattern)"/>
        </svg>
        {/* Radial glow (sits over pattern, dims center so text reads cleanly) */}
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
                <Button
                  className="btn-cta h-auto rounded-[10px] px-7 py-3.5 text-[0.9375rem] font-medium text-white border-0 hover:-translate-y-px disabled:opacity-40"
                  onClick={() => setShowDialog(true)}
                  disabled={isBusy}
                >
                  <IconPlus size={16} />
                  New Project
                </Button>
                <Button
                  variant="outline"
                  className="h-auto rounded-[10px] px-7 py-3.5 text-[0.9375rem] font-medium text-white bg-white/8 border-white/18 hover:bg-white/15 hover:text-white hover:-translate-y-px disabled:opacity-40"
                  onClick={() => { void handleOpenProject() }}
                  disabled={isBusy}
                >
                  <IconFolderOpen size={16} />
                  Open Existing
                </Button>
              </>
            ) : (
              <p className="text-[0.8125rem] text-center text-white/50">
                Endpapers requires Chrome or Edge for local file access.
              </p>
            )}
          </div>
          <div className="flex gap-3.5 flex-wrap justify-center mt-5">
            <Button
              variant="outline"
              className="h-auto rounded-[10px] px-7 py-3.5 text-[0.9375rem] font-medium text-white bg-white/8 border-white/18 hover:bg-white/15 hover:text-white hover:-translate-y-px"
              onClick={() => { openDemoProject(); navigate('/editor') }}
            >
              Try the Demo
            </Button>
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

        {/* AI Tools */}
        <div className="mb-14">
          <Card className="p-7 gap-0">
            <CardContent className="p-0 flex flex-col sm:flex-row items-start gap-5">
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
                <Button
                  variant="link"
                  className="h-auto p-0 text-accent text-[0.875rem] gap-1"
                  onClick={() => navigate('/ai')}
                >
                  Learn more
                  <IconArrowRight size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
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
                <FooterLink onClick={() => navigate('/pricing')}>Pricing</FooterLink>
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
