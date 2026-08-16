# LLM HTML Bench — Technical Architecture & Engineering Manual

This technical manual details the internal architecture, component design, data persistence, security model, and build pipeline for **LLM HTML Bench**.

---

## 📑 Table of Contents
1. [Architectural Overview](#1-architectural-overview)
2. [Multi-Process Model & IPC Architecture](#2-multi-process-model--ipc-architecture)
3. [Database & Persistence Layer](#3-database--persistence-layer)
4. [Security Model & Sandbox Execution](#4-security-model--sandbox-execution)
5. [Frontend & Renderer Design System](#5-frontend--renderer-design-system)
6. [LLM Provider Execution Engine](#6-llm-provider-execution-engine)
7. [Vector Icon & Asset Build System](#7-vector-icon--asset-build-system)
8. [Packaging & Distribution](#8-packaging--distribution)

---

## 1. Architectural Overview

LLM HTML Bench is built with a decoupled 3-tier architecture:
- **Core Desktop Shell**: Electron 34 (Node.js runtime + Chromium display engine).
- **Presentation Layer**: React 18 with Vite, Vanilla CSS custom design system, Monaco Editor integration.
- **Data & Execution Core**: Embedded SQLite (via `better-sqlite3`), transactional migrations, sandboxed iframe runtime, encrypted safeStorage.

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│   ┌───────────────────┐               ┌─────────────────┐   │
│   │ SQLite (WAL Mode) │               │ Provider Engine │   │
│   │ better-sqlite3    │               │ (OpenAI Compat) │   │
│   └─────────▲─────────┘               └────────▲────────┘   │
│             │                                  │            │
│   ┌─────────▼──────────────────────────────────▼────────┐   │
│   │            Typed IPC Handler Layer (60+ APIs)        │   │
│   └─────────────────────────▲────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │ Context Bridge (Preload)
┌─────────────────────────────▼───────────────────────────────┐
│                   Renderer Process (React 18)               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ AppContext (Reactive Store & Single Source of Truth)│   │
│   └──────────┬───────────────────────┬──────────────────┘   │
│              ▼                       ▼                      │
│   ┌──────────────────────┐┌─────────────────────────────┐   │
│   │ Monaco Editor & Diff ││ Sandboxed IFrame Preview    │   │
│   │ (Code / Prompts)     ││ (Console & Exception Trap)  │   │
│   └──────────────────────┘└─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Process Model & IPC Architecture

### Main Process (`src/main/`)
The Electron main process manages native operating system lifecycle, window creation, SQLite persistence, file system exports, and safe credential storage.
- **Entry Point**: `src/main/index.ts`
- **Logger**: `src/main/utils/logger.ts` outputs persistent execution logs to `%APPDATA%/llm-html-bench/logs/`.
- **Database Initializer**: `src/main/database/connection.ts`

### Preload & Type-Safe Context Bridge (`src/preload/`)
- Strict security configuration: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`.
- Exposes `window.electronAPI` to the renderer with 100% TypeScript type safety defined in `src/shared/types/ipc.ts`.

### IPC Channels & Routing (`src/main/ipc/`)
- Channel definitions are centralized in `src/main/ipc/channels.ts`.
- Structured repository routing in `src/main/ipc/ipcHandlers.ts` maps renderer calls directly to transactional database repository services.

---

## 3. Database & Persistence Layer

The application embeds SQLite via `better-sqlite3` operating in **Write-Ahead Logging (WAL)** mode for maximum desktop throughput and zero concurrency locking.

### Storage Location
```text
%APPDATA%\llm-html-bench\database\benchmark.sqlite
```

### Schema & Entity Model
```
┌──────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│   prompts    │ 1───* │   prompt_versions    │ 1───* │     model_runs      │
│ (id, name,   │       │ (id, version,        │       │ (id, raw_output,    │
│  category)   │       │  prompt_text)        │       │  html, eval, speed) │
└──────┬───────┘       └──────────────────────┘       └──────────┬──────────┘
       │                                                         │
       │ *                                                     * │
┌──────▼───────┐                                      ┌──────────▼──────────┐
│  collections │                                      │       models        │
│    & tags    │                                      │ (id, provider,      │
└──────────────┘                                      │  params, quant)     │
                                                      └─────────────────────┘
```

### Key Tables & Cascade Deletion Rules
All foreign key relations enforce `ON DELETE CASCADE`:
1. `prompts`: Master records. Deleting a prompt cascades to delete its `prompt_versions`, all linked `model_runs`, `outputs`, `evaluations`, `screenshots`, `prompt_tags`, and `prompt_collections`.
2. `prompt_versions`: Immutable historical versions (`v1`, `v2`, etc.) containing the exact task prompt text.
3. `models`: Registered LLM architectures, providers, parameter counts, quantizations, and deployment types. Deleting a model cascades to delete all associated `model_runs`.
4. `model_runs`: Benchmark runs capturing the raw LLM response, extracted HTML, sampling temperature, output tokens, tokens/sec, and timing. Deleting a run cascades to delete `outputs`, `evaluations`, `screenshots`, and `head_to_head_comparisons`.
5. `outputs`: Extracted HTML and raw output text (`is_modified` iteration support).
6. `evaluations`: Multi-dimensional score breakdown (`visual_score`, `prompt_adherence_score`, `functionality_score`, `code_quality_score`, `creativity_score`, `overall_score`).
7. `head_to_head_comparisons`: Direct pairwise winner matchups driving model leaderboard win-rates.
8. `collections` & `prompt_collections`: Grouping suites; deleting a suite safely unlinks prompt relationships without deleting prompts.
9. `provider_configs`: Saved endpoint configurations with encrypted API keys.

### Typed CRUD IPC API Surface
- **Prompts**: `prompts:get`, `prompts:get-by-id`, `prompts:create`, `prompts:update`, `prompts:archive`, `prompts:delete`, `prompts:create-version`, `prompts:get-versions`.
- **Models**: `models:get`, `models:get-by-id`, `models:create`, `models:update`, `models:delete`.
- **Runs & Outputs**: `runs:get-for-prompt`, `runs:get-for-model`, `runs:get-all`, `runs:create`, `runs:update`, `runs:delete`, `runs:save-modified-output`, `outputs:update`.
- **Collections & Suites**: `collections:get`, `collections:create`, `collections:update`, `collections:delete`, `collections:remove-prompt`.

### Migration Engine (`src/main/database/migrator.ts`)
Tracks schema versions via SQLite `PRAGMA user_version`. Migrations run sequentially in atomic transactions upon application startup.

---

## 4. Security Model & Sandbox Execution

Evaluating untrusted model code requires layered defense-in-depth:

### 1. Isolated `<iframe>` Execution
Rendered HTML is injected into an isolated `<iframe>` configured with:
```html
<iframe sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups" />
```
- Restricts direct DOM access to the parent application window.
- Disallows top-level navigation, parent window redirection, and Electron IPC access.

### 2. Runtime Exception & Console Interceptor Shim
Before injecting model code, a lightweight inline telemetry shim is mounted inside the iframe:
```javascript
(function() {
  const _log = console.log, _warn = console.warn, _error = console.error;
  function send(type, args) {
    window.parent.postMessage({ type: 'CONSOLE_LOG', level: type, messages: Array.from(args).map(String) }, '*');
  }
  console.log = (...a) => { _log(...a); send('log', a); };
  console.warn = (...a) => { _warn(...a); send('warn', a); };
  console.error = (...a) => { _error(...a); send('error', a); };
  window.addEventListener('error', (e) => send('error', [e.message + ' at ' + e.filename + ':' + e.lineno]));
})();
```
This isolates and mirrors console messages in the application's **Console Drawer** without exposing the host window.

### 3. Content Security Policy & Navigation Interception
- `session.defaultSession.webRequest.onHeadersReceived` injects CSP rules.
- `webContents.setWindowOpenHandler` blocks window popups and routes external HTTP/HTTPS URLs to the default OS browser via `shell.openExternal`.

---

## 5. Frontend & Renderer Design System

- **React 18 & Vite**: Built for instant sub-second hot reloading in dev and optimized tree-shaken chunks in production.
- **Theme System**: Full Dark and Light theme token support via CSS variables (`variables.css`, `reset.css`, `typography.css`).
- **State Management**: Centralized reactive state in `AppContext.tsx` managing active tabs, selected prompts, models, compare selections, and toast notifications.
- **Monaco Editor Integration**: Embedded VS Code editor engine for syntax-highlighted prompt authoring and side-by-side HTML diffing.

---

## 6. LLM Provider Execution & Model Discovery Engine

- **Provider Registry**: `src/main/providers/providerRegistry.ts`
- **Multi-Endpoint Management**: `src/main/services/settingsService.ts` persists multiple local and cloud provider configurations with secure `safeStorage` encryption for API keys.
- **OpenAI Compatible Client**: `src/main/providers/openaiProvider.ts` communicates with OpenAI, OpenRouter, LM Studio, Ollama, vLLM, and SGLang endpoints.
- **Dynamic Model Auto-Discovery (`/v1/models`)**: Queries endpoint models and normalizes IDs, display names, and owner metadata.
- **Automatic Catalog Registration**: The IPC handler automatically registers discovered models into SQLite on the fly during benchmark execution if not already present.
- **Streaming & Token Telemetry**: Automatically records total duration in milliseconds, completion tokens, and tokens per second throughput.
- **SafeStorage Encryption**: API keys are securely encrypted using Windows DPAPI / macOS Keychain / Linux Secret Service before disk storage.

---

## 7. Vector Icon & Asset Build System

- **Source Asset**: Pure vector SVG located at `assets/icon.svg`.
- **Build Engine**: `scripts/build-icons.mjs`
  - Validates SVG structure, XML namespace, and geometry.
  - Automatically rasterizes SVG into crisp multi-resolution PNGs (16px, 24px, 32px, 48px, 64px, 128px, 256px, 512px) using Electron Chromium offscreen rendering.
  - Packages PNG layers into a valid multi-image Windows `.ico` binary asset.
  - Automatically copies outputs to `build/`, `public/`, and `dist/`.

---

## 8. Packaging & Distribution

- **Packager**: `electron-builder` with configuration defined in `electron-builder.json5`.
- **Target Platforms**: Windows (NSIS installer), macOS (DMG), Linux (AppImage).
- **Executable Accompanying Documentation**: `extraFiles` directive automatically copies `README.md`, `MANUAL_FUNCTIONAL.md`, `MANUAL_TECHNICAL.md`, and `CHANGELOG.md` directly next to the distributed application binary.

---

## 9. Logging Subsystem Architecture & Persistence

- **Core Module**: `src/main/utils/logger.ts`
- **In-Memory Ring Buffer**: Retains the last 2,000 log entries with millisecond timestamps (`HH:mm:ss.SSS`), log levels (`DEBUG`, `INFO`, `WARNING`, `ERROR`), and subsystem tags (`MAIN`, `RENDERER`, `DATABASE`, `PROVIDER`, `BENCHMARK`).
- **Real-Time IPC Streaming**: The main logger utilizes a broadcast callback to stream log events in real-time over the `logs:new-entry-event` channel to the renderer.
- **Log File Storage & Naming**:
  - In production (packaged Electron app), log files are saved directly in the executable root folder (`path.dirname(process.execPath)`).
  - In development mode, logs are stored in `<workspace>/logs/`.
  - Daily dated file naming convention: `llm-html-bench-YYYY-MM-DD.log`.
  - Format per line: `[YYYY-MM-DDTHH:mm:ss.SSSZ] [LEVEL] [SOURCE] message | Details: ...`

---

## 10. Automated CI/CD Release Pipeline

LLM HTML Bench features a fully automated multi-platform release workflow powered by GitHub Actions:

- **Workflow Definition**: `.github/workflows/release.yml`
- **Triggers**:
  - Pushing any semantic version Git tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`).
  - Manual trigger via `workflow_dispatch` with custom tag parameters.
- **Stage 1: Validation & Quality Gate (`validate-and-test`)**:
  - Validates that the git tag conforms to Semantic Versioning (`vMAJOR.MINOR.PATCH`).
  - Executes full TypeScript typecheck (`tsc --noEmit`).
  - Runs headless Vitest unit tests and SQLite Electron migration tests inside an automated Xvfb display server.
- **Stage 2: Multi-Platform Build Matrix (`build-binaries`)**:
  - Matrix parallel compilation on native host runners:
    - **Windows (`windows-latest`)**: Produces `LLM HTML Bench-Setup-X.Y.Z.exe` (NSIS) and `LLM HTML Bench-X.Y.Z-win.zip` (Portable).
    - **macOS (`macos-latest`)**: Produces `LLM HTML Bench-X.Y.Z-arm64.dmg`, `LLM HTML Bench-X.Y.Z-x64.dmg`, and standalone `.zip` archives.
    - **Linux (`ubuntu-latest`)**: Produces `LLM HTML Bench-X.Y.Z-x64.AppImage`, `LLM HTML Bench-X.Y.Z-x64.deb`, and `LLM HTML Bench-X.Y.Z-x64.tar.gz`.
  - Native module rebuilds (`better-sqlite3`) executed per target platform and architecture.
- **Stage 3: Release Packaging & Publishing (`publish-release`)**:
  - Gathers all platform binaries into unified release staging.
  - Computes cryptographic SHA-256 hashes (`SHA256SUMS.txt`).
  - Automatically parses and extracts the matching release section from `CHANGELOG.md` via `scripts/generate-release-notes.mjs`.
  - Publishes a formal GitHub Release attaching all binary packages, checksums, and structured download tables.

