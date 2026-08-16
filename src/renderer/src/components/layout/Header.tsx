import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Layers,
  Plus,
  Columns,
  Sun,
  Moon,
  Sparkles,
  Play,
  Minus,
  Square,
  Copy,
  X,
  Search,
  FolderOpen,
  FileCode2,
  Database,
  BookOpen,
  RotateCw,
  Download,
  Upload,
  Info,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Tooltip } from '../common/Tooltip';

export const Header: React.FC = () => {
  const {
    compareRunIds,
    clearCompareRunIds,
    setCurrentTab,
    setIsNewPromptModalOpen,
    setIsNewModelModalOpen,
    setIsRunBenchmarkModalOpen,
    openAddOutputModal,
    openAboutModal,
    backupDatabase,
    restoreDatabase,
    openDatabaseFolder,
    openCommandPalette,
    showToast,
    toggleLogPanel,
  } = useApp();

  const { theme, toggleTheme } = useTheme();

  // Window State Management
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'benchmark' | 'help' | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Initialize and track window maximization state
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isWindowMaximized().then((max) => setIsMaximized(max));

      const cleanup = window.electronAPI.onWindowStateChange((max) => {
        setIsMaximized(max);
      });
      return cleanup;
    }
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximizeToggle = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <header
      style={{
        height: 'var(--header-height, 38px)',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0 0 10px',
        zIndex: 100,
        userSelect: 'none',
        // Enable native window dragging across the entire title bar
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
      onDoubleClick={handleMaximizeToggle}
    >
      {/* Left Section: App Logo, Product Title, and VSCode Dropdown Menus */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '100%',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
        ref={menuBarRef}
      >
        {/* App Icon */}
        <Tooltip content="LLM HTML Bench" description="Return to main Dashboard overview" position="bottom">
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
              cursor: 'pointer',
            }}
            onClick={() => setCurrentTab('dashboard')}
          >
            <Layers size={13} />
          </div>
        </Tooltip>

        {/* Product Brand */}
        <span
          onClick={() => setCurrentTab('dashboard')}
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginRight: '6px',
            cursor: 'pointer',
          }}
        >
          LLM HTML Bench
        </span>

        {/* VSCode-style Top Menu Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px', position: 'relative' }}>
          {/* File Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              onMouseEnter={() => activeMenu && setActiveMenu('file')}
              style={{
                padding: '3px 7px',
                fontSize: '11px',
                color: activeMenu === 'file' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backgroundColor: activeMenu === 'file' ? 'var(--bg-tertiary)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="titlebar-dropdown-menu">
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    setIsNewPromptModalOpen(true);
                  }}
                >
                  <Plus size={13} />
                  <span>New Benchmark Prompt</span>
                  <span className="titlebar-dropdown-shortcut">Ctrl+N</span>
                </div>
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    openAddOutputModal('');
                  }}
                >
                  <FileCode2 size={13} />
                  <span>Add Model Output...</span>
                </div>
                <div className="titlebar-dropdown-divider" />
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    backupDatabase();
                  }}
                >
                  <Download size={13} color="var(--accent-primary)" />
                  <span>Backup SQLite Database...</span>
                </div>
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    restoreDatabase();
                  }}
                >
                  <Upload size={13} color="var(--accent-warning)" />
                  <span>Restore SQLite Database...</span>
                </div>
                <div className="titlebar-dropdown-divider" />
                <div
                  className="titlebar-dropdown-item"
                  onClick={async () => {
                    setActiveMenu(null);
                    if (window.electronAPI) {
                      const res = await window.electronAPI.exportDatasetToFile();
                      if (res.success) showToast('Benchmark dataset exported successfully!', 'success');
                    }
                  }}
                >
                  <Database size={13} />
                  <span>Export Dataset to JSON...</span>
                </div>
                <div
                  className="titlebar-dropdown-item"
                  onClick={async () => {
                    setActiveMenu(null);
                    if (window.electronAPI) {
                      const res = await window.electronAPI.importDatasetFromFile();
                      if (res.success) showToast(`Imported ${res.importedCount} benchmark items!`, 'success');
                    }
                  }}
                >
                  <FolderOpen size={13} />
                  <span>Import Dataset from JSON...</span>
                </div>
                <div className="titlebar-dropdown-divider" />
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    handleClose();
                  }}
                >
                  <X size={13} />
                  <span>Exit Application</span>
                  <span className="titlebar-dropdown-shortcut">Alt+F4</span>
                </div>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
              onMouseEnter={() => activeMenu && setActiveMenu('view')}
              style={{
                padding: '3px 7px',
                fontSize: '11px',
                color: activeMenu === 'view' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backgroundColor: activeMenu === 'view' ? 'var(--bg-tertiary)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div className="titlebar-dropdown-menu">
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); setCurrentTab('dashboard'); }}>
                  <span>Dashboard Overview</span>
                </div>
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); setCurrentTab('prompts'); }}>
                  <span>Prompt Library</span>
                </div>
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); setCurrentTab('compare'); }}>
                  <span>Compare Laboratory</span>
                  <span className="titlebar-dropdown-shortcut">Ctrl+Shift+C</span>
                </div>
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); setCurrentTab('models'); }}>
                  <span>Models Catalog</span>
                </div>
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); setCurrentTab('collections'); }}>
                  <span>Collections</span>
                </div>
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); setCurrentTab('runs'); }}>
                  <span>Run History</span>
                </div>
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); setCurrentTab('settings'); }}>
                  <span>Settings & Database</span>
                </div>
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); setCurrentTab('info'); }}>
                  <span>Documentation & Info</span>
                </div>
                <div className="titlebar-dropdown-divider" />
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); toggleLogPanel(); }}>
                  <span>Toggle Application Logs</span>
                </div>
                <div className="titlebar-dropdown-item" onClick={() => { setActiveMenu(null); toggleTheme(); }}>
                  <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Theme</span>
                </div>
              </div>
            )}
          </div>

          {/* Benchmark Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setActiveMenu(activeMenu === 'benchmark' ? null : 'benchmark')}
              onMouseEnter={() => activeMenu && setActiveMenu('benchmark')}
              style={{
                padding: '3px 7px',
                fontSize: '11px',
                color: activeMenu === 'benchmark' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backgroundColor: activeMenu === 'benchmark' ? 'var(--bg-tertiary)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Benchmark
            </button>
            {activeMenu === 'benchmark' && (
              <div className="titlebar-dropdown-menu">
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    setIsRunBenchmarkModalOpen(true);
                  }}
                >
                  <Play size={13} color="var(--accent-success)" />
                  <span>Execute Live Run...</span>
                </div>
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    setIsNewModelModalOpen(true);
                  }}
                >
                  <Sparkles size={13} color="var(--accent-primary)" />
                  <span>Register New Model...</span>
                </div>
                {compareRunIds.length > 0 && (
                  <div
                    className="titlebar-dropdown-item"
                    onClick={() => {
                      setActiveMenu(null);
                      clearCompareRunIds();
                      showToast('Comparison list cleared', 'info');
                    }}
                  >
                    <span>Clear Compare Selection ({compareRunIds.length})</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
              onMouseEnter={() => activeMenu && setActiveMenu('help')}
              style={{
                padding: '3px 7px',
                fontSize: '11px',
                color: activeMenu === 'help' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backgroundColor: activeMenu === 'help' ? 'var(--bg-tertiary)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Help
            </button>
            {activeMenu === 'help' && (
              <div className="titlebar-dropdown-menu">
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    setCurrentTab('info');
                  }}
                >
                  <BookOpen size={13} />
                  <span>Functional & Technical Manuals</span>
                </div>
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    if (window.electronAPI) window.electronAPI.openDocsFolder();
                  }}
                >
                  <FolderOpen size={13} />
                  <span>Open Documentation Folder</span>
                </div>
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    openDatabaseFolder();
                  }}
                >
                  <Database size={13} />
                  <span>Open Database Location</span>
                </div>
                <div className="titlebar-dropdown-divider" />
                <div
                  className="titlebar-dropdown-item"
                  onClick={async () => {
                    setActiveMenu(null);
                    if (window.electronAPI?.checkForUpdates) {
                      showToast('Checking for software updates...', 'info');
                      const res = await window.electronAPI.checkForUpdates();
                      if (res?.message) {
                        showToast(res.message, 'info');
                      }
                    }
                  }}
                >
                  <RotateCw size={13} color="var(--accent-primary)" />
                  <span>Check for Updates...</span>
                </div>
                <div className="titlebar-dropdown-divider" />
                <div
                  className="titlebar-dropdown-item"
                  onClick={() => {
                    setActiveMenu(null);
                    openAboutModal();
                  }}
                >
                  <Info size={13} color="var(--accent-primary)" />
                  <span>About LLM HTML Bench...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Section: VSCode Command Bar / Search Center */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          maxWidth: '460px',
          margin: '0 12px',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <Tooltip content="Command Palette & Quick Search" description="Search prompts, models, test runs, and actions" shortcut="Ctrl+K" position="bottom">
          <div
            className="header-command-pill"
            onClick={openCommandPalette}
            style={{
              flex: 1,
              height: '24px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '11px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <Search size={12} color="var(--accent-primary)" />
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Search prompts, models, runs or type a command...
              </span>
            </div>
            <kbd className="keycap" style={{ fontSize: '9px', padding: '0 4px', height: '16px' }}>
              Ctrl+K
            </kbd>
          </div>
        </Tooltip>
      </div>

      {/* Right Section: Quick Action Buttons, Theme Switcher & Frameless Window Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          height: '100%',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
          <Tooltip content="Create New Benchmark Prompt" shortcut="Ctrl+N" position="bottom">
            <Button
              size="sm"
              variant="primary"
              icon={<Plus size={12} />}
              onClick={() => setIsNewPromptModalOpen(true)}
              style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
            >
              Prompt
            </Button>
          </Tooltip>

          <Tooltip content="Register New LLM Architecture" position="bottom">
            <Button
              size="sm"
              variant="secondary"
              icon={<Sparkles size={12} />}
              onClick={() => setIsNewModelModalOpen(true)}
              style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
            >
              Model
            </Button>
          </Tooltip>

          <Tooltip content="Execute Live API Benchmark" position="bottom">
            <Button
              size="sm"
              variant="secondary"
              icon={<Play size={11} color="var(--accent-success)" />}
              onClick={() => setIsRunBenchmarkModalOpen(true)}
              style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
            >
              Run
            </Button>
          </Tooltip>

          {compareRunIds.length > 0 && (
            <Tooltip content="Open Comparison Laboratory" shortcut="Ctrl+Shift+C" position="bottom">
              <Button
                size="sm"
                variant="secondary"
                icon={<Columns size={12} />}
                onClick={() => setCurrentTab('compare')}
                style={{
                  borderColor: 'var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  backgroundColor: 'var(--accent-primary-light)',
                  padding: '3px 8px',
                  fontSize: '11px',
                  height: '24px',
                }}
              >
                Compare ({compareRunIds.length})
              </Button>
            </Tooltip>
          )}

          {/* Theme Toggle */}
          <Tooltip content={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`} position="bottom">
            <button
              onClick={toggleTheme}
              style={{
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                marginLeft: '2px',
                height: '24px',
                width: '24px',
                cursor: 'pointer',
              }}
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </Tooltip>
        </div>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

        {/* VSCode-inspired Custom Window Controls */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {/* Minimize */}
          <Tooltip content="Minimize Window" position="bottom">
            <button
              onClick={handleMinimize}
              className="window-control-button"
            >
              <Minus size={14} />
            </button>
          </Tooltip>

          {/* Maximize / Restore */}
          <Tooltip content={isMaximized ? 'Restore Window' : 'Maximize Window'} position="bottom">
            <button
              onClick={handleMaximizeToggle}
              className="window-control-button"
            >
              {isMaximized ? <Copy size={11} /> : <Square size={12} />}
            </button>
          </Tooltip>

          {/* Close */}
          <Tooltip content="Close Window" position="bottom">
            <button
              onClick={handleClose}
              className="window-control-button window-control-close"
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
