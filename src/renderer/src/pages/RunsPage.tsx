import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useListKeyboardNav } from '../hooks/useListKeyboardNav';
import { ModelRun } from '@shared/types/entities';
import { Button } from '../components/common/Button';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { IsolatedFrame } from '../components/preview/IsolatedFrame';
import { MonacoCodeEditor } from '../components/editor/MonacoCodeEditor';
import { EvaluationPanel } from '../components/evaluation/EvaluationPanel';
import { EditOutputModal } from '../components/modals/EditOutputModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Tooltip } from '../components/common/Tooltip';
import {
  Search,
  Copy,
  Check,
  Columns,
  Star,
  Edit2,
  Trash2,
  History,
} from 'lucide-react';

export const RunsPage: React.FC = () => {
  const {
    openCompareWithRuns,
    showToast,
  } = useApp();

  const listContainerRef = useRef<HTMLDivElement>(null);
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterProvenance, setFilterProvenance] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'score-desc' | 'speed-desc' | 'duration-asc'>('date-desc');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [inspectTab, setInspectTab] = useState<'preview' | 'html' | 'raw' | 'metadata' | 'eval'>('preview');
  const [copiedType, setCopiedType] = useState<'html' | 'raw' | null>(null);
  const [editingRun, setEditingRun] = useState<ModelRun | null>(null);
  const [deletingRun, setDeletingRun] = useState<ModelRun | null>(null);

  const loadRuns = async () => {
    try {
      if (window.electronAPI) {
        const allRuns = await window.electronAPI.getAllRuns(300);
        setRuns(allRuns);
        if (allRuns.length > 0 && !selectedRunId) {
          setSelectedRunId(allRuns[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load runs:', err);
    }
  };

  const handleDeleteRun = async () => {
    if (!deletingRun || !window.electronAPI) return;
    try {
      await window.electronAPI.deleteModelRun(deletingRun.id);
      showToast('Model run deleted successfully', 'info');
      if (selectedRunId === deletingRun.id) {
        const remaining = runs.filter((r) => r.id !== deletingRun.id);
        setSelectedRunId(remaining.length > 0 ? remaining[0].id : null);
      }
      setDeletingRun(null);
      await loadRuns();
    } catch (err: unknown) {
      showToast(`Failed to delete run: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      // Search query filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          r.prompt_name?.toLowerCase().includes(term) ||
          r.model_name?.toLowerCase().includes(term) ||
          r.model_display_name?.toLowerCase().includes(term) ||
          r.provider?.toLowerCase().includes(term) ||
          r.notes?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      // Provenance filter
      if (filterProvenance !== 'all' && r.provenance !== filterProvenance) {
        return false;
      }

      return true;
    });
  }, [runs, searchTerm, filterProvenance]);

  const sortedRuns = useMemo(() => {
    const list = [...filteredRuns];
    switch (sortBy) {
      case 'date-desc':
        return list.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      case 'date-asc':
        return list.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
      case 'score-desc':
        return list.sort((a, b) => (b.evaluation?.overall_score || 0) - (a.evaluation?.overall_score || 0));
      case 'speed-desc':
        return list.sort((a, b) => (b.tokens_per_second || 0) - (a.tokens_per_second || 0));
      case 'duration-asc':
        return list.sort((a, b) => (a.generation_time_ms || 999999) - (b.generation_time_ms || 999999));
      default:
        return list;
    }
  }, [filteredRuns, sortBy]);

  // Selected run entity
  const selectedRun = useMemo(() => {
    return runs.find((r) => r.id === selectedRunId) || (sortedRuns.length > 0 ? sortedRuns[0] : null);
  }, [runs, selectedRunId, sortedRuns]);

  // If active selected run is outside filtered list, sync selection
  useEffect(() => {
    if (sortedRuns.length > 0) {
      if (!selectedRunId || !sortedRuns.some((r) => r.id === selectedRunId)) {
        setSelectedRunId(sortedRuns[0].id);
      }
    } else {
      setSelectedRunId(null);
    }
  }, [sortedRuns]);

  const handleCopy = (text: string, type: 'html' | 'raw') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast(`Copied ${type === 'html' ? 'HTML' : 'Raw Response'} to clipboard!`, 'info');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const selectedIndex = useMemo(() => {
    return sortedRuns.findIndex((r) => r.id === selectedRun?.id);
  }, [sortedRuns, selectedRun?.id]);

  useListKeyboardNav({
    itemCount: sortedRuns.length,
    selectedIndex,
    onSelectIndex: (idx) => {
      if (sortedRuns[idx]) {
        setSelectedRunId(sortedRuns[idx].id);
      }
    },
    containerRef: listContainerRef,
    pageSize: 6,
    onExtraKey: (e) => {
      // Delete key: prompt to delete selected run
      if (e.key === 'Delete') {
        if (selectedRun) setDeletingRun(selectedRun);
        return true;
      }
      // E: edit output
      if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (selectedRun) setEditingRun(selectedRun);
        return true;
      }
      // C: copy HTML
      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (selectedRun?.output?.html) {
          handleCopy(selectedRun.output.html, 'html');
          return true;
        }
      }
      // R: copy raw
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (selectedRun?.output?.raw_output) {
          handleCopy(selectedRun.output.raw_output, 'raw');
          return true;
        }
      }
      // Numbers 1-5: switch inspect tabs
      if (['1', '2', '3', '4', '5'].includes(e.key) && !e.ctrlKey && !e.altKey) {
        const tabs: ('preview' | 'html' | 'raw' | 'metadata' | 'eval')[] = ['preview', 'html', 'raw', 'metadata', 'eval'];
        setInspectTab(tabs[parseInt(e.key, 10) - 1]);
        return true;
      }
      // Left / Right arrow: cycle inspect tabs
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.altKey) {
        const tabs: ('preview' | 'html' | 'raw' | 'metadata' | 'eval')[] = ['preview', 'html', 'raw', 'metadata', 'eval'];
        const cur = tabs.indexOf(inspectTab);
        setInspectTab(cur > 0 ? tabs[cur - 1] : tabs[tabs.length - 1]);
        return true;
      }
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.altKey) {
        const tabs: ('preview' | 'html' | 'raw' | 'metadata' | 'eval')[] = ['preview', 'html', 'raw', 'metadata', 'eval'];
        const cur = tabs.indexOf(inspectTab);
        setInspectTab(cur < tabs.length - 1 ? tabs[cur + 1] : tabs[0]);
        return true;
      }
    },
  });

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Master Pane: Run History Catalog */}
      <div
        style={{
          width: '380px',
          minWidth: '320px',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Master Pane Header */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={15} color="var(--accent-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Run History
              </span>
            </div>
            <span className="badge" style={{ fontSize: '10px', padding: '1px 6px' }}>
              {sortedRuns.length} of {runs.length} runs
            </span>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search model, prompt, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px 5px 26px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
              }}
            />
          </div>

          {/* Filter & Sort Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '3px 6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
              }}
            >
              <option value="date-desc">Sort: Newest First</option>
              <option value="date-asc">Sort: Oldest First</option>
              <option value="score-desc">Sort: Highest Score</option>
              <option value="speed-desc">Sort: Fastest Speed</option>
              <option value="duration-asc">Sort: Shortest Time</option>
            </select>

            <select
              value={filterProvenance}
              onChange={(e) => setFilterProvenance(e.target.value)}
              style={{
                padding: '3px 6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
              }}
            >
              <option value="all">All Sources</option>
              <option value="api">API Benchmark</option>
              <option value="manual-paste">Manual Paste</option>
              <option value="imported">Imported</option>
            </select>
          </div>
        </div>

        {/* Master Runs List */}
        <div ref={listContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {sortedRuns.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
              No model runs recorded matching filters.
            </div>
          ) : (
            sortedRuns.map((r) => {
              const isSelected = r.id === selectedRun?.id;
              return (
                <div
                  key={r.id}
                  data-list-item="true"
                  tabIndex={0}
                  onClick={() => setSelectedRunId(r.id)}
                  onFocus={() => setSelectedRunId(r.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)'}`,
                    outline: isSelected ? '2px solid var(--accent-primary)' : 'none',
                    outlineOffset: '-1px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {/* Top: Model Name & Star & Score Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '12px',
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.model_display_name || r.model_name}
                      </span>
                      {r.evaluation?.favorite === 1 && (
                        <Star size={11} fill="var(--accent-warning)" color="var(--accent-warning)" style={{ flexShrink: 0 }} />
                      )}
                    </div>
                    <ScoreBadge score={r.evaluation?.overall_score} size="sm" />
                  </div>

                  {/* Middle: Prompt Title & Version */}
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.prompt_name}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      (v{r.prompt_version})
                    </span>
                  </div>

                  {/* Bottom: Date, Duration, Tok/s, Source Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>
                      {new Date(r.started_at).toLocaleDateString()}{' '}
                      {new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {r.generation_time_ms ? (
                        <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {(r.generation_time_ms / 1000).toFixed(1)}s
                        </span>
                      ) : null}
                      {r.tokens_per_second ? (
                        <span className="font-mono" style={{ color: 'var(--accent-success)' }}>
                          {Math.round(r.tokens_per_second)} t/s
                        </span>
                      ) : null}
                      <span className="badge" style={{ fontSize: '9px', padding: '0 4px' }}>
                        {r.provenance}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Pane: Integrated Live Output & Evaluation Inspector */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
        {selectedRun ? (
          <>
            {/* Detail Pane Header Toolbar */}
            <div
              style={{
                padding: '12px 20px',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {selectedRun.model_display_name || selectedRun.model_name}
                  </h2>
                  {selectedRun.evaluation?.favorite === 1 && (
                    <Star size={15} fill="var(--accent-warning)" color="var(--accent-warning)" />
                  )}
                  <ScoreBadge score={selectedRun.evaluation?.overall_score} size="sm" />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  <strong>Prompt:</strong> {selectedRun.prompt_name} (v{selectedRun.prompt_version}) •{' '}
                  <strong>Date:</strong> {new Date(selectedRun.started_at).toLocaleString()} •{' '}
                  <span className="badge" style={{ fontSize: '9px' }}>{selectedRun.provenance}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Columns size={12} />}
                  onClick={() => openCompareWithRuns([selectedRun.id])}
                >
                  Compare
                </Button>

                <Tooltip content="Edit HTML Code or Notes">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Edit2 size={12} />}
                    onClick={() => setEditingRun(selectedRun)}
                  >
                    Edit Output
                  </Button>
                </Tooltip>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={copiedType === 'html' ? <Check size={12} color="var(--accent-success)" /> : <Copy size={12} />}
                  onClick={() => handleCopy(selectedRun.output?.html || '', 'html')}
                >
                  {copiedType === 'html' ? 'Copied HTML' : 'Copy HTML'}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={copiedType === 'raw' ? <Check size={12} color="var(--accent-success)" /> : <Copy size={12} />}
                  onClick={() => handleCopy(selectedRun.output?.raw_output || '', 'raw')}
                >
                  {copiedType === 'raw' ? 'Copied Raw' : 'Copy Raw'}
                </Button>

                <Tooltip content="Delete this Run">
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={12} />}
                    onClick={() => setDeletingRun(selectedRun)}
                  >
                    Delete
                  </Button>
                </Tooltip>
              </div>
            </div>

            {/* Tab Switcher Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 16px',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setInspectTab('preview')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: inspectTab === 'preview' ? 'var(--accent-primary-light)' : 'transparent',
                    color: inspectTab === 'preview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: inspectTab === 'preview' ? 600 : 500,
                    fontSize: '12px',
                  }}
                >
                  Live Preview
                </button>
                <button
                  onClick={() => setInspectTab('html')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: inspectTab === 'html' ? 'var(--accent-primary-light)' : 'transparent',
                    color: inspectTab === 'html' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: inspectTab === 'html' ? 600 : 500,
                    fontSize: '12px',
                  }}
                >
                  Extracted HTML ({selectedRun.output?.html.length || 0} chars)
                </button>
                <button
                  onClick={() => setInspectTab('raw')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: inspectTab === 'raw' ? 'var(--accent-primary-light)' : 'transparent',
                    color: inspectTab === 'raw' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: inspectTab === 'raw' ? 600 : 500,
                    fontSize: '12px',
                  }}
                >
                  Raw Response
                </button>
                <button
                  onClick={() => setInspectTab('metadata')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: inspectTab === 'metadata' ? 'var(--accent-primary-light)' : 'transparent',
                    color: inspectTab === 'metadata' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: inspectTab === 'metadata' ? 600 : 500,
                    fontSize: '12px',
                  }}
                >
                  Metadata & Parameters
                </button>
                <button
                  onClick={() => setInspectTab('eval')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: inspectTab === 'eval' ? 'var(--accent-primary-light)' : 'transparent',
                    color: inspectTab === 'eval' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: inspectTab === 'eval' ? 600 : 500,
                    fontSize: '12px',
                  }}
                >
                  Evaluation & Scoring
                </button>
              </div>
            </div>

            {/* Tab Body View */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {inspectTab === 'preview' && (
                <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                  <IsolatedFrame html={selectedRun.output?.html || ''} />
                </div>
              )}

              {inspectTab === 'html' && (
                <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                  <MonacoCodeEditor value={selectedRun.output?.html || ''} readOnly language="html" />
                </div>
              )}

              {inspectTab === 'raw' && (
                <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                  <MonacoCodeEditor value={selectedRun.output?.raw_output || ''} readOnly language="markdown" />
                </div>
              )}

              {inspectTab === 'metadata' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                  <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Run Identifier</div>
                        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedRun.id}</div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Model Architecture & ID</div>
                        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedRun.model_id}</div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Execution Time / Latency</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {selectedRun.generation_time_ms ? `${(selectedRun.generation_time_ms / 1000).toFixed(2)} seconds (${selectedRun.generation_time_ms} ms)` : '—'}
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Generation Speed</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-success)' }}>
                          {selectedRun.tokens_per_second ? `${selectedRun.tokens_per_second.toFixed(1)} tokens / sec` : '—'}
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Token Metrics</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          Input: <strong>{selectedRun.input_tokens ?? '—'}</strong> • Output: <strong>{selectedRun.output_tokens ?? '—'}</strong>
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Sampling Parameters</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          Temperature: <strong>{selectedRun.temperature ?? 'Default'}</strong> • Top P: <strong>{selectedRun.top_p ?? 'Default'}</strong>
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Application Version</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>v{selectedRun.app_version || '1.0.0'}</div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Provenance Source</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          <span className="badge">{selectedRun.provenance}</span>
                        </div>
                      </div>
                    </div>

                    {selectedRun.notes && (
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          Run Notes & Comments:
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {selectedRun.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {inspectTab === 'eval' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                  <div style={{ maxWidth: '840px', margin: '0 auto' }}>
                    <EvaluationPanel
                      modelRunId={selectedRun.id}
                      initialEvaluation={selectedRun.evaluation}
                      onSaved={(savedEval) => {
                        setRuns((prev) =>
                          prev.map((r) => (r.id === selectedRun.id ? { ...r, evaluation: savedEval } : r))
                        );
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '12px',
              padding: '24px',
            }}
          >
            <History size={48} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Select a benchmark run
            </div>
            <p style={{ fontSize: '12px', maxWidth: '340px', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
              Choose any benchmark run from the list on the left to inspect its live rendered output, HTML code, model parameters, and evaluations.
            </p>
          </div>
        )}
      </div>

      {/* Edit Output Modal */}
      <EditOutputModal
        isOpen={!!editingRun}
        onClose={() => setEditingRun(null)}
        modelRun={editingRun}
        onUpdated={(updatedRun) => {
          setRuns((prev) => prev.map((r) => (r.id === updatedRun.id ? updatedRun : r)));
          loadRuns();
        }}
      />

      {/* Delete Run Confirmation */}
      <ConfirmModal
        isOpen={!!deletingRun}
        onClose={() => setDeletingRun(null)}
        onConfirm={handleDeleteRun}
        title="Delete Model Output & Run?"
        message={`Are you sure you want to delete this benchmark generation run for "${deletingRun?.model_display_name || deletingRun?.model_name}" (${deletingRun?.prompt_name})? Its HTML output, screenshots, and evaluation scores will be permanently removed.`}
        confirmLabel="Delete Run"
        confirmVariant="danger"
      />
    </div>
  );
};
