import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { SectionManifestEntry, ProjectSettings } from '@endpapers/types'
import { countWords, estimatePages, findSectionTitle } from '@endpapers/utils'
import { useProject } from '../../contexts/ProjectContext'
import { useToast } from '../../contexts/ToastContext'
import { readSectionFile, writeSectionFile } from '../../fs/projectFs'
import { IconClose, IconClock } from '../shared/icons'
import FloatingBar from '../shared/FloatingBar'
import SearchBar from './SearchBar'
import ExportDialog from '../dialogs/ExportDialog'

function findSectionFile(sections: SectionManifestEntry[], id: string): string | null {
  for (const entry of sections) {
    if (entry.type === 'section' && entry.id === id) return entry.file ?? null
    if (entry.type === 'group' && entry.children) {
      for (const child of entry.children) {
        if (child.id === id) return child.file ?? null
      }
    }
  }
  return null
}

const DEFAULTS: ProjectSettings = {
  spellCheck: true,
  paperMode: true,
  darkMode: false,
  font: 'Inter, sans-serif',
  fontSize: 16,
  wordsPerPage: 250,
  showWordCount: true,
}

interface RichTextEditorProps {
  editor: Editor | null
  focusMode?: boolean
  onExitFocus: () => void
  totalWords: number
  goalProgress: number
  goalInfo: GoalInfo | null
  searchOpen: boolean
  onOpenSearch: () => void
  onCloseSearch: () => void
  exportOpen: boolean
  onCloseExport: () => void
}

/** Map a character offset in editor.getText() output to a ProseMirror position. */
function textOffsetToPos(doc: ProseMirrorNode, targetOffset: number): number | null {
  let textOffset = 0
  let result: number | null = null
  let isFirstBlock = true

  doc.descendants((node, pos) => {
    if (result !== null) return false
    if (node.isTextblock) {
      if (!isFirstBlock) {
        textOffset += 2
        if (targetOffset <= textOffset) {
          result = pos + 1
          return false
        }
      }
      isFirstBlock = false
    }
    if (node.isText && node.text) {
      const len = node.text.length
      if (textOffset + len > targetOffset) {
        result = pos + (targetOffset - textOffset)
        return false
      }
      textOffset += len
    }
  })

  if (result === null && targetOffset === textOffset) {
    result = doc.content.size
  }
  return result
}

export interface RichTextEditorHandle {
  getText: () => string
  replaceTextRange: (startIndex: number, endIndex: number, replacement: string) => void
  highlightTextRange: (startIndex: number, endIndex: number) => void
  clearHighlight: () => void
}

export interface GoalInfo {
  label: string
  current: number
  target: number
}

