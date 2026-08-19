# LLM HTML Bench — Version Log & Changelog

All notable changes, architectural milestones, and release updates for **LLM HTML Bench** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.8.1] - 2026-08-19

### 🚀 Cutting-Edge 2025/2026 Model Catalog & CI/CD Pipeline Hardening

#### 🌟 Key Features & Architectural Enhancements
- **Expanded Cutting-Edge 2025/2026 Model Catalog (38 Models Across 10 Categories)**:
  - Completely updated model templates with the latest frontier reasoning and generative architectures:
    - **Reasoning Leaders**: *Claude 3.7 Sonnet (Hybrid Thinking)*, *DeepSeek R1 (671B MoE)*, *OpenAI o3-mini*, *OpenAI o1*, *OpenAI o1-mini*, *Gemini 2.0 Flash Thinking Exp*, *QwQ 32B Preview*, *DeepSeek R1 Distill Qwen 32B*, *DeepSeek R1 Distill Llama 70B*.
    - **Frontier Flagships**: *Claude 3.7 Sonnet (Standard)*, *Claude 3.5 Sonnet v2*, *Claude 3.5 Haiku*, *GPT-4.5 Preview*, *GPT-4o (2024-11-20)*, *GPT-4o mini*, *DeepSeek V3 (671B MoE MLA)*, *Gemini 2.0 Flash*, *Gemini 2.0 Pro Exp*, *xAI Grok 3*, *xAI Grok 2*, *Mistral Large 2 (2411)*.
    - **Open-Weights & Code Synthesis**: *Qwen 2.5 Coder 32B/14B/7B*, *Codestral 2501*, *Llama 3.3 70B*, *Llama 3.1 405B/70B/8B*, *Phi-4 (14B)*, *Phi-4 Mini (3.8B)*, *Gemma 2 27B*, *Cohere Command R+*, *Amazon Nova Pro*, *SmolLM2 1.7B*.
  - **Categorized UI `<optgroup>` Pickers**: Grouped into clean subheadings within the model preset dropdown for effortless navigation.
  - **Comprehensive Artificial Analysis Correlation**: All 38 models are mapped with pre-populated Artificial Analysis intelligence indices, measured token speeds, and API pricing.
- **CI/CD Build Pipeline Hardening**:
  - Added a 5-attempt retry loop with exponential backoff for `npm ci` and Electron binary downloads in `.github/workflows/release.yml`, resolving transient CDN socket resets (`ECONNRESET`) during multi-platform builds.

---

## [1.8.0] - 2026-08-19

### 🏢 Model Entry & Editor Overhaul + Artificial Analysis Benchmark Intelligence

#### 🌟 Key Features & Architectural Enhancements
- **Modern Model Entry & Editor Suite (`ModelForm.tsx`)**:
  - Reusable, high-density form powering both `NewModelModal` and `EditModelModal`.
  - **Categorized Provider Dropdown**: Organized into *Frontier Cloud Labs* (*Anthropic, OpenAI, Google, DeepSeek, xAI, Meta, Mistral AI, Cohere, Alibaba, Amazon Bedrock, Microsoft*), *Local Inference Engines* (*Ollama, LM Studio, vLLM, SGLang, LocalAI, llama.cpp, Jan*), and *Cloud Gateways & Aggregators* (*OpenRouter, Together AI, Groq, Fireworks AI, Cerebras*), plus custom write-in support.
  - **Smart Deployment Detection**: Automatically switches between *Cloud API* and *Local Inference* based on provider selection.
  - **Modern Architecture Presets**: *Transformer (Decoder Dense)*, *Mixture of Experts (MoE)*, *Transformer + Multi-Head Latent Attention (MLA)*, *Reasoning / Thinking Model*, *Hybrid SSM-Transformer (Mamba)*, and *Vision-Language Multimodal (VLM)*.
  - **Grouped Quantization / Precision Formats**: *Full/Native (FP32, BF16, FP16)*, *Modern FP8 (E4M3, E5M2, NVFP4)*, *GGUF / llama.cpp (Q4_K_M, Q5_K_M, Q8_0, etc.)*, and *AWQ / EXL2 (4.0 bpw, 6.0 bpw)*.
