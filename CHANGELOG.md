# LLM HTML Bench — Version Log & Changelog

All notable changes, architectural milestones, and release updates for **LLM HTML Bench** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
