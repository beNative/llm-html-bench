import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ModelRun, Prompt } from '@shared/types/entities';
import { IsolatedFrame, ConsoleEntry } from '../components/preview/IsolatedFrame';
import { ViewportControls } from '../components/preview/ViewportControls';
import { ConsoleDrawer } from '../components/preview/ConsoleDrawer';
import { MonacoCodeEditor } from '../components/editor/MonacoCodeEditor';
import { MonacoDiffViewer } from '../components/editor/MonacoDiffViewer';
import { EvaluationPanel } from '../components/evaluation/EvaluationPanel';
import { HeadToHeadSelector } from '../components/evaluation/HeadToHeadSelector';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { Button } from '../components/common/Button';
import { EditOutputModal } from '../components/modals/EditOutputModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Tooltip } from '../components/common/Tooltip';
import {
  GitCompare,
  Search,
  Copy,
  Check,
  RotateCw,
  Split,
  Eye,
  Code2,
  Award,
  Trash2,
  Edit2,
  Table,
  Star,
  Plus,
  X,
  Sparkles,
  Terminal,
} from 'lucide-react';

type CompareTab = 'preview' | 'html' | 'split' | 'diff' | 'matrix' | 'eval';

const SLOT_COLORS = [
  { label: 'A', bg: 'rgba(59, 130, 246, 0.15)', text: 'var(--accent-primary)', border: 'rgba(59, 130, 246, 0.4)' },
  { label: 'B', bg: 'rgba(139, 92, 246, 0.15)', text: 'var(--accent-purple)', border: 'rgba(139, 92, 246, 0.4)' },
  { label: 'C', bg: 'rgba(16, 185, 129, 0.15)', text: 'var(--accent-success)', border: 'rgba(16, 185, 129, 0.4)' },
  { label: 'D', bg: 'rgba(245, 158, 11, 0.15)', text: 'var(--accent-warning)', border: 'rgba(245, 158, 11, 0.4)' },
];

