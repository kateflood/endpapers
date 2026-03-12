import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '../components/shared/icons'
import { logoFullWhite } from '@endpapers/assets'
import { Card, CardContent } from '@/components/ui/card'

export default function ContactScreen() {
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
        <h1 className="text-2xl font-semibold text-text mb-4">Contact</h1>

        <div className="space-y-4 text-[0.9375rem] text-text-secondary leading-relaxed">
          <p>
            We'd love to hear from you — whether it's a bug report, a feature request,
            or just to say hello.
          </p>

          <Card className="p-0 gap-0">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-[0.875rem] font-semibold text-text mb-1">Email</h2>
                <div className="text-text-secondary">Coming Soon!</div>
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
            </CardContent>
          </Card>
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
