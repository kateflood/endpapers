# Endpapers — Claude Instructions

## Project overview

Endpapers is a local-first writing app for serious writers (fiction, non-fiction, scripts). The web app is the active product; Electron desktop and React Native mobile are planned for later. Projects are stored on the local filesystem via the File System Access API — no backend required for core use.

See `planning/scope.md` for full product decisions.

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
    assets/       # @endpapers/assets — SVG logos/icons exported as URL imports
  planning/       # Product docs and feature tracking
  .claude/        # plans, memory
```

Package manager: **npm workspaces**. Build orchestrator: **Turborepo**.

- Dev: `npm run dev` from repo root
- Build: `npm run build` from repo root

---

## Web app stack (apps/web)

- **Vite 7** + `@vitejs/plugin-react`
- **React 19** + **TypeScript** (strict, `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`)
- **React Router v7** (`createBrowserRouter`)
- **Tailwind CSS v4** via `@tailwindcss/vite` — CSS `@theme {}` config, no `tailwind.config.ts`
- **shadcn/ui** (style: radix-nova) — component primitives in `src/components/ui/`
- **TipTap** — rich text editor (ProseMirror-based)
- **dnd-kit** — drag-and-drop for section reordering
- **fflate** — zip compression for project backups
- **idb** — IndexedDB access for recent projects
- **@fontsource-variable/lora** — Lora Variable serif font
- `@/` path alias → `apps/web/src/`

---

## Routes

| Path | Screen | Notes |
|------|--------|-------|
| `/` | HomeScreen | Landing + recent projects |
| `/editor` | EditorScreen | 3-column writing editor |
| `/reference` | ReferenceScreen | Character/location/etc. database |
| `/settings` | SettingsScreen | Project settings |
| `/pricing` | PricingScreen | Lazy-loaded |
| `/help`, `/help/:topic` | HelpScreen | Lazy-loaded, two-pane layout |
| `/about` | AboutScreen | Lazy-loaded |
| `/contact` | ContactScreen | Lazy-loaded |
| `/ai` | AIScreen | Lazy-loaded |

---

## Source layout

```
apps/web/src/
  main.tsx
  App.tsx                    # ProjectProvider + RouterProvider
  router.tsx
  index.css                  # Tailwind import + @theme design tokens
  lib/
    utils.ts                 # cn() utility (clsx + tailwind-merge)
  contexts/
    ProjectContext.tsx
    ToastContext.tsx
  db/
    recents.ts               # IndexedDB helpers for recent projects
  fs/
    projectFs.ts             # File System Access API helpers
    backups.ts               # Zip backup/restore logic
  ai/                        # AI worker, model cache, Chrome AI bridge
  screens/
    HomeScreen/
    EditorScreen/
    ReferenceScreen/
    SettingsScreen/
    PricingScreen/
    HelpScreen/              # includes HelpSidebar + topics/
    AboutScreen/
    ContactScreen/
    AIScreen/
  components/
    ui/                      # shadcn primitives — DO NOT add custom components here
    editor/                  # RichTextEditor, EditorToolbar, SearchBar, useEditorSetup
    sidebar/                 # SectionsSidebar, SidebarZone, SortableListItem, SortableGroupItem, CollapsibleSectionHeader
    panels/                  # WritingGoalsPanel, AIPanel (and sub-files)
    dialogs/                 # ConfirmDialog, NewProjectDialog, ImportDialog, ExportDialog, BackupsDialog
    home/                    # FeatureShowcase, RecentProjectsList
    reference/               # ReferenceSidebar, ReferenceBoard, ReferenceGridView, ReferenceItemCard
    shared/                  # FloatingBar, ToolbarButton, DragHandle, RowMenu, ErrorBoundary, icons
