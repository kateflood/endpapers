import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconShield, IconCheckCircle, IconSparkles } from '../../components/icons'
import { logoFullWhite } from '@endpapers/assets'

export default function AIScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg flex flex-col">

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

      <main className="flex-1 max-w-[640px] mx-auto w-full px-6 sm:px-10 py-16">
        <h1 className="text-2xl font-semibold text-text mb-4">AI Tools</h1>

        <div className="space-y-4 text-[0.9375rem] text-text-secondary leading-relaxed">
          <p>
            Endpapers includes optional AI tools that help you polish your writing — without
            compromising your privacy. Every model runs directly on your device. Your text
            is never sent to a server, never stored in the cloud, and never used for training.
          </p>

          <h2 className="text-lg font-semibold text-text pt-4">How it works</h2>
          <p>
            Endpapers uses on-device AI models provided by your browser. These models are
            downloaded once and stored locally — after the initial download, everything runs
            offline with no internet connection required.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong className="text-text">On-device processing.</strong> Models run entirely in your browser using your computer's hardware.</li>
            <li><strong className="text-text">No cloud involved.</strong> Your text never leaves your machine — not even temporarily.</li>
            <li><strong className="text-text">Download once.</strong> Models are cached locally after the first download and reused across sessions.</li>
          </ul>

          <h2 className="text-lg font-semibold text-text pt-4">Available tools</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-text">Proofreader</strong> — Checks spelling and grammar,
              then presents corrections one by one. Accept or skip each suggestion, or batch-apply
              them all at once.
            </li>
            <li>
              <strong className="text-text">Summarizer</strong> — Generates key points, a TL;DR,
              a teaser, or a headline from your text. Choose the summary type and length that fits
              your needs.
            </li>
            <li className="text-text-placeholder">
              <strong>More tools coming soon</strong> — including a reviewer that gives feedback
              from different reader perspectives.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-text pt-4">Getting started</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Open your project settings and enable <strong className="text-text">AI Tools</strong> in the AI section.</li>
            <li>In the editor, click the <strong className="text-text">sparkles icon</strong> in the title bar to open the AI panel.</li>
            <li>Choose a tool and click <strong className="text-text">Run</strong>. If it's your first time, the model will download automatically — this may take a few minutes.</li>
            <li>Review the results and apply changes directly to your text.</li>
          </ol>

          <h2 className="text-lg font-semibold text-text pt-4">Privacy</h2>
          <p>
            We built these tools with the same philosophy as the rest of Endpapers: your writing
            is yours. AI features are entirely opt-in, and when you do use them, everything
            happens on your device.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong className="text-text">No data transmission.</strong> Text is processed locally — nothing is sent over the network.</li>
            <li><strong className="text-text">No telemetry.</strong> We don't track which tools you use or what you write.</li>
            <li><strong className="text-text">Fully optional.</strong> AI tools are disabled by default and can be turned off at any time in settings.</li>
          </ul>
        </div>

        {/* Privacy banner */}
        <div className="dark-privacy rounded-2xl px-8 sm:px-12 py-10 mt-12 mb-2">
          <h2 className="font-serif text-2xl font-normal text-white mb-2">
            Private by design.
          </h2>
          <p className="text-[0.875rem] leading-relaxed mb-4 text-white/60">
            Your manuscript and all AI processing stay on your computer. No accounts,
            no cloud, no compromises.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {[
              { icon: IconShield, label: 'On-device processing' },
              { icon: IconCheckCircle, label: 'No cloud' },
              { icon: IconSparkles, label: 'No account needed' },
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
      </main>

      <footer className="py-10 px-6 sm:px-10 bg-navy border-t border-white/7 mt-auto">
        <div className="max-w-[640px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <img src={logoFullWhite} alt="Endpapers" className="h-6" />
          <p className="text-[0.75rem] text-white/30">
            &copy; {new Date().getFullYear()} Endpapers. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  )
}
