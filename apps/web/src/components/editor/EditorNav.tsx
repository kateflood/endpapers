import { useNavigate } from 'react-router-dom'
import { logoFullWhite } from '@endpapers/assets'
import {
  IconFolderOpen, IconChevronDown, IconBookOpen, IconSettings, IconArchive,
} from '../shared/icons'

interface EditorNavProps {
  projectTitle: string
  sectionTitle: string | null
  showBackups: boolean
  onClose: () => void
  onBackups: () => void
}

export default function EditorNav({ projectTitle, sectionTitle, showBackups, onClose, onBackups }: EditorNavProps) {
  const navigate = useNavigate()

  const btnClass = 'flex items-center gap-1 px-2 py-1 rounded-sm text-xs text-white/45 hover:bg-white/[0.08] transition-colors cursor-pointer'

  return (
    <div className="dark-nav flex items-center gap-2 px-4 shrink-0 h-[60px]">
      <button className="flex items-center cursor-pointer shrink-0" onClick={onClose} aria-label="Home">
        <img src={logoFullWhite} alt="Endpapers" className="h-7" />
      </button>

      <div className="hidden sm:flex items-center gap-1.5 ml-3 text-xs text-white/40">
        <IconFolderOpen size={11} />
        <span className="truncate max-w-[200px]">{projectTitle || 'Untitled'}</span>
        {sectionTitle && (
          <>
            <IconChevronDown size={9} className="rotate-[-90deg] opacity-40" />
            <span className="truncate max-w-[200px] text-white/60">{sectionTitle}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {showBackups && (
          <button className={btnClass} onClick={onBackups} title="Backups">
            <IconArchive size={13} />
          </button>
        )}
        <button className={btnClass} onClick={() => navigate('/reference')} title="Reference">
          <IconBookOpen size={13} />
        </button>
        <button className={btnClass} onClick={() => navigate('/settings')} title="Settings">
          <IconSettings size={13} />
        </button>
      </div>
    </div>
  )
}
