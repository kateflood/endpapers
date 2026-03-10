Project Status
==============

Last updated: 2026-02-24 (session 15)

See planning/scope.md for full product decisions and planning/v1.md for the v1 milestone definition.


What's been done
----------------

Planning
- Full product scope defined (see planning/scope.md)
- V1 milestone defined with feature list, file structure, UI layout, and build order (see planning/v1.md)

Monorepo scaffolding (build order step 1 — complete)
- Turborepo + npm workspaces configured at repo root
- apps/web — Vite + React + TypeScript app scaffolded (React 19, Vite 7)
- apps/desktop, apps/mobile, apps/server — empty placeholders
- packages/types — shared TypeScript types (Project, SectionManifestEntry, MetadataItem, WritingLog, etc.)
- packages/utils — shared utilities (countWords, countCharacters, estimatePages, generateId, todayISODate)
- All packages installed and workspace symlinks verified

App shell + home screen (build order step 2 — complete)
- Scope change: no account required for local use; Firebase Auth deferred
- react-router-dom v7 + idb installed in apps/web
- React Router set up: routes for /, /editor, /settings
- ProjectContext: holds open project state (Project + FileSystemDirectoryHandle) across routes
- IndexedDB layer (db/recents.ts): stores recent projects with FileSystemDirectoryHandle for re-opening
- File System Access API layer (fs/projectFs.ts): createProjectStructure, readProjectJson, validateProjectDirectory, permission helpers
- HomeScreen: New Project flow, Open Project flow, recent projects list, browser support check
- EditorScreen placeholder: shows project title, redirects to / if no project open
- SettingsScreen placeholder
- fsapi.d.ts: ambient type declarations for showDirectoryPicker (not in TS DOM lib)

Styling (complete)
- Tailwind CSS v4 + @tailwindcss/vite — replaces CSS Modules entirely
- Design tokens defined in @theme in index.css (colors, fonts, radii)
- All component styles are inline Tailwind utility classes — no .module.css files
- Shared Button component (src/components/Button/Button.tsx) with primary/ghost variants
- Turborepo: packageManager field added to root package.json; telemetry disabled

Section management (build order step 3 — complete)
- @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities installed
- EditorScreen: 3-panel layout (header + collapsible sidebar + editor area)
- SectionsSidebar: DnD-enabled list; new section/group buttons in footer
- SectionItem: draggable row; inline rename (double-click or menu); delete via ··· menu; active highlight
- GroupItem: draggable group header; collapsible children; inline rename; add section inside; delete with confirmation
- Full drag-and-drop: reorder within flat list, within groups, and cross-container (section ↔ group ↔ top-level)
- ProjectContext extended: activeSectionId, setActiveSectionId, updateSections (writes project.json to disk)
- projectFs.ts extended: writeProjectJson, createSectionFile, deleteSectionFile, readSectionFile, writeSectionFile

Rich text editor (build order step 4 — complete)
- TipTap v3 with StarterKit; @tiptap/extension-placeholder installed
- EditorToolbar: font family select, font size select, bold, italic, find toggle
- Font/size are session-only (not persisted); default font/size saved in ProjectSettings
- Search & replace: custom ProseMirror plugin (searchExtension.ts); SearchBar UI with match counter, prev/next, replace, replace all; Cmd/Ctrl+F to open, Escape to close
- Auto-save: debounced 500ms on change; flush on section switch and unmount
- Placeholder text when section is empty; focus editor on section select
- Paper mode: white card with shadow + generous margins (toggled via settings)
- ProjectSettings in project.json: spellCheck, paperMode, font, fontSize; updateSettings in context
- Project.subtitle added to types; updateProjectMeta in context
- SectionsSidebar: shows title + subtitle (read-only, only when set) at top
- SettingsScreen: Project section (title, subtitle inputs) + Editor section (font, size, paper mode, spell check)
- EditorScreen header: settings gear icon navigates to /settings


Word & page count (build order step 5 — complete)
- sectionWordCounts: Record<string, number> in ProjectContext; updated live as sections are edited/loaded
- RichTextEditor status bar (bottom): word count + page estimate + character count for active section
- EditorScreen header: project total word count + page estimate (appears once any section has been visited)
- wordsPerPage added to ProjectSettings (default 250); configurable in Settings screen (150–350)
- estimatePages() from @endpapers/utils used throughout


