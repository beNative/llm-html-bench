# LLM HTML Bench — Version Log & Changelog

All notable changes, architectural milestones, and release updates for **LLM HTML Bench** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.1] - 2026-08-16

### 🛠️ Resilient Multi-Candidate Model Discovery, Auto-Updater Error Fixes & Diagnostics

#### 🌟 Bug Fixes & Refinements
- **Smart Multi-Candidate Endpoint Discovery**:
  - Implemented automatic resolution across candidate model URLs (`/models`, `/v1/models`, `/api/tags`, `/api/v1/models`) ensuring seamless discovery with Ollama, LM Studio, vLLM, OpenRouter, and LocalAI.
  - Added multi-format payload parser for OpenAI data format (`{ data: [...] }`), Ollama tags format (`{ models: [...] }`), and raw arrays.
- **Request Timeout & Abort Control**:
  - Added 8-second timeout protection with `AbortController` preventing stalled network queries if a server is offline or unreachable.
- **Comprehensive Diagnostic Provider Logging**:
  - Added granular logging (`Logger.info`, `Logger.debug`, `Logger.warn`, `Logger.error`) across provider queries, connection tests, and model discovery.
- **Interactive Discovery Troubleshooting**:
  - Replaced silent fallback in `RunBenchmarkModal.tsx` with a descriptive troubleshooting banner showing the exact connection status and an instant **"Retry"** button.
- **Auto-Updater 404 & Notice Protection**:
  - Suppressed raw 404 HTTP errors during background startup checks when the GitHub repository is private or has no published releases yet.
  - Gracefully handles manual update checks and strips HTTP headers/cookies.

---

## [1.3.0] - 2026-08-16

### 🚀 Master-Detail Run History, Multi-Provider Endpoints & Model Auto-Discovery

#### 🌟 Features & Architecture Improvements
- **Integrated Master-Detail Benchmark Run History (`RunsPage.tsx`)**:
  - Replaced the modal inspection dialog with a split-pane layout.
  - Left master pane features real-time search, provenance filtering, dynamic sorting, and detailed metric cards.
  - Right detail pane embeds Live HTML Preview (`IsolatedFrame`), Monaco Extracted HTML Editor, Raw Model Response, Metadata & Parameter metrics, and the Evaluation Panel with instant action buttons.
- **Multi-Provider LLM Endpoint Management (`SettingsPage.tsx`)**:
  - Full support for configuring, testing, editing, and deleting multiple provider endpoints simultaneously.
  - 1-click quick presets for **Local LM Studio**, **Local Ollama**, **OpenRouter Cloud**, **OpenAI Cloud**, and **Local vLLM**.
- **Automated Model Discovery (`/v1/models`)**:
  - Live query of available models loaded on local engines or available through cloud API keys.
  - Zero-manual-entry execution in **Execute Live Benchmark Run**: discovered models can be run directly and are automatically registered in the SQLite catalog on the fly.
  - 1-click **"Register to Catalog"** directly from endpoint cards in Settings.
- **About Dialog & GitHub Repository Integration (`AboutModal.tsx`)**:
  - Dedicated About dialog accessible from **Help Menu**, **Command Palette**, and **Status Bar**.
  - Direct link button to the official GitHub repository (`https://github.com/beNative/llm-html-bench`).
  - System diagnostics, database storage statistics, and quick system actions.
- **Enhanced Database Tools & Explorer Integration**:
  - Added **Backup Database**, **Restore Database**, and **Open Database Location in Explorer** across the top File menu, Help menu, Settings, and Command Palette.
  - Fixed database connection re-initialization on restore to seamlessly re-bind without requiring an application restart.
- **Dynamic Application Versioning**:
  - Replaced hardcoded version strings with dynamic resolution via Electron runtime `app.getVersion()`.

---

## [1.2.0] - 2026-08-15

### 🚀 Automated Background Auto-Update System with Real-Time Progress Toast

#### 🌟 Features & Architecture Improvements
- **Silent Background Update Detection & Auto-Download**:
  - Integrated `electron-updater` with GitHub Releases (`beNative/llm-html-bench`).
  - Automatically queries for newer releases in the background 5 seconds after startup, downloading update bundles transparently without interrupting the user.
- **Sleek Real-Time Progress Toast Notification (`UpdateToast.tsx`)**:
  - **Dynamic Visual Stages**: Seamlessly transitions between Downloading, Ready-to-Install, and Up-to-Date states.
  - **Real-Time Progress Tracking**: Displays a vibrant animated gradient progress bar, percentage (`0.0%` → `100.0%`), download transfer speed (`MB/s`), and transferred size (`MB / MB`).
  - **Glassmorphic Styling**: Frosted glass blur, glowing accents, pulsing indicator badges, and smooth entrance micro-animations.
- **Zero-Disruption Silent Upgrade & Relaunch**:
  - Configured NSIS `oneClick: true` to eliminate all installer wizard screens and setup dialogs.
  - One-click **"Restart & Update"** instantly applies the update and relaunches the application in under 2 seconds.
  - Clicking **"Later"** closes the notification while automatically staging the update to apply silently when the app exits.
