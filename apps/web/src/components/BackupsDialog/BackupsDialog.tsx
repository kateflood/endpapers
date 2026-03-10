import { useState, useEffect, useRef } from 'react'
import { useProject } from '../../contexts/ProjectContext'
import { useToast } from '../../contexts/ToastContext'
import { listBackups, deleteBackup, restoreBackup, createBackup, renameBackup, formatBytes, parseBackupDate } from '../../fs/backups'
import type { BackupInfo } from '../../fs/backups'
import Dialog from '../Dialog'
import DeleteConfirmation from '../DeleteConfirmation'

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface Props {
  onClose: () => void
}

export default function BackupsDialog({ onClose }: Props) {
  const { handle, project, createManualBackup, openBackupPreview, previewBackupFilename } = useProject()
  const { showToast } = useToast()

  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  async function loadBackups() {
    if (!handle) return
    setLoading(true)
    try {
      const list = await listBackups(handle)
      setBackups(list)
    } catch {
      showToast('Failed to load backups.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBackups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])

  async function handleCreate() {
    setCreating(true)
    try {
      await createManualBackup()
      await loadBackups()
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(filename: string) {
    if (!handle) return
    try {
      await deleteBackup(handle, filename)
      setBackups(prev => prev.filter(b => b.filename !== filename))
      setConfirmingDelete(null)
      showToast('Backup deleted.', 'info')
    } catch {
      showToast('Failed to delete backup.', 'error')
    }
  }

  async function handleRestore(filename: string) {
    if (!handle) return
    const confirmed = confirm(
      `This will replace all current project files with the backup from ${formatDate(parseBackupDate(filename))}.\n\nA backup of the current state will be created first.\n\nContinue?`
    )
    if (!confirmed) return

    setRestoring(filename)
    try {
      await createBackup(handle, project?.settings?.backupRetentionCount, 'Pre-restore backup')
      await restoreBackup(handle, filename)
      showToast('Backup restored. Reloading…', 'info')
      setTimeout(() => window.location.reload(), 500)
    } catch {
      showToast('Failed to restore backup.', 'error')
      setRestoring(null)
    }
  }

  async function handlePreview(filename: string) {
    setPreviewing(filename)
    try {
      await openBackupPreview(filename)
      onClose()
    } catch {
      showToast('Failed to open backup preview.', 'error')
      setPreviewing(null)
    }
  }

  const busy = restoring !== null || previewing !== null
  const btnClass = 'px-2 h-7 rounded-sm text-[0.75rem] border border-border text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <Dialog title="Backups" width="max-w-[480px]" onClose={onClose}>
      <div className="px-4 py-4 flex flex-col gap-3 overflow-y-auto max-h-[65vh]">

        <button
          className="w-full h-9 rounded-sm text-[0.8125rem] bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCreate}
          disabled={creating || busy}
        >
          {creating ? 'Creating backup…' : 'Create backup now'}
        </button>

        {loading && (
          <p className="text-[0.8125rem] text-text-secondary text-center py-4">Loading…</p>
        )}

        {!loading && backups.length === 0 && (
          <p className="text-[0.8125rem] text-text-placeholder text-center py-4">No backups yet.</p>
        )}

        {!loading && backups.map(backup => {
          const isCurrentPreview = backup.filename === previewBackupFilename
          return (
            <div
              key={backup.filename}
              className={`rounded-sm border bg-bg ${isCurrentPreview ? 'border-accent bg-accent/[0.04]' : 'border-border'}`}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <BackupNameField
                    backup={backup}
                    handle={handle}
                    onUpdate={(name) => setBackups(prev => prev.map(b => b.filename === backup.filename ? { ...b, name } : b))}
                  />
                  <div className="text-[0.75rem] text-text-secondary">
                    {formatDate(backup.createdAt)} · {formatBytes(backup.sizeBytes)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isCurrentPreview ? (
                    <span className="text-[0.75rem] text-accent">Viewing</span>
                  ) : (
                    <button
                      className={btnClass}
                      onClick={() => handlePreview(backup.filename)}
                      disabled={busy}
                    >
                      {previewing === backup.filename ? 'Opening…' : 'Preview'}
                    </button>
                  )}
                  <button
                    className={btnClass}
                    onClick={() => handleRestore(backup.filename)}
                    disabled={busy}
                  >
                    {restoring === backup.filename ? 'Restoring…' : 'Restore'}
                  </button>
                  <button
                    className={btnClass}
                    onClick={() => setConfirmingDelete(backup.filename)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {confirmingDelete === backup.filename && (
                <DeleteConfirmation
                  name={backup.name || formatDate(backup.createdAt)}
                  onConfirm={() => handleDelete(backup.filename)}
                  onCancel={() => setConfirmingDelete(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Inline editable backup name
// ---------------------------------------------------------------------------

function BackupNameField({
  backup,
  handle,
  onUpdate,
}: {
  backup: BackupInfo
  handle: FileSystemDirectoryHandle | null
  onUpdate: (name: string | undefined) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(backup.name ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  // Sync display when backup.name changes externally (e.g. after re-fetch)
  useEffect(() => {
    if (!editing) setValue(backup.name ?? '')
  }, [backup.name, editing])

  async function save() {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed === (backup.name ?? '')) return
    if (!handle) return
    try {
      await renameBackup(handle, backup.filename, trimmed)
      onUpdate(trimmed || undefined)
    } catch {
      setValue(backup.name ?? '')
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="text-[0.8125rem] text-text bg-transparent border-b border-border outline-none w-full py-0"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(backup.name ?? ''); setEditing(false) } }}
        placeholder="Add a name…"
      />
    )
  }

  return (
    <button
      className="text-[0.8125rem] text-text truncate block text-left cursor-pointer hover:text-accent transition-colors"
      onClick={() => { setValue(backup.name ?? ''); setEditing(true) }}
      title="Click to rename"
    >
      {backup.name || 'Untitled backup'}
    </button>
  )
}
