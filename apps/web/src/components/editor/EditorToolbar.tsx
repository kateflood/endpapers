import { useRef } from 'react'
import type { Editor } from '@tiptap/core'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  IconUndo, IconRedo,
  IconH1, IconH2, IconH3,
  IconBold, IconItalic, IconUnderline, IconStrike, IconHighlight, IconCode,
  IconBulletList, IconOrderedList, IconBlockquote,
  IconAlignLeft, IconAlignCenter, IconAlignRight,
  IconImage, IconSearch, IconDownload, IconType,
} from '../shared/icons'

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
  defaultFont: string
  defaultFontSize: number
  onSearch: () => void
  searchActive: boolean
  onExport: () => void
}

export default function EditorToolbar({
  editor,
  defaultFont,
  defaultFontSize,
  onSearch,
  searchActive,
  onExport,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)

  const btnBase = 'w-7 h-7 flex items-center justify-center rounded-sm cursor-pointer transition-colors shrink-0'
  const btnActive = 'bg-active text-text'
  const btnInactive = 'text-text-secondary hover:bg-hover hover:text-text'
  const selectClass = 'h-7 px-1.5 rounded-sm text-[0.875rem] text-text bg-transparent border-none outline-none cursor-pointer hover:bg-hover transition-colors shrink-0'
  const sep = <Separator orientation="vertical" className="h-4 mx-1 shrink-0 self-center" />

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

  // Determine active heading icon for trigger
  function activeHeadingIcon() {
    if (!editor) return <IconType size={ICON_SIZE} />
    if (editor.isActive('heading', { level: 1 })) return <IconH1 size={ICON_SIZE} />
    if (editor.isActive('heading', { level: 2 })) return <IconH2 size={ICON_SIZE} />
    if (editor.isActive('heading', { level: 3 })) return <IconH3 size={ICON_SIZE} />
    return <IconType size={ICON_SIZE} />
  }

  // Determine active list icon for trigger
  function activeListIcon() {
    if (!editor) return <IconBulletList size={ICON_SIZE} />
    if (editor.isActive('orderedList')) return <IconOrderedList size={ICON_SIZE} />
    if (editor.isActive('blockquote')) return <IconBlockquote size={ICON_SIZE} />
    return <IconBulletList size={ICON_SIZE} />
  }

  // Determine active alignment icon for trigger
  function activeAlignIcon() {
    if (!editor) return <IconAlignLeft size={ICON_SIZE} />
    if (editor.isActive({ textAlign: 'center' })) return <IconAlignCenter size={ICON_SIZE} />
    if (editor.isActive({ textAlign: 'right' })) return <IconAlignRight size={ICON_SIZE} />
    return <IconAlignLeft size={ICON_SIZE} />
  }

  const isHeadingActive = editor
    ? editor.isActive('heading', { level: 1 }) || editor.isActive('heading', { level: 2 }) || editor.isActive('heading', { level: 3 })
    : false
  const isListActive = editor
    ? editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('blockquote')
    : false
  const isAlignActive = editor
    ? editor.isActive({ textAlign: 'center' }) || editor.isActive({ textAlign: 'right' })
    : false

  const dropdownTriggerClass = `${btnBase} ${isHeadingActive ? btnActive : btnInactive}`
  const listTriggerClass = `${btnBase} ${isListActive ? btnActive : btnInactive}`
  const alignTriggerClass = `${btnBase} ${isAlignActive ? btnActive : btnInactive}`

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto flex-1 scrollbar-none">

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


          {/* Heading dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title="Heading style" className={dropdownTriggerClass}>
                {activeHeadingIcon()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                <IconType size={13} className="mr-2" /> Paragraph
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                <IconH1 size={13} className="mr-2" /> Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <IconH2 size={13} className="mr-2" /> Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                <IconH3 size={13} className="mr-2" /> Heading 3
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {sep}

          {/* Inline marks */}
          {iconBtn(<IconBold size={ICON_SIZE} />, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold')}
          {iconBtn(<IconItalic size={ICON_SIZE} />, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic')}
          {iconBtn(<IconUnderline size={ICON_SIZE} />, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Underline')}
          {iconBtn(<IconStrike size={ICON_SIZE} />, editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Strikethrough')}
          {iconBtn(<IconHighlight size={ICON_SIZE} />, editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), 'Highlight')}
          {iconBtn(<IconCode size={ICON_SIZE} />, editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), 'Inline code')}

          {sep}

          {/* Lists + blockquote dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title="Lists" className={listTriggerClass}>
                {activeListIcon()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[150px]">
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <IconBulletList size={13} className="mr-2" /> Bullet List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <IconOrderedList size={13} className="mr-2" /> Numbered List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <IconBlockquote size={13} className="mr-2" /> Blockquote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {sep}

          {/* Alignment dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title="Text alignment" className={alignTriggerClass}>
                {activeAlignIcon()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[130px]">
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                <IconAlignLeft size={13} className="mr-2" /> Left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                <IconAlignCenter size={13} className="mr-2" /> Center
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                <IconAlignRight size={13} className="mr-2" /> Right
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {sep}

          {/* Image upload */}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          {iconBtn(<IconImage size={ICON_SIZE} />, false, () => imageInputRef.current?.click(), 'Insert image')}

          {sep}

          {/* Undo / Redo */}
          {iconBtn(<IconUndo size={ICON_SIZE} />, false, () => editor.chain().focus().undo().run(), 'Undo')}
          {iconBtn(<IconRedo size={ICON_SIZE} />, false, () => editor.chain().focus().redo().run(), 'Redo')}

          {sep}

          {/* Search + Export */}
          {iconBtn(<IconSearch size={ICON_SIZE} />, searchActive, onSearch, 'Search & replace')}
          {iconBtn(<IconDownload size={ICON_SIZE} />, false, onExport, 'Export section')}
        </>
      )}
    </div>
  )
}
