import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const aiHighlightKey = new PluginKey<DecorationSet>('aiHighlight')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiHighlight: {
      setAIHighlight(from: number, to: number): ReturnType
      clearAIHighlight(): ReturnType
    }
  }
}

export const AIHighlight = Extension.create({
  name: 'aiHighlight',

  addCommands() {
    return {
      setAIHighlight: (from: number, to: number) => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(aiHighlightKey, { from, to }))
        return true
      },
      clearAIHighlight: () => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(aiHighlightKey, { from: null, to: null }))
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: aiHighlightKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, prev) {
            const meta = tr.getMeta(aiHighlightKey) as { from: number | null; to: number | null } | undefined
            if (meta) {
              if (meta.from !== null && meta.to !== null) {
                if (meta.from === meta.to) {
                  // Zero-width (insertion) — show a cursor-style widget
                  const widget = document.createElement('span')
                  widget.className = 'ai-highlight-caret'
                  const deco = Decoration.widget(meta.from, widget, { side: 0 })
                  return DecorationSet.create(tr.doc, [deco])
                }
                const deco = Decoration.inline(meta.from, meta.to, { class: 'ai-highlight' })
                return DecorationSet.create(tr.doc, [deco])
              }
              return DecorationSet.empty
            }
            // Map decorations through doc changes so they stay in sync
            if (tr.docChanged) return prev.map(tr.mapping, tr.doc)
            return prev
          },
        },
        props: {
          decorations(state) {
            return aiHighlightKey.getState(state) ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})
