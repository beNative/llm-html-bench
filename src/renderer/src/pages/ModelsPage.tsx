import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useListKeyboardNav } from '../hooks/useListKeyboardNav';
import { ModelRun } from '@shared/types/entities';
import { Button } from '../components/common/Button';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { EditModelModal } from '../components/modals/EditModelModal';
import { EditOutputModal } from '../components/modals/EditOutputModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Tooltip } from '../components/common/Tooltip';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const ModelsPage: React.FC = () => {
  const {
    models,
    refreshModels,
    selectedModelId,
    setSelectedModelId,
    setIsNewModelModalOpen,
    setSelectedPromptId,
    setCurrentTab,
    openCompareWithRuns,
    showToast,
  } = useApp();

  const [modelRuns, setModelRuns] = useState<ModelRun[]>([]);
  const [isEditModelModalOpen, setIsEditModelModalOpen] = useState(false);
  const [isDeleteModelModalOpen, setIsDeleteModelModalOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<ModelRun | null>(null);
  const [deletingRun, setDeletingRun] = useState<ModelRun | null>(null);

  const handleDeleteModel = async () => {
    if (!selectedModel || !window.electronAPI) return;
    try {
      await window.electronAPI.deleteModel(selectedModel.id);
      showToast(`Model "${selectedModel.display_name}" deleted successfully`, 'info');
      setIsDeleteModelModalOpen(false);
      setSelectedModelId(null);
      await refreshModels();
    } catch (err: unknown) {
      showToast(`Failed to delete model: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleDeleteRun = async () => {
    if (!deletingRun || !window.electronAPI) return;
    try {
      await window.electronAPI.deleteModelRun(deletingRun.id);
      showToast('Model run deleted successfully', 'info');
      setDeletingRun(null);
      if (selectedModel) {
        const rList = await window.electronAPI.getRunsForModel(selectedModel.id);
        setModelRuns(rList);
        refreshModels();
      }
    } catch (err: unknown) {
      showToast(`Failed to delete run: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  useEffect(() => {
    refreshModels();
  }, []);

  // Ensure a model is selected if none or invalid is selected
  useEffect(() => {
    if (models.length > 0) {
      if (!selectedModelId || !models.some((m) => m.id === selectedModelId)) {
        setSelectedModelId(models[0].id);
      }
    }
  }, [models, selectedModelId, setSelectedModelId]);

  const selectedModel = models.find((m) => m.id === selectedModelId) || (models.length > 0 ? models[0] : null);

  useEffect(() => {
    if (selectedModel && window.electronAPI) {
      window.electronAPI.getRunsForModel(selectedModel.id).then((rList) => {
        setModelRuns(rList);
      });
    } else {
      setModelRuns([]);
    }
  }, [selectedModel?.id]);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = useMemo(() => {
    return models.findIndex((m) => m.id === selectedModelId);
  }, [models, selectedModelId]);

  useListKeyboardNav({
    itemCount: models.length,
    selectedIndex,
    onSelectIndex: (idx) => {
      if (models[idx]) {
        setSelectedModelId(models[idx].id);
      }
    },
    containerRef: listContainerRef,
    pageSize: 6,
    onExtraKey: (e) => {
      // Delete: delete model
      if (e.key === 'Delete') {
        if (selectedModel) setIsDeleteModelModalOpen(true);
        return true;
      }
      // E: edit model
      if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (selectedModel) setIsEditModelModalOpen(true);
        return true;
      }
    },
  });

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left Sidebar: Models List */}
      <div
        style={{
          width: '320px',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Registered Models ({models.length})
          </span>
          <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setIsNewModelModalOpen(true)}>
            Add
          </Button>
        </div>

        <div ref={listContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {models.map((m) => {
            const isSelected = selectedModel?.id === m.id;
            return (
              <div
                key={m.id}
                data-list-item="true"
                tabIndex={0}
                onClick={() => setSelectedModelId(m.id)}
                onFocus={() => setSelectedModelId(m.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  outline: isSelected ? '2px solid var(--accent-primary)' : 'none',
                  outlineOffset: '-1px',
                  marginBottom: '4px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                    {m.is_reasoning_model ? <span title="Reasoning / CoT Model">🧠</span> : null}
                    <span style={{ fontWeight: 600, fontSize: '12px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.display_name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {m.aa_intelligence_index ? (
                      <span
                        className="badge"
                        title="Artificial Analysis Intelligence Index"
                        style={{
                          fontSize: '9px',
                          padding: '1px 4px',
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          fontWeight: 700,
                        }}
                      >
                        AA {m.aa_intelligence_index.toFixed(0)}
                      </span>
                    ) : null}
                    <ScoreBadge score={m.avg_overall_score} size="sm" />
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <span>{m.provider}</span>
                  {m.parameter_count && <span>• {m.parameter_count}</span>}
                  {m.quantization && m.quantization !== 'None / Cloud Native' && <span>• {m.quantization}</span>}
                  {m.context_window && <span>• {m.context_window}</span>}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {m.run_count || 0} run{m.run_count !== 1 ? 's' : ''} across {m.prompt_count || 0} prompts
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Main Detail: Model Stats & Prompt Run History */}
      {selectedModel ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '20px' }}>
          {/* Header */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h1 className="h1" style={{ margin: 0 }}>{selectedModel.display_name}</h1>
                  {selectedModel.is_reasoning_model ? (
                    <span className="badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                      🧠 Reasoning CoT
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-purple">{selectedModel.provider}</span>
                  {selectedModel.model_family && <span className="badge">Family: {selectedModel.model_family}</span>}
                  {selectedModel.parameter_count && <span className="badge">Params: {selectedModel.parameter_count}</span>}
                  {selectedModel.architecture && <span className="badge">Arch: {selectedModel.architecture}</span>}
                  {selectedModel.quantization && <span className="badge">Quant: {selectedModel.quantization}</span>}
                  {selectedModel.context_window && <span className="badge">Context: {selectedModel.context_window}</span>}
                  <span className="badge">{selectedModel.local_or_cloud === 'local' ? '🖥️ Local' : '☁️ Cloud'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average Overall Benchmark</div>
                  <div style={{ marginTop: '4px' }}>
                    <ScoreBadge score={selectedModel.avg_overall_score} size="lg" />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Tooltip content="Edit Model Specs" description="Modify provider, architecture, quantization, and benchmark data" position="left">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Edit2 size={13} />}
                      onClick={() => setIsEditModelModalOpen(true)}
                    >
                      Edit
                    </Button>
                  </Tooltip>
                  <Tooltip content="Delete Model" description="Permanently remove model and all its benchmark results" position="left">
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 size={13} />}
                      onClick={() => setIsDeleteModelModalOpen(true)}
                    >
                      Delete
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Artificial Analysis Benchmark Intelligence Strip */}
            {(() => {
              let evals: any = null;
              if (selectedModel.aa_evaluations_json) {
                try {
                  evals = JSON.parse(selectedModel.aa_evaluations_json);
                } catch {
                  evals = null;
                }
              }

              if (selectedModel.aa_intelligence_index || evals) {
                return (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                        ⚡ Artificial Analysis Benchmarks:
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      {selectedModel.aa_intelligence_index ? (
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Intelligence: </span>
                          <strong style={{ color: 'var(--accent-primary)' }}>{selectedModel.aa_intelligence_index.toFixed(1)} / 100</strong>
                        </div>
                      ) : null}

                      {evals?.throughputTokSec ? (
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Measured Speed: </span>
                          <strong style={{ color: 'var(--accent-success)' }}>{Math.round(evals.throughputTokSec)} tok/s</strong>
                        </div>
                      ) : null}

                      {evals?.priceOutputPer1M !== undefined ? (
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Price / 1M: </span>
                          <strong>${evals.priceInputPer1M ?? 0} in / ${evals.priceOutputPer1M} out</strong>
                        </div>
                      ) : null}

                      {evals?.coding ? (
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Coding: </span>
                          <strong style={{ color: 'var(--accent-purple)' }}>{evals.coding}%</strong>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Dimension Breakdown Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Visual Quality</div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedModel.avg_visual_score ? selectedModel.avg_visual_score.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Prompt Adherence</div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedModel.avg_adherence_score ? selectedModel.avg_adherence_score.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Functionality</div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedModel.avg_functionality_score ? selectedModel.avg_functionality_score.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Code Quality</div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedModel.avg_code_quality_score ? selectedModel.avg_code_quality_score.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Creativity</div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedModel.avg_creativity_score ? selectedModel.avg_creativity_score.toFixed(1) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Tested Prompts Run History */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '13px' }}>
              All Tested Benchmark Prompts ({modelRuns.length} runs)
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 14px' }}>Prompt</th>
                  <th style={{ padding: '8px 14px' }}>Version</th>
                  <th style={{ padding: '8px 14px' }}>Date</th>
                  <th style={{ padding: '8px 14px' }}>Generation Speed</th>
                  <th style={{ padding: '8px 14px' }}>Score</th>
                  <th style={{ padding: '8px 14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {modelRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No benchmark runs executed for this model yet.
                    </td>
                  </tr>
                ) : (
                  modelRuns.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.prompt_name}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="badge">v{r.prompt_version}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        {new Date(r.started_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        {r.tokens_per_second ? `${r.tokens_per_second} tok/s` : r.output_tokens ? `${r.output_tokens} tok` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <ScoreBadge score={r.evaluation?.overall_score} size="sm" />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (r.prompt_id) {
                                setSelectedPromptId(r.prompt_id);
                                setCurrentTab('prompts');
                              }
                            }}
                          >
                            View Prompt →
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openCompareWithRuns([r.id])}
                          >
                            Compare
                          </Button>
                          <Tooltip content="Edit HTML Code or Notes">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Edit2 size={12} />}
                              onClick={() => setEditingRun(r)}
                            />
                          </Tooltip>
                          <Tooltip content="Delete Run Output">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Trash2 size={12} color="var(--accent-danger)" />}
                              onClick={() => setDeletingRun(r)}
                            />
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Edit Model Modal */}
      <EditModelModal
        isOpen={isEditModelModalOpen}
        onClose={() => setIsEditModelModalOpen(false)}
        model={selectedModel}
        onUpdated={() => {
          refreshModels();
        }}
      />

      {/* Delete Model Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModelModalOpen}
        onClose={() => setIsDeleteModelModalOpen(false)}
        onConfirm={handleDeleteModel}
        title={`Delete Model "${selectedModel?.display_name}"?`}
        message="Are you sure you want to permanently delete this model? All benchmark runs, generated HTML outputs, screenshots, and evaluations associated with this model will also be permanently deleted."
        confirmLabel="Delete Model"
        confirmVariant="danger"
      />

      {/* Edit Output Modal */}
      <EditOutputModal
        isOpen={!!editingRun}
        onClose={() => setEditingRun(null)}
        modelRun={editingRun}
        onUpdated={() => {
          if (selectedModel && window.electronAPI) {
            window.electronAPI.getRunsForModel(selectedModel.id).then((rList) => setModelRuns(rList));
            refreshModels();
          }
        }}
      />

      {/* Delete Run Confirmation */}
      <ConfirmModal
        isOpen={!!deletingRun}
        onClose={() => setDeletingRun(null)}
        onConfirm={handleDeleteRun}
        title="Delete Model Output & Run?"
        message={`Are you sure you want to delete this benchmark run? Its HTML output, screenshots, and evaluation scores will be removed.`}
        confirmLabel="Delete Run"
        confirmVariant="danger"
      />
    </div>
  );
};
