import { useRef } from 'react'
import type { Editor } from '@tiptap/core'
import {
  IconUndo, IconRedo,
  IconH1, IconH2, IconH3,
  IconBold, IconItalic, IconUnderline, IconStrike, IconHighlight, IconCode,
  IconBulletList, IconOrderedList, IconBlockquote,
  IconAlignLeft, IconAlignCenter, IconAlignRight,
  IconImage, IconSearch, IconDownload,
  IconPanelLeft, IconMaximize, IconMinimize,
} from '../icons'

export const FONTS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Palatino', value: 'Palatino, serif' },
  { label: 'Baskerville', value: 'Baskerville, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Futura', value: 'Futura, "Century Gothic", sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
]

export const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48, 72]

const ICON_SIZE = 15

interface Props {
  editor: Editor | null
  searchOpen: boolean
  onToggleSearch: () => void
  onExportSection: () => void
  defaultFont: string
  defaultFontSize: number
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onToggleFocus: () => void
  focusMode: boolean
  focusModeEnabled: boolean
}

export default function EditorToolbar({
  editor,
  searchOpen,
  onToggleSearch,
  onExportSection,
  defaultFont,
  defaultFontSize,
  sidebarOpen,
  onToggleSidebar,
  onToggleFocus,
  focusMode,
  focusModeEnabled,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)

  const btnBase = 'w-7 h-7 flex items-center justify-center rounded-sm cursor-pointer transition-colors shrink-0'
  const btnActive = 'bg-active text-text'
  const btnInactive = 'text-text-secondary hover:bg-hover hover:text-text'
  const selectClass = 'h-7 px-1.5 rounded-sm text-[0.875rem] text-text bg-transparent border-none outline-none cursor-pointer hover:bg-hover transition-colors shrink-0'
  const sep = <div className="w-px h-4 bg-border mx-1 shrink-0" />

  function iconBtn(icon: React.ReactNode, isActive: boolean, onClick: () => void, tooltip: string) {
    return (
      <button
        type="button"
        title={tooltip}
        className={`${btnBase} ${isActive ? btnActive : btnInactive}`}
        onClick={onClick}
      >
        {icon}
      </button>
    )
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex items-center px-3 h-11 border-b border-border bg-surface shrink-0 gap-0.5 overflow-x-auto">

      {/* Sidebar toggle */}
      {iconBtn(<IconPanelLeft size={ICON_SIZE} />, sidebarOpen, onToggleSidebar, 'Toggle sidebar')}

      {sep}

      {/* Formatting tools — only shown when editor is active */}
      {editor && (
        <>
          {/* Font family + size */}
          {(() => {
            const activeFont = editor.getAttributes('textStyle').fontFamily ?? defaultFont
            const activeFontSize = editor.getAttributes('textStyle').fontSize
              ? parseInt(editor.getAttributes('textStyle').fontSize as string)
              : defaultFontSize
            return (
              <>
                <select
                  className={selectClass}
                  value={activeFont}
                  onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
                  aria-label="Font family"
                >
                  {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select
                  className={`${selectClass} w-12`}
                  value={activeFontSize}
                  onChange={e => editor.chain().focus().setFontSize(`${e.target.value}px`).run()}
                  aria-label="Font size"
                >
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )
          })()}

          {sep}

          {/* Undo / Redo */}
          {iconBtn(<IconUndo size={ICON_SIZE} />, false, () => editor.chain().focus().undo().run(), 'Undo')}
          {iconBtn(<IconRedo size={ICON_SIZE} />, false, () => editor.chain().focus().redo().run(), 'Redo')}

          {sep}

          {/* Headings */}
          {iconBtn(<IconH1 size={ICON_SIZE} />, editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'Heading 1')}
          {iconBtn(<IconH2 size={ICON_SIZE} />, editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading 2')}
          {iconBtn(<IconH3 size={ICON_SIZE} />, editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Heading 3')}

          {sep}

          {/* Inline marks */}
          {iconBtn(<IconBold size={ICON_SIZE} />, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold')}
          {iconBtn(<IconItalic size={ICON_SIZE} />, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic')}
          {iconBtn(<IconUnderline size={ICON_SIZE} />, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Underline')}
          {iconBtn(<IconStrike size={ICON_SIZE} />, editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Strikethrough')}
          {iconBtn(<IconHighlight size={ICON_SIZE} />, editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), 'Highlight')}
          {iconBtn(<IconCode size={ICON_SIZE} />, editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), 'Inline code')}

          {sep}

          {/* Lists + blockquote */}
          {iconBtn(<IconBulletList size={ICON_SIZE} />, editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Bullet list')}
          {iconBtn(<IconOrderedList size={ICON_SIZE} />, editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Ordered list')}
          {iconBtn(<IconBlockquote size={ICON_SIZE} />, editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Blockquote')}

          {sep}

          {/* Text alignment */}
          {iconBtn(<IconAlignLeft size={ICON_SIZE} />, editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), 'Align left')}
          {iconBtn(<IconAlignCenter size={ICON_SIZE} />, editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), 'Align center')}
          {iconBtn(<IconAlignRight size={ICON_SIZE} />, editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), 'Align right')}

          {sep}

          {/* Image upload */}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          {iconBtn(<IconImage size={ICON_SIZE} />, false, () => imageInputRef.current?.click(), 'Insert image')}

          {sep}

          {/* Find */}
          {iconBtn(<IconSearch size={ICON_SIZE} />, searchOpen, onToggleSearch, 'Search & replace')}

          {sep}

          {/* Export section */}
          {iconBtn(<IconDownload size={ICON_SIZE} />, false, onExportSection, 'Export section')}
        </>
      )}

      {/* Right side — Focus */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onToggleFocus}
          disabled={!focusModeEnabled}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
            focusMode
              ? 'border-navy bg-navy text-white'
              : focusModeEnabled
                ? 'border-border text-text-secondary hover:border-accent hover:text-accent hover:bg-accent/5 cursor-pointer'
                : 'border-border text-text-placeholder cursor-default'
          }`}
        >
          {focusMode
            ? <IconMinimize size={12} />
            : <IconMaximize size={12} />
          }
          {focusMode ? 'Exit Focus' : 'Focus'}
        </button>
      </div>
    </div>
  )
}
