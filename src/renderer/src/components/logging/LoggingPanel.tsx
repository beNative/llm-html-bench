import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LogLevel } from '@shared/types/ipc';
import {
  Terminal,
  Search,
  Trash2,
  Copy,
  CheckCircle2,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  X,
  HardDrive,
  Filter,
} from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

export const LoggingPanel: React.FC = () => {
  const {
    isLogPanelOpen,
    setIsLogPanelOpen,
    logs,
    logConfig,
    logCounts,
    clearLogs,
    setLogAutoSave,
    openLogFolder,
    showToast,
  } = useApp();

  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState<number>(250);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log entries if enabled
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isLogPanelOpen]);

  // Handle panel resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 120 && newHeight <= 600) {
        setPanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Filter logs based on level, source, and search text
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return false;
      if (selectedSource !== 'ALL' && log.source !== selectedSource) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchMsg = log.message.toLowerCase().includes(query);
        const matchSource = log.source.toLowerCase().includes(query);
        const matchDetails = log.details ? log.details.toLowerCase().includes(query) : false;
        if (!matchMsg && !matchSource && !matchDetails) return false;
      }
      return true;
    });
  }, [logs, selectedLevel, selectedSource, searchQuery]);

  // Unique sources for dropdown filter
  const sources = useMemo(() => {
    const s = new Set<string>();
    for (const log of logs) {
      s.add(log.source);
    }
    return Array.from(s).sort();
  }, [logs]);

  const handleCopyLogs = () => {
    if (filteredLogs.length === 0) return;
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}${l.details ? '\n' + l.details : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Copied ${filteredLogs.length} log lines to clipboard`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLogPanelOpen) return null;

  return (
    <div
      style={{
        height: `${panelHeight}px`,
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '2px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        position: 'relative',
      }}
    >
      {/* Top Resize Drag Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        style={{
          position: 'absolute',
          top: '-4px',
          left: 0,
          right: 0,
          height: '6px',
          cursor: 'ns-resize',
          zIndex: 50,
        }}
      />

      {/* Toolbar / Header */}
      <div
        style={{
          padding: '6px 12px',
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          fontSize: '11px',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Title & Level Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Terminal size={13} color="var(--accent-primary)" />
            <span>Logs</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ({filteredLogs.length}/{logs.length})
            </span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

          {/* Level Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {/* ALL */}
            <button
              onClick={() => setSelectedLevel('ALL')}
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontWeight: selectedLevel === 'ALL' ? 700 : 500,
                backgroundColor: selectedLevel === 'ALL' ? 'var(--bg-hover)' : 'transparent',
                color: selectedLevel === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              ALL ({logCounts.total})
            </button>

            {/* DEBUG (Green) */}
            <button
              onClick={() => setSelectedLevel('DEBUG')}
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontWeight: selectedLevel === 'DEBUG' ? 700 : 500,
                backgroundColor: selectedLevel === 'DEBUG' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: '#10b981',
                border: `1px solid ${selectedLevel === 'DEBUG' ? '#10b981' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              DEBUG ({logCounts.debug})
            </button>

            {/* INFO (Blue) */}
            <button
              onClick={() => setSelectedLevel('INFO')}
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontWeight: selectedLevel === 'INFO' ? 700 : 500,
                backgroundColor: selectedLevel === 'INFO' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: '#3b82f6',
                border: `1px solid ${selectedLevel === 'INFO' ? '#3b82f6' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              INFO ({logCounts.info})
            </button>

            {/* WARNING (Orange) */}
            <button
              onClick={() => setSelectedLevel('WARNING')}
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontWeight: selectedLevel === 'WARNING' ? 700 : 500,
                backgroundColor: selectedLevel === 'WARNING' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: '#f59e0b',
                border: `1px solid ${selectedLevel === 'WARNING' ? '#f59e0b' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              WARN ({logCounts.warning})
            </button>

            {/* ERROR (Red) */}
            <button
              onClick={() => setSelectedLevel('ERROR')}
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontWeight: selectedLevel === 'ERROR' ? 700 : 500,
                backgroundColor: selectedLevel === 'ERROR' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: '#ef4444',
                border: `1px solid ${selectedLevel === 'ERROR' ? '#ef4444' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              ERROR ({logCounts.error})
            </button>
          </div>
        </div>

        {/* Middle: Search & Source Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Source Dropdown */}
          {sources.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={11} color="var(--text-muted)" />
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All Sources</option>
                {sources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div style={{ position: 'relative', width: '160px' }}>
            <Search size={11} style={{ position: 'absolute', left: '6px', top: '5px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '2px 6px 2px 22px',
                fontSize: '10px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Right: Auto-Save, Auto-Scroll, Actions, Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Auto-Save to File Switch */}
          <Tooltip content="Auto-Save Logs to Disk" description={logConfig ? `Location: ${logConfig.logFilePath}` : 'Automatically append logs to disk file'} position="top">
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                color: logConfig?.autoSaveToFile ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontSize: '10px',
              }}
            >
              <input
                type="checkbox"
                checked={logConfig?.autoSaveToFile ?? true}
                onChange={(e) => setLogAutoSave(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
              />
              <HardDrive size={11} />
              <span>Save to Logfile</span>
            </label>
          </Tooltip>

          {/* Open Log Folder Button */}
          <Tooltip content="Open Log Directory" description={logConfig?.logDirectory ? `Location: ${logConfig.logDirectory}` : 'Open disk log folder'} position="top">
            <button
              onClick={openLogFolder}
              style={{
                padding: '2px 5px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
              }}
            >
              <FolderOpen size={11} />
              <span>Log Folder</span>
            </button>
          </Tooltip>

          {/* Auto-Scroll Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '10px',
              marginLeft: '4px',
            }}
          >
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
            <span>Auto-scroll</span>
          </label>

          <div style={{ width: '1px', height: '12px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

          {/* Copy Button */}
          <Tooltip content="Copy Filtered Logs" description="Copy active log stream to clipboard" position="top">
            <button
              onClick={handleCopyLogs}
              style={{
                padding: '2px 5px',
                backgroundColor: 'transparent',
                border: 'none',
                color: copied ? 'var(--accent-success)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            </button>
          </Tooltip>

          {/* Clear Button */}
          <Tooltip content="Clear In-Memory Logs" position="top">
            <button
              onClick={clearLogs}
              style={{
                padding: '2px 5px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={12} />
            </button>
          </Tooltip>

          {/* Close Button */}
          <Tooltip content="Close Log Drawer" position="top">
            <button
              onClick={() => setIsLogPanelOpen(false)}
              style={{
                padding: '2px 5px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Log Output Body */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          padding: '4px 0',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No log entries match the current filter criteria.
          </div>
        ) : (
          filteredLogs.map((entry) => {
            const isExpanded = expandedLogId === entry.id;

            // Level color tokens: DEBUG (green), INFO (blue), WARNING (orange), ERROR (red)
            let levelColor = '#3b82f6';
            let levelBg = 'rgba(59, 130, 246, 0.12)';
            let levelBorder = 'rgba(59, 130, 246, 0.3)';

            if (entry.level === 'DEBUG') {
              levelColor = '#10b981';
              levelBg = 'rgba(16, 185, 129, 0.12)';
              levelBorder = 'rgba(16, 185, 129, 0.3)';
            } else if (entry.level === 'WARNING') {
              levelColor = '#f59e0b';
              levelBg = 'rgba(245, 158, 11, 0.12)';
              levelBorder = 'rgba(245, 158, 11, 0.3)';
            } else if (entry.level === 'ERROR') {
              levelColor = '#ef4444';
              levelBg = 'rgba(239, 68, 68, 0.15)';
              levelBorder = 'rgba(239, 68, 68, 0.4)';
            }

            return (
              <div
                key={entry.id}
                style={{
                  padding: '3px 12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: entry.level === 'ERROR' ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.4' }}>
                  {/* Timestamp */}
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0, width: '75px' }}>
                    {entry.timeFormatted}
                  </span>

                  {/* Level Badge */}
                  <span
                    style={{
                      padding: '0 4px',
                      borderRadius: '3px',
                      backgroundColor: levelBg,
                      color: levelColor,
                      border: `1px solid ${levelBorder}`,
                      fontSize: '9px',
                      fontWeight: 700,
                      flexShrink: 0,
                      width: '46px',
                      textAlign: 'center',
                    }}
                  >
                    {entry.level === 'WARNING' ? 'WARN' : entry.level}
                  </span>

                  {/* Source Badge */}
                  <span
                    style={{
                      padding: '0 4px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0,
                    }}
                  >
                    {entry.source}
                  </span>

                  {/* Message Body */}
                  <span style={{ color: 'var(--text-primary)', flex: 1, wordBreak: 'break-word' }}>
                    {entry.message}
                  </span>

                  {/* Expand Details Trigger */}
                  {entry.details && (
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Toggle Stack Details"
                    >
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  )}
                </div>

                {/* Expanded Details / Stack trace */}
                {isExpanded && entry.details && (
                  <pre
                    style={{
                      margin: '4px 0 2px 83px',
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '10px',
                      color: entry.level === 'ERROR' ? '#fca5a5' : 'var(--text-secondary)',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {entry.details}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
