# Endpapers

A writing app for authors. Organize sections, track characters and locations, set writing goals, and export your work — all from a clean, distraction-free interface.

**Try it:** [endpapers-app.web.app/editor](https://endpapers-app.web.app/editor)

## Features

- **Section-based writing** — organize your project into sections and groups with drag-and-drop reordering
- **Rich text editor** — formatting, headings, lists, images, search and replace, and focus mode for distraction-free writing
- **Reference board** — track characters, locations, timelines, scenes, notes, and research on a visual canvas with relationship edges
- **Writing goals** — set session, daily, weekly, or monthly word count targets with progress tracking
- **Export** — PDF, plain text, MD, HTML and standard manuscript (.doc) export for individual sections or the full project
- **On-device AI tools** — proofreader and summarizer powered by Chrome's on-device models; your text never leaves your machine
- **Local-first** — projects are stored on your filesystem via the File System Access API; no account required

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TipTap
- **Desktop:** Electron (planned)
- **Mobile:** React Native (planned)

## Development

```bash
npm install
npm run dev
```

## Project structure

```
apps/
  web/            # Vite + React web app
  desktop/        # Electron (planned)
  mobile/         # React Native (planned)
packages/
  types/          # Shared TypeScript interfaces
  utils/          # Shared utilities
```
