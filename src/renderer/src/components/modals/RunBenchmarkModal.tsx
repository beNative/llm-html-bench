import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Model, Prompt, PromptVersion } from '@shared/types/entities';
import { ProviderConfig } from '@shared/types/providers';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Play, AlertCircle } from 'lucide-react';

export const RunBenchmarkModal: React.FC = () => {
  const {
    isRunBenchmarkModalOpen,
    setIsRunBenchmarkModalOpen,
    selectedPromptId,
    showToast,
    setCurrentTab,
    openCompareWithRuns,
  } = useApp();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);

  const [targetPromptId, setTargetPromptId] = useState<string>('');
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  const [temperature, setTemperature] = useState<string>('0.7');
  const [topP, setTopP] = useState<string>('1.0');
  const [maxTokens, setMaxTokens] = useState<string>('4096');

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isRunBenchmarkModalOpen && window.electronAPI) {
      setErrorMsg(null);
      Promise.all([
        window.electronAPI.getPrompts(),
        window.electronAPI.getModels(),
        window.electronAPI.getProviderConfigs(),
      ]).then(([pList, mList, cList]) => {
        setPrompts(pList);
        setModels(mList);
        setProviderConfigs(cList);

        const initialPromptId = selectedPromptId || (pList.length > 0 ? pList[0].id : '');
        setTargetPromptId(initialPromptId);
        if (mList.length > 0) setSelectedModelId(mList[0].id);
        if (cList.length > 0) setSelectedConfigId(cList[0].id);
      });
    }
  }, [isRunBenchmarkModalOpen, selectedPromptId]);

  useEffect(() => {
    if (targetPromptId && window.electronAPI) {
      window.electronAPI.getPromptVersions(targetPromptId).then((pv) => {
        setPromptVersions(pv);
        if (pv.length > 0) {
          setSelectedVersionId(pv[0].id);
        }
      });
    }
  }, [targetPromptId]);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfigId) {
      setErrorMsg('No provider configured. Please configure an API endpoint in Settings & DB first.');
      return;
    }
    if (!targetPromptId || !selectedVersionId || !selectedModelId) {
      setErrorMsg('Please select a Prompt, Version, and Model.');
      return;
    }

    setIsRunning(true);
    setErrorMsg(null);

    try {
      if (window.electronAPI) {
        const run = await window.electronAPI.executeBenchmarkRun({
          promptVersionId: selectedVersionId,
          modelId: selectedModelId,
          providerConfigId: selectedConfigId,
          temperature: temperature ? parseFloat(temperature) : undefined,
          topP: topP ? parseFloat(topP) : undefined,
          maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
        });

        showToast(`Benchmark run completed in ${run.generation_time_ms}ms!`, 'success');
        setIsRunBenchmarkModalOpen(false);
        openCompareWithRuns([run.id]);
        setCurrentTab('compare');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Modal
      isOpen={isRunBenchmarkModalOpen}
      onClose={() => setIsRunBenchmarkModalOpen(false)}
      title="Execute Live Benchmark Run"
      subtitle="Send the exact historical prompt to an LLM provider and capture tokens, duration, and output"
      maxWidth="680px"
    >
      <form onSubmit={handleRun} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-danger-light)',
              color: 'var(--accent-danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={15} />
            {errorMsg}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Select Benchmark Provider Endpoint:
          </label>
          <select
            value={selectedConfigId}
            onChange={(e) => setSelectedConfigId(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
            }}
          >
            {providerConfigs.length === 0 ? (
              <option value="">No provider configured (Configure in Settings)</option>
            ) : (
              providerConfigs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.baseUrl})
                </option>
              ))
            )}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Benchmark Prompt:
            </label>
            <select
              value={targetPromptId}
              onChange={(e) => setTargetPromptId(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Prompt Version:
            </label>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}
            >
              {promptVersions.map((pv) => (
                <option key={pv.id} value={pv.id}>
                  Version {pv.version} {pv.notes ? `(${pv.notes})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Target Model:
          </label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.provider} — {m.display_name} ({m.model_name})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              Temperature:
            </label>
            <input
              type="number"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              Top P:
            </label>
            <input
              type="number"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(e.target.value)}
              style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              Max Tokens:
            </label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <Button type="button" variant="ghost" onClick={() => setIsRunBenchmarkModalOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isRunning || !selectedConfigId} icon={<Play size={13} />}>
            {isRunning ? 'Generating...' : 'Start Execution'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
