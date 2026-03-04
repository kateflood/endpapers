import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { FontSize } from './fontSizeExtension'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { SectionManifestEntry, ProjectSettings } from '@endpapers/types'
import { countWords, estimatePages, findSectionTitle } from '@endpapers/utils'
import { useProject } from '../../contexts/ProjectContext'
import { useToast } from '../../contexts/ToastContext'
import { readSectionFile, writeSectionFile } from '../../fs/projectFs'
import { SearchReplace } from './searchExtension'
import { AIHighlight } from './aiHighlightExtension'
import { IconClose, IconClock } from '../icons'
import EditorToolbar from './EditorToolbar'
import SearchBar from './SearchBar'
import ExportDialog from '../ExportDialog/ExportDialog'

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
  focusMode?: boolean
  onExitFocus: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onToggleFocus: () => void
  focusModeEnabled: boolean
  totalWords: number
}

/** Map a character offset in editor.getText() output to a ProseMirror position. */
function textOffsetToPos(doc: ProseMirrorNode, targetOffset: number): number | null {
  let textOffset = 0
  let result: number | null = null
  let isFirstBlock = true

  doc.descendants((node, pos) => {
    if (result !== null) return false
    if (node.isTextblock) {
      // editor.getText() inserts '\n\n' between blocks by default
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

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor({
  focusMode = false,
  onExitFocus,
  sidebarOpen,
  onToggleSidebar,
  onToggleFocus,
  focusModeEnabled,
  totalWords,
}, ref) {
  const { project, handle, activeSectionId, sectionWordCounts, updateSectionWordCount } = useProject()
  const { showToast } = useToast()
  const settings: ProjectSettings = { ...DEFAULTS, ...project?.settings }
  // font/fontSize are the document defaults; inline marks override them per-selection
  const font = settings.font
  const fontSize = settings.fontSize
  const [loading, setLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
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

  // Refs so TipTap callbacks always have the current values (avoid stale closures)
  const handleRef = useRef(handle)
  useEffect(() => { handleRef.current = handle }, [handle])

  const activeSectionIdRef = useRef(activeSectionId)
  useEffect(() => { activeSectionIdRef.current = activeSectionId }, [activeSectionId])

  const updateWordCountRef = useRef(updateSectionWordCount)
  useEffect(() => { updateWordCountRef.current = updateSectionWordCount }, [updateSectionWordCount])

  const activeFileRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, underline: false }),
      SearchReplace,
      AIHighlight,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      Underline,
      Highlight,
      TextStyle,
      FontFamily,
      FontSize,
    ],
    content: '',
    onUpdate: ({ editor: e }) => {
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
    },
    coreExtensionOptions: {
      clipboardTextSerializer: {
        blockSeparator: '\n',
      },
    },
  })

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
        // Scroll the decoration into view after it renders
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
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeSectionId])

  // Load section when activeSectionId changes; flush any pending save first
  useEffect(() => {
    if (!handle || !project || !editor) return

    // Flush pending save for the previous section
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
        updateSectionWordCount(activeSectionId, countWords(text))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeSectionId, handle, project, editor])

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
    setSearchOpen(false)
    editor?.commands.setSearchTerm('')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
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
      {!focusMode && (
        <EditorToolbar
          editor={editor}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen(o => !o)}
          onExportSection={() => setExportOpen(true)}
          defaultFont={font}
          defaultFontSize={fontSize}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={onToggleSidebar}
          onToggleFocus={onToggleFocus}
          focusMode={focusMode}
          focusModeEnabled={focusModeEnabled}
        />
      )}
      <div className={`flex-1 overflow-y-auto${settings.paperMode && !focusMode ? ' bg-bg py-10 px-6' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[0.9375rem] text-text-placeholder">Loading…</p>
          </div>
        ) : !activeSectionId ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[0.9375rem] text-text-placeholder">Select a section to start writing.</p>
          </div>
        ) : (
          <div
            className={settings.paperMode && !focusMode
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
      {!focusMode && activeSectionId && !loading && (() => {
        const sectionWords = sectionWordCounts[activeSectionId] ?? 0
        const wpp = settings.wordsPerPage
        const sectionPages = estimatePages(sectionWords, wpp)
        const totalPages = estimatePages(totalWords, wpp)
        const readMin = Math.max(1, Math.ceil(totalWords / 200))
        return (
          <div className="shrink-0 border-t border-border h-8 flex items-center px-4 gap-4 text-[0.75rem] text-text-secondary bg-surface">
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
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-text-placeholder">Saved locally</span>
            </div>
          </div>
        )
      })()}
      {exportOpen && activeSectionId && editor && (() => {
        const sectionTitle =
          findSectionTitle(project?.sections ?? [], activeSectionId) ??
          findSectionTitle(project?.extras ?? [], activeSectionId) ??
          findSectionTitle(project?.frontMatter ?? [], activeSectionId) ??
          findSectionTitle(project?.backMatter ?? [], activeSectionId) ??
          'Untitled'
        return (
          <ExportDialog
            sectionContext={{ title: sectionTitle, html: editor.getHTML() }}
            onClose={() => setExportOpen(false)}
          />
        )
      })()}
    </div>
  )
})

export default RichTextEditor