- **Manual Check Triggers**:
  - Added **"Check for Updates..."** action inside the Title Bar **Help** dropdown menu.
  - Added a dedicated **"Check Updates"** button in the Documentation & Info page header toolbar.

---

## [1.1.1] - 2026-08-15

### 📖 Full GitHub Flavored Markdown (GFM) Rendering Engine

#### 🚀 Features & Architecture Improvements
- **Robust GFM & CommonMark Parser**:
  - Replaced the legacy line-by-line manual string splitter in the Documentation & Manuals viewer with a high-fidelity Markdown engine (`MarkdownViewer.tsx`) powered by `marked`.
  - **Inline Formatting**: Fully parses bold (`**bold**`), italics (`*italic*`), strikethrough (`~~text~~`), inline code (`` `code` ``), and nested formatting correctly without rendering raw unparsed markdown symbols.
  - **Lists & Indentation**: Fully supports bulleted lists, numbered lists, sub-lists, and interactive task checkboxes.
  - **Interactive Code Blocks**: Code blocks now display language badges and include 1-click **"Copy Code"** buttons with visual checkmark animations.
  - **Interactive Table of Contents**: Clicking any heading in the "On This Page" sidebar or within the document body smoothly scrolls directly to the section anchor.
  - **GitHub-Style Callouts**: Supports `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]` alert banners.
  - **Responsive Tables**: Beautiful glassmorphic table borders with zebra striping and horizontal scrolling support.
  - **Dynamic In-Doc Search**: Real-time highlighting of search queries across headings, paragraphs, and lists.

---

## [1.1.0] - 2026-08-15

### 🌟 Smart Portal-Based Hint & Tooltip System (Zero-Clipping Architecture)

#### 🚀 Features & Architecture Improvements
- **Smart Portal Rendering (`ReactDOM.createPortal`)**:
  - Eliminated UI clipping and cropping caused by parent containers with `overflow: hidden`, `overflow: scroll`, modal borders, or restricted stacking contexts by mounting tooltips directly to `document.body`.
- **Dynamic Viewport Collision & Boundary Clamping Engine**:
  - Implemented automatic edge detection: tooltips automatically flip placement (`top` ↔ `bottom`, `left` ↔ `right`) when encountering viewport boundaries.
  - Added strict coordinate clamping with a safety margin (8px) ensuring tooltips and hints are never clipped, cut off, or pushed off-screen.
  - Dynamically calculates the arrow/caret offset to point accurately at the target element's center even when clamped.
  - Live recalculation on window resize and container scroll events.
- **Universal Replaced Native OS Tooltips**:
  - Completely replaced ugly, unstyled default Windows OS tooltips (`title=`) across all pages (Prompts, Models, Compare Lab, Collections, Runs History, Viewport Controls, Logging Panel, Header, and Sidebar) with rich glassmorphism hints.
  - Added support for subtext descriptions and glowing 3D `<kbd>` keyboard shortcut pills.
- **⚡ Instant 1-Click Prompt Copy Engine**:
  - **Prompt Library Header**: Added a prominent `Copy Prompt` action button with live `Copied!` visual checkmark feedback and toast notification.
  - **Global Keyboard Shortcut (`Alt+C`)**: Pressing `Alt+C` on the Prompts or Compare page instantly copies the active challenge prompt to the clipboard.
  - **Prompt List Sidebar**: Every prompt card in the left library list features a 1-click quick-copy button.
  - **Prompt Version History**: Historical versions (`v1`, `v2`, etc.) and Monaco editor toolbar have dedicated 1-click copy buttons.
  - **Command Palette (`Ctrl+K`)**: Direct prompt search results have instant copy buttons and dedicated `Copy Prompt: <Name>` action items, plus `Alt+C` shortcut support from anywhere in the app.
  - **Execution & Output Modals**: Direct prompt preview and copy capabilities within `RunBenchmarkModal` and `AddOutputModal`.
  - **Comparison Laboratory**: Added a top toolbar prompt pill with a 1-click `Copy Prompt` button.

---

## [1.0.0] - 2026-08-15

### 🚀 Initial Production Release

