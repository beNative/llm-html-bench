import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Model, Prompt, PromptVersion } from '@shared/types/entities';
import { ProviderConfig, DiscoveredModel } from '@shared/types/providers';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Tooltip } from '../common/Tooltip';
import {
  Play,
  AlertCircle,
  Copy,
  Check,
  RotateCw,
  Globe,
  Settings,
  Cpu,
} from 'lucide-react';

export const RunBenchmarkModal: React.FC = () => {
  const {
    isRunBenchmarkModalOpen,
    setIsRunBenchmarkModalOpen,
    selectedPromptId,
    showToast,
    setCurrentTab,
    openCompareWithRuns,
    refreshModels,
  } = useApp();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [catalogModels, setCatalogModels] = useState<Model[]>([]);
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);

  const [targetPromptId, setTargetPromptId] = useState<string>('');
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  // Provider & Model selection mode
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [modelSource, setModelSource] = useState<'discovered' | 'catalog'>('discovered');
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [selectedDiscoveredId, setSelectedDiscoveredId] = useState<string>('');
  const [selectedCatalogModelId, setSelectedCatalogModelId] = useState<string>('');

  // Execution parameters
  const [temperature, setTemperature] = useState<string>('0.7');
  const [topP, setTopP] = useState<string>('1.0');
  const [maxTokens, setMaxTokens] = useState<string>('4096');

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPromptCopied, setIsPromptCopied] = useState<boolean>(false);

  const activePv = promptVersions.find((pv) => pv.id === selectedVersionId);
  const activePromptObj = prompts.find((p) => p.id === targetPromptId);
  const activeConfig = providerConfigs.find((c) => c.id === selectedConfigId);

  const handleCopyPrompt = async () => {
    const text = activePv?.prompt_text;
    if (text) {
      await navigator.clipboard.writeText(text);
      setIsPromptCopied(true);
      setTimeout(() => setIsPromptCopied(false), 2000);
      showToast(`Prompt "${activePromptObj?.name || ''}" copied to clipboard!`, 'success');
    } else {
      showToast('No prompt text available to copy', 'error');
    }
  };

  const loadData = async () => {
    if (!window.electronAPI) return;
    try {
      const [pList, mList, cList] = await Promise.all([
        window.electronAPI.getPrompts(),
        window.electronAPI.getModels(),
        window.electronAPI.getProviderConfigs(),
      ]);
      setPrompts(pList || []);
      setCatalogModels(mList || []);
      setProviderConfigs(cList || []);

      const initialPromptId = selectedPromptId || (pList.length > 0 ? pList[0].id : '');
      setTargetPromptId(initialPromptId);
      if (mList.length > 0) setSelectedCatalogModelId(mList[0].id);

      if (cList.length > 0) {
        const defaultCfg = cList[0];
        setSelectedConfigId(defaultCfg.id);
        // Trigger initial model auto-discovery for default config
        discoverModelsForConfig(defaultCfg);
      }
    } catch (err) {
      console.error('Failed to load benchmark modal data:', err);
    }
  };

  const discoverModelsForConfig = async (config: ProviderConfig) => {
    if (!window.electronAPI) return;
    setIsDiscovering(true);
    setErrorMsg(null);
    try {
      const res = await window.electronAPI.fetchProviderModels(config);
      if (res.success && res.models.length > 0) {
        setDiscoveredModels(res.models);
        setSelectedDiscoveredId(res.models[0].id);
        setModelSource('discovered');
      } else {
        setDiscoveredModels([]);
        setModelSource('catalog');
        if (res.error) {
          console.warn('Discovery notice:', res.error);
        }
      }
    } catch (err: unknown) {
      setDiscoveredModels([]);
      setModelSource('catalog');
    } finally {
      setIsDiscovering(false);
    }
  };

  useEffect(() => {
    if (isRunBenchmarkModalOpen) {
      setErrorMsg(null);
      loadData();
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

  const handleProviderChange = (newConfigId: string) => {
    setSelectedConfigId(newConfigId);
    const cfg = providerConfigs.find((c) => c.id === newConfigId);
    if (cfg) {
      discoverModelsForConfig(cfg);
    }
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfigId || !activeConfig) {
      setErrorMsg('No provider endpoint selected. Please configure an endpoint in Settings.');
      return;
    }
    if (!targetPromptId || !selectedVersionId) {
      setErrorMsg('Please select a Prompt and Prompt Version.');
      return;
    }

    let targetModelId = '';
    let targetModelName = '';
    let targetModelDisplayName = '';

    if (modelSource === 'discovered') {
      if (!selectedDiscoveredId) {
        setErrorMsg('Please select an auto-discovered model from the endpoint.');
        return;
      }
      const disc = discoveredModels.find((m) => m.id === selectedDiscoveredId);
      targetModelId = selectedDiscoveredId;
      targetModelName = selectedDiscoveredId;
      targetModelDisplayName = disc?.name || selectedDiscoveredId;
    } else {
      if (!selectedCatalogModelId) {
        setErrorMsg('Please select a model from the local catalog.');
        return;
      }
      const cat = catalogModels.find((m) => m.id === selectedCatalogModelId);
      targetModelId = cat ? cat.id : selectedCatalogModelId;
      targetModelName = cat ? cat.model_name : selectedCatalogModelId;
      targetModelDisplayName = cat ? cat.display_name : selectedCatalogModelId;
    }

    setIsRunning(true);
    setErrorMsg(null);

    try {
      if (window.electronAPI) {
        const run = await window.electronAPI.executeBenchmarkRun({
          promptVersionId: selectedVersionId,
          modelId: targetModelId,
          providerConfigId: selectedConfigId,
          modelName: targetModelName,
          modelDisplayName: targetModelDisplayName,
          temperature: temperature ? parseFloat(temperature) : undefined,
          topP: topP ? parseFloat(topP) : undefined,
          maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
        });

        const timeStr = run.generation_time_ms ? `${(run.generation_time_ms / 1000).toFixed(2)}s` : 'completed';
        showToast(`Benchmark run completed (${timeStr})!`, 'success');
        refreshModels();
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
      subtitle="Send the benchmark challenge to any local or cloud LLM endpoint and capture tokens, duration, and output"
      maxWidth="720px"
    >
      <form onSubmit={handleRun} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-danger-light)',
              color: 'var(--accent-danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Provider Endpoint Selector with Auto-Discovery Action */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} color="var(--accent-primary)" />
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Provider Endpoint:
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activeConfig && (
                <Tooltip content="Auto-discover models currently loaded/available on this endpoint">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<RotateCw size={11} className={isDiscovering ? 'spin-anim' : ''} />}
                    onClick={() => discoverModelsForConfig(activeConfig)}
                    disabled={isDiscovering}
                    style={{ height: '22px', fontSize: '11px', padding: '1px 8px' }}
                  >
                    {isDiscovering ? 'Discovering...' : 'Auto-Discover Models'}
                  </Button>
                </Tooltip>
              )}

              <Tooltip content="Configure multiple endpoints in Settings">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={<Settings size={11} />}
                  onClick={() => {
                    setIsRunBenchmarkModalOpen(false);
                    setCurrentTab('settings');
                  }}
                  style={{ height: '22px', fontSize: '11px', padding: '1px 6px' }}
                >
                  Manage Endpoints
                </Button>
              </Tooltip>
            </div>
          </div>

          <select
            value={selectedConfigId}
            onChange={(e) => handleProviderChange(e.target.value)}
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
              <option value="">No provider configured (Click 'Manage Endpoints' to add one)</option>
            ) : (
              providerConfigs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.baseUrl}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Model Selection with Discovered vs Catalog Mode */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} color="var(--accent-purple)" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Target AI Model:
              </span>
            </div>

            {/* Source Mode Toggle */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-primary)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
              <button
                type="button"
                onClick={() => setModelSource('discovered')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '10px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: modelSource === 'discovered' ? 'var(--accent-primary)' : 'transparent',
                  color: modelSource === 'discovered' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                Auto-Discovered ({discoveredModels.length})
              </button>
              <button
                type="button"
                onClick={() => setModelSource('catalog')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '10px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: modelSource === 'catalog' ? 'var(--accent-primary)' : 'transparent',
                  color: modelSource === 'catalog' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                Catalog Models ({catalogModels.length})
              </button>
            </div>
          </div>

          {modelSource === 'discovered' ? (
            <div>
              {discoveredModels.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px' }}>
                  {isDiscovering ? (
                    'Querying endpoint for available models...'
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                      <span>No models discovered from {activeConfig?.baseUrl || 'endpoint'}.</span>
                      <span style={{ fontSize: '10px' }}>Make sure your local engine (LM Studio, Ollama, vLLM) or API server is running, or switch to Catalog Models.</span>
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={selectedDiscoveredId}
                  onChange={(e) => setSelectedDiscoveredId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {discoveredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} {m.ownedBy ? `(by ${m.ownedBy})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <select
              value={selectedCatalogModelId}
              onChange={(e) => setSelectedCatalogModelId(e.target.value)}
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
              {catalogModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.provider} — {m.display_name} ({m.model_name})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Prompt Selection & Version Selection */}
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

        {/* Prompt Preview & Quick Copy Box */}
        {activePv && (
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Prompt Preview (Version {activePv.version})
              </span>
              <Tooltip content="Copy Prompt Text" description="Copy full challenge prompt to clipboard">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={isPromptCopied ? <Check size={11} color="var(--accent-success)" /> : <Copy size={11} />}
                  onClick={handleCopyPrompt}
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    height: '22px',
                    color: isPromptCopied ? 'var(--accent-success)' : undefined,
                  }}
                >
                  {isPromptCopied ? 'Copied!' : 'Copy Prompt'}
                </Button>
              </Tooltip>
            </div>
            <div
              style={{
                maxHeight: '65px',
                overflowY: 'auto',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {activePv.prompt_text}
            </div>
          </div>
        )}

        {/* Sampling Parameters */}
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <Button type="button" variant="ghost" onClick={() => setIsRunBenchmarkModalOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isRunning || !selectedConfigId}
            icon={<Play size={13} />}
          >
            {isRunning ? 'Executing Live Run...' : 'Start Execution'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
