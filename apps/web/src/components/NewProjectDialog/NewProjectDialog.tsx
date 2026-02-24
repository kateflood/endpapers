import { useState, useEffect, useRef } from 'react'
import Button from '../Button/Button'
import Dialog from '../Dialog'

interface Props {
  onConfirm: (title: string) => void
  onCancel: () => void
}

export default function NewProjectDialog({ onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (trimmed) onConfirm(trimmed)
  }

  return (
    <Dialog title="New project" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="p-6 pt-5">
        <input
          ref={inputRef}
          className="w-full px-3 py-2.5 font-sans text-[0.9375rem] text-text bg-bg border border-border rounded-sm outline-none transition-colors focus:border-accent placeholder:text-text-placeholder mb-5"
          type="text"
          placeholder="Project title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!title.trim()}>
            Choose folder
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
