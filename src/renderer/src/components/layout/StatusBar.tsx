import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { HardDrive, Sun, Moon, Terminal, AlertCircle } from 'lucide-react';
import { DatabaseInfo } from '@shared/types/ipc';
import { Tooltip } from '../common/Tooltip';

export const StatusBar: React.FC = () => {
  const {
    compareRunIds,
    clearCompareRunIds,
    setCurrentTab,
    isLogPanelOpen,
    toggleLogPanel,
    logCounts,
  } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getDatabaseInfo().then((info) => setDbInfo(info)).catch(() => {});
    }
  }, []);

  return (
    <footer
      style={{
        height: '24px',
        backgroundColor: 'var(--bg-tertiary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        userSelect: 'none',
        zIndex: 50,
      }}
    >
      {/* Left: DB & Bench status & Logs trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Tooltip content="Open SQLite Database Settings" position="top">
          <div
            onClick={() => setCurrentTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <HardDrive size={11} color="var(--accent-primary)" />
            <span>
              SQLite: {dbInfo ? `${(dbInfo.sizeBytes / 1024).toFixed(0)} KB (${dbInfo.counts.runs} runs)` : 'Ready'}
            </span>
          </div>
        </Tooltip>

        {/* Live Logs Toggle in StatusBar */}
        <Tooltip content="Toggle Application Diagnostic Logs" position="top">
          <div
            onClick={toggleLogPanel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              color: isLogPanelOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: isLogPanelOpen ? 'var(--accent-primary-light)' : 'transparent',
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.1s ease',
            }}
          >
            <Terminal size={11} color={isLogPanelOpen ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span>Logs ({logCounts.total})</span>
            {logCounts.error > 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '10px',
                }}
              >
                <AlertCircle size={10} color="#ef4444" />
                {logCounts.error}
              </span>
            )}
          </div>
        </Tooltip>

        {compareRunIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--accent-primary)' }}>
              Comparing {compareRunIds.length} run{compareRunIds.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={clearCompareRunIds}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '10px',
                textDecoration: 'underline',
              }}
            >
              clear
            </button>
          </div>
        )}
      </div>

      {/* Right: Theme Toggle & Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Tooltip content={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`} position="top">
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
          >
            {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
            <span>{theme === 'dark' ? 'Light UI' : 'Dark UI'}</span>
          </button>
        </Tooltip>

        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LLM HTML Bench v1.0.0</span>
      </div>
    </footer>
  );
};
