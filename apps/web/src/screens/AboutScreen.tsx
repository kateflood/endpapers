import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '../components/shared/icons'
import { logoFullWhite } from '@endpapers/assets'

export default function AboutScreen() {
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
        <h1 className="text-2xl font-semibold text-text mb-4">About Endpapers</h1>

        <div className="space-y-4 text-[0.9375rem] text-text-secondary leading-relaxed">
          <p>
            Endpapers is a focused writing app built for authors, essayists, and anyone who
            takes their writing seriously. We believe your words belong to you — not locked
            in a cloud service, not gated behind a subscription, and not dependent on an
            internet connection.
          </p>
          <p>
            Your projects are stored as plain files on your computer. You can open them in
            any text editor, back them up however you like, and keep them forever. No
            account required.
          </p>
          <p>
            Endpapers gives you the tools to organize your work — sections, groups,
            reference boards, writing goals — without getting in the way of the writing
            itself. A distraction-free editor, a clean interface, and nothing more than
            what you need.
          </p>

          <h2 className="text-lg font-semibold text-text pt-4">Our principles</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong className="text-text">Privacy first.</strong> Your writing never leaves your machine unless you choose to share it.</li>
            <li><strong className="text-text">Open formats.</strong> Plain Markdown files and JSON — no proprietary lock-in.</li>
            <li><strong className="text-text">Offline capable.</strong> No internet connection required to write, organize, or export.</li>
            <li><strong className="text-text">Writer focused.</strong> Every feature is designed for the writing process, not for showing off technology.</li>
          </ul>
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
