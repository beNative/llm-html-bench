import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Prompt, ModelRun } from '@shared/types/entities';
import {
  Search,
  Plus,
  Play,
  Sparkles,
  FileCode2,
  Columns,
  LayoutDashboard,
  Cpu,
  FolderKanban,
  History,
  Settings,
  BookOpen,
  Database,
  FolderOpen,
  Terminal,
  Sun,
  Moon,
  ArrowRight,
  X,
  Code2,
  Copy,
  Check,
  Download,
  Upload,
  Info,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CommandItem {
  id: string;
  title: string;
  category: 'Actions' | 'Navigation' | 'Prompts' | 'Models' | 'Suites' | 'Runs';
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  onCopy?: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setCurrentTab,
    setIsNewPromptModalOpen,
    setIsNewModelModalOpen,
    setIsRunBenchmarkModalOpen,
    openAddOutputModal,
    openAboutModal,
    backupDatabase,
    restoreDatabase,
    openDatabaseFolder,
    setSelectedPromptId,
    setSelectedModelId,
    openCompareWithRuns,
    models,
    collections,
    toggleLogPanel,
    showToast,
  } = useApp();

  const { theme, toggleTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [recentRuns, setRecentRuns] = useState<ModelRun[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedCmdId, setCopiedCmdId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load prompts and recent runs when palette opens
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      if (window.electronAPI) {
        window.electronAPI.getPrompts().then((data) => setPrompts(data || []));
        window.electronAPI.getAllRuns(20).then((data) => setRecentRuns(data || []));
      }
    }
  }, [isCommandPaletteOpen]);

  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // 1. Quick Actions
    list.push({
      id: 'action-new-prompt',
      title: 'Create New Benchmark Prompt',
      category: 'Actions',
      subtitle: 'Define a new HTML benchmark challenge with v1 prompt text',
      icon: <Plus size={14} color="var(--accent-primary)" />,
      shortcut: 'Ctrl+N',
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setIsNewPromptModalOpen(true);
      },
    });

    list.push({
      id: 'action-new-model',
      title: 'Register New LLM Model',
      category: 'Actions',
      subtitle: 'Add model provider, architecture specs, and quantization',
      icon: <Sparkles size={14} color="var(--accent-purple)" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setIsNewModelModalOpen(true);
      },
    });

    list.push({
      id: 'action-run-benchmark',
      title: 'Execute Live API Benchmark',
      category: 'Actions',
      subtitle: 'Send benchmark prompt to OpenAI / OpenRouter / Ollama / LM Studio',
      icon: <Play size={14} color="var(--accent-success)" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setIsRunBenchmarkModalOpen(true);
      },
    });

    list.push({
      id: 'action-add-output',
      title: 'Add Model Output (Manual Paste)',
      category: 'Actions',
      subtitle: 'Paste raw response or extracted HTML from browser / CLI runs',
      icon: <FileCode2 size={14} color="var(--accent-cyan)" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        openAddOutputModal('');
      },
    });

    list.push({
      id: 'action-backup-db',
      title: 'Database: Backup SQLite Database',
      category: 'Actions',
      subtitle: 'Create a standalone snapshot backup file of benchmark.sqlite',
      icon: <Download size={14} color="var(--accent-primary)" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        backupDatabase();
      },
    });

    list.push({
      id: 'action-restore-db',
      title: 'Database: Restore SQLite Database',
      category: 'Actions',
      subtitle: 'Restore database from an existing SQLite backup file',
      icon: <Upload size={14} color="var(--accent-warning)" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        restoreDatabase();
      },
    });

    list.push({
      id: 'action-open-db-folder',
      title: 'Database: Open Database File Location in Explorer',
      category: 'Actions',
      subtitle: 'Reveal benchmark.sqlite on the filesystem',
      icon: <FolderOpen size={14} color="var(--accent-primary)" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        openDatabaseFolder();
      },
    });

    list.push({
      id: 'action-about-app',
      title: 'App: About LLM HTML Bench & GitHub Repo',
      category: 'Actions',
      subtitle: 'Version details, author credits, and repository links',
      icon: <Info size={14} color="var(--accent-primary)" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        openAboutModal();
      },
    });

    list.push({
      id: 'action-export-json',
      title: 'Export Benchmark Dataset to JSON...',
      category: 'Actions',
      subtitle: 'Full backup of prompts, models, runs, outputs, and scores',
      icon: <Database size={14} color="var(--accent-warning)" />,
      onSelect: async () => {
        setIsCommandPaletteOpen(false);
        if (window.electronAPI) {
          const res = await window.electronAPI.exportDatasetToFile();
          if (res.success) showToast('Benchmark dataset exported successfully!', 'success');
        }
      },
    });

    list.push({
      id: 'action-import-json',
      title: 'Import Benchmark Dataset from JSON...',
      category: 'Actions',
      subtitle: 'Restore or merge benchmark runs and prompt libraries',
      icon: <FolderOpen size={14} color="var(--accent-warning)" />,
      onSelect: async () => {
        setIsCommandPaletteOpen(false);
        if (window.electronAPI) {
          const res = await window.electronAPI.importDatasetFromFile();
          if (res.success) showToast(`Imported ${res.importedCount} benchmark items!`, 'success');
        }
      },
    });

    list.push({
      id: 'action-toggle-logs',
      title: 'Toggle Application Diagnostic Logs',
      category: 'Actions',
      subtitle: 'Open or close the bottom real-time logging drawer',
      icon: <Terminal size={14} color="var(--accent-primary)" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        toggleLogPanel();
      },
    });

    list.push({
      id: 'action-toggle-theme',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`,
      category: 'Actions',
      subtitle: `Toggle application visual theme to ${theme === 'dark' ? 'Light' : 'Dark'} mode`,
      icon: theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#8b5cf6" />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        toggleTheme();
      },
    });

    // 2. Navigation
    list.push({
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      category: 'Navigation',
      subtitle: 'Overview rankings, metric summary, and category breakdowns',
      icon: <LayoutDashboard size={14} />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setCurrentTab('dashboard');
      },
    });

    list.push({
      id: 'nav-prompts',
      title: 'Go to Prompt Library',
      category: 'Navigation',
      subtitle: 'Manage benchmark prompts, categories, tags, and versions',
      icon: <FileCode2 size={14} />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setCurrentTab('prompts');
      },
    });

    list.push({
      id: 'nav-compare',
      title: 'Go to Compare Laboratory',
      category: 'Navigation',
      subtitle: 'Side-by-side multi-model inspection and head-to-head arena',
      icon: <Columns size={14} />,
      shortcut: 'Ctrl+Shift+C',
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setCurrentTab('compare');
      },
    });

    list.push({
      id: 'nav-models',
      title: 'Go to Models Catalog',
      category: 'Navigation',
      subtitle: 'Inspect registered LLMs, architectures, and evaluation scores',
      icon: <Cpu size={14} />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setCurrentTab('models');
      },
    });

    list.push({
      id: 'nav-collections',
      title: 'Go to Collections & Benchmark Suites',
      category: 'Navigation',
      subtitle: 'Curated test suites and grouped prompt challenges',
      icon: <FolderKanban size={14} />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setCurrentTab('collections');
      },
    });

    list.push({
      id: 'nav-runs',
      title: 'Go to Run History & Outputs',
      category: 'Navigation',
      subtitle: 'Audit log of all generations, token speeds, and ratings',
      icon: <History size={14} />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setCurrentTab('runs');
      },
    });

    list.push({
      id: 'nav-settings',
      title: 'Go to Settings & Database',
      category: 'Navigation',
      subtitle: 'API keys, database backups, vacuum, and preferences',
      icon: <Settings size={14} />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setCurrentTab('settings');
      },
    });

    list.push({
      id: 'nav-info',
      title: 'Go to Documentation & Manuals',
      category: 'Navigation',
      subtitle: 'Read Functional Manual, Technical Architecture, and Changelog',
      icon: <BookOpen size={14} />,
      onSelect: () => {
        setIsCommandPaletteOpen(false);
        setCurrentTab('info');
      },
    });

    // 3. Dynamic Prompts (Searchable & Quick-Copyable)
    prompts.forEach((p) => {
      const copyFn = async () => {
        let text = p.latest_version?.prompt_text;
        if (!text && window.electronAPI) {
          const vers = await window.electronAPI.getPromptVersions(p.id);
          if (vers && vers.length > 0) text = vers[0].prompt_text;
        }
        if (text) {
          await navigator.clipboard.writeText(text);
          setCopiedCmdId(`prompt-${p.id}`);
          setTimeout(() => setCopiedCmdId(null), 2000);
          showToast(`Prompt "${p.name}" copied to clipboard!`, 'success');
        } else {
          showToast('No prompt text available to copy', 'error');
        }
      };

      list.push({
        id: `prompt-${p.id}`,
        title: p.name,
        category: 'Prompts',
        subtitle: `[${p.category}] ${p.description || 'Prompt challenge'}`,
        icon: <FileCode2 size={14} color="var(--accent-primary)" />,
        onSelect: () => {
          setIsCommandPaletteOpen(false);
          setSelectedPromptId(p.id);
          setCurrentTab('prompts');
        },
        onCopy: copyFn,
      });

      list.push({
        id: `copy-prompt-${p.id}`,
        title: `Copy Prompt: ${p.name}`,
        category: 'Actions',
        subtitle: `Copy full text of "${p.name}" (${p.category}) to clipboard`,
        icon: <Copy size={14} color="var(--accent-cyan)" />,
        onSelect: async () => {
          setIsCommandPaletteOpen(false);
          await copyFn();
        },
      });
    });

    // 4. Dynamic Models
    models.forEach((m) => {
      list.push({
        id: `model-${m.id}`,
        title: m.display_name,
        category: 'Models',
        subtitle: `${m.provider} • ${m.parameter_count || 'Params N/A'} • ${m.quantization || m.local_or_cloud || 'Cloud'}`,
        icon: <Cpu size={14} color="var(--accent-purple)" />,
        onSelect: () => {
          setIsCommandPaletteOpen(false);
          setSelectedModelId(m.id);
          setCurrentTab('models');
        },
      });
    });

    // 5. Dynamic Suites
    collections.forEach((c) => {
      list.push({
        id: `suite-${c.id}`,
        title: c.name,
        category: 'Suites',
        subtitle: c.description || 'Curated benchmark suite',
        icon: <FolderKanban size={14} color="var(--accent-cyan)" />,
        onSelect: () => {
          setIsCommandPaletteOpen(false);
          setCurrentTab('collections');
        },
      });
    });

    // 6. Dynamic Benchmark Runs
    recentRuns.forEach((r) => {
      list.push({
        id: `run-${r.id}`,
        title: `Run: ${r.model_display_name || r.model_name || 'Model'} • ${r.prompt_name || 'Benchmark Prompt'}`,
        category: 'Runs',
        subtitle: `Score: ${r.evaluation?.overall_score ? `${r.evaluation.overall_score.toFixed(1)}/10` : 'Unrated'} • ${r.generation_time_ms ? `${r.generation_time_ms}ms` : ''} • ${r.started_at ? new Date(r.started_at).toLocaleDateString() : ''}`,
        icon: <Code2 size={14} color="var(--accent-success)" />,
        onSelect: () => {
          setIsCommandPaletteOpen(false);
          openCompareWithRuns([r.id]);
          setCurrentTab('compare');
        },
      });
    });

    return list;
  }, [prompts, models, collections, recentRuns, theme, openCompareWithRuns, setCurrentTab, setIsCommandPaletteOpen, setIsNewModelModalOpen, setIsNewPromptModalOpen, setIsRunBenchmarkModalOpen, setSelectedModelId, setSelectedPromptId, showToast, toggleLogPanel, toggleTheme]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Return top priority actions and navigation when empty
      return allCommands.slice(0, 16);
    }
    const q = query.toLowerCase().trim();
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Ensure selectedIndex is within range
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      const activeCmd = filteredCommands[selectedIndex];
      if (activeCmd?.onCopy) {
        e.preventDefault();
        activeCmd.onCopy();
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredCommands.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCommandPaletteOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="command-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCommandPaletteOpen(false);
      }}
    >
      <div className="command-palette-container" onKeyDown={handleKeyDown}>
        {/* Input Bar */}
        <div className="command-palette-input-wrap">
          <Search size={16} color="var(--accent-primary)" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command, search prompts, models, suites, or actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          )}
          <kbd className="keycap">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="command-palette-results" ref={resultsRef}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No commands or benchmark items match "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`command-palette-item ${isSelected ? 'active' : ''}`}
                  onClick={() => cmd.onSelect()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {cmd.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cmd.title}
                      </span>
                      {cmd.subtitle && (
                        <span
                          className="command-palette-subtext"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {cmd.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                    {cmd.onCopy && (
                      <Tooltip content="Quick Copy Prompt" description="Copy prompt text to clipboard" position="left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cmd.onCopy?.();
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 5px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: copiedCmdId === cmd.id ? 'var(--accent-success-light)' : 'transparent',
                            color: copiedCmdId === cmd.id ? 'var(--accent-success)' : 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            fontSize: '10px',
                            gap: '3px',
                          }}
                        >
                          {copiedCmdId === cmd.id ? <Check size={11} color="var(--accent-success)" /> : <Copy size={11} />}
                          <span>{copiedCmdId === cmd.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </Tooltip>
                    )}
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && <kbd className="keycap">{cmd.shortcut}</kbd>}
                    {isSelected && <ArrowRight size={12} color="#ffffff" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with clean keyboard navigation hints */}
        <div className="command-palette-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span><kbd className="keycap">↑</kbd> <kbd className="keycap">↓</kbd> to navigate</span>
            <span><kbd className="keycap">↵</kbd> to select</span>
            <span><kbd className="keycap">Alt+C</kbd> to copy prompt</span>
            <span><kbd className="keycap">ESC</kbd> to close</span>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>
            {filteredCommands.length} {filteredCommands.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>
    </div>
  );
};