```

---

## Component guidelines

### `components/ui/` — shadcn only
This directory is managed by shadcn. Never add custom components here. To add a new shadcn component: `npx shadcn@latest add <name>`. Import with `@/components/ui/<name>`.

Available: `button`, `card` + `card-content`, `badge`, `dialog`, `input`, `label`, `select`, `checkbox`, `switch`

### Feature folders
All other components belong to their feature folder — even single-file components. If a component is specific to the editor, it lives in `components/editor/`. If it's shared across multiple features, it lives in `components/shared/`.

### When to create a component vs inline JSX
- **Create a component** if the same structure appears in 2+ places, or if extracting it gives the piece a meaningful name that clarifies intent.
- **Keep it inline** for one-off layout or structure that isn't reused and doesn't need naming.
- **Don't create a component** just to avoid long JSX — long is fine if it's cohesive.

### Check before building
Before writing a new component, search `components/` to see if something equivalent already exists. The custom `Card.tsx` and `Dialog.tsx` are being migrated to shadcn equivalents — prefer `ui/card`, `ui/dialog`, `ui/button` for new code.

### Buttons
- **`ui/button`** — use for primary actions, CTAs, and form actions
- **Raw `<button>` with Tailwind** — use for compact icon/header controls (toolbar buttons, sidebar items). `ToolbarButton` in `shared/` wraps this pattern for icon-sized controls.

---

## Styling

- **Tailwind CSS v4** — all styles are inline utility classes. No CSS Modules.
- **Design tokens** in `apps/web/src/index.css` under `@theme {}`:
  - `bg` (#F7F5F0, warm cream), `surface` (#ffffff), `text` (#2D3748), `text-secondary` (#718096), `text-placeholder` (#A0AEC0)
  - `border` (#E2E8F0), `accent` (#B45309, amber-700), `navy` (#1A365D)
  - Font: Lora Variable — set as both `--font-sans` and `--font-serif`
  - Dark mode: `.dark` class on screen wrapper; dark `accent` = #D97706 (amber-600)
- **shadcn tokens** in `:root {}` (`--background`, `--foreground`, etc.) coexist with app tokens — don't remove either set.
- Use `group` / `group-hover:` for parent-triggered child visibility.
- Use `cn()` from `@/lib/utils` when merging conditional classes.

---

## TypeScript rules

- `verbatimModuleSyntax: true` — use `import type { ... }` for type-only imports.
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — no unused code.
- `erasableSyntaxOnly: true` — no `enum`, no `namespace`, no `const enum`.
- File System Access API methods not in the DOM lib (`queryPermission`, `requestPermission`): use type assertions — see `fs/projectFs.ts`.
- `showDirectoryPicker` declared in `src/fsapi.d.ts`.
- Chrome AI types: ambient in `chromium-ai.d.ts`; guard with `typeof X !== 'undefined'`.

---

## Shared packages

### @endpapers/types (`packages/types/src/index.ts`)
- `Project` — project metadata + sections manifest
- `SectionManifestEntry` — `{ id, title, type: 'section' | 'group', file?, children? }` — one level deep
- `WritingLog`, `WritingGoals`, `WritingLogEntry`
- `MetadataItem`, `MetadataCollection`, `CollectionsManifest`

### @endpapers/utils (`packages/utils/src/index.ts`)
- `generateId()`, `todayISODate()`
- `countWords(text)`, `countCharacters(text)`, `estimatePages(wordCount)`
- `isThisWeek(date)`, `isThisMonth(date)`, `sumWritingLog(log, predicate)`

### @endpapers/assets (`packages/assets/src/index.ts`)
SVG assets imported as URLs: `logo`, `logoFull`, `logoFullWhite`, `icon512`, `favicon32`, `appleTouchIcon`, `splashIcon`, `trayIcon`

---

## Data model

### Project folder (on disk)
```
my-project/
  project.json          # Project: title, author, settings, sections manifest
  writing-log.json      # WritingLog: goals + daily word count entries
  sections/             # .md files, one per section
  reference/
    collections.json
    manifest.json
    graph.json
    {id}.json
  assets/
