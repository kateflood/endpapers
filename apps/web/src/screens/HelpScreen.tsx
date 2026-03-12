import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft } from '../components/shared/icons'
import { logoFullWhite } from '@endpapers/assets'
import HelpSidebar from '../components/help/HelpSidebar'
import GettingStarted from '../components/help/GettingStarted'
import KeyboardShortcuts from '../components/help/KeyboardShortcuts'
import SectionsAndGroups from '../components/help/SectionsAndGroups'
import FrontBackMatter from '../components/help/FrontBackMatter'
import ReferenceBoard from '../components/help/ReferenceBoard'
import WritingGoals from '../components/help/WritingGoals'
import ImportExport from '../components/help/ImportExport'

const TOPICS: Record<string, { title: string; component: React.FC }> = {
  'getting-started': { title: 'Getting Started', component: GettingStarted },
  'keyboard-shortcuts': { title: 'Keyboard Shortcuts', component: KeyboardShortcuts },
  'sections-and-groups': { title: 'Sections & Groups', component: SectionsAndGroups },
  'front-back-matter': { title: 'Front & Back Matter', component: FrontBackMatter },
  'reference-board': { title: 'Reference Board', component: ReferenceBoard },
  'writing-goals': { title: 'Writing Goals', component: WritingGoals },
  'import-export': { title: 'Import & Export', component: ImportExport },
}

export const TOPIC_LIST = Object.entries(TOPICS).map(([slug, { title }]) => ({ slug, title }))

export default function HelpScreen() {
  const navigate = useNavigate()
  const { topic } = useParams<{ topic: string }>()
  const active = topic && TOPICS[topic] ? topic : 'getting-started'
  const TopicComponent = TOPICS[active].component

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <nav className="dark-nav sticky top-0 z-50 h-[60px] flex items-center justify-between px-6 sm:px-10 border-b border-white/7 shrink-0">
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

      <div className="flex-1 flex overflow-hidden">
        <HelpSidebar activeTopic={active} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[600px] mx-auto px-6 py-8">
            <TopicComponent />
          </div>
        </main>
      </div>
    </div>
  )
}
