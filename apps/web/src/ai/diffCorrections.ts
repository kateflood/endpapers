// Compute ProofCorrection[] by diffing original text against corrected text

import type { ProofCorrection } from './types'

interface Token {
  text: string
  start: number // character offset in source string
  end: number   // character offset (exclusive) in source string
}

/** Tokenise into words + whitespace runs, tracking character offsets. */
function tokenize(s: string): Token[] {
  const tokens: Token[] = []
  const re = /(\S+|\s+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length })
  }
  return tokens
}

/**
 * Compute the longest common subsequence table for two token arrays,
 * comparing by token text.
 */
function lcsTable(a: Token[], b: Token[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1].text === b[j - 1].text) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp
}

interface DiffOp {
  type: 'equal' | 'delete' | 'insert' | 'replace'
  origTokens: Token[] // tokens from original (empty for inserts)
  corrTokens: Token[] // tokens from corrected (empty for deletes)
}

/** Back-trace the LCS table to produce diff operations. */
function backtrack(a: Token[], b: Token[], dp: number[][]): DiffOp[] {
  const ops: DiffOp[] = []
  let i = a.length
  let j = b.length

  // Collect raw equal/delete/insert ops
  const raw: { type: 'equal' | 'delete' | 'insert'; aIdx?: number; bIdx?: number }[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1].text === b[j - 1].text) {
      raw.push({ type: 'equal', aIdx: i - 1, bIdx: j - 1 })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ type: 'insert', bIdx: j - 1 })
      j--
    } else {
      raw.push({ type: 'delete', aIdx: i - 1 })
      i--
    }
  }

  raw.reverse()

  // Merge consecutive delete+insert into replace, group into DiffOps
  let ri = 0
  while (ri < raw.length) {
    const r = raw[ri]
    if (r.type === 'equal') {
      ops.push({ type: 'equal', origTokens: [a[r.aIdx!]], corrTokens: [b[r.bIdx!]] })
      ri++
    } else {
      // Collect consecutive non-equal entries
      const delTokens: Token[] = []
      const insTokens: Token[] = []
      while (ri < raw.length && raw[ri].type !== 'equal') {
        if (raw[ri].type === 'delete') delTokens.push(a[raw[ri].aIdx!])
        if (raw[ri].type === 'insert') insTokens.push(b[raw[ri].bIdx!])
        ri++
      }
      if (delTokens.length > 0 && insTokens.length > 0) {
        ops.push({ type: 'replace', origTokens: delTokens, corrTokens: insTokens })
      } else if (delTokens.length > 0) {
        ops.push({ type: 'delete', origTokens: delTokens, corrTokens: [] })
      } else {
        ops.push({ type: 'insert', origTokens: [], corrTokens: insTokens })
      }
    }
  }

  return ops
}

/**
 * Given original text and a model-corrected version, compute the set of
 * corrections as `{ startIndex, endIndex, correction }` in the original text.
 */
export function computeCorrections(original: string, corrected: string): ProofCorrection[] {
  if (original === corrected) return []

  const origTokens = tokenize(original)
  const corrTokens = tokenize(corrected)
  const dp = lcsTable(origTokens, corrTokens)
  const ops = backtrack(origTokens, corrTokens, dp)

  const corrections: ProofCorrection[] = []

  for (const op of ops) {
    if (op.type === 'equal') continue

    // Determine the range in the original text
    let startIndex: number
    let endIndex: number

    if (op.origTokens.length > 0) {
      startIndex = op.origTokens[0].start
      endIndex = op.origTokens[op.origTokens.length - 1].end
    } else {
      // Pure insertion — zero-width range at the position of the insert
      // Find the position: after the last equal token before this op
      // We use the end of the last original token we've seen
      const prevOp = corrections.length > 0
        ? corrections[corrections.length - 1].endIndex
        : 0
      startIndex = prevOp
      endIndex = prevOp
    }

    const correction = op.corrTokens.map(t => t.text).join('')

    // Skip pure whitespace changes
    const origSpan = original.slice(startIndex, endIndex)
    if (origSpan.trim() === '' && correction.trim() === '') continue

    corrections.push({ startIndex, endIndex, correction })
  }

  return corrections
}
