import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ModelRun } from '@shared/types/entities';
import { Button } from '../components/common/Button';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { Plus } from 'lucide-react';

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
  } = useApp();

  const [modelRuns, setModelRuns] = useState<ModelRun[]>([]);

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

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {models.map((m) => {
            const isSelected = selectedModel?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedModelId(m.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  marginBottom: '4px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600, fontSize: '12px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {m.display_name}
                  </span>
                  <ScoreBadge score={m.avg_overall_score} size="sm" />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {m.provider} {m.parameter_count ? `• ${m.parameter_count}` : ''} {m.quantization ? `• ${m.quantization}` : ''}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 className="h1">{selectedModel.display_name}</h1>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                  <span className="badge badge-purple">{selectedModel.provider}</span>
                  {selectedModel.model_family && <span className="badge">Family: {selectedModel.model_family}</span>}
                  {selectedModel.parameter_count && <span className="badge">Params: {selectedModel.parameter_count}</span>}
                  {selectedModel.quantization && <span className="badge">Quant: {selectedModel.quantization}</span>}
                  <span className="badge">{selectedModel.local_or_cloud === 'local' ? 'Local Model' : 'Cloud API'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average Overall Benchmark</div>
                <div style={{ marginTop: '4px' }}>
                  <ScoreBadge score={selectedModel.avg_overall_score} size="lg" />
                </div>
              </div>
            </div>

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
                          style={{ marginLeft: '4px' }}
                        >
                          Compare
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};
