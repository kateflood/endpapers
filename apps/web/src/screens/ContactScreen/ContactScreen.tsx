import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '../../components/icons'

export default function ContactScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="dark-nav sticky top-0 z-50 h-[60px] flex items-center px-6 sm:px-10 border-b border-white/7">
        <button
          className="flex items-center gap-2 text-[0.8125rem] text-white/65 hover:text-white cursor-pointer transition-colors"
          onClick={() => navigate('/')}
        >
          <IconArrowLeft size={16} />
          Back
        </button>
      </header>

      <main className="max-w-[640px] mx-auto px-6 sm:px-10 py-16">
        <h1 className="text-2xl font-semibold text-text mb-4">Contact</h1>

        <div className="space-y-4 text-[0.9375rem] text-text-secondary leading-relaxed">
          <p>
            We'd love to hear from you — whether it's a bug report, a feature request,
            or just to say hello.
          </p>

          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-[0.875rem] font-semibold text-text mb-1">Email</h2>
              <a
                href="mailto:hello@endpapers.app"
                className="text-accent hover:underline"
              >
                hello@endpapers.app
              </a>
            </div>

            <div>
              <h2 className="text-[0.875rem] font-semibold text-text mb-1">Bug reports & feature requests</h2>
              <p className="text-text-secondary">
                Found a bug or have an idea? Let us know by email and we'll look into it.
              </p>
            </div>

            <div>
              <h2 className="text-[0.875rem] font-semibold text-text mb-1">General feedback</h2>
              <p className="text-text-secondary">
                Tell us what's working, what isn't, and what you wish Endpapers could do.
                Every message gets read.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
