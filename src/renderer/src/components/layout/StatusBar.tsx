import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { HardDrive, Sun, Moon } from 'lucide-react';
import { DatabaseInfo } from '@shared/types/ipc';

export const StatusBar: React.FC = () => {
  const { compareRunIds, clearCompareRunIds, setCurrentTab } = useApp();
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
      {/* Left: DB & Bench status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          onClick={() => setCurrentTab('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
          title="SQLite Database Status"
        >
          <HardDrive size={11} color="var(--accent-primary)" />
          <span>
            SQLite: {dbInfo ? `${(dbInfo.sizeBytes / 1024).toFixed(0)} KB (${dbInfo.counts.runs} runs)` : 'Ready'}
          </span>
        </div>

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
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
          <span>{theme === 'dark' ? 'Light UI' : 'Dark UI'}</span>
        </button>

        <span>LLM HTML Bench v1.0.0</span>
      </div>
    </footer>
  );
};