- **⚡ 30+ 1-Click Model Presets & Templates**:
  - Top preset selector pre-populates all technical parameters for current flagship models (*DeepSeek R1, DeepSeek V3, Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, GPT-4o, GPT-4o mini, o1, o3-mini, Qwen 2.5 Coder 32B, Qwen 2.5 72B, Llama 3.3 70B, Llama 3.1 8B, Gemini 2.0 Flash, Mistral Large 2, Codestral 2501, Phi-4*, etc.).
- **🎛️ Parameter Scale & Context Window Pills**:
  - Clickable pills for parameter counts (`7B`, `8B`, `14B`, `27B`, `32B`, `70B`, `MoE 671B`, `Proprietary`) and context windows (`32k` to `2M`).
  - `🧠 Reasoning / Thinking Model (CoT)` flag highlighting reasoning architectures across leaderboards.
  - **Live Visual Preview Card**: Real-time card showing how the model badge, pill, and spec summary will render across the application.
- **⚡ Artificial Analysis Benchmark Intelligence**:
  - **Independent Benchmark Metrics**: Correlates **Intelligence Index (0–100)**, **Measured Output Speed (tok/s)**, **Per-1M Token Pricing ($ In / $ Out)**, and benchmark scores (**GPQA, MATH, Coding %**).
  - **Zero-Setup Offline Database**: Pre-populated snapshot for 40+ top models with instant offline matching.
  - **Live API Integration**: Optional API key in Settings querying `https://artificialanalysis.ai/api/v2/language/models` in real time.
  - **Bulk Sync**: 1-Click "Sync All Models with Artificial Analysis" action in **Settings & DB**.
  - **Models Catalog Visuals**: Displays Artificial Analysis intelligence index badges (`AA 89`), measured speeds, and pricing across sidebar cards and model detail views.
- **Database Schema Migration 002**:
  - Added `context_window`, `is_reasoning_model`, `aa_intelligence_index`, `aa_evaluations_json`, and `aa_model_id` columns to the `models` table.

---

## [1.7.0] - 2026-08-19

### 🎛️ Unified Model Preview & Adaptive Side-by-Side Comparison Workspace

#### 🌟 Key Features & Architectural Enhancements
- **Single-Model Full-Width Inspection (`ComparePage.tsx`)**:
  - Replaced the forced 50/50 split screen and empty Slot [B] placeholder with an adaptive full-width viewport when previewing a single model result.
  - Interactive sandboxed live previews, HTML source views, and metrics now occupy 100% width and height without visual clutter or forced empty slots.
- **Dedicated Single-Model Metadata Header**:
  - Dynamically updates the Detail Header when 1 model is active to display model title, score badge, star, prompt version, execution latency, generation speed (tok/s), and provenance source tags.
- **On-Demand "Compare Side-by-Side" / "Add Model" Action Menu**:
  - Added an intuitive toolbar action button with a smart candidate dropdown menu.
  - Automatically prioritizes and surfaces other model runs tested against the same benchmark prompt.
  - Instantly loads candidate models into comparison slots (supporting 1, 2, 3, or 4 simultaneous slots) on demand.
  - Seamlessly scales back down to single-model full view when slots are removed.
- **Unified Responsive Grid Engine**:
  - Consolidated multi-slot and single-slot rendering under a single reactive grid architecture with dynamic slot headers and toolbars.

---

## [1.6.0] - 2026-08-18

### ⌨️ Windows-Native Keyboard Navigation Suite & Desktop Accessibility

