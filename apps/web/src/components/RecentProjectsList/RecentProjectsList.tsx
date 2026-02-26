import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RecentProject } from '../../db/recents'
import { removeRecent, touchRecent } from '../../db/recents'
import { requestPermissionForHandle, readProjectJson, readWritingLog } from '../../fs/projectFs'
import { useProject } from '../../contexts/ProjectContext'

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
    <ul className="list-none border border-border rounded-md overflow-hidden">
      {recents.map(item => (
        <li key={item.id} className="border-b border-border last:border-b-0">
          <div
            className="group flex items-center gap-2 px-4 py-3.5 cursor-pointer transition-colors hover:bg-hover"
            onClick={() => { void handleOpen(item) }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[0.9375rem] text-text truncate">{item.title}</div>
              <div className="text-[0.8125rem] text-text-secondary mt-0.5">
                {formatDate(item.lastOpened)}
              </div>
            </div>
            <button
              className="bg-transparent border-0 cursor-pointer text-text-secondary px-1.5 py-1 leading-none text-lg rounded-sm opacity-0 group-hover:opacity-100 transition-all hover:text-text"
              onClick={e => { e.stopPropagation(); void handleRemove(item.id) }}
              aria-label="Remove from recents"
            >
              ×
            </button>
          </div>
          {itemErrors[item.id] && (
            <div className="text-[0.8125rem] text-danger px-4 py-2 bg-danger-surface border-t border-border">
              {itemErrors[item.id]}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
