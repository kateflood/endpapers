Project goals:
- Create a multi platform writing app that has a simple clean ui, can manage version control, stores research and other metadata information such as location, character, and timelines, and easily allows the user to move and arrange sections in the ui
- Projects will be the overarching data structure
- It will also utilize ai for proofreading, research, first reader and editor roles along side the actual writing
- Initial scope will be a React/Typescript web app
- Additional platforms will be a MacOS desktop app and a mobile iOS app
- There will be a free version with minimal features and paid versions with the more advanced features and integrations
- Should be able to open/import any basic text file
- Should be able to export into text, pdf or ePub
- Should be able to do most text document actions such as search and replace, change typography, etc
- Should be able to include title pages, end pages, front matter and other traditional book components
- Should have an account and settings area where a user can configure storage and integrations


Free Features:
- One project
- Local file storage only
- Export to plain text and PDF
- Bring-your-own-AI: user connects their own ChatGPT, Gemini, or Claude account via their own API key — the app provides the UI, no backend proxying needed

Paid Features:
- Multiple projects
- Multiple volumes/parts within a project
- Cloud sync (Google Drive) and cloud snapshots (Firebase Storage)
- Version control (named snapshots with AI-powered change summaries)
- ePub export
- Domain-specific AI features (e.g. editor/reviewer agents that understand the full project context) — details TBD


Terminology:
- Project — top-level container (replaces "project/book")
- Sections — individual content pieces within a project (replaces "chapters")
- Metadata — characters, locations, timeline, research


Project File Format:
- Working copy is a folder structure stored locally or synced via Google Drive
- Snapshots (named versions) are zip archives stored in Firebase Storage
- Structure:
    my-project/
      project.json          # title, author, settings, metadata
      sections/             # individual content files
        01-introduction.md
        02-part-one.md
      metadata/
        collections.json      # type definitions and field templates
        john-smith.json       # { "type": "character", ... }
        the-old-house.json    # { "type": "location", ... }
      assets/               # images, reference files, etc.


Version Control:
- Named snapshots (full project copies)
- User names each snapshot (e.g. "Draft 1", "After beta readers")
- AI will be used to summarize what changed between versions rather than a technical diff view
- Snapshots stored as zip files in Firebase Storage


Platform Strategy:
- Web: React/TypeScript (primary)
- MacOS desktop: Electron (reuses React web code via monorepo)
- iOS: React Native (future, further down the line)
- Monorepo structure to share code across platforms


Auth & Storage:
- Authentication: Firebase Auth
- Snapshot/version storage: Firebase Storage
- Working file storage: local filesystem (Electron) or Google Drive
- Goal is to minimize backend code — no custom server needed for initial release


AI Integrations:
- Bring-your-own-AI model: users connect their own API keys for ChatGPT, Gemini, or Claude — app provides the UI, no backend proxying, keys stored locally
- AI integration is free since the user bears the API cost
- Domain-specific paid AI features (editor/reviewer agents with full project context) — details TBD separately
- Eventually, allow users to configure reviewer agents that represent their ideal reader


Notes:
- This app will require the user to create an account so we will need an authentication service
- To start, we don't want to store data and would want to store it locally or in an external account like Google Drive. We want to minimize the backend code and data storage needs.


Export:
- Plain text: client-side, always free
- PDF: browser print-to-PDF with a custom print stylesheet — no backend required, free tier
- ePub: Pandoc running on a Cloud Run service (GCP) — paid feature, small backend justified by format complexity
- Upgrade PDF to Pandoc later if output quality becomes an issue


AI Features (first to ship):
- In-app chat assistant: sidebar chat with the current section injected as context
- Users can use it for proofreading, brainstorming, editing, etc.
- Built on the bring-your-own-AI model — user's own API key, no backend proxying
- Dedicated proofreading and research modes to be built on top of this foundation later


Brand Navy (primary)

#1A365D — deep navy, backgrounds, wordmark, spine dark

Brand Blue (secondary)

#2B6CB0 — spine, marble strokes, buttons
#4299E1 — marble mid strokes, UI accents
#63B3ED — marble light strokes, favicon fill

Marble / Page Tints

#90CDF4 — text lines, light marble strokes
#BEE3F8 — page border, marble mid gradient
#EBF8FF — marble light gradient start, light bg

Page White

#FFFFFF — page top
#F0F7FF — page bottom (very slight blue tint)

Utility

#2C5282 — darkest marble accent stroke

These all sit within the Tailwind blue scale if you're using Tailwind in your app, which makes things convenient — blue-900 through blue-100 maps almost exactly to this palette.