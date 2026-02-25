/**
 * In-memory implementation of FileSystemDirectoryHandle.
 *
 * Used by the demo project so every component can work with a normal
 * `handle` — reads come from bundled data, writes go to memory and
 * are discarded when the project is closed.  No `isDemo` guards needed
 * anywhere in the UI.
 */

import {
  DEMO_PROJECT,
  DEMO_SECTIONS,
  DEMO_WRITING_LOG,
  DEMO_REFERENCE_COLLECTIONS,
  DEMO_REFERENCE_ITEMS,
  DEMO_REFERENCE_GRAPH,
  DEMO_REFERENCE_MANIFEST,
} from './demoContent'

// ---------------------------------------------------------------------------
// MemoryFileHandle — wraps an in-memory string
// ---------------------------------------------------------------------------

class MemoryFileHandle {
  readonly kind = 'file' as const
  readonly name: string
  private _content: string
  private _parent: MemoryDirectoryHandle

  constructor(name: string, content: string, parent: MemoryDirectoryHandle) {
    this.name = name
    this._content = content
    this._parent = parent
  }

  async getFile(): Promise<File> {
    return new File([this._content], this.name, { type: 'application/octet-stream' })
  }

  async createWritable() {
    const chunks: string[] = []
    const self = this
    return {
      async write(data: string) {
        chunks.push(data)
      },
      async close() {
        self._content = chunks.join('')
        self._parent._files.set(self.name, self)
      },
    }
  }
}

// ---------------------------------------------------------------------------
// MemoryDirectoryHandle — in-memory directory tree
// ---------------------------------------------------------------------------

class MemoryDirectoryHandle {
  readonly kind = 'directory' as const
  readonly name: string
  _files = new Map<string, MemoryFileHandle>()
  private _dirs = new Map<string, MemoryDirectoryHandle>()

  constructor(name: string) {
    this.name = name
  }

  /** Helper: seed a file with content. */
  _addFile(name: string, content: string): MemoryFileHandle {
    const fh = new MemoryFileHandle(name, content, this)
    this._files.set(name, fh)
    return fh
  }

  /** Helper: seed a subdirectory. */
  _addDir(name: string): MemoryDirectoryHandle {
    const dh = new MemoryDirectoryHandle(name)
    this._dirs.set(name, dh)
    return dh
  }

  // --- FileSystemDirectoryHandle API surface used by projectFs.ts -----------

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MemoryFileHandle> {
    let fh = this._files.get(name)
    if (!fh && options?.create) {
      fh = new MemoryFileHandle(name, '', this)
      this._files.set(name, fh)
    }
    if (!fh) throw new DOMException(`File "${name}" not found`, 'NotFoundError')
    return fh
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemoryDirectoryHandle> {
    let dh = this._dirs.get(name)
    if (!dh && options?.create) {
      dh = new MemoryDirectoryHandle(name)
      this._dirs.set(name, dh)
    }
    if (!dh) throw new DOMException(`Directory "${name}" not found`, 'NotFoundError')
    return dh
  }

  async removeEntry(name: string) {
    this._files.delete(name)
    this._dirs.delete(name)
  }

  // readAllReferenceItems uses: for await (const [name, entry] of dir)
  async *[Symbol.asyncIterator](): AsyncIterableIterator<[string, MemoryFileHandle | MemoryDirectoryHandle]> {
    for (const entry of this._files) yield entry
    for (const entry of this._dirs) yield entry
  }

  // Permission stubs (called by requestPermissionForHandle)
  async queryPermission() { return 'granted' as const }
  async requestPermission() { return 'granted' as const }
}

// ---------------------------------------------------------------------------
// Build a fully-populated demo handle
// ---------------------------------------------------------------------------

export function createDemoHandle(): FileSystemDirectoryHandle {
  const root = new MemoryDirectoryHandle('Demo Project')

  // project.json
  root._addFile('project.json', JSON.stringify(DEMO_PROJECT))

  // writing-log.json
  root._addFile('writing-log.json', JSON.stringify(DEMO_WRITING_LOG))

  // sections/
  const sectionsDir = root._addDir('sections')
  for (const [filename, html] of Object.entries(DEMO_SECTIONS)) {
    sectionsDir._addFile(filename, html)
  }

  // reference/
  const refDir = root._addDir('reference')
  refDir._addFile('collections.json', JSON.stringify(DEMO_REFERENCE_COLLECTIONS))
  refDir._addFile('graph.json', JSON.stringify(DEMO_REFERENCE_GRAPH))
  refDir._addFile('manifest.json', JSON.stringify(DEMO_REFERENCE_MANIFEST))
  for (const item of DEMO_REFERENCE_ITEMS) {
    refDir._addFile(`${item.id}.json`, JSON.stringify(item))
  }

  // assets/
  root._addDir('assets')

  // Cast: our mock implements the same runtime API surface
  return root as unknown as FileSystemDirectoryHandle
}