Writing goals (build order step 6 — complete)
- WritingLog.lastKnownTotal added to types; used as session baseline on project open
- projectFs.ts: readWritingLog, writeWritingLog added
- ProjectContext: writingLog state + sessionStartWords; debounced flush (2s) writes delta to today's log entry and updates lastKnownTotal; updateGoals writes goals to disk
- HomeScreen + RecentProjectsList: read writing-log.json on project open, pass to openProject
- WritingGoalsPanel: right-side panel with Session / Daily / Weekly / Monthly progress bars + inline goal editing + recent log
- EditorScreen: word count in header is now a button that toggles the goals panel; sessionWords passed to panel


Reference (build order step 7 — complete, refactored session 14)
- Feature renamed from "Notes/Metadata" to "Reference" (session 9)
- Data model refactored (session 14, see planning/reference.md):
  - ReferenceItem: removed parentId (no board groups)
  - ReferenceGroup type removed entirely
  - ReferenceGraph: edges + annotations (BoardAnnotation[]), no groups
  - New ReferenceManifestEntry type: manifest-driven ordering + sidebar-only groups
  - New BoardAnnotation type: rectangle and annotation nodes on the board
- Types: ReferenceItem (with position), ReferenceManifestEntry, BoardAnnotation, ReferenceEdge, ReferenceGraph, ReferenceCollection, ReferenceFieldDefinition, ReferenceManifest
- projectFs.ts: readReferenceCollections, readAllReferenceItems, writeReferenceItem, deleteReferenceItem, readReferenceGraph, writeReferenceGraph, readReferenceManifest, writeReferenceManifest; disk folder: reference/
- Migration: readAllReferenceItems strips legacy parentId; readReferenceGraph migrates legacy groups → annotations; readReferenceManifest generates manifest.json from items on first load
- @xyflow/react installed
- Board (ReferenceBoardView):
  - Unified canvas (all types on one canvas); flat item nodes + edges (no group containers)
  - ReferenceCard: 4 visible handle dots, selection state from React Flow
  - Rectangle nodes: resizable colored rectangles for visual grouping (stored in graph.json annotations)
  - Annotation nodes: sticky-note style text nodes (stored in graph.json annotations)
  - Board toolbar: search input + add rectangle + add note buttons
  - MiniMap: pannable/zoomable overview in corner
  - Search/filter: dims non-matching nodes (by name, fields, annotation text)
  - Edges: draw handle-to-handle; persisted to graph.json; delete with Delete key
  - Connection mode: loose (any handle to any handle)
  - New items require a name — closing with blank name auto-deletes the item
- Sidebar (ReferenceSidebar):
  - Manifest-driven ordering per collection type
  - DnD reordering within a collection type (per-collection SortableContext)
  - Sidebar-only groups: create, rename (double-click), ungroup; no board representation
  - "All" + type rows with counts and per-type + button
  - Clicking fits view to those nodes (board) or filters (grid)
- Grid (ReferenceGridView):
  - Items displayed in manifest order within each collection type
  - Sidebar groups shown as sub-headings within their collection section
- EditorScreen: "Reference" button navigates to /reference
- Route: /reference