#### 🌟 Core Features & Capabilities
- **LLM Benchmark Laboratory**: Systematic desktop suite for testing, evaluating, and inspecting LLM-generated HTML applications over time.
- **Benchmark Prompts & Immutable Versioning**: Full prompt management with categories, tags, collections, and permanent historical version records (`v1`, `v2`, etc.).
- **Registered Model Catalog**: Track model releases across providers, parameter counts (e.g. 27B, 70B), quantizations (FP16, Q4_K_M), and deployment types (Cloud API vs. Local Inference).
- **Manual Output Recording & Automatic HTML Extractor**: Paste raw model markdown responses with automatic extraction of code fences (` ```html ... ``` `) and non-destructive preservation of original raw text.
- **Live Provider Execution Engine**: Direct API execution for OpenAI, OpenRouter, LM Studio, Ollama, and vLLM endpoints with generation timing and token throughput metrics (`tokens/sec`).
- **Side-by-Side Comparison Laboratory**: Compare up to 4 models simultaneously with synchronized responsive viewport controls (Desktop, Tablet, Mobile, Canvas).
- **Sandboxed Execution Runtime**: Isolated `<iframe>` security sandbox with an inline error & console interception drawer capturing `console.log`, warnings, and runtime exceptions.
- **Monaco Code Diff Viewer**: Embedded side-by-side visual diffing engine comparing HTML and raw model responses.
- **Multi-Dimensional Evaluation System**: Weighted 5-dimension rating scale (Visual Quality 25%, Prompt Adherence 25%, Functionality 25%, Code Quality 15%, Creativity 10%).
- **Head-to-Head Matchup Arena**: Pairwise comparison tracking driving Elo-style model leaderboard win-rates.
- **Performance Leaderboards & Category Analytics**: Comprehensive dashboard metrics, rankings, sample counts, and category breakdowns.
- **Data Portability & Database Engine**: SQLite storage (`better-sqlite3`) in WAL mode with atomic schema migrations, point-in-time database backups, and full JSON dataset export/import.

#### 🎨 Design & Assets
- **Vector SVG Application Icon**: Custom high-resolution vector emblem (`assets/icon.svg`) featuring dark squircle geometry, glowing code brackets `< / >`, layered benchmark cards, and AI spark accents.
- **Automated SVG Icon Build Pipeline**: Automated script (`scripts/build-icons.mjs`) validating and rasterizing SVG source into multi-resolution PNGs and Windows `.ico` formats using Electron Chromium offscreen rendering.
- **Theme System**: Sleek Dark and Light themes with high-density desktop typography and custom CSS variable tokens.

#### 🔧 Fixes & Stability Improvements
- **Modal Event Handling**: Resolved modal disappearance issue caused by text selection and mouse drag releases outside dialog boundaries by implementing coordinated `onMouseDown` and `onMouseUp` backdrop tracking.
- **Reactive Model Synchronization**: Connected `NewModelModal` directly with `AppContext` and `ModelsPage` so newly registered models immediately populate and highlight without requiring a manual refresh.
- **Keyboard Shortcut Guards**: Added input focus protection to prevent global shortcuts (`Ctrl+N`, `Ctrl+Shift+C`) from intercepting text editing inside input fields and textareas.
- **Comprehensive Documentation Suite**: Integrated built-in Documentation & Info tab providing instant access to the Project Readme, Functional User Manual, Technical Architecture Manual, and Version Log.
- **VSCode-Inspired Frameless Title Bar**: Implemented modern borderless desktop window design with custom window controls (minimize, maximize/restore, close), native window dragging, command palette search bar, and integrated File, View, Benchmark, and Help dropdown menus.
- **Application Logging Subsystem & Live Panel**: Added real-time log streaming with level filtering for DEBUG (green), INFO (blue), WARNING (orange), and ERROR (red), source & text filtering, automatic log file storage in the executable directory (`llm-html-bench-YYYY-MM-DD.log`), and collapsible bottom panel drawer.
- **Full CRUD & Cascade Deletion Management**:
  - **Prompts**: Added `EditPromptModal` for modifying prompt titles, categories, descriptions, tag chips, and suite assignments. Added `ConfirmModal` for permanent prompt deletion with cascading clean-up of child versions, runs, outputs, and evaluations.
  - **Models**: Added `EditModelModal` for updating model provider, identifier, display name, family, parameter count, architecture, quantization, and deployment notes. Added safe model deletion.
  - **Outputs & Runs**: Added `EditOutputModal` enabling in-place or versioned modification of generated HTML code (with live preview and syntax editing), raw responses, and notes. Added run deletion across Prompts, Models, and Runs tabs.
  - **Benchmark Suites**: Added Suite editing (name & description), deletion, and individual prompt unlinking.
  - **Compare Lab In-Situ Actions**: Added one-click output editing and slot removal directly within side-by-side comparison cards.
- **Spotlight Command Palette & Global Search (`Ctrl+K` / `Ctrl+P`)**:
  - Implemented an interactive search bar in the title header that opens an instant Spotlight-style command palette.
  - Real-time unified search across **Actions** (New Prompt, Register Model, Run Benchmark, Export/Import, Logs, Theme), **Navigation Tabs**, **Prompt Library**, **Model Catalog**, **Benchmark Runs**, and **Suites**.
  - Complete keyboard navigation with `↑` `↓` arrows, `↵` execution, and `ESC` dismissal.
- **Polished Tooltips, Keycaps & Form Hints Design System**:
  - Replaced boxy browser native OS tooltips with a custom glassmorphism `Tooltip` component supporting customizable directions (top, bottom, left, right) and keyboard shortcut badges.
  - Introduced styled 3D keyboard keycaps (`<kbd>`, `.keycap`) and structured `.field-hint` / `.form-hint` components across forms, header controls, and status bar elements.
