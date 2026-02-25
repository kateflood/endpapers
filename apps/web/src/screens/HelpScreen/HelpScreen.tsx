import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft } from '../../components/icons'
import HelpSidebar from './HelpSidebar'
import GettingStarted from './topics/GettingStarted'
import KeyboardShortcuts from './topics/KeyboardShortcuts'
import SectionsAndGroups from './topics/SectionsAndGroups'
import FrontBackMatter from './topics/FrontBackMatter'
import ReferenceBoard from './topics/ReferenceBoard'
import WritingGoals from './topics/WritingGoals'
import ImportExport from './topics/ImportExport'

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
      <header className="flex items-center px-4 h-12 border-b border-border bg-surface shrink-0 gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
          onClick={() => navigate('/')}
          aria-label="Back to home"
        >
          <IconArrowLeft size={16} />
        </button>
        <span className="text-[0.9375rem] font-medium text-text">Help</span>
      </header>

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
