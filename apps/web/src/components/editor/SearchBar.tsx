import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { searchKey } from './searchExtension'
import { IconClose } from '../shared/icons'
import FloatingBar from '../shared/FloatingBar'

interface Props {
  editor: Editor
  onClose: () => void
}

export default function SearchBar({ editor, onClose }: Props) {
  const [findTerm, setFindTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus find input on mount
  useEffect(() => {
    findInputRef.current?.focus()
  }, [])

  // Track match count from plugin state
  useEffect(() => {
    function update() {
      const state = searchKey.getState(editor.state)
      if (state) {
        setMatchCount(state.results.length)
        setCurrentIndex(state.currentIndex)
      }
    }
    editor.on('transaction', update)
    return () => { editor.off('transaction', update) }
  }, [editor])

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleFindChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value
    setFindTerm(term)
    editor.commands.setSearchTerm(term)
  }

  const inputClass = 'h-7 px-2 text-[0.8125rem] bg-bg border border-border rounded-sm outline-none focus:border-accent w-40 text-text'
  const btnClass = 'h-7 px-2 rounded-sm text-[0.8125rem] text-text-secondary hover:bg-hover hover:text-text cursor-pointer transition-colors'

  const matchLabel = findTerm
    ? matchCount === 0
      ? 'No matches'
      : `${currentIndex + 1} / ${matchCount}`
    : ''

  return (
    <FloatingBar className="flex items-center gap-2 ml-auto mr-3 mt-1.5 px-3 h-10 w-fit">
      {/* Find */}
      <input
        ref={findInputRef}
        type="text"
        placeholder="Find…"
        className={inputClass}
        value={findTerm}
        onChange={handleFindChange}
      />
      {matchLabel && (
        <span className="text-[0.75rem] text-text-secondary shrink-0">{matchLabel}</span>
      )}
      <button type="button" className={btnClass} onClick={() => editor.commands.previousSearchResult()} aria-label="Previous match">◀</button>
      <button type="button" className={btnClass} onClick={() => editor.commands.nextSearchResult()} aria-label="Next match">▶</button>

      <div className="w-px h-4 bg-border mx-1 shrink-0" />

      {/* Replace */}
      <input
        type="text"
        placeholder="Replace…"
        className={inputClass}
        value={replaceTerm}
        onChange={e => setReplaceTerm(e.target.value)}
      />
      <button
        type="button"
        className={btnClass}
        onClick={() => editor.commands.replaceCurrentSearchResult(replaceTerm)}
      >
        Replace
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={() => editor.commands.replaceAllSearchResults(replaceTerm)}
      >
        All
      </button>

      <div className="w-px h-4 bg-border mx-1 shrink-0" />

      {/* Close */}
      <button type="button" className={btnClass} onClick={onClose} aria-label="Close find bar"><IconClose size={14} /></button>
    </FloatingBar>
  )
}