#### 🌟 Key Features & Architectural Enhancements
- **Windows-Native Keyboard Navigation Suite (`useListKeyboardNav.ts`)**:
  - Implemented desktop-grade keyboard navigation across all master lists, catalogs, and sidebars (`RunsPage`, `PromptsPage`, `ComparePage`, `ModelsPage`, `CollectionsPage`, `InfoPage`, `CommandPalette`).
  - **Standard Desktop Keys**:
    - `↓ ArrowDown` / `↑ ArrowUp`: Step through items with smooth auto-scrolling into view.
    - `Home` / `End`: Jump immediately to first or last list item.
    - `PageDown` / `PageUp`: Fast pagination by 6 items per step.
    - `Space` / `↵ Enter`: Activate item or toggle slot in Compare Lab catalog.
    - `Delete`: Prompt deletion for selected run, prompt, model, or benchmark suite.
    - `E`: Open Edit metadata or output modal for active item.
    - `C` / `R`: Quick-copy primary artifacts (HTML, Prompt text, Raw LLM response).
  - **Global Workspace Shortcuts**:
    - `Ctrl + 1` .. `Ctrl + 8` / `Alt + 1..8`: Instant main tab navigation across all 8 app pages.
    - `1` .. `6` / `←` / `→`: Cycle detail inspection and comparison tabs.
    - `Ctrl + R`: Open Run Benchmark Modal.
    - `Ctrl + N`: Create New Prompt.
    - `Ctrl + M`: Register New Model.
    - `Ctrl + B`: Quick SQLite database backup.
    - `Ctrl + L` / `F12`: Toggle Logging & Diagnostics drawer.
    - `F1`: Open About & System Guide.
    - `Escape`: Close modals and blur inputs to resume keyboard navigation.
  - **Input Guarding & Focus Styles**: Single-key shortcuts automatically pause while typing inside form inputs, textareas, and Monaco editors; distinct `:focus-visible` outline rings throughout UI.
- **Unit Test Suite Expansion (`tests/keyboardNav.test.ts`)**: Added automated tests verifying list index math, bounds clamping, pagination steps, and detail tab cycling.

---

## [1.5.0] - 2026-08-18

### 🔬 Compare Lab Master-Detail Redesign & Multi-Model Comparative Suite

#### 🌟 Key Features & Architectural Enhancements
- **Master-Detail 2-Pane Architecture (`ComparePage.tsx`)**:
  - Completely redesigned Compare Lab into a unified master-detail workspace matching the organization and aesthetic of Run History.
  - **Left Master Catalog (380px)**: Real-time search across model names, prompts, notes, and providers; filtering by prompt to isolate runs generated for the same challenge; multi-metric sorting (Newest, Oldest, Highest Score, Fastest Speed, Shortest Latency); provenance filtering (All Sources, API Benchmark, Manual Paste, Imported).
  - **Active Slot Chips**: Visual slot chips with color accents (`[A]`, `[B]`, `[C]`, `[D]`) with 1-click slot removal.
  - **Rich Interactive Selection Cards**: Cards with slot selection indicators (`[A]`, `[B]`, `[C]`, `[D]`), model name, star, score badge, prompt version, execution latency, tok/s, and source tags.
  - **1-Click Quick Compare**: Added "Compare Top 2" button to instantly load the two most recent runs into side-by-side comparison slots.
- **6 Specialized Comparison Workspace Tabs**:
  - 👁️ **Live Preview**: Sandboxed real-time interactive previews with responsive viewport presets (*Desktop 1920×1080*, *Tablet*, *Mobile*, *Custom*), zoom controls, and synchronized scrolling.
  - 💻 **Extracted HTML**: Side-by-side Monaco code editors with full HTML/CSS syntax highlighting.
  - ⚡ **Split View**: Synchronized live preview on top and source code below for each compared model.
  - 🔀 **Monaco Diff Viewer**: Visual side-by-side Monaco Diff viewer highlighting line and character differences (with dynamic model selectors for >2 runs).
  - 📊 **Metrics Matrix**: Side-by-side comparative table analyzing Overall Score, all 5 evaluation dimensions (Visual Quality, Prompt Adherence, Functionality, Code Quality, Creativity), Generation Speed (tok/s), Latency, Token metrics (In/Out), HTML size, Sampling Parameters, and timestamps.
  - 🏆 **Head-to-Head Arena & Scoring**: Head-to-head winner declaration selector (`HeadToHeadSelector`) + simultaneous side-by-side evaluation rating panels (`EvaluationPanel`) to grade models concurrently.
- **Synchronized Viewport & Console Integration**:
  - Integrated `ViewportControls` with responsive sizing, synchronized zoom, synchronized scrolling across iframes, reload all sandboxes, and per-slot collapsible JavaScript console drawer with real-time error badge counters.

---

## [1.4.0] - 2026-08-16

### ⚡ Live Token-by-Token Streaming Engine & Real-Time Progressive Preview

