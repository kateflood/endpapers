import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RecentProject } from '../../db/recents'
import { removeRecent, touchRecent } from '../../db/recents'
import { requestPermissionForHandle, readProjectJson, readWritingLog } from '../../fs/projectFs'
import { useProject } from '../../contexts/ProjectContext'
import { IconFileText, IconClose } from '../icons'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  recents: RecentProject[]
  onRecentsChanged: () => void
}

export default function RecentProjectsList({ recents, onRecentsChanged }: Props) {
  const navigate = useNavigate()
  const { openProject } = useProject()
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})

  async function handleOpen(item: RecentProject) {
    setItemErrors(prev => ({ ...prev, [item.id]: '' }))
    try {
      const granted = await requestPermissionForHandle(item.handle)
      if (!granted) {
        setItemErrors(prev => ({
          ...prev,
          [item.id]: 'Permission denied. Try opening the folder manually.',
        }))
        return
      }
      const [project, writingLog] = await Promise.all([readProjectJson(item.handle), readWritingLog(item.handle)])
      await touchRecent(item.id)
      openProject(item.handle, project, item.id, writingLog)
      navigate('/editor')
    } catch {
      setItemErrors(prev => ({
        ...prev,
        [item.id]: 'Could not open this project. The folder may have been moved or deleted.',
      }))
    }
  }

  async function handleRemove(id: string) {
    await removeRecent(id)
    onRecentsChanged()
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
      {recents.map(item => (
        <div key={item.id} className="group relative">
          <Card
            className="p-5 gap-2.5 cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(43,108,176,0.1)] hover:-translate-y-0.5 hover:ring-accent/40"
            onClick={() => { void handleOpen(item) }}
          >
            <div className="w-[38px] h-[38px] rounded-lg bg-accent/10 flex items-center justify-center">
              <IconFileText size={20} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-[0.875rem] font-semibold text-text truncate">{item.title}</div>
              <div className="text-[0.75rem] text-text-placeholder mt-0.5">{formatDate(item.lastOpened)}</div>
            </div>
          </Card>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-text-placeholder hover:text-text"
            onClick={e => { e.stopPropagation(); void handleRemove(item.id) }}
            aria-label="Remove from recents"
          >
            <IconClose size={14} />
          </Button>
          {itemErrors[item.id] && (
            <div className="text-[0.75rem] text-red-500 mt-1 px-1">
              {itemErrors[item.id]}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00')
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Opened today'
  if (diffDays === 1) return 'Opened yesterday'
  if (diffDays < 7) return `Opened ${diffDays} days ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
