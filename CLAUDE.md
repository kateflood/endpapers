# Endpapers — Claude Instructions

## Project overview

Endpapers is a multi-platform writing app. The web app (Vite + React 19) is being built first, with Electron desktop and React Native mobile planned for later. The app stores projects on the local filesystem via the File System Access API. No backend is required for core local use.

See `planning/scope.md` for full product decisions and `planning/v1.md` for the v1 milestone. See `.claude/status.md` for current build progress.

---

## Monorepo structure

```
/
  apps/
    web/          # Vite + React 19 + TypeScript (active development)
    desktop/      # Electron placeholder (empty)
    mobile/       # React Native placeholder (empty)
    server/       # placeholder (empty)
  packages/
    types/        # @endpapers/types — shared TypeScript interfaces
    utils/        # @endpapers/utils — shared utilities
  planning/       # Product docs (scope.md, v1.md)
  .claude/        # status.md, plans
```

Package manager: **npm workspaces**. Build orchestrator: **Turborepo**.

Run dev server: `npm run dev` from repo root (starts all apps via Turbo).
Run build: `npm run build` from repo root.

---

## Web app: apps/web

### Stack
- **Vite 7** with `@vitejs/plugin-react`
- **React 19** + **TypeScript** (strict mode, `verbatimModuleSyntax: true`)
- **React Router v7** (`createBrowserRouter`)
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.ts`
- **idb** for IndexedDB access
- File System Access API for local project folders

### Source layout
```
apps/web/src/
  main.tsx                  # entry point
  App.tsx                   # ProjectProvider + RouterProvider
  router.tsx                # route definitions
  index.css                 # Tailwind import + @theme design tokens
  fsapi.d.ts                # ambient Window type extensions for showDirectoryPicker
  contexts/
    ProjectContext.tsx       # open project state (Project + FileSystemDirectoryHandle)
  db/
    recents.ts              # IndexedDB helpers for recent projects
  fs/
    projectFs.ts            # File System Access API helpers
  screens/
    HomeScreen/
    EditorScreen/           # 3-panel layout: header + sidebar + editor area
    SettingsScreen/
  components/
    Button/                 # shared Button component (primary / ghost variants)
    NewProjectDialog/
    RecentProjectsList/
    SectionsSidebar/
      SectionsSidebar.tsx   # DnD container, CRUD logic, section manifest helpers
      SectionItem.tsx       # draggable section row (flat or inside group)
      GroupItem.tsx         # draggable collapsible group with nested children
      DragHandle.tsx        # shared grip icon + dnd-kit listeners
      RowMenu.tsx           # shared ··· button + dropdown + outside-click detection
```

### Routes
- `/` → HomeScreen
- `/editor` → EditorScreen
- `/settings` → SettingsScreen

---

## Styling

- **Tailwind CSS v4** — all styles are inline Tailwind utility classes. No CSS Modules, no `.module.css` files.
- Design tokens are defined in `apps/web/src/index.css` under `@theme`:
  - Colors: `bg`, `surface`, `text`, `text-secondary`, `text-placeholder`, `border`, `accent`
  - Fonts: `sans` (Inter), `serif` (Georgia — app name only)
  - Radii: `sm` (4px), `md` (8px)
- Use `group` / `group-hover:` for parent-triggered child visibility (e.g. hover to reveal buttons).
- Shared interactive element: `src/components/Button/Button.tsx` — use this instead of raw `<button>` for primary actions and ghost/cancel buttons. Use raw `<button>` with Tailwind classes directly for compact icon/header controls (they don't fit the Button component's padding and border styling).

---

## TypeScript rules

- `verbatimModuleSyntax: true` — use `import type { ... }` for type-only imports.
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — no unused code.
- `erasableSyntaxOnly: true` — no `enum`, no `namespace`, no `const enum`.
- For File System Access API methods not in the DOM lib (`queryPermission`, `requestPermission`), use type assertions — see `fs/projectFs.ts` for the established pattern.
- `showDirectoryPicker` is declared in `src/fsapi.d.ts` (not in TypeScript's DOM lib).

---

## Shared packages

### @endpapers/types (`packages/types/src/index.ts`)

Key interfaces:
- `Project` — project metadata + sections manifest
- `SectionManifestEntry` — `{ id, title, type: 'section' | 'group', file?, children? }` — one level deep (group → sections)
- `MetadataItem`, `MetadataCollection`, `CollectionsManifest`
- `WritingLog`, `WritingGoals`, `WritingLogEntry`

### @endpapers/utils (`packages/utils/src/index.ts`)

- `generateId()` — generates a short unique ID
- `todayISODate()` — returns today as `YYYY-MM-DD`
- `countWords(text)`, `countCharacters(text)`, `estimatePages(wordCount)`

---

## Data model

### Project folder structure (on disk)
```
my-project/
  project.json            # Project interface (title, author, sections manifest, etc.)
  writing-log.json        # WritingLog interface (goals + daily activity log)
  sections/               # flat .md files, one per section
  reference/
    collections.json      # ReferenceManifest (built-in types: Character, Location, Timeline, Scenes, Notes, Research)
    manifest.json         # Ordered entries per collection type (sidebar ordering + groups)
    graph.json            # Edges + board annotations (rectangles, sticky notes)
    {id}.json             # Individual ReferenceItem files
  assets/
```

### Recent projects (IndexedDB)
- Database: `endpapers-recents` v1
- Store: `recent-projects` (keyPath: `id`)
- Record: `{ id: string, handle: FileSystemDirectoryHandle, title: string, lastOpened: string }`
- `id` = `project.id` from `project.json` — used as the key for natural deduplication

### Project context
`ProjectContext` holds the currently open project in memory:
```ts
{
  project: Project | null
  handle: FileSystemDirectoryHandle | null
  recentId: string | null
  activeSectionId: string | null        // which section is selected in the editor
  openProject(handle, project, recentId): void
  closeProject(): void
  setActiveSectionId(id: string | null): void
  updateSections(sections: SectionManifestEntry[]): Promise<void>  // updates state + writes project.json
}
```
Navigation is done by components (not inside the context). `updateSections` is the single write path for all section manifest changes.

---

## Key decisions

- **No account required for local use** — Firebase Auth is deferred; guests get full local functionality.
- **FileSystemDirectoryHandle in IndexedDB** — not serializable to localStorage; stored via `idb`.
- **Sections manifest in project.json** — section order and grouping are managed by the manifest, not by filenames or folder structure.
- **One level of nesting** — groups can contain sections, but groups cannot contain groups.
- **Bring-your-own API key** — AI chat uses user-supplied keys (ChatGPT, Gemini, Claude); keys stored in localStorage, never sent to our backend.
- **PDF export** — browser print-to-PDF with a custom print stylesheet (no server-side rendering).

---

## What's done / what's next

See `.claude/status.md` for the current build progress and next steps.

Steps 1–11 are complete (all core v1 features built). The next step is **UI polish** — visual consistency, empty states, error handling, and UX refinements. See `planning/v2.md` for post-v1 features.
