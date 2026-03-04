import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export const searchKey = new PluginKey<SearchPluginState>('searchReplace')

interface SearchResult {
  from: number
  to: number
}

interface SearchPluginState {
  term: string
  currentIndex: number
  results: SearchResult[]
  decorations: DecorationSet
}

function findAll(doc: ProseMirrorNode, term: string): SearchResult[] {
  if (!term.trim()) return []
  const results: SearchResult[] = []
  const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    pattern.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = pattern.exec(node.text)) !== null) {
      results.push({ from: pos + m.index, to: pos + m.index + m[0].length })
    }
  })
  return results
}

function buildDecorations(doc: ProseMirrorNode, results: SearchResult[], currentIndex: number): DecorationSet {
  if (!results.length) return DecorationSet.empty
  const decos = results.map((r, i) =>
    Decoration.inline(r.from, r.to, { class: i === currentIndex ? 'search-current' : 'search-match' })
  )
  return DecorationSet.create(doc, decos)
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchTerm(term: string): ReturnType
      nextSearchResult(): ReturnType
      previousSearchResult(): ReturnType
      replaceCurrentSearchResult(replacement: string): ReturnType
      replaceAllSearchResults(replacement: string): ReturnType
    }
  }
}

export const SearchReplace = Extension.create({
  name: 'searchReplace',

  addCommands() {
    return {
      setSearchTerm: (term: string) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(searchKey, { type: 'setTerm', term })
          const results = findAll(tr.doc, term)
          if (results.length > 0) {
            const { from, to } = results[0]
            tr.setSelection(TextSelection.create(tr.doc, from, to)).scrollIntoView()
          }
          dispatch(tr)
        }
        return true
      },
      nextSearchResult: () => ({ tr, dispatch, editor }) => {
        const state = searchKey.getState(editor.state)
        if (!state?.results.length) return false
        const next = (state.currentIndex + 1) % state.results.length
        if (dispatch) {
          tr.setMeta(searchKey, { type: 'setIndex', index: next })
          const { from, to } = state.results[next]
          tr.setSelection(TextSelection.create(tr.doc, from, to)).scrollIntoView()
          dispatch(tr)
        }
        return true
      },
      previousSearchResult: () => ({ tr, dispatch, editor }) => {
        const state = searchKey.getState(editor.state)
        if (!state?.results.length) return false
        const prev = (state.currentIndex - 1 + state.results.length) % state.results.length
        if (dispatch) {
          tr.setMeta(searchKey, { type: 'setIndex', index: prev })
          const { from, to } = state.results[prev]
          tr.setSelection(TextSelection.create(tr.doc, from, to)).scrollIntoView()
          dispatch(tr)
        }
        return true
      },
      replaceCurrentSearchResult: (replacement: string) => ({ tr, dispatch, editor }) => {
        const state = searchKey.getState(editor.state)
        if (!state?.results.length) return false
        const r = state.results[state.currentIndex]
        if (!r) return false
        if (dispatch) dispatch(tr.insertText(replacement, r.from, r.to))
        return true
      },
      replaceAllSearchResults: (replacement: string) => ({ tr, dispatch, editor }) => {
        const state = searchKey.getState(editor.state)
        if (!state?.results.length) return false
        ;[...state.results].reverse().forEach(r => {
          tr.insertText(replacement, r.from, r.to)
        })
        if (dispatch) dispatch(tr)
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchKey,
        state: {
          init(): SearchPluginState {
            return { term: '', currentIndex: 0, results: [], decorations: DecorationSet.empty }
          },
          apply(tr, prev): SearchPluginState {
            const meta = tr.getMeta(searchKey) as { type: string; term?: string; index?: number } | undefined
            let { term, currentIndex } = prev
            if (meta?.type === 'setTerm' && meta.term !== undefined) {
              term = meta.term
              currentIndex = 0
            } else if (meta?.type === 'setIndex' && meta.index !== undefined) {
              currentIndex = meta.index
            } else if (!tr.docChanged) {
              return prev
            }
            const results = findAll(tr.doc, term)
            const safeIndex = results.length ? Math.min(currentIndex, results.length - 1) : 0
            return {
              term,
              currentIndex: safeIndex,
              results,
              decorations: buildDecorations(tr.doc, results, safeIndex),
            }
          },
        },
        props: {
          decorations(state) {
            return searchKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})