function GoalRing({ progress, goalInfo }: { progress: number; goalInfo: GoalInfo | null }) {
  const r = 6
  const circumference = 2 * Math.PI * r
  const noGoal = progress < 0
  const offset = circumference - Math.min(1, Math.max(0, progress)) * circumference
  const met = progress >= 1
  const pct = Math.min(100, Math.round(progress * 100))
  return (
    <span className="group/goal relative flex items-center">
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
        <circle cx="8" cy="8" r={r} fill="none" stroke="#E2E8F0" strokeWidth="2" />
        {!noGoal && (
          <circle cx="8" cy="8" r={r} fill="none" stroke={met ? '#48BB78' : '#B45309'}
            strokeWidth="2" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform="rotate(-90 8 8)" className="transition-all duration-500"
          />
        )}
      </svg>
      {goalInfo && (
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-44 opacity-0 group-hover/goal:opacity-100 transition-opacity duration-150 z-50">
          <div className="bg-surface border border-border rounded-lg shadow-md px-3 py-2.5">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[0.75rem] font-medium text-text">{goalInfo.label}</span>
              <span className={`text-[0.75rem] tabular-nums ${met ? 'text-accent font-medium' : 'text-text-secondary'}`}>
                {goalInfo.current.toLocaleString()} / {goalInfo.target.toLocaleString()}
              </span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${met ? 'bg-[#48BB78]' : 'bg-accent'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[0.6875rem] text-text-placeholder mt-1.5">{pct}% complete</p>
          </div>
        </div>
      )}
    </span>
  )
}

function FooterStats({
  sectionWords,
  totalWords,
  wordsPerPage,
  goalProgress,
  goalInfo,
}: {
  sectionWords: number
  totalWords: number
  wordsPerPage: number
  goalProgress: number
  goalInfo: GoalInfo | null
}) {
  const sectionPages = estimatePages(sectionWords, wordsPerPage)
  const totalPages = estimatePages(totalWords, wordsPerPage)
  const readMin = Math.max(1, Math.ceil(totalWords / 200))

  return (
    <FloatingBar className="flex items-center ml-auto mr-3 mb-3 px-4 h-8 w-fit gap-4 text-[0.75rem] text-text-secondary">
      <span><strong className="font-medium text-text-secondary">{sectionWords.toLocaleString()}</strong> words</span>
      <span><strong className="font-medium text-text-secondary">~{sectionPages}</strong> {sectionPages === 1 ? 'pg' : 'pgs'}</span>
      <div className="w-px h-3.5 bg-border" />
      <span><strong className="font-medium text-text-secondary">{totalWords.toLocaleString()}</strong> total</span>
      <span><strong className="font-medium text-text-secondary">~{totalPages}</strong> {totalPages === 1 ? 'pg' : 'pgs'}</span>
      <div className="w-px h-3.5 bg-border" />
      <span className="flex items-center gap-1">
        <IconClock size={11} />
        <strong className="font-medium text-text-secondary">~{readMin} min</strong> read
      </span>
      {goalProgress >= 0 && (
        <>
          <div className="w-px h-3.5 bg-border" />
          <span className="flex items-center gap-1.5">
            <GoalRing progress={goalProgress} goalInfo={goalInfo} />
            <strong className="font-medium text-text-secondary">{Math.round(goalProgress * 100)}%</strong> goal
          </span>
        </>
      )}
    </FloatingBar>
  )
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor({
  editor,
  focusMode = false,
  onExitFocus,
  totalWords,
  goalProgress,
  goalInfo,
  searchOpen,
  onOpenSearch,
  onCloseSearch,
  exportOpen,
  onCloseExport,
}, ref) {
  const { project, handle, activeSectionId, sectionWordCounts, updateSectionWordCount } = useProject()
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const settings: ProjectSettings = { ...DEFAULTS, ...project?.settings }
  const font = settings.font
  const fontSize = settings.fontSize
  const [loading, setLoading] = useState(false)
  const [exitBtnVisible, setExitBtnVisible] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show exit button on mouse movement in focus mode, hide after 2s of inactivity
  useEffect(() => {
    if (!focusMode) return
    function onMouseMove() {
      setExitBtnVisible(true)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setExitBtnVisible(false), 2000)
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [focusMode])

  // Refs so editor callbacks always have the current values
  const handleRef = useRef(handle)
  useEffect(() => { handleRef.current = handle }, [handle])

  const activeSectionIdRef = useRef(activeSectionId)
  useEffect(() => { activeSectionIdRef.current = activeSectionId }, [activeSectionId])

  const updateWordCountRef = useRef(updateSectionWordCount)
  useEffect(() => { updateWordCountRef.current = updateSectionWordCount }, [updateSectionWordCount])

  const activeFileRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Attach update handler to editor
  useEffect(() => {
    if (!editor) return
    function onUpdate({ editor: e }: { editor: Editor }) {
      if (!activeFileRef.current) return
      const file = activeFileRef.current
      if (handleRef.current) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          writeSectionFile(handleRef.current!, file, e.getHTML())
            .catch(() => showToast('Failed to save section.', 'error'))
        }, 500)
      }
      const text = e.getText()
      if (activeSectionIdRef.current) {
        updateWordCountRef.current(activeSectionIdRef.current, countWords(text))
      }
    }
    editor.on('update', onUpdate)
    return () => { editor.off('update', onUpdate) }
  }, [editor, showToast])

  useImperativeHandle(ref, () => ({
    getText: () => editor?.getText() ?? '',
    replaceTextRange: (startIndex: number, endIndex: number, replacement: string) => {
      if (!editor) return
      const from = textOffsetToPos(editor.state.doc, startIndex)
      const to = textOffsetToPos(editor.state.doc, endIndex)
      if (from !== null && to !== null) {
        editor.chain().focus().insertContentAt({ from, to }, replacement).run()
      }
    },
    highlightTextRange: (startIndex: number, endIndex: number) => {
      if (!editor) return
      const from = textOffsetToPos(editor.state.doc, startIndex)
      const to = textOffsetToPos(editor.state.doc, endIndex)
      if (from !== null && to !== null) {
        editor.commands.setAIHighlight(from, to)
        requestAnimationFrame(() => {
          const el = editor.view.dom.querySelector('.ai-highlight, .ai-highlight-caret')
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      }
    },
    clearHighlight: () => {
      if (!editor) return
      editor.commands.clearAIHighlight()
    },
  }), [editor])

  // Cmd/Ctrl+F → open search bar
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && activeSectionId) {
        e.preventDefault()
        onOpenSearch()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeSectionId, onOpenSearch])

  // Load section when activeSectionId changes; flush any pending save first
  useEffect(() => {
    if (!handle || !project || !editor) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (activeFileRef.current) {
      writeSectionFile(handle, activeFileRef.current, editor.getHTML())
        .catch(() => showToast('Failed to save section.', 'error'))
    }

    if (!activeSectionId) {
      activeFileRef.current = null
      editor.commands.setContent('')
      return
    }

    const file =
      findSectionFile(project.sections, activeSectionId) ??
      findSectionFile(project.extras ?? [], activeSectionId) ??
      findSectionFile(project.frontMatter ?? [], activeSectionId) ??
      findSectionFile(project.backMatter ?? [], activeSectionId)
    if (!file) return

    activeFileRef.current = file
    setLoading(true)
    readSectionFile(handle, file)
      .then(html => {
        editor.commands.setContent(html || '')
        editor.commands.focus('start')
        const text = editor.getText()
        updateWordCountRef.current(activeSectionId, countWords(text))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeSectionId, handle, project, editor, showToast])

  // Flush save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const h = handleRef.current
      const file = activeFileRef.current
      if (h && file && editor) {
        void writeSectionFile(h, file, editor.getHTML())
      }
    }
  }, [editor])

  function closeSearch() {
    onCloseSearch()
    editor?.commands.setSearchTerm('')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-surface">
      {/* Focus mode exit button */}
      {focusMode && (
        <button
          className={`focus-exit-btn absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-sm text-text-placeholder hover:text-text hover:bg-hover transition-colors cursor-pointer${exitBtnVisible ? ' visible' : ''}`}
          onClick={onExitFocus}
          aria-label="Exit focus mode"
        >
          <IconClose size={16} />
        </button>
      )}

      {!focusMode && searchOpen && editor && (
        <SearchBar editor={editor} onClose={closeSearch} />
      )}

      <div className={`flex-1 overflow-y-auto scrollbar-none${settings.paperMode && !focusMode && !isMobile ? ' bg-surface py-10 px-6' : ''}`}>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[0.9375rem] text-text-placeholder">Loading…</p>
          </div>
        )}
        {!loading && !activeSectionId && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[0.9375rem] text-text-placeholder">Select a section to start writing.</p>
          </div>
        )}
        {!loading && activeSectionId && (
          <div
            className={settings.paperMode && !focusMode && !isMobile
              ? 'max-w-[680px] mx-auto bg-surface shadow-[0_2px_12px_rgba(0,0,0,0.08)] px-16 pt-16 pb-24 min-h-[900px]'
              : 'max-w-[680px] mx-auto px-12 py-10 min-h-full'
            }
            style={{ fontFamily: font, fontSize: `${fontSize}px` }}
            onClick={() => editor?.commands.focus()}
          >
            <EditorContent editor={editor} spellCheck={settings.spellCheck} />
          </div>
        )}
      </div>

      {!focusMode && activeSectionId && !loading && (
        <FooterStats
          sectionWords={sectionWordCounts[activeSectionId] ?? 0}
          totalWords={totalWords}
          wordsPerPage={settings.wordsPerPage}
          goalProgress={goalProgress}
          goalInfo={goalInfo}
        />
      )}

      {exportOpen && activeSectionId && editor && (
        <ExportDialog
          sectionContext={{
            title: findSectionTitle(project?.sections ?? [], activeSectionId)
              ?? findSectionTitle(project?.extras ?? [], activeSectionId)
              ?? findSectionTitle(project?.frontMatter ?? [], activeSectionId)
              ?? findSectionTitle(project?.backMatter ?? [], activeSectionId)
              ?? 'Untitled',
            html: editor.getHTML(),
          }}
          onClose={onCloseExport}
        />
      )}
    </div>
  )
})

export default RichTextEditor
