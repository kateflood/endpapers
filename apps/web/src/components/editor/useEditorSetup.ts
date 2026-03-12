import { useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { FontSize } from './fontSizeExtension'
import { SearchReplace } from './searchExtension'
import { AIHighlight } from './aiHighlightExtension'

export function useEditorSetup(): Editor | null {
  return useEditor({
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
    coreExtensionOptions: {
      clipboardTextSerializer: { blockSeparator: '\n' },
    },
  })
}
