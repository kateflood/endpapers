import { useNavigate } from 'react-router-dom'
import { TOPIC_LIST } from '../../screens/HelpScreen'

interface Props {
  activeTopic: string
}

export default function HelpSidebar({ activeTopic }: Props) {
  const navigate = useNavigate()

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-surface overflow-y-auto py-3 px-2">
      <nav className="flex flex-col gap-0.5">
        {TOPIC_LIST.map(({ slug, title }) => (
          <button
            key={slug}
            className={`text-left px-3 py-1.5 rounded-sm text-[0.8125rem] transition-colors cursor-pointer ${
              slug === activeTopic
                ? 'text-text bg-active font-medium'
                : 'text-text-secondary hover:text-text hover:bg-hover'
            }`}
            onClick={() => navigate(`/help/${slug}`)}
          >
            {title}
          </button>
        ))}
      </nav>
    </aside>
  )
}
