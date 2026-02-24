import { useEffect, useRef, useState } from 'react'
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
import type { SectionManifestEntry, ProjectSettings } from '@endpapers/types'
import { countWords, countCharacters, estimatePages } from '@endpapers/utils'
import { useProject } from '../../contexts/ProjectContext'
import { useToast } from '../../contexts/ToastContext'
import { readSectionFile, writeSectionFile } from '../../fs/projectFs'
import { SearchReplace } from './searchExtension'
import EditorToolbar from './EditorToolbar'
import SearchBar from './SearchBar'

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
  paperMode: false,
  font: 'Inter, sans-serif',
  fontSize: 16,
  wordsPerPage: 250,
  showWordCount: true,
}

export default function RichTextEditor() {
  const { project, handle, activeSectionId, sectionWordCounts, updateSectionWordCount } = useProject()
  const { showToast } = useToast()
  const settings: ProjectSettings = { ...DEFAULTS, ...project?.settings }
  // font/fontSize are the document defaults; inline marks override them per-selection
  const font = settings.font
  const fontSize = settings.fontSize
  const [loading, setLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [charCount, setCharCount] = useState(0)

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
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      SearchReplace,
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
      if (!handleRef.current || !activeFileRef.current) return
      const file = activeFileRef.current
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        writeSectionFile(handleRef.current!, file, e.getHTML())
          .catch(() => showToast('Failed to save section.', 'error'))
      }, 500)
      const text = e.getText()
      setCharCount(countCharacters(text))
      if (activeSectionIdRef.current) {
        updateWordCountRef.current(activeSectionIdRef.current, countWords(text))
      }
    },
  })

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
      setCharCount(0)
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
        setCharCount(countCharacters(text))
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {searchOpen && editor && (
        <SearchBar editor={editor} onClose={closeSearch} />
      )}
      {activeSectionId && (
        <EditorToolbar
          editor={editor}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen(o => !o)}
          defaultFont={font}
          defaultFontSize={fontSize}
        />
      )}
      <div className={`flex-1 overflow-y-auto${settings.paperMode ? ' bg-bg py-10 px-6' : ''}`}>
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
            className={settings.paperMode
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
      {activeSectionId && !loading && (
        <div className="shrink-0 border-t border-border h-7 flex items-center px-4 gap-4 text-[0.75rem] text-text-secondary bg-surface">
          {(() => {
            const words = sectionWordCounts[activeSectionId] ?? 0
            const pages = Math.max(1, estimatePages(words, settings.wordsPerPage))
            return (
              <>
                <span>{words.toLocaleString()} words</span>
                <span>{pages} {pages === 1 ? 'page' : 'pages'}</span>
                <span>{charCount.toLocaleString()} characters</span>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