```

### Recent projects (IndexedDB)
- DB: `endpapers-recents` v1, store: `recent-projects` (keyPath: `id`)
- Record: `{ id, handle: FileSystemDirectoryHandle, title, lastOpened }`

### ProjectContext
```ts
{
  project: Project | null
  handle: FileSystemDirectoryHandle | null
  recentId: string | null
  activeSectionId: string | null
  sectionWordCounts: Record<string, number>
  writingLog: WritingLog
  sessionStartWords: number
  openProject(handle, project, recentId): void
  closeProject(): void
  setActiveSectionId(id): void
  updateSections(sections): Promise<void>
  updateGoals(goals): Promise<void>
}
```

---

## Key decisions

- **Local-first** — no account required; full functionality offline.
- **FileSystemDirectoryHandle in IndexedDB** — not serializable to localStorage.
- **Sections manifest in project.json** — order and grouping are managed by manifest, not filenames.
- **One level of nesting** — groups contain sections; groups cannot contain groups.
- **On-device AI only** — all AI models run locally via Transformers.js or Chrome AI APIs; no text leaves the device.
- **PDF export** — browser print-to-PDF with custom print stylesheet; no server rendering.
- **shadcn as the component foundation** — migrate custom Card/Dialog/Button to shadcn equivalents over time; don't build new primitives from scratch.

---

# Project Instructions

## Style Guide

### General
- Write clean, readable code. Favor clarity over cleverness.
- Follow existing patterns and conventions in the codebase. If it isn't obvious or there are conflicts in style or pattern ask for clarity.
- Keep functions small and focused on a single responsibility.
- Use descriptive variable and function names that convey intent.
- Avoid abbreviations unless they are widely understood (e.g., `url`, `id`).
- Always do a code review to simplify and refactor code after adding feature or resolving a bug
- Include clear and concise documentation for users when applicable to the project

### Naming Conventions
- **Files**: Use kebab-case for python filenames (e.g., `auth-service.py`) and React standards for client files - PascalCase for React components (EditorScreen.tsx, SectionsSidebar.tsx, etc.) and camelCase for utilities (projectFs.ts, recents.ts).
- **Variables/Functions**: Use camelCase (JavaScript/TypeScript) or snake_case (Python) per language convention.
- **Classes/Types**: Use PascalCase.
- **Constants**: Use UPPER_SNAKE_CASE for true constants.
- **Boolean variables**: Prefix with `is`, `has`, `should`, `can` (e.g., `isActive`, `hasPermission`).

### Code Organization
- Group imports: stdlib first, then third-party, then local — separated by blank lines.
- Keep files focused. If a file exceeds ~300 lines, consider splitting it. Large files are okay if it best to keep all logic and functionality in one place.
- Co-locate related code. Tests live next to the code they test or in a parallel 
`__tests__`/`tests` directory.

### Comments
- Only add comments where the logic isn't self-evident.
- Use comments to explain "why", not "what".
- Do not leave commented-out code in the codebase.
- Use TODO comments sparingly and include context (e.g., `// TODO(ticket-123): refactor after migration`).

### Error Handling
- Handle errors at system boundaries (user input, API responses, file I/O).
- Use specific error types/messages — avoid generic catch-all handlers.
- Do not silently swallow errors.
- Log errors with enough context to debug (what failed, relevant IDs, inputs).

## Test Guidance

### General Principles
- Write tests for all new functionality and bug fixes.
- Tests should be independent — no shared mutable state between tests.
- Each test should test one behavior. Name tests to describe the expected behavior.
- Follow the Arrange-Act-Assert (AAA) pattern.

### Test Naming
- Use descriptive test names: `should return empty array when no results found`.
- Group related tests using `describe`/`context` blocks.

### What to Test
- Happy paths mainly and edge cases for important or critical features (like auth).
- Error conditions and boundary values.
- Public API surfaces — avoid testing private implementation details.
- Integration points (API calls, database queries, external services).

### What Not to Test
- Third-party library internals.
- Trivial getters/setters with no logic.
- Implementation details that may change without affecting behavior.

### Test Organization
- Keep test files next to source files or in a parallel test directory — be consistent per project.
- Use factories or builders for test data — avoid duplicating setup across tests.
- Mock external dependencies, not internal modules.

### Running Tests
- Run the full test suite before submitting changes.
- If a test fails, investigate and fix the root cause — do not skip or disable tests without documenting why.
- Do not skip or remove tests just because they are failing - ask for guidance

## Security

### Principle of Least Privilege
- Request only the permissions and access needed for the task at hand.
- Do not include web search tools by default.
- Agents should operate with the minimum set of tools required.
- Always ask for permission before performing actions outside normal development scope.

### Sensitive Data
- Never commit secrets, API keys, or credentials to the repository.
- Use environment variables or secret management for sensitive configuration.
- Add sensitive file patterns to `.gitignore` (e.g., `.env`, `*.pem`, `credentials.json`).
- Ask before you make changes to any sensitive files

## Git Practices
- Write clear, concise commit messages that explain the "why".
- Keep commits focused — one logical change per commit.
- Do not force-push to shared branches.
- Review diffs before committing to avoid unintended changes.

## Changes to this file
- When we make a decision that is different or additive from what is in this file, be sure to update it with the new guildelines.
