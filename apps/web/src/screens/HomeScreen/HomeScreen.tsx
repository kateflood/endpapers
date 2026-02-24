import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../../contexts/ProjectContext'
import { getAllRecents, upsertRecent } from '../../db/recents'
import type { RecentProject } from '../../db/recents'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  createProjectStructure,
  validateProjectDirectory,
  readProjectJson,
  readWritingLog,
} from '../../fs/projectFs'
import Button from '../../components/Button/Button'
import NewProjectDialog from '../../components/NewProjectDialog/NewProjectDialog'
import RecentProjectsList from '../../components/RecentProjectsList/RecentProjectsList'

export default function HomeScreen() {
  const navigate = useNavigate()
  const { openProject } = useProject()
  const [recents, setRecents] = useState<RecentProject[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const supported = isFileSystemAccessSupported()

  const loadRecents = useCallback(() => {
    void getAllRecents().then(setRecents)
  }, [])

  useEffect(() => {
    loadRecents()
  }, [loadRecents])

  async function handleNewProject(title: string) {
    setShowDialog(false)
    setIsBusy(true)
    setError(null)
    try {
      const handle = await pickDirectory()
      if (!handle) return
      const project = await createProjectStructure(handle, title, '')
      const recent: RecentProject = {
        id: project.id,
        handle,
        title: project.title,
        lastOpened: new Date().toISOString().split('T')[0],
      }
      await upsertRecent(recent)
      openProject(handle, project, project.id, { goals: {}, log: [] })
      navigate('/editor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleOpenProject() {
    setIsBusy(true)
    setError(null)
    try {
      const handle = await pickDirectory()
      if (!handle) return
      const isValid = await validateProjectDirectory(handle)
      if (!isValid) {
        setError("This folder doesn't appear to be an Endpapers project.")
        return
      }
      const [project, writingLog] = await Promise.all([readProjectJson(handle), readWritingLog(handle)])
      const recent: RecentProject = {
        id: project.id,
        handle,
        title: project.title,
        lastOpened: new Date().toISOString().split('T')[0],
      }
      await upsertRecent(recent)
      openProject(handle, project, project.id, writingLog)
      navigate('/editor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-6">
      <div className="flex flex-col items-center w-full max-w-[480px]">
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl font-normal tracking-[-.01em] text-text mb-2">
            Endpapers
          </h1>
          <p className="text-[0.9375rem] text-text-secondary">Your writing, your files.</p>
        </div>

        {supported ? (
          <div className="flex flex-col gap-2.5 w-full max-w-[280px] mb-10">
            <Button variant="primary" className="w-full" onClick={() => setShowDialog(true)} disabled={isBusy}>
              New project
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { void handleOpenProject() }} disabled={isBusy}>
              Open project
            </Button>
          </div>
        ) : (
          <p className="text-[0.9375rem] text-text-secondary text-center max-w-[320px] mb-10">
            Endpapers requires a browser that supports the File System Access API.
            Please use Chrome or Edge.
          </p>
        )}

        {error && <p className="text-[0.8125rem] text-red-700 text-center mb-6">{error}</p>}

        {recents.length > 0 ? (
          <div className="w-full mb-12">
            <p className="text-[0.6875rem] font-semibold tracking-wider uppercase text-text-secondary mb-2.5">
              Recent
            </p>
            <RecentProjectsList recents={recents} onRecentsChanged={loadRecents} />
          </div>
        ) : supported ? (
          <p className="text-[0.8125rem] text-text-placeholder text-center mb-12">
            Create a new project or open an existing folder to get started.
          </p>
        ) : null}

      </div>

      {showDialog && (
        <NewProjectDialog
          onConfirm={title => { void handleNewProject(title) }}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  )
}
