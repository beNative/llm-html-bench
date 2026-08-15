import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ModelRun } from '@shared/types/entities';
import { Button } from '../components/common/Button';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { Modal } from '../components/common/Modal';
import { IsolatedFrame } from '../components/preview/IsolatedFrame';
import { MonacoCodeEditor } from '../components/editor/MonacoCodeEditor';
import { EvaluationPanel } from '../components/evaluation/EvaluationPanel';
import { EditOutputModal } from '../components/modals/EditOutputModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  Search,
  Eye,
  Copy,
  Check,
  Columns,
  Star,
  Edit2,
  Trash2,
} from 'lucide-react';

export const RunsPage: React.FC = () => {
  const {
    openCompareWithRuns,
    showToast,
  } = useApp();

  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<ModelRun | null>(null);
  const [inspectTab, setInspectTab] = useState<'preview' | 'html' | 'raw' | 'metadata' | 'eval'>('preview');
  const [copiedType, setCopiedType] = useState<'html' | 'raw' | null>(null);
  const [editingRun, setEditingRun] = useState<ModelRun | null>(null);
  const [deletingRun, setDeletingRun] = useState<ModelRun | null>(null);

  const loadRuns = async () => {
    try {
      if (window.electronAPI) {
        const allRuns = await window.electronAPI.getAllRuns(200);
        setRuns(allRuns);
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
      if (selectedRun?.id === deletingRun.id) {
        setSelectedRun(null);
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

  const filteredRuns = runs.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.prompt_name?.toLowerCase().includes(term) ||
      r.model_name?.toLowerCase().includes(term) ||
      r.model_display_name?.toLowerCase().includes(term) ||
      r.provider?.toLowerCase().includes(term) ||
      r.notes?.toLowerCase().includes(term)
    );
  });

  const handleCopy = (text: string, type: 'html' | 'raw') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast(`Copied ${type === 'html' ? 'HTML' : 'Raw Response'} to clipboard!`, 'info');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1">Benchmark Run History</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Complete audit trail and inspection archive of all generated HTML runs across all models and prompts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by model, prompt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '6px 10px 6px 26px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                width: '220px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Runs Table */}
      <div
        style={{
          flex: 1,
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          overflowY: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ padding: '8px 14px' }}>Model</th>
              <th style={{ padding: '8px 14px' }}>Prompt</th>
              <th style={{ padding: '8px 14px' }}>Date</th>
              <th style={{ padding: '8px 14px' }}>Duration / Speed</th>
              <th style={{ padding: '8px 14px' }}>Score</th>
              <th style={{ padding: '8px 14px' }}>Provenance</th>
              <th style={{ padding: '8px 14px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No model runs recorded.
                </td>
              </tr>
            ) : (
              filteredRuns.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {r.model_display_name || r.model_name}
                    {r.evaluation?.favorite === 1 && (
                      <Star size={11} fill="var(--accent-warning)" color="var(--accent-warning)" style={{ marginLeft: '4px' }} />
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontWeight: 500 }}>{r.prompt_name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>(v{r.prompt_version})</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    {new Date(r.started_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {r.generation_time_ms ? `${r.generation_time_ms}ms` : '—'}
                    {r.tokens_per_second ? ` (${r.tokens_per_second} tok/s)` : ''}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <ScoreBadge score={r.evaluation?.overall_score} size="sm" />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="badge">{r.provenance}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Button size="sm" variant="ghost" icon={<Eye size={12} />} onClick={() => setSelectedRun(r)}>
                        Inspect
                      </Button>
                      <Button size="sm" variant="primary" icon={<Columns size={12} />} onClick={() => openCompareWithRuns([r.id])}>
                        Compare
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Edit2 size={12} />}
                        onClick={() => setEditingRun(r)}
                        title="Edit HTML code or run notes"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 size={12} color="var(--accent-danger)" />}
                        onClick={() => setDeletingRun(r)}
                        title="Delete this run"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Output Inspection Modal */}
      {selectedRun && (
        <Modal
          isOpen={!!selectedRun}
          onClose={() => setSelectedRun(null)}
          title={`Output Inspection: ${selectedRun.model_display_name || selectedRun.model_name}`}
          subtitle={`${selectedRun.prompt_name} (v${selectedRun.prompt_version}) • ${new Date(selectedRun.started_at).toLocaleString()}`}
          maxWidth="920px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Modal Tabs & Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
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
                  Raw Model Response
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
                  Metadata
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
                  Evaluation & Scores
                </button>
              </div>

              {/* Action & Copy Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Edit2 size={12} />}
                  onClick={() => setEditingRun(selectedRun)}
                  title="Edit Output HTML or run notes"
                >
                  Edit Output
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={12} />}
                  onClick={() => setDeletingRun(selectedRun)}
                  title="Delete this run"
                >
                  Delete Run
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copiedType === 'html' ? <Check size={12} /> : <Copy size={12} />}
                  onClick={() => handleCopy(selectedRun.output?.html || '', 'html')}
                >
                  Copy HTML
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copiedType === 'raw' ? <Check size={12} /> : <Copy size={12} />}
                  onClick={() => handleCopy(selectedRun.output?.raw_output || '', 'raw')}
                >
                  Copy Raw
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            {inspectTab === 'preview' && (
              <div style={{ height: '420px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <IsolatedFrame html={selectedRun.output?.html || ''} />
              </div>
            )}

            {inspectTab === 'html' && (
              <div style={{ height: '420px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <MonacoCodeEditor value={selectedRun.output?.html || ''} readOnly language="html" />
              </div>
            )}

            {inspectTab === 'raw' && (
              <div style={{ height: '420px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <MonacoCodeEditor value={selectedRun.output?.raw_output || ''} readOnly language="markdown" />
              </div>
            )}

            {inspectTab === 'metadata' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                <div><strong>Run ID:</strong> <span className="font-mono">{selectedRun.id}</span></div>
                <div><strong>Model ID:</strong> <span className="font-mono">{selectedRun.model_id}</span></div>
                <div><strong>Temperature:</strong> {selectedRun.temperature ?? 'Default'}</div>
                <div><strong>Top P:</strong> {selectedRun.top_p ?? 'Default'}</div>
                <div><strong>Input Tokens:</strong> {selectedRun.input_tokens ?? '—'}</div>
                <div><strong>Output Tokens:</strong> {selectedRun.output_tokens ?? '—'}</div>
                <div><strong>Generation Time:</strong> {selectedRun.generation_time_ms ? `${selectedRun.generation_time_ms} ms` : '—'}</div>
                <div><strong>Tokens / Second:</strong> {selectedRun.tokens_per_second ? `${selectedRun.tokens_per_second} tok/s` : '—'}</div>
                <div><strong>App Version:</strong> {selectedRun.app_version}</div>
                <div><strong>Provenance:</strong> {selectedRun.provenance}</div>
                {selectedRun.notes && (
                  <div style={{ gridColumn: 'span 2', marginTop: '6px' }}>
                    <strong>Run Notes:</strong> {selectedRun.notes}
                  </div>
                )}
              </div>
            )}

            {inspectTab === 'eval' && (
              <EvaluationPanel
                modelRunId={selectedRun.id}
                initialEvaluation={selectedRun.evaluation}
                onSaved={(savedEval) => {
                  setRuns((prev) =>
                    prev.map((r) => (r.id === selectedRun.id ? { ...r, evaluation: savedEval } : r))
                  );
                }}
              />
            )}
          </div>
        </Modal>
      )}

      {/* Edit Output Modal */}
      <EditOutputModal
        isOpen={!!editingRun}
        onClose={() => setEditingRun(null)}
        modelRun={editingRun}
        onUpdated={(updatedRun) => {
          setRuns((prev) => prev.map((r) => (r.id === updatedRun.id ? updatedRun : r)));
          if (selectedRun?.id === updatedRun.id) {
            setSelectedRun(updatedRun);
          }
          loadRuns();
        }}
      />

      {/* Delete Run Confirmation */}
      <ConfirmModal
        isOpen={!!deletingRun}
        onClose={() => setDeletingRun(null)}
        onConfirm={handleDeleteRun}
        title="Delete Model Output & Run?"
        message={`Are you sure you want to delete this benchmark generation run for "${deletingRun?.model_display_name || deletingRun?.model_name}" (${deletingRun?.prompt_name})? Its HTML output, screenshots, and evaluation scores will be removed.`}
        confirmLabel="Delete Run"
        confirmVariant="danger"
      />
    </div>
  );
};
