import React, { useState } from 'react';
import { ConsoleEntry } from './IsolatedFrame';
import { Trash2, AlertCircle, AlertTriangle, Info, Terminal, ChevronDown } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

interface ConsoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ConsoleEntry[];
  onClear: () => void;
}

export const ConsoleDrawer: React.FC<ConsoleDrawerProps> = ({
  isOpen,
  onClose,
  entries,
  onClear,
}) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'log'>('all');

  if (!isOpen) return null;

  const filteredEntries = entries.filter((e) => {
    if (filter === 'all') return true;
    return e.type === filter;
  });

  const errorCount = entries.filter((e) => e.type === 'error').length;
  const warnCount = entries.filter((e) => e.type === 'warn').length;

  return (
    <div
      style={{
        height: '180px',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
      }}
    >
      {/* Console Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 10px',
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Terminal size={12} /> Console
          </span>

          <div style={{ display: 'flex', gap: '2px', marginLeft: '8px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: filter === 'all' ? 'var(--bg-active)' : 'transparent',
                color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: filter === 'error' ? 'var(--accent-danger-light)' : 'transparent',
                color: errorCount > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)',
                fontWeight: errorCount > 0 ? 600 : 400,
              }}
            >
              Errors ({errorCount})
            </button>
            <button
              onClick={() => setFilter('warn')}
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: filter === 'warn' ? 'var(--accent-warning-light)' : 'transparent',
                color: warnCount > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)',
              }}
            >
              Warnings ({warnCount})
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Tooltip content="Clear Console Entries" position="top">
            <button
              onClick={onClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                color: 'var(--text-muted)',
              }}
            >
              <Trash2 size={12} /> Clear
            </button>
          </Tooltip>
          <Tooltip content="Close Console Drawer" position="top">
            <button
              onClick={onClose}
              style={{
                padding: '2px 4px',
                color: 'var(--text-muted)',
              }}
            >
              <ChevronDown size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Messages List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {filteredEntries.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px' }}>
            No console output recorded.
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            let icon = <Info size={11} color="var(--text-muted)" />;
            let bg = 'transparent';
            let textColor = 'var(--text-secondary)';

            if (entry.type === 'error') {
              icon = <AlertCircle size={11} color="var(--accent-danger)" />;
              bg = 'rgba(239, 68, 68, 0.08)';
              textColor = 'var(--accent-danger)';
            } else if (entry.type === 'warn') {
              icon = <AlertTriangle size={11} color="var(--accent-warning)" />;
              bg = 'rgba(245, 158, 11, 0.08)';
              textColor = 'var(--accent-warning)';
            }

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  padding: '3px 6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: bg,
                  wordBreak: 'break-all',
                }}
              >
                <span style={{ marginTop: '2px' }}>{icon}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px', minWidth: '55px' }}>
                  {entry.timestamp}
                </span>
                <span style={{ color: textColor, flex: 1 }}>{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