Word count improvements (session 9)
- openProject now eagerly reads all section files and computes word counts (using DOMParser + htmlToPlainText helper that matches TipTap's getText() block-separator behaviour)
- ProjectSettings.showWordCount added; toggle in Settings → Editor; hides/shows word count button in header


Draft + Drawer (build order step 8 — complete)
- Sidebar split into two named zones: "Draft" (main manuscript) and "Drawer" (secondary/experimental sections)
- Both zones support sections and groups with full DnD within and between zones
- Only Draft sections count toward the word/page total in the header
- Data model: Project.extras: SectionManifestEntry[] (optional, absent = [])
- ProjectContext: updateExtras, updateBothManifests (atomic cross-zone write)
- RichTextEditor: loads and saves Drawer sections correctly (searches both project.sections and project.extras)


Front matter + Back matter (build order step 9 — complete)
- Sidebar gains two more zones below Drawer: "Front matter" and "Back matter"
- Sections only (no groups); neither zone counts toward word/page total
- Data model: Project.frontMatter and Project.backMatter (optional SectionManifestEntry[])
- ProjectContext: updateFrontMatter, updateBackMatter, updateAllManifests (atomic 4-zone write)
- RichTextEditor: findSectionFile searches all 4 zones
- DnD: cross-zone moves use updateAllManifests; groups blocked from entering front/back zones


Rich text editor improvements (session 10–11)
- Toolbar expanded: undo/redo, H1–H3, underline, strikethrough, highlight, inline code, bullet list, ordered list, blockquote, align left/center/right, image upload, find
- Icon library: all inline SVGs replaced with Lucide React; abstraction layer at src/components/icons.ts (swap library by editing one file)
- Font family and font size now work as inline marks (like bold/italic) via @tiptap/extension-text-style, @tiptap/extension-font-family, and a custom FontSize extension
- Toolbar dropdowns read the mark at the cursor and fall back to the project default; changes apply to the selection only
- Document-level default font/size still set via ProjectSettings (applied as CSS on the editor wrapper)
- Font list expanded: Inter, Georgia, Garamond, Palatino, Baskerville, Times New Roman, Helvetica, Futura, Courier New
- Font size list extended to include 28, 32, 36, 48, 72pt


Import (build order step 10 — complete)
- Import button in EditorScreen header opens ImportDialog modal
- Supports .txt and .md files; multiple files selectable at once (files read in parallel)
- Zone selector: Draft / Drawer / Front matter / Back matter
- Split on page breaks: splits on \f (form-feed); shows section count or "none found" feedback
- Markdown parsed to HTML via marked; plain text converted to <p> tags with HTML escaping
- Section naming: single file → first line of chunk (markdown heading markers stripped, 50-char limit); multiple files → filename, with _1/_2 appended if file splits into multiple chunks
- After import, navigates to first imported section


Export (build order step 11 — complete)
- Export button in EditorScreen header opens ExportDialog modal
- Three formats: Plain text (.txt), PDF (print dialog), Standard manuscript (.doc)
- Export order: front matter → draft → back matter; Drawer excluded
- Plain text: HTML stripped to plain text; sections joined with form-feed (\f) page breaks; downloaded as {title}.txt
- PDF: builds HTML with print stylesheet (@page 1in margins, Times New Roman 12pt, double-spaced); opens in new window and triggers print dialog
- Standard manuscript (.doc): Word-compatible HTML with mso namespace markup
  - Title page: author + approx. word count (top right), title + "by" + author (centered)
  - Running header on text pages: LASTNAME / TITLE / page number (via Word mso-field-code)
  - Blank header on first/title page (mso-first-header)
  - All text: Times New Roman 12pt, double-spaced, 0.5in paragraph indent, 1in margins
  - "The End" centered after last section
  - Filename: Lastname_TITLE_date.doc


Version Control / Backups (v2 — complete)
-----------------------------------------
- Opt-in backup system: compressed zip files stored in project's `backups/` folder
- Backup on close (when leaving editor or hiding tab) + manual backup via header button
- Retention limit (default 10), auto-prune oldest backups
- BackupsDialog: list, create, restore, delete backups
- Settings: enable toggle, backup-on-close toggle, retention count, manage button
- Library: fflate for zip compression


What's next (v2)
-----------------
- Whole Manuscript Search
- Tests & QA support
- Text to Speech
- AI Chat Sidebar
- Firebase Auth
- Settings (AI & Account)
- Polish & Limits


Key technical decisions
-----------------------
- Package manager: npm (workspaces)
- Build tool: Turborepo
- Web app: Vite + React 19 + TypeScript
- Desktop (future): Electron
- Mobile (future): React Native
- Auth: Firebase Auth — deferred, optional for local use
- Storage: local filesystem via File System Access API; recent projects in IndexedDB
- Cloud snapshots: Firebase Storage (paid feature, not in v1)
- AI: bring-your-own API key, no backend proxying
- Rich text editor: TipTap v3
- PDF export: browser print-to-PDF with custom stylesheet