export const ComparePage: React.FC = () => {
  const {
    compareRunIds,
    setCompareRunIds,
    toggleCompareRunId,
    clearCompareRunIds,
    showToast,
  } = useApp();

  const [allRuns, setAllRuns] = useState<ModelRun[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterPromptId, setFilterPromptId] = useState<string>('all');
  const [filterProvenance, setFilterProvenance] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'score-desc' | 'speed-desc' | 'duration-asc'>('date-desc');
  const [activeTab, setActiveTab] = useState<CompareTab>('preview');
  const [isPromptCopied, setIsPromptCopied] = useState<boolean>(false);
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);

  // Viewport Settings
  const [selectedPreset, setSelectedPreset] = useState<string>('Responsive (Fit)');
  const [customWidth, setCustomWidth] = useState<string>('100%');
  const [customHeight, setCustomHeight] = useState<string>('100%');
  const [zoom, setZoom] = useState<number>(1);
  const [reloadTriggers, setReloadTriggers] = useState<Record<string, number>>({});

  // Sync Settings
  const [isSyncViewport, setIsSyncViewport] = useState<boolean>(true);
  const [isSyncScroll, setIsSyncScroll] = useState<boolean>(true);
  const [syncScrollTop, setSyncScrollTop] = useState<number>(0);

  // Console Drawers State
  const [consoleOpenSlots, setConsoleOpenSlots] = useState<Record<string, boolean>>({});
  const [consoleEntries, setConsoleEntries] = useState<Record<string, ConsoleEntry[]>>({});

  // Modals
  const [editingRun, setEditingRun] = useState<ModelRun | null>(null);
  const [deletingRun, setDeletingRun] = useState<ModelRun | null>(null);

  // Diff Custom Selection (for >2 runs)
  const [diffLeftId, setDiffLeftId] = useState<string>('');
  const [diffRightId, setDiffRightId] = useState<string>('');

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [runsData, promptsData] = await Promise.all([
          window.electronAPI.getAllRuns(300),
          window.electronAPI.getPrompts(),
        ]);
        setAllRuns(runsData);
        setPrompts(promptsData);
      }
    } catch (err) {
      console.error('Failed to load runs for compare page:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered master catalog list
  const filteredRuns = useMemo(() => {
    return allRuns.filter((r) => {
      // Search term
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

      // Filter by prompt
      if (filterPromptId !== 'all' && r.prompt_id !== filterPromptId) {
        return false;
      }

      // Filter by provenance
      if (filterProvenance !== 'all' && r.provenance !== filterProvenance) {
        return false;
      }

      return true;
    });
  }, [allRuns, searchTerm, filterPromptId, filterProvenance]);

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

  // Selected runs for comparison
  const compareRuns = useMemo(() => {
    return compareRunIds
      .map((id) => allRuns.find((r) => r.id === id))
      .filter((r): r is ModelRun => r !== undefined);
  }, [allRuns, compareRunIds]);

  // Sync diff selection defaults when compareRuns change
  useEffect(() => {
    if (compareRuns.length >= 2) {
      if (!diffLeftId || !compareRuns.some((r) => r.id === diffLeftId)) {
        setDiffLeftId(compareRuns[0].id);
      }
      if (!diffRightId || !compareRuns.some((r) => r.id === diffRightId) || diffRightId === compareRuns[0].id) {
        setDiffRightId(compareRuns[1].id);
      }
    }
  }, [compareRuns, diffLeftId, diffRightId]);

  const handlePresetChange = (presetName: string, w: string, h: string) => {
    setSelectedPreset(presetName);
    setCustomWidth(w);
    setCustomHeight(h);
  };

  const handleReloadAll = () => {
    const next: Record<string, number> = {};
    compareRuns.forEach((r) => {
      next[r.id] = (reloadTriggers[r.id] || 0) + 1;
    });
    setReloadTriggers(next);
  };

  const handleConsoleMessage = (runId: string, entry: ConsoleEntry) => {
    setConsoleEntries((prev) => ({
      ...prev,
      [runId]: [...(prev[runId] || []), entry],
    }));
  };

  const handleScroll = (scrollTop: number) => {
    if (isSyncScroll) {
      setSyncScrollTop(scrollTop);
    }
  };

  const handleRemoveSlot = (runId: string) => {
    setCompareRunIds((prev) => prev.filter((id) => id !== runId));
  };

  const handleQuickCompareLatest = () => {
    if (sortedRuns.length >= 2) {
      setCompareRunIds([sortedRuns[0].id, sortedRuns[1].id]);
      showToast(`Loaded ${sortedRuns[0].model_display_name || sortedRuns[0].model_name} vs ${sortedRuns[1].model_display_name || sortedRuns[1].model_name} for comparison`, 'info');
    } else if (sortedRuns.length === 1) {
      setCompareRunIds([sortedRuns[0].id]);
    }
  };

  const handleCopyPrompt = async () => {
    if (compareRuns.length === 0) return;
    const targetRun = compareRuns[0];
    try {
      if (targetRun.prompt_text) {
        await navigator.clipboard.writeText(targetRun.prompt_text);
        setIsPromptCopied(true);
        setTimeout(() => setIsPromptCopied(false), 2000);
        showToast(`Prompt "${targetRun.prompt_name || ''} (v${targetRun.prompt_version || 1})" copied to clipboard!`, 'success');
        return;
      }
      if (targetRun.prompt_id && window.electronAPI) {
        const versions = await window.electronAPI.getPromptVersions(targetRun.prompt_id);
        const matched = versions.find((v) => v.id === targetRun.prompt_version_id) || versions[0];
        if (matched && matched.prompt_text) {
          await navigator.clipboard.writeText(matched.prompt_text);
          setIsPromptCopied(true);
          setTimeout(() => setIsPromptCopied(false), 2000);
          showToast(`Prompt "${targetRun.prompt_name || ''} (v${targetRun.prompt_version || 1})" copied to clipboard!`, 'success');
          return;
        }
      }
      showToast('Could not retrieve prompt text', 'error');
    } catch (err) {
      showToast('Failed to copy prompt', 'error');
    }
  };

  const handleCopyHtml = (html: string, runId: string) => {
    navigator.clipboard.writeText(html);
    setCopiedSlotId(runId);
    showToast('HTML code copied to clipboard', 'info');
    setTimeout(() => setCopiedSlotId(null), 2000);
  };

  const handleDeleteRun = async () => {
    if (!deletingRun || !window.electronAPI) return;
    try {
      await window.electronAPI.deleteModelRun(deletingRun.id);
      showToast('Model run deleted', 'info');
      setCompareRunIds((prev) => prev.filter((id) => id !== deletingRun.id));
      setDeletingRun(null);
      await loadData();
    } catch (err: unknown) {
      showToast(`Failed to delete run: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Grid layout styles depending on count
  const getGridStyle = (count: number): React.CSSProperties => {
    if (count === 1) return { display: 'grid', gridTemplateColumns: '1fr', height: '100%', overflow: 'hidden' };
    if (count === 2) return { display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', overflow: 'hidden', gap: '1px', backgroundColor: 'var(--border-color)' };
    if (count === 3) return { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: '100%', overflow: 'hidden', gap: '1px', backgroundColor: 'var(--border-color)' };
    return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '100%', overflow: 'hidden', gap: '1px', backgroundColor: 'var(--border-color)' };
  };

  const isPair = compareRuns.length === 2;
  const isSamePrompt = compareRuns.length >= 2 && compareRuns.every((r) => r.prompt_id === compareRuns[0].prompt_id);
  const diffRunLeft = compareRuns.find((r) => r.id === diffLeftId) || compareRuns[0];
  const diffRunRight = compareRuns.find((r) => r.id === diffRightId) || compareRuns[1];

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Master Pane: Comparison Catalog & Slot Selector */}
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
              <GitCompare size={15} color="var(--accent-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Compare Lab
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="badge"
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  backgroundColor: compareRuns.length > 0 ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                  color: compareRuns.length > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: `1px solid ${compareRuns.length > 0 ? 'rgba(59, 130, 246, 0.4)' : 'transparent'}`,
                  fontWeight: 600,
                }}
              >
                {compareRuns.length} of 4 selected
              </span>
              {compareRuns.length > 0 && (
                <button
                  onClick={clearCompareRunIds}
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0 2px',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Active Compare Slots Chips */}
          {compareRuns.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '2px' }}>
              {compareRuns.map((r, idx) => {
                const slotMeta = SLOT_COLORS[idx % SLOT_COLORS.length];
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: slotMeta.bg,
                      color: slotMeta.text,
                      border: `1px solid ${slotMeta.border}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      maxWidth: '100%',
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>[{slotMeta.label}]</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                      {r.model_display_name || r.model_name}
                    </span>
                    <button
                      onClick={() => handleRemoveSlot(r.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        opacity: 0.8,
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Check 2 to 4 runs below to compare</span>
              {sortedRuns.length >= 2 && (
                <button
                  onClick={handleQuickCompareLatest}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '10px',
                    color: 'var(--accent-primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={11} /> Compare Top 2
                </button>
              )}
            </div>
          )}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Filter by prompt dropdown */}
            <select
              value={filterPromptId}
              onChange={(e) => setFilterPromptId(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: filterPromptId !== 'all' ? 600 : 400,
              }}
            >
              <option value="all">Filter: All Benchmark Prompts</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  Prompt: {p.name}
                </option>
              ))}
            </select>

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
                <option value="date-desc">Sort: Newest</option>
                <option value="date-asc">Sort: Oldest</option>
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
        </div>

        {/* Master Runs List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {sortedRuns.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
              No model runs recorded matching filters.
            </div>
          ) : (
            sortedRuns.map((r) => {
              const selectedIndex = compareRunIds.indexOf(r.id);
              const isSelected = selectedIndex !== -1;
              const slotMeta = isSelected ? SLOT_COLORS[selectedIndex % SLOT_COLORS.length] : null;

              return (
                <div
                  key={r.id}
                  onClick={() => toggleCompareRunId(r.id)}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? slotMeta?.bg || 'var(--accent-primary-light)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? slotMeta?.border || 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)'}`,
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Slot selection checkbox / badge */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? slotMeta?.text : 'var(--bg-tertiary)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      border: `1px solid ${isSelected ? slotMeta?.text : 'var(--border-color)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {isSelected ? slotMeta?.label : <Plus size={11} />}
                  </div>

                  {/* Card Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Top: Model Name & Star & Score Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '12px',
                            color: isSelected ? slotMeta?.text : 'var(--text-primary)',
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
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Pane: Integrated Side-by-Side Comparison Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
        {compareRuns.length > 0 ? (
          <>
            {/* Detail Header Toolbar */}
            <div
              style={{
                padding: '10px 18px',
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
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {isSamePrompt
                      ? compareRuns[0].prompt_name
                      : `Comparing ${compareRuns.length} Model Generations`}
                  </h2>
                  {isSamePrompt && (
                    <span className="badge" style={{ fontSize: '10px' }}>
                      Prompt v{compareRuns[0].prompt_version}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {compareRuns.map((r, idx) => {
                    const slotMeta = SLOT_COLORS[idx % SLOT_COLORS.length];
                    return (
                      <span
                        key={r.id}
                        style={{
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong style={{ color: slotMeta.text }}>[{slotMeta.label}]</strong>{' '}
                        {r.model_display_name || r.model_name}
                        <ScoreBadge score={r.evaluation?.overall_score} size="sm" />
                        {idx < compareRuns.length - 1 && <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>vs</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <Tooltip content="Copy Benchmark Prompt" description="Copy full prompt text tested across these models" position="bottom">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={isPromptCopied ? <Check size={12} color="var(--accent-success)" /> : <Copy size={12} />}
                    onClick={handleCopyPrompt}
                  >
                    {isPromptCopied ? 'Copied Prompt' : 'Copy Prompt'}
                  </Button>
                </Tooltip>

                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RotateCw size={12} />}
                  onClick={handleReloadAll}
                >
                  Reload All
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={12} />}
                  onClick={clearCompareRunIds}
                >
                  Clear Selection
                </Button>
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
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveTab('preview')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: activeTab === 'preview' ? 'var(--accent-primary-light)' : 'transparent',
                    color: activeTab === 'preview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'preview' ? 600 : 500,
                    fontSize: '12px',
                    border: `1px solid ${activeTab === 'preview' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  }}
                >
                  <Eye size={13} /> Live Preview
                </button>

                <button
                  onClick={() => setActiveTab('html')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: activeTab === 'html' ? 'var(--accent-primary-light)' : 'transparent',
                    color: activeTab === 'html' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'html' ? 600 : 500,
                    fontSize: '12px',
                    border: `1px solid ${activeTab === 'html' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  }}
                >
                  <Code2 size={13} /> Extracted HTML
                </button>

                <button
                  onClick={() => setActiveTab('split')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: activeTab === 'split' ? 'var(--accent-primary-light)' : 'transparent',
                    color: activeTab === 'split' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'split' ? 600 : 500,
                    fontSize: '12px',
                    border: `1px solid ${activeTab === 'split' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  }}
                >
                  <Split size={13} /> Split (Preview + Code)
                </button>

                {compareRuns.length >= 2 && (
                  <button
                    onClick={() => setActiveTab('diff')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: activeTab === 'diff' ? 'var(--accent-primary-light)' : 'transparent',
                      color: activeTab === 'diff' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: activeTab === 'diff' ? 600 : 500,
                      fontSize: '12px',
                      border: `1px solid ${activeTab === 'diff' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                    }}
                  >
                    <GitCompare size={13} /> Monaco Diff
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('matrix')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: activeTab === 'matrix' ? 'var(--accent-primary-light)' : 'transparent',
                    color: activeTab === 'matrix' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'matrix' ? 600 : 500,
                    fontSize: '12px',
                    border: `1px solid ${activeTab === 'matrix' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  }}
                >
                  <Table size={13} /> Metrics Matrix
                </button>

                <button
                  onClick={() => setActiveTab('eval')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: activeTab === 'eval' ? 'var(--accent-primary-light)' : 'transparent',
                    color: activeTab === 'eval' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'eval' ? 600 : 500,
                    fontSize: '12px',
                    border: `1px solid ${activeTab === 'eval' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  }}
                >
                  <Award size={13} /> Head-to-Head & Scoring
                </button>
              </div>
            </div>

            {/* Viewport Controls Sub-Bar (for Live Preview & Split View) */}
            {(activeTab === 'preview' || activeTab === 'split') && (
              <ViewportControls
                selectedPreset={selectedPreset}
                onPresetChange={handlePresetChange}
                customWidth={customWidth}
                customHeight={customHeight}
                onCustomDimensionsChange={(w, h) => {
                  setCustomWidth(w);
                  setCustomHeight(h);
                }}
                zoom={zoom}
                onZoomChange={setZoom}
                onReload={handleReloadAll}
                isConsoleOpen={Object.values(consoleOpenSlots).some(Boolean)}
                onToggleConsole={() => {
                  const anyOpen = Object.values(consoleOpenSlots).some(Boolean);
                  const next: Record<string, boolean> = {};
                  compareRuns.forEach((r) => (next[r.id] = !anyOpen));
                  setConsoleOpenSlots(next);
                }}
                syncControls={{
                  isSyncViewport,
                  onToggleSyncViewport: () => setIsSyncViewport(!isSyncViewport),
                  isSyncScroll,
                  onToggleSyncScroll: () => setIsSyncScroll(!isSyncScroll),
                }}
              />
            )}

            {/* TAB BODY: Live Preview / Extracted HTML / Split View */}
            {(activeTab === 'preview' || activeTab === 'html' || activeTab === 'split') && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {compareRuns.length === 1 ? (
                  /* 1 Run Selected View with Invitation to Pick 2nd Run */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, height: '100%', overflow: 'hidden', gap: '1px', backgroundColor: 'var(--border-color)' }}>
                    {/* Slot A */}
                    {(() => {
                      const run = compareRuns[0];
                      const slotMeta = SLOT_COLORS[0];
                      const isConsoleOpen = !!consoleOpenSlots[run.id];
                      const entries = consoleEntries[run.id] || [];
                      const html = run.output?.html || '';

                      return (
                        <div style={{ backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                          {/* Slot Header */}
                          <div
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--bg-secondary)',
                              borderBottom: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  backgroundColor: slotMeta.bg,
                                  color: slotMeta.text,
                                  border: `1px solid ${slotMeta.border}`,
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '1px 5px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                }}
                              >
                                {slotMeta.label}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                                {run.model_display_name || run.model_name}
                              </span>
                              <ScoreBadge score={run.evaluation?.overall_score} size="sm" />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={copiedSlotId === run.id ? <Check size={11} color="var(--accent-success)" /> : <Copy size={11} />}
                                onClick={() => handleCopyHtml(html, run.id)}
                              >
                                {copiedSlotId === run.id ? 'Copied' : 'Copy HTML'}
                              </Button>

                              <Tooltip content="Edit HTML / Notes">
                                <button
                                  onClick={() => setEditingRun(run)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '3px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                  }}
                                >
                                  <Edit2 size={11} />
                                </button>
                              </Tooltip>

                              <Tooltip content="Remove Slot">
                                <button
                                  onClick={() => handleRemoveSlot(run.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px' }}
                                >
                                  <X size={12} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {activeTab === 'preview' && (
                              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                                <IsolatedFrame
                                  id={`frame-${run.id}`}
                                  html={html}
                                  width={customWidth}
                                  height={customHeight}
                                  zoom={zoom}
                                  reloadKey={reloadTriggers[run.id] || 0}
                                  onConsoleMessage={(entry) => handleConsoleMessage(run.id, entry)}
                                  onScroll={handleScroll}
                                  syncScrollTop={syncScrollTop}
                                />
                              </div>
                            )}

                            {activeTab === 'html' && (
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <MonacoCodeEditor value={html} readOnly language="html" />
                              </div>
                            )}

                            {activeTab === 'split' && (
                              <>
                                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                                  <IsolatedFrame
                                    id={`frame-${run.id}`}
                                    html={html}
                                    width={customWidth}
                                    height={customHeight}
                                    zoom={zoom}
                                    reloadKey={reloadTriggers[run.id] || 0}
                                    onConsoleMessage={(entry) => handleConsoleMessage(run.id, entry)}
                                    onScroll={handleScroll}
                                    syncScrollTop={syncScrollTop}
                                  />
                                </div>
                                <div style={{ flex: 1, borderTop: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                  <MonacoCodeEditor value={html} readOnly language="html" />
                                </div>
                              </>
                            )}
                          </div>

                          <ConsoleDrawer
                            isOpen={isConsoleOpen}
                            onClose={() => setConsoleOpenSlots((prev) => ({ ...prev, [run.id]: false }))}
                            entries={entries}
                            onClear={() => setConsoleEntries((prev) => ({ ...prev, [run.id]: [] }))}
                          />
                        </div>
                      );
                    })()}

                    {/* Placeholder for Slot B */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        <Plus size={24} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Select a 2nd Run to Compare
                      </div>
                      <p style={{ fontSize: '11px', maxWidth: '280px', margin: 0, lineHeight: 1.4 }}>
                        Click any model run from the catalog on the left to place it in Slot [B] and compare side-by-side.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* 2 to 4 Runs Multi-Grid */
                  <div style={getGridStyle(compareRuns.length)}>
                    {compareRuns.map((run, index) => {
                      const slotMeta = SLOT_COLORS[index % SLOT_COLORS.length];
                      const isConsoleOpen = !!consoleOpenSlots[run.id];
                      const entries = consoleEntries[run.id] || [];
                      const html = run.output?.html || '';
                      const errorCount = entries.filter((e) => e.type === 'error').length;

                      return (
                        <div
                          key={run.id}
                          style={{
                            backgroundColor: 'var(--bg-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Slot Header Toolbar */}
                          <div
                            style={{
                              padding: '6px 10px',
                              backgroundColor: 'var(--bg-secondary)',
                              borderBottom: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <span
                                style={{
                                  backgroundColor: slotMeta.bg,
                                  color: slotMeta.text,
                                  border: `1px solid ${slotMeta.border}`,
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '1px 5px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {slotMeta.label}
                              </span>
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {run.model_display_name || run.model_name}
                              </span>
                              <ScoreBadge score={run.evaluation?.overall_score} size="sm" />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              {run.tokens_per_second ? (
                                <span className="badge" style={{ fontSize: '9px', color: 'var(--accent-success)' }}>
                                  {Math.round(run.tokens_per_second)} t/s
                                </span>
                              ) : null}

                              <Tooltip content="Copy HTML">
                                <button
                                  onClick={() => handleCopyHtml(html, run.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '3px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: copiedSlotId === run.id ? 'var(--accent-success)' : 'var(--text-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                  }}
                                >
                                  {copiedSlotId === run.id ? <Check size={11} /> : <Copy size={11} />}
                                </button>
                              </Tooltip>

                              <Tooltip content="Edit HTML or Notes">
                                <button
                                  onClick={() => setEditingRun(run)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '3px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                  }}
                                >
                                  <Edit2 size={11} />
                                </button>
                              </Tooltip>

                              <Tooltip content="Toggle JavaScript Console">
                                <button
                                  onClick={() =>
                                    setConsoleOpenSlots((prev) => ({ ...prev, [run.id]: !prev[run.id] }))
                                  }
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    padding: '3px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: isConsoleOpen ? 'var(--bg-active)' : 'var(--bg-tertiary)',
                                    color: errorCount > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)',
                                    border: `1px solid ${errorCount > 0 ? 'var(--accent-danger)' : 'var(--border-subtle)'}`,
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                  }}
                                >
                                  <Terminal size={11} />
                                  {errorCount > 0 && <span>{errorCount}</span>}
                                </button>
                              </Tooltip>

                              <Tooltip content="Remove Slot from Comparison">
                                <button
                                  onClick={() => handleRemoveSlot(run.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '3px',
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Content Area */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {activeTab === 'preview' && (
                              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                                <IsolatedFrame
                                  id={`frame-${run.id}`}
                                  html={html}
                                  width={customWidth}
                                  height={customHeight}
                                  zoom={zoom}
                                  reloadKey={reloadTriggers[run.id] || 0}
                                  onConsoleMessage={(entry) => handleConsoleMessage(run.id, entry)}
                                  onScroll={handleScroll}
                                  syncScrollTop={syncScrollTop}
                                />
                              </div>
                            )}

                            {activeTab === 'html' && (
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <MonacoCodeEditor value={html} readOnly language="html" />
                              </div>
                            )}

                            {activeTab === 'split' && (
                              <>
                                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                                  <IsolatedFrame
                                    id={`frame-${run.id}`}
                                    html={html}
                                    width={customWidth}
                                    height={customHeight}
                                    zoom={zoom}
                                    reloadKey={reloadTriggers[run.id] || 0}
                                    onConsoleMessage={(entry) => handleConsoleMessage(run.id, entry)}
                                    onScroll={handleScroll}
                                    syncScrollTop={syncScrollTop}
                                  />
                                </div>
                                <div style={{ flex: 1, borderTop: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                  <MonacoCodeEditor value={html} readOnly language="html" />
                                </div>
                              </>
                            )}
                          </div>

                          {/* Console Drawer */}
                          <ConsoleDrawer
                            isOpen={isConsoleOpen}
                            onClose={() =>
                              setConsoleOpenSlots((prev) => ({ ...prev, [run.id]: false }))
                            }
                            entries={entries}
                            onClear={() =>
                              setConsoleEntries((prev) => ({ ...prev, [run.id]: [] }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB BODY: Monaco Diff Viewer */}
            {activeTab === 'diff' && compareRuns.length >= 2 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Diff selector toolbar if >2 runs */}
                {compareRuns.length > 2 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 16px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Left Model:</span>
                      <select
                        value={diffLeftId}
                        onChange={(e) => setDiffLeftId(e.target.value)}
                        style={{
                          padding: '3px 8px',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                        }}
                      >
                        {compareRuns.map((r, i) => (
                          <option key={r.id} value={r.id}>
                            [{SLOT_COLORS[i].label}] {r.model_display_name || r.model_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Right Model:</span>
                      <select
                        value={diffRightId}
                        onChange={(e) => setDiffRightId(e.target.value)}
                        style={{
                          padding: '3px 8px',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                        }}
                      >
                        {compareRuns.map((r, i) => (
                          <option key={r.id} value={r.id}>
                            [{SLOT_COLORS[i].label}] {r.model_display_name || r.model_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <MonacoDiffViewer
                    original={diffRunLeft?.output?.html || ''}
                    modified={diffRunRight?.output?.html || ''}
                    originalTitle={`${diffRunLeft?.model_display_name || diffRunLeft?.model_name || 'Left'} (${diffRunLeft?.output?.html?.length || 0} chars)`}
                    modifiedTitle={`${diffRunRight?.model_display_name || diffRunRight?.model_name || 'Right'} (${diffRunRight?.output?.html?.length || 0} chars)`}
                  />
                </div>
              </div>
            )}

            {/* TAB BODY: Metrics Matrix */}
            {activeTab === 'matrix' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)',
                      overflow: 'hidden',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, width: '220px' }}>
                            Benchmark Metric
                          </th>
                          {compareRuns.map((r, idx) => {
                            const slotMeta = SLOT_COLORS[idx % SLOT_COLORS.length];
                            return (
                              <th
                                key={r.id}
                                style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  color: slotMeta.text,
                                  fontWeight: 700,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ backgroundColor: slotMeta.bg, padding: '1px 5px', borderRadius: '3px', border: `1px solid ${slotMeta.border}` }}>
                                    {slotMeta.label}
                                  </span>
                                  {r.model_display_name || r.model_name}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Overall Score */}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>Overall Score</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '10px 16px' }}>
                              <ScoreBadge score={r.evaluation?.overall_score} size="md" isManual={r.evaluation?.is_manual_overall === 1} />
                            </td>
                          ))}
                        </tr>

                        {/* Individual Evaluation Scores */}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                          <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '11px' }}>Visual Quality (25%)</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '8px 16px', fontFamily: 'var(--font-mono)' }}>
                              {r.evaluation?.visual_score != null ? `${r.evaluation.visual_score} / 10` : '—'}
                            </td>
                          ))}
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '11px' }}>Prompt Adherence (25%)</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '8px 16px', fontFamily: 'var(--font-mono)' }}>
                              {r.evaluation?.prompt_adherence_score != null ? `${r.evaluation.prompt_adherence_score} / 10` : '—'}
                            </td>
                          ))}
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                          <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '11px' }}>Functionality (25%)</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '8px 16px', fontFamily: 'var(--font-mono)' }}>
                              {r.evaluation?.functionality_score != null ? `${r.evaluation.functionality_score} / 10` : '—'}
                            </td>
                          ))}
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '11px' }}>Code Quality (15%)</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '8px 16px', fontFamily: 'var(--font-mono)' }}>
                              {r.evaluation?.code_quality_score != null ? `${r.evaluation.code_quality_score} / 10` : '—'}
                            </td>
                          ))}
                        </tr>

                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                          <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '11px' }}>Creativity (10%)</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '8px 16px', fontFamily: 'var(--font-mono)' }}>
                              {r.evaluation?.creativity_score != null ? `${r.evaluation.creativity_score} / 10` : '—'}
                            </td>
                          ))}
                        </tr>

                        {/* Generation Speed */}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>Generation Speed</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '10px 16px', color: 'var(--accent-success)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                              {r.tokens_per_second ? `${r.tokens_per_second.toFixed(1)} tok/s` : '—'}
                            </td>
                          ))}
                        </tr>

                        {/* Generation Time */}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>Latency / Duration</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>
                              {r.generation_time_ms ? `${(r.generation_time_ms / 1000).toFixed(2)}s` : '—'}
                            </td>
                          ))}
                        </tr>

                        {/* Token Metrics */}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>Tokens (In / Out)</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                              In: <strong>{r.input_tokens ?? '—'}</strong> • Out: <strong>{r.output_tokens ?? '—'}</strong>
                            </td>
                          ))}
                        </tr>

                        {/* HTML Code Size */}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>HTML Output Size</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>
                              {r.output?.html?.length?.toLocaleString() || 0} characters
                            </td>
                          ))}
                        </tr>

                        {/* Parameters */}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>Sampling Parameters</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '10px 16px', fontSize: '11px' }}>
                              Temp: <strong>{r.temperature ?? 'Default'}</strong> • Top P: <strong>{r.top_p ?? 'Default'}</strong>
                            </td>
                          ))}
                        </tr>

                        {/* Provenance */}
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>Source / Provenance</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '10px 16px' }}>
                              <span className="badge">{r.provenance}</span>
                            </td>
                          ))}
                        </tr>

                        {/* Date */}
                        <tr>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>Execution Timestamp</td>
                          {compareRuns.map((r) => (
                            <td key={r.id} style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {new Date(r.started_at).toLocaleString()}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB BODY: Head-to-Head & Scoring */}
            {activeTab === 'eval' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Pairwise Decision Banner if exactly 2 models */}
                  {isPair && isSamePrompt && (
                    <HeadToHeadSelector
                      leftRun={compareRuns[0]}
                      rightRun={compareRuns[1]}
                      promptVersionId={compareRuns[0].prompt_version_id || compareRuns[0].prompt_id || ''}
                      onDecisionSaved={() => showToast('Head-to-head decision recorded', 'success')}
                    />
                  )}

                  {/* Side-by-side rating panels */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: compareRuns.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {compareRuns.map((run, idx) => {
                      const slotMeta = SLOT_COLORS[idx % SLOT_COLORS.length];
                      return (
                        <div
                          key={run.id}
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: 'var(--radius-lg)',
                            border: `1px solid ${slotMeta.border}`,
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  backgroundColor: slotMeta.bg,
                                  color: slotMeta.text,
                                  border: `1px solid ${slotMeta.border}`,
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '2px 6px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                }}
                              >
                                {slotMeta.label}
                              </span>
                              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                {run.model_display_name || run.model_name}
                              </h3>
                            </div>
                            <ScoreBadge score={run.evaluation?.overall_score} size="md" />
                          </div>

                          <EvaluationPanel
                            modelRunId={run.id}
                            initialEvaluation={run.evaluation}
                            compact
                            onSaved={(savedEval) => {
                              setAllRuns((prev) =>
                                prev.map((r) => (r.id === run.id ? { ...r, evaluation: savedEval } : r))
                              );
                              showToast(`Saved scores for ${run.model_display_name || run.model_name}`, 'success');
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State: No Runs Selected in Compare Lab */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '16px',
              padding: '32px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
              }}
            >
              <GitCompare size={32} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Compare Lab
              </div>
              <p style={{ fontSize: '12px', maxWidth: '380px', margin: 0, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                Select 2 to 4 model runs from the catalog on the left to inspect and compare their live interactive outputs, code, performance metrics, and evaluations side-by-side.
              </p>
            </div>

            {sortedRuns.length >= 2 && (
              <Button
                variant="primary"
                size="md"
                icon={<Sparkles size={14} />}
                onClick={handleQuickCompareLatest}
              >
                Compare Latest 2 Model Runs
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit Output Modal */}
      <EditOutputModal
        isOpen={!!editingRun}
        onClose={() => setEditingRun(null)}
        modelRun={editingRun}
        onUpdated={(updatedRun) => {
          setAllRuns((prev) => prev.map((r) => (r.id === updatedRun.id ? updatedRun : r)));
          loadData();
        }}
      />

      {/* Delete Run Confirmation */}
      <ConfirmModal
        isOpen={!!deletingRun}
        onClose={() => setDeletingRun(null)}
        onConfirm={handleDeleteRun}
        title="Delete Model Output & Run?"
        message={`Are you sure you want to delete this benchmark generation run for "${deletingRun?.model_display_name || deletingRun?.model_name}" (${deletingRun?.prompt_name})?`}
        confirmLabel="Delete Run"
        confirmVariant="danger"
      />
    </div>
  );
};
