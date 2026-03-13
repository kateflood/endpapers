import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const spellHighlightKey = new PluginKey<DecorationSet>('spellHighlight')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spellHighlight: {
      setSpellHighlights(spans: Array<{ from: number; to: number }>): ReturnType
      clearSpellHighlights(): ReturnType
    }
  }
}

export const SpellHighlight = Extension.create({
  name: 'spellHighlight',

  addCommands() {
    return {
      setSpellHighlights: (spans: Array<{ from: number; to: number }>) => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(spellHighlightKey, { spans }))
        return true
      },
      clearSpellHighlights: () => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(spellHighlightKey, { spans: [] }))
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: spellHighlightKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, prev) {
            const meta = tr.getMeta(spellHighlightKey) as { spans: Array<{ from: number; to: number }> } | undefined
            if (meta) {
              if (meta.spans.length === 0) return DecorationSet.empty
              const decos = meta.spans
                .filter(s => s.from < s.to)
                .map(s => Decoration.inline(s.from, s.to, { class: 'spell-error' }))
              return DecorationSet.create(tr.doc, decos)
            }
            // Map decorations through doc changes so they stay in sync
            if (tr.docChanged) return prev.map(tr.mapping, tr.doc)
            return prev
          },
        },
        props: {
          decorations(state) {
            return spellHighlightKey.getState(state) ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})
