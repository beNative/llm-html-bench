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

### Key Tables
1. `prompts`: Master records containing prompt name, description, category, and metadata.
2. `prompt_versions`: Immutable historical versions (`v1`, `v2`, etc.) containing the exact task prompt text.
3. `models`: Registered LLM architectures, providers, parameter counts, quantizations, and deployment types.
4. `model_runs`: Benchmark runs capturing the raw LLM response, extracted HTML, sampling temperature, output tokens, tokens/sec, and timing.
5. `evaluations`: Multi-dimensional score breakdown (`visual_score`, `prompt_adherence_score`, `functionality_score`, `code_quality_score`, `creativity_score`, `overall_score`).
6. `head_to_head_comparisons`: Direct pairwise winner matchups driving model leaderboard win-rates.
7. `provider_configs`: Saved endpoint configurations with encrypted API keys.

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

## 6. LLM Provider Execution Engine

- **Provider Registry**: `src/main/providers/providerRegistry.ts`
- **OpenAI Compatible Client**: `src/main/providers/openaiProvider.ts` communicates with OpenAI, OpenRouter, LM Studio, Ollama, and vLLM endpoints.
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
