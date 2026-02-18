Project Status
==============

Last updated: 2026-02-16

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


What's next (build order from v1.md)
-------------------------------------

Step 2: Firebase Auth
  - Create a Firebase project in GCP console (if not already done)
  - Install firebase SDK in apps/web
  - Set up Firebase Auth (email/password to start)
  - Create auth context and sign in / sign up / sign out flows
  - Protect routes — unauthenticated users see the home/auth screen only

Step 3: Home screen
  - Route: /
  - New Project button → creates project folder structure, opens editor
  - Open Project → file picker + recent projects list (stored in localStorage)
  - Sign in / sign up if not authenticated

Step 4: Project creation and local file save/load
  - Create project.json, sections/, metadata/, assets/, writing-log.json on disk
  - Load project from a folder selected via file picker
  - Recent projects list persisted in localStorage (path + title + last opened)

Step 5: Section management (CRUD + reorder + grouping)
  - Sections sidebar with collapsible groups
  - Drag and drop reorder (flat sections and within/between groups)
  - One level of nesting only (group > section, no nested groups)
  - All ordering/grouping managed via sections manifest in project.json

Step 6: Rich text editor
  - Bold, italic, headings, paragraphs
  - Search and replace within a section
  - Recommend evaluating: TipTap (most flexible), Slate, or Quill

Step 7: Word & page count
  - Status bar at bottom of editor: word count + character count for current section
  - Project total in header: word count + estimated pages (250 words/page)
  - Calculated on the fly from content

Step 8: Writing goals
  - writing-log.json: goals (session/daily/weekly/monthly) + daily activity log
  - Net words tracked per session (diff at open vs close)
  - Stats & Goals panel accessible from header word count indicator

Step 9: Metadata view
  - Full-screen view separate from editor
  - Three-column: type list | items list | item detail/edit
  - Built-in types: Character, Location, Timeline entry, Research note
  - Each item: { id, type, name, fields: Record<string,string> }
  - collections.json defines field templates per type

Step 10: AI chat sidebar
  - Right panel, slides in when toggled
  - Current section content injected as context on open
  - Supports ChatGPT, Gemini, Claude via user-supplied API key
  - API keys stored in localStorage, never sent to our backend

Step 11: Import (.txt / .md)
  - File picker → read file → create new section with content

Step 12: Export
  - Plain text: concatenate all sections, download as .txt
  - PDF: custom print stylesheet, trigger browser print

Step 13: Settings
  - Account info (Firebase user)
  - AI provider selection + API key entry per provider
  - Danger zone: delete account

Step 14: Polish
  - Enforce free tier limit (one project per account)
  - Empty states for all views
  - Error handling


Key technical decisions
-----------------------
- Package manager: npm (workspaces)
- Build tool: Turborepo
- Web app: Vite + React 19 + TypeScript
- Desktop (future): Electron
- Mobile (future): React Native
- Auth: Firebase Auth
- Storage: local filesystem (web uses File System Access API, Electron uses Node fs)
- Cloud snapshots: Firebase Storage (paid feature, not in v1)
- AI: bring-your-own API key, no backend proxying
- Rich text editor: TBD (evaluate TipTap, Slate, Quill)
- PDF export: browser print-to-PDF with custom stylesheet
- ePub export: Pandoc on Cloud Run (paid, not in v1)