#### 🌟 Key Features & Architectural Enhancements
- **Real-Time Token-by-Token SSE Streaming Engine (`openaiProvider.ts`)**:
  - Implemented `generateStream(...)` with line-buffered Server-Sent Events (SSE) decoding directly streaming text token chunks from LM Studio, Ollama, OpenRouter, and OpenAI.
  - Supports standard OpenAI format (`choices[0].delta.content`), OpenRouter format, and Ollama streaming format (`message.content`, `eval_count`).
  - Seamless fallback to non-streaming execution if an endpoint does not support SSE.
- **Bi-Directional Streaming IPC & Request Cancellation (`ipcHandlers.ts` / `channels.ts`)**:
  - Added `PROVIDER_STREAM_CHUNK`, `PROVIDER_STREAM_STATUS`, and `PROVIDER_CANCEL_RUN` channels across Electron main and preload bridge.
  - Added `AbortController` request management allowing users to cancel in-flight generations mid-stream at any time.
- **Live Benchmark Execution Terminal (`RunBenchmarkModal.tsx`)**:
  - **Live Metrics Bar**: Active model badge, endpoint badge, elapsed timer (`0.0s`), token counter (`~1,840 tokens`), streaming velocity (`48.2 tok/s`), and state indicator (`Streaming` / `Extracting HTML`).
  - **Live Code Stream Viewer**: Syntax-styled dark terminal with auto-scroll to bottom and animated cursor `▋`.
  - **Progressive Live Preview Tab**: Sandboxed `IsolatedFrame` rendering the live HTML game/app progressively as closing tags complete.
  - **Cancel Generation Button**: Halts generation cleanly mid-stream with instant user feedback.
- **Automatic Output Storage & Inspection Transition**:
  - Automatically extracts the full HTML application upon stream completion, records timing and token counts in SQLite, and seamlessly transitions to the Master-Detail Run History.

---

## [1.3.4] - 2026-08-16

### 🎯 LM Studio Endpoint Routing Fix & HTML Landing Page Filter

#### 🌟 Bug Fixes & Refinements
- **Fixed LM Studio Chat Completion Endpoint Routing**:
  - Corrected candidate URL prioritization so `/v1/chat/completions` is always queried before `/chat/completions`, preventing LM Studio's HTTP root web server from intercepting API calls.
- **HTML Landing Page Detection & Rejection**:
  - Added response content-type and payload validation to reject HTML landing pages returned with HTTP 200, ensuring the client properly connects to the OpenAI API handler.
- **Unified Log Directory**:
  - Standardized logger path to `%APPDATA%\llm-html-bench\logs\` across all platforms.

---

## [1.3.3] - 2026-08-16

### 🎮 Live Benchmark Execution Engine, Progress Timer & Automatic Output Storage

#### 🌟 Features & Refinements
- **Real-Time Execution Progress & Elapsed Timer (`RunBenchmarkModal.tsx`)**:
  - Added a live elapsed execution timer with 100ms precision and dynamic progress box showing the target model, endpoint URL, and status.
  - Action button dynamically shows real-time progress (`Generating (14s)...`).
- **Resilient Generation & Stream Handling (`openaiProvider.ts`)**:
  - Explicitly passed `stream: false` preventing servers that default to streaming from failing single-response JSON parsing.
  - Added fallback parsers for SSE streamed chunks (`data: {...}`), multi-line JSONL, and Ollama-specific response properties (`response`, `eval_count`, `prompt_eval_count`).
- **Direct Output Storage & Master-Detail Inspection**:
  - Automatically captures the full generated HTML application, parses code blocks, records token counts and duration, and opens the run in the **Master-Detail Run History** with instant interactive preview.

---

## [1.3.2] - 2026-08-16

### 🚀 Complete Auto-Update Packaging & GitHub Releases Metadata Synchronization

#### 🌟 Bug Fixes & Refinements
- **Auto-Update Metadata Generation (`latest.yml` / `*.blockmap`)**:
  - Configured `electron-builder` to always generate differential and channel update files (`latest.yml`, `latest-mac.yml`, `latest-linux.yml`, and `*.blockmap`).
  - Updated the GitHub Actions Release workflow (`.github/workflows/release.yml`) to package and upload `latest.yml` directly into GitHub Release assets, enabling `electron-updater` to discover updates.
- **Explicit Feed URL Configuration**:
  - Added explicit `setFeedURL` configuration in `AutoUpdateService.ts` ensuring clean discovery against GitHub Releases.

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
