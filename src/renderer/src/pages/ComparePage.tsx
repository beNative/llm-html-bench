import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ModelRun } from '@shared/types/entities';
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
import { Tooltip } from '../components/common/Tooltip';
import {
  Eye,
  Code2,
  GitCompare,
  Split,
  Award,
  Trash2,
  RefreshCw,
  Edit2,
} from 'lucide-react';

type ViewMode = 'preview' | 'source' | 'split' | 'diff';

export const ComparePage: React.FC = () => {
  const {
    compareRunIds,
    setCompareRunIds,
    clearCompareRunIds,
    setCurrentTab,
    showToast,
  } = useApp();

  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [allAvailableRuns, setAllAvailableRuns] = useState<ModelRun[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

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

  // Evaluation Drawers State
  const [evalOpenSlots, setEvalOpenSlots] = useState<Record<string, boolean>>({});
  const [editingRun, setEditingRun] = useState<ModelRun | null>(null);

  const loadRuns = async () => {
    if (compareRunIds.length === 0) {
      setRuns([]);
      return;
    }
    try {
      if (window.electronAPI) {
        const [loadedRuns, allRuns] = await Promise.all([
          window.electronAPI.getRunsByIds(compareRunIds),
          window.electronAPI.getAllRuns(100),
        ]);
        setRuns(loadedRuns);
        setAllAvailableRuns(allRuns);
      }
    } catch (err) {
      console.error('Failed to load runs for comparison:', err);
    }
  };

  useEffect(() => {
    loadRuns();
  }, [compareRunIds]);

  const handlePresetChange = (presetName: string, w: string, h: string) => {
    setSelectedPreset(presetName);
    setCustomWidth(w);
    setCustomHeight(h);
  };

  const handleReloadAll = () => {
    const next: Record<string, number> = {};
    runs.forEach((r) => {
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

  const handleSlotRunChange = (slotIndex: number, newRunId: string) => {
    setCompareRunIds((prev) => {
      const updated = [...prev];
      updated[slotIndex] = newRunId;
      return updated;
    });
  };

  const handleRemoveSlot = (slotIndex: number) => {
    setCompareRunIds((prev) => prev.filter((_, idx) => idx !== slotIndex));
  };

  if (runs.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <GitCompare size={40} color="var(--accent-primary)" style={{ opacity: 0.6 }} />
        <h2 className="h2">No Model Runs Selected for Comparison</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px' }}>
          Go to the Prompt Library, select a prompt, and check 2 to 4 model runs to compare their rendered HTML, code, and performance side-by-side.
        </p>
        <Button variant="primary" size="md" onClick={() => setCurrentTab('prompts')}>
          Go to Prompt Library
        </Button>
      </div>
    );
  }

  const isPair = runs.length === 2;

  // Grid layout styles depending on count
  let gridStyle: React.CSSProperties = {
    display: 'grid',
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    gap: '1px',
    backgroundColor: 'var(--border-color)',
  };

  if (runs.length === 1) {
    gridStyle.gridTemplateColumns = '1fr';
  } else if (runs.length === 2) {
    gridStyle.gridTemplateColumns = '1fr 1fr';
  } else if (runs.length === 3) {
    gridStyle.gridTemplateColumns = '1fr 1fr 1fr';
  } else {
    gridStyle.gridTemplateColumns = '1fr 1fr';
    gridStyle.gridTemplateRows = '1fr 1fr';
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Comparison Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: View Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setViewMode('preview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: viewMode === 'preview' ? 'var(--accent-primary-light)' : 'transparent',
              color: viewMode === 'preview' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${viewMode === 'preview' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <Eye size={13} /> Rendered
          </button>

          <button
            onClick={() => setViewMode('source')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: viewMode === 'source' ? 'var(--accent-primary-light)' : 'transparent',
              color: viewMode === 'source' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${viewMode === 'source' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <Code2 size={13} /> Source
          </button>

          <button
            onClick={() => setViewMode('split')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: viewMode === 'split' ? 'var(--accent-primary-light)' : 'transparent',
              color: viewMode === 'split' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${viewMode === 'split' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <Split size={13} /> Split
          </button>

          {isPair && (
            <button
              onClick={() => setViewMode('diff')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'diff' ? 'var(--accent-primary-light)' : 'transparent',
                color: viewMode === 'diff' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${viewMode === 'diff' ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <GitCompare size={13} /> Line/Word Diff
            </button>
          )}
        </div>

        {/* Global actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button size="sm" variant="ghost" icon={<RefreshCw size={12} />} onClick={handleReloadAll}>
            Reload All
          </Button>
          <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={clearCompareRunIds}>
            Clear
          </Button>
        </div>
      </div>

      {/* Head to Head decision selector if 2 models tested for same prompt version */}
      {isPair && runs[0].prompt_version_id && runs[0].prompt_version_id === runs[1].prompt_version_id && (
        <HeadToHeadSelector
          leftRun={runs[0]}
          rightRun={runs[1]}
          promptVersionId={runs[0].prompt_version_id}
          onDecisionSaved={() => showToast('Pairwise ranking saved in database', 'success')}
        />
      )}

      {/* Shared Viewport Controls Bar */}
      {viewMode !== 'diff' && (
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
            runs.forEach((r) => (next[r.id] = !anyOpen));
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

      {/* Diff View Mode */}
      {viewMode === 'diff' && isPair ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MonacoDiffViewer
            original={runs[0].output?.html || ''}
            modified={runs[1].output?.html || ''}
            originalTitle={`${runs[0].model_display_name || runs[0].model_name} (${runs[0].output?.html.length || 0} chars)`}
            modifiedTitle={`${runs[1].model_display_name || runs[1].model_name} (${runs[1].output?.html.length || 0} chars)`}
          />
        </div>
      ) : (
        /* Multi-Pane Grid Layout */
        <div style={gridStyle}>
          {runs.map((run, index) => {
            const isConsoleOpen = !!consoleOpenSlots[run.id];
            const isEvalOpen = !!evalOpenSlots[run.id];
            const entries = consoleEntries[run.id] || [];
            const html = run.output?.html || '';

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
                {/* Pane Header */}
                <div
                  style={{
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  {/* Model Switcher Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={run.id}
                      onChange={(e) => handleSlotRunChange(index, e.target.value)}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 600,
                        maxWidth: '200px',
                      }}
                    >
                      {allAvailableRuns.map((ar) => (
                        <option key={ar.id} value={ar.id}>
                          {ar.model_display_name || ar.model_name} — {ar.prompt_name} (v{ar.prompt_version})
                        </option>
                      ))}
                    </select>

                    <ScoreBadge
                      score={run.evaluation?.overall_score}
                      size="sm"
                      isManual={run.evaluation?.is_manual_overall === 1}
                    />
                  </div>

                  {/* Slot Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tooltip content="Edit HTML Code or Notes" position="bottom">
                      <button
                        onClick={() => setEditingRun(run)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 6px',
                          fontSize: '10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={11} /> Edit
                      </button>
                    </Tooltip>

                    <Tooltip content="Toggle Evaluation & Rating Drawer" position="bottom">
                      <button
                        onClick={() =>
                          setEvalOpenSlots((prev) => ({ ...prev, [run.id]: !prev[run.id] }))
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 6px',
                          fontSize: '10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isEvalOpen ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                          color: isEvalOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          border: `1px solid ${isEvalOpen ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <Award size={11} /> Score
                      </button>
                    </Tooltip>

                    <Tooltip content="Remove Slot from Comparison" position="bottom">
                      <button
                        onClick={() => handleRemoveSlot(index)}
                        style={{
                          padding: '3px',
                          color: 'var(--text-muted)',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Main Content Area: Rendered Preview or Source or Split */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {(viewMode === 'preview' || viewMode === 'split') && (
                    <div style={{ flex: viewMode === 'split' ? 1 : 1, overflow: 'hidden', position: 'relative' }}>
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

                  {(viewMode === 'source' || viewMode === 'split') && (
                    <div style={{ flex: viewMode === 'split' ? 1 : 1, borderTop: viewMode === 'split' ? '1px solid var(--border-color)' : 'none', overflow: 'hidden' }}>
                      <MonacoCodeEditor value={html} readOnly language="html" />
                    </div>
                  )}
                </div>

                {/* Console Drawer for this slot */}
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

                {/* In-situ Evaluation Panel Drawer */}
                {isEvalOpen && (
                  <div
                    style={{
                      maxHeight: '260px',
                      overflowY: 'auto',
                      borderTop: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <EvaluationPanel
                      modelRunId={run.id}
                      initialEvaluation={run.evaluation}
                      compact
                      onSaved={(savedEval) => {
                        setRuns((prev) =>
                          prev.map((r) => (r.id === run.id ? { ...r, evaluation: savedEval } : r))
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Output Modal */}
      <EditOutputModal
        isOpen={!!editingRun}
        onClose={() => setEditingRun(null)}
        modelRun={editingRun}
        onUpdated={() => {
          loadRuns();
        }}
      />
    </div>
  );
};
