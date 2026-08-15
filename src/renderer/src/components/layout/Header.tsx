import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Layers, Plus, Columns, Sun, Moon, Sparkles, Play } from 'lucide-react';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const {
    compareRunIds,
    setCurrentTab,
    setIsNewPromptModalOpen,
    setIsNewModelModalOpen,
    setIsRunBenchmarkModalOpen,
  } = useApp();

  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 10,
      }}
    >
      {/* Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
          }}
        >
          <Layers size={16} />
        </div>
        <div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            LLM HTML Bench
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
            v1.0
          </span>
        </div>
      </div>

      {/* Global Quick Action Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button
          size="sm"
          variant="primary"
          icon={<Plus size={14} />}
          onClick={() => setIsNewPromptModalOpen(true)}
          title="Create New Benchmark Prompt (Ctrl+N)"
        >
          New Prompt
        </Button>

        <Button
          size="sm"
          variant="secondary"
          icon={<Sparkles size={14} />}
          onClick={() => setIsNewModelModalOpen(true)}
          title="Add / Register Model"
        >
          New Model
        </Button>

        <Button
          size="sm"
          variant="secondary"
          icon={<Play size={13} color="var(--accent-success)" />}
          onClick={() => setIsRunBenchmarkModalOpen(true)}
          title="Run API Benchmark"
        >
          Run Benchmark
        </Button>

        {compareRunIds.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            icon={<Columns size={14} />}
            onClick={() => setCurrentTab('compare')}
            style={{
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              backgroundColor: 'var(--accent-primary-light)',
            }}
            title="Open Comparison View (Ctrl+Shift+C)"
          >
            Compare ({compareRunIds.length})
          </Button>
        )}

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          style={{
            padding: '6px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
};
