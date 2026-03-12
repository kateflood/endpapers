import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCheckCircle, IconShield, IconArrowRight, IconSparkles } from '../components/shared/icons'
import { logoFullWhite } from '@endpapers/assets'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function PricingScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Nav */}
      <nav className="dark-nav sticky top-0 z-50 h-[60px] flex items-center justify-between px-6 sm:px-10 border-b border-white/7">
        <button
          className="flex items-center gap-2 text-[0.8125rem] text-white/65 hover:text-white cursor-pointer transition-colors"
          onClick={() => navigate('/')}
        >
          <IconArrowLeft size={16} />
          Back
        </button>
        <a href="/" className="flex items-center gap-3 no-underline">
          <img src={logoFullWhite} alt="Endpapers" className="h-7" />
        </a>
        <div className="w-[60px]" />
      </nav>

      <main className="flex-1 max-w-[900px] mx-auto w-full px-6 sm:px-10 py-16">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-serif font-normal text-3xl text-text mb-3">Simple, honest pricing</h1>
          <p className="text-text-secondary max-w-[480px] mx-auto leading-relaxed">
            Endpapers is free to use. Premium features are coming — and will always be optional.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-14">

          {/* Free tier */}
          <Card className="p-7 gap-0 flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1">
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
              <Button
                className="btn-cta w-full rounded-[10px] h-auto px-6 py-3 text-[0.9375rem] font-medium text-white border-0 hover:-translate-y-px"
                onClick={() => navigate('/')}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          {/* Premium tier */}
          <Card className="relative p-7 gap-0 flex flex-col overflow-hidden">
            <Badge className="absolute top-4 right-4 bg-amber-50 text-accent border-0 rounded-full text-[0.6875rem] font-semibold tracking-wide uppercase h-auto py-0.5 px-3">
              Coming soon
            </Badge>
            <CardContent className="p-0 flex flex-col flex-1">
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
              <Button
                className="w-full rounded-[10px] h-auto px-6 py-3 text-[0.9375rem] font-medium opacity-50 bg-border text-text-secondary border-0"
                disabled
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Privacy note */}
        <div className="dark-privacy rounded-2xl px-8 sm:px-12 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
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

      {/* Footer */}
      <footer className="py-10 px-6 sm:px-10 bg-navy border-t border-white/7 mt-auto">
        <div className="max-w-[900px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <img src={logoFullWhite} alt="Endpapers" className="h-6" />
          <p className="text-[0.75rem] text-white/30">
            &copy; {new Date().getFullYear()} Endpapers. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  )
}
