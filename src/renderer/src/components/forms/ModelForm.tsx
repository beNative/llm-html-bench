import React, { useState, useEffect } from 'react';
import { Model } from '@shared/types/entities';
import {
  PROVIDER_CATEGORIES,
  ARCHITECTURE_PRESETS,
  QUANTIZATION_CATEGORIES,
  CONTEXT_WINDOW_PILLS,
  MODEL_TEMPLATES,
  ModelPresetTemplate,
} from '../../../../shared/constants/modelPresets';
import { Button } from '../common/Button';
import {
  Cpu,
  Sparkles,
  Zap,
  RotateCw,
  Server,
  Brain,
} from 'lucide-react';

export interface ModelFormData {
  provider: string;
  modelName: string;
  displayName: string;
  modelVersion: string;
  modelFamily: string;
  parameterCount: string;
  architecture: string;
  quantization: string;
  localOrCloud: 'cloud' | 'local';
  contextWindow: string;
  isReasoningModel: boolean;
  notes: string;
  aaIntelligenceIndex?: number;
  aaEvaluationsJson?: string;
  aaModelId?: string;
}

interface ModelFormProps {
  initialData?: Partial<ModelFormData> | Model | null;
  onSubmit: (data: ModelFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export const ModelForm: React.FC<ModelFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save Model',
  isSubmitting = false,
}) => {
  const [provider, setProvider] = useState<string>('Anthropic');
  const [isCustomProvider, setIsCustomProvider] = useState<boolean>(false);
  const [customProviderText, setCustomProviderText] = useState<string>('');

  const [modelName, setModelName] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [modelVersion, setModelVersion] = useState<string>('');
  const [modelFamily, setModelFamily] = useState<string>('');
  const [parameterCount, setParameterCount] = useState<string>('');
  const [architecture, setArchitecture] = useState<string>('Transformer (Decoder-only Dense)');
  const [quantization, setQuantization] = useState<string>('None / Cloud Native');
  const [localOrCloud, setLocalOrCloud] = useState<'cloud' | 'local'>('cloud');
  const [contextWindow, setContextWindow] = useState<string>('200k');
  const [isReasoningModel, setIsReasoningModel] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Artificial Analysis State
  const [aaIntelligenceIndex, setAaIntelligenceIndex] = useState<number | undefined>(undefined);
  const [aaEvaluations, setAaEvaluations] = useState<any>(null);
  const [aaModelId, setAaModelId] = useState<string | undefined>(undefined);
  const [isFetchingAA, setIsFetchingAA] = useState<boolean>(false);
  const [aaMatchStatus, setAaMatchStatus] = useState<string | null>(null);

  // Local Server Model Discovery
  const [discoveredModels, setDiscoveredModels] = useState<Array<{ id: string; name: string }>>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  // Initialize form with initialData
  useEffect(() => {
    if (initialData) {
      const p = (initialData as any).provider || 'Anthropic';
      const allKnown = PROVIDER_CATEGORIES.flatMap((c) => c.providers);
      if (allKnown.includes(p)) {
        setProvider(p);
        setIsCustomProvider(false);
      } else {
        setIsCustomProvider(true);
        setCustomProviderText(p);
        setProvider('__custom__');
      }

      setModelName((initialData as any).model_name || (initialData as any).modelName || '');
      setDisplayName((initialData as any).display_name || (initialData as any).displayName || '');
      setModelVersion((initialData as any).model_version || (initialData as any).modelVersion || '');
      setModelFamily((initialData as any).model_family || (initialData as any).modelFamily || '');
      setParameterCount((initialData as any).parameter_count || (initialData as any).parameterCount || '');
      setArchitecture((initialData as any).architecture || 'Transformer (Decoder-only Dense)');
      setQuantization((initialData as any).quantization || 'None / Cloud Native');
      setLocalOrCloud(((initialData as any).local_or_cloud || (initialData as any).localOrCloud || 'cloud') as 'cloud' | 'local');
      setContextWindow((initialData as any).context_window || (initialData as any).contextWindow || '');
      setIsReasoningModel(
        Boolean((initialData as any).is_reasoning_model || (initialData as any).isReasoningModel)
      );
      setNotes((initialData as any).notes || '');
      setAaIntelligenceIndex((initialData as any).aa_intelligence_index || (initialData as any).aaIntelligenceIndex || undefined);
      setAaModelId((initialData as any).aa_model_id || (initialData as any).aaModelId || undefined);

      const rawEval = (initialData as any).aa_evaluations_json || (initialData as any).aaEvaluationsJson;
      if (rawEval) {
        try {
          setAaEvaluations(typeof rawEval === 'string' ? JSON.parse(rawEval) : rawEval);
        } catch {
          setAaEvaluations(null);
        }
      }
    }
  }, [initialData]);

  // Apply Preset Template
  const handleApplyPreset = (template: ModelPresetTemplate) => {
    const allKnown = PROVIDER_CATEGORIES.flatMap((c) => c.providers);
    if (allKnown.includes(template.provider)) {
      setProvider(template.provider);
      setIsCustomProvider(false);
    } else {
      setIsCustomProvider(true);
      setCustomProviderText(template.provider);
      setProvider('__custom__');
    }

    setModelName(template.modelName);
    setDisplayName(template.displayName);
    setModelFamily(template.modelFamily);
    setParameterCount(template.parameterCount);
    setArchitecture(template.architecture);
    setQuantization(template.quantization);
    setLocalOrCloud(template.localOrCloud);
    setContextWindow(template.contextWindow);
    setIsReasoningModel(template.isReasoningModel);
    setNotes(template.notes);
    setAaIntelligenceIndex(template.aaIntelligenceIndex);
    setAaModelId(template.aaModelId);
    setAaEvaluations(template.aaEvaluations || null);
    setAaMatchStatus(`Loaded specs & benchmarks from ${template.name}`);
  };

  // Provider change handler
  const handleProviderChange = (val: string) => {
    if (val === '__custom__') {
      setIsCustomProvider(true);
      setProvider('__custom__');
    } else {
      setIsCustomProvider(false);
      setProvider(val);
      // Auto adjust cloud vs local
      const localProviders = ['Ollama', 'LM Studio', 'vLLM', 'SGLang', 'LocalAI', 'llama.cpp', 'Jan', 'Local / Self-Hosted'];
      if (localProviders.includes(val)) {
        setLocalOrCloud('local');
      } else {
        setLocalOrCloud('cloud');
      }
    }
  };

  const getEffectiveProvider = () => {
    return isCustomProvider ? customProviderText.trim() || 'Custom' : provider;
  };

  // Fetch / Match Artificial Analysis Benchmarks
  const handleFetchArtificialAnalysis = async () => {
    const effectiveModel = modelName.trim() || displayName.trim();
    if (!effectiveModel) {
      setAaMatchStatus('Please enter a model name or identifier first.');
      return;
    }

    setIsFetchingAA(true);
    setAaMatchStatus(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.fetchModelBenchmarks(effectiveModel, getEffectiveProvider());
        if (res.success && res.benchmark) {
          const b = res.benchmark;
          setAaIntelligenceIndex(b.intelligenceIndex);
          setAaModelId(b.modelId);
          setAaEvaluations(b.evaluations || null);
          if (b.contextWindow && !contextWindow) {
            setContextWindow(b.contextWindow);
          }
          setAaMatchStatus(`Matched with Artificial Analysis: ${b.name}`);
        } else {
          setAaMatchStatus('No direct Artificial Analysis benchmark match found for this model name.');
        }
      }
    } catch (err: any) {
      setAaMatchStatus(`Benchmark query error: ${err.message}`);
    } finally {
      setIsFetchingAA(false);
    }
  };

  // Auto-discover from local endpoints
  const handleDiscoverFromLocalServer = async () => {
    setIsDiscovering(true);
    try {
      if (window.electronAPI) {
        const configs = await window.electronAPI.getProviderConfigs();
        const activeLocal = configs.find((c) => c.enabled && (c.name.toLowerCase().includes('ollama') || c.name.toLowerCase().includes('lm studio') || c.name.toLowerCase().includes('vllm') || c.baseUrl.includes('localhost') || c.baseUrl.includes('127.0.0.1')));
        if (activeLocal) {
          const res = await window.electronAPI.fetchProviderModels(activeLocal);
          if (res.success && res.models && res.models.length > 0) {
            setDiscoveredModels(res.models);
          }
        }
      }
    } catch (err) {
      console.warn('Local discovery error:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveProv = getEffectiveProvider();
    onSubmit({
      provider: effectiveProv,
      modelName: modelName.trim(),
      displayName: displayName.trim() || `${effectiveProv} ${modelName.trim()}`,
      modelVersion: modelVersion.trim(),
      modelFamily: modelFamily.trim(),
      parameterCount: parameterCount.trim(),
      architecture: architecture.trim(),
      quantization: quantization.trim(),
      localOrCloud,
      contextWindow: contextWindow.trim(),
      isReasoningModel,
      notes: notes.trim(),
      aaIntelligenceIndex,
      aaEvaluationsJson: aaEvaluations ? JSON.stringify(aaEvaluations) : undefined,
      aaModelId,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Banner: 1-Click Model Preset Templates */}
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="var(--accent-primary)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            1-Click Model Preset:
          </span>
        </div>

        <select
          onChange={(e) => {
            const template = MODEL_TEMPLATES.find((t) => t.id === e.target.value);
            if (template) handleApplyPreset(template);
          }}
          defaultValue=""
          style={{
            flex: 1,
            minWidth: '240px',
            maxWidth: '420px',
            padding: '5px 8px',
            fontSize: '11px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
          }}
        >
          <option value="" disabled>
            ⚡ Select a recent 2025/2026 model to autofill specs...
          </option>
          {Array.from(new Set(MODEL_TEMPLATES.map((t) => t.categoryTag || 'Other'))).map((cat) => (
            <optgroup key={cat} label={`── ${cat} ──`}>
              {MODEL_TEMPLATES.filter((t) => (t.categoryTag || 'Other') === cat).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} [{t.parameterCount}]
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Live Preview Card */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              flexShrink: 0,
            }}
          >
            {isReasoningModel ? <Brain size={18} /> : <Cpu size={18} />}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {displayName.trim() || `${getEffectiveProvider()} ${modelName.trim() || 'Model Identifier'}`}
              </span>
              {isReasoningModel && (
                <span className="badge" style={{ fontSize: '9px', backgroundColor: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                  🧠 Reasoning CoT
                </span>
              )}
              <span className="badge" style={{ fontSize: '9px' }}>
                {localOrCloud === 'local' ? '🖥️ Local' : '☁️ Cloud'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
              <span>{getEffectiveProvider()}</span>
              {parameterCount && <span>• {parameterCount}</span>}
              {quantization && quantization !== 'None / Cloud Native' && <span>• {quantization}</span>}
              {contextWindow && <span>• {contextWindow} ctx</span>}
            </div>
          </div>
        </div>

        {aaIntelligenceIndex && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              AA Intelligence Index
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {aaIntelligenceIndex.toFixed(1)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
          </div>
        )}
      </div>

      {/* Row 1: Provider & Deployment Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Provider / Organization *
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <select
              value={isCustomProvider ? '__custom__' : provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {PROVIDER_CATEGORIES.map((cat) => (
                <optgroup key={cat.category} label={cat.category}>
                  {cat.providers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__custom__">✏️ Custom Provider...</option>
            </select>
          </div>

          {isCustomProvider && (
            <input
              type="text"
              placeholder="Enter custom provider name..."
              value={customProviderText}
              onChange={(e) => setCustomProviderText(e.target.value)}
              required
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '5px 8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
              }}
            />
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Deployment Type
          </label>
          <select
            value={localOrCloud}
            onChange={(e) => setLocalOrCloud(e.target.value as 'cloud' | 'local')}
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
            <option value="cloud">☁️ Cloud API (Hosted)</option>
            <option value="local">🖥️ Local Inference (Ollama / LM Studio / vLLM)</option>
          </select>
        </div>
      </div>

      {/* Row 2: Model Identifier & Display Name */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Model Identifier / API String *
            </label>
            {discoveredModels.length === 0 && (
              <button
                type="button"
                onClick={handleDiscoverFromLocalServer}
                disabled={isDiscovering}
                style={{
                  fontSize: '10px',
                  color: 'var(--accent-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Server size={10} />
                {isDiscovering ? 'Detecting...' : 'Detect Local Server'}
              </button>
            )}
          </div>

          {discoveredModels.length > 0 ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                onChange={(e) => setModelName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                }}
              >
                <option value="">Select running local model...</option>
                {discoveredModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={() => setDiscoveredModels([])}>
                Manual
              </Button>
            </div>
          ) : (
            <input
              type="text"
              placeholder="e.g. qwen2.5-coder:32b, gpt-4o, claude-3-7-sonnet-20250219"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
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
            />
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Display Name (UI Label)
          </label>
          <input
            type="text"
            placeholder={modelName ? `${getEffectiveProvider()} ${modelName}` : 'e.g. Claude 3.7 Sonnet'}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
            }}
          />
        </div>
      </div>

      {/* Row 3: Architecture & Quantization */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Model Architecture
          </label>
          <select
            value={architecture}
            onChange={(e) => setArchitecture(e.target.value)}
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
            {ARCHITECTURE_PRESETS.map((arch) => (
              <option key={arch.label} value={arch.label}>
                {arch.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Quantization / Precision
          </label>
          <select
            value={quantization}
            onChange={(e) => setQuantization(e.target.value)}
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
            {QUANTIZATION_CATEGORIES.map((cat) => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.options.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4: Parameter Scale & Context Window with quick-select pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Parameter Scale
          </label>
          <input
            type="text"
            placeholder="e.g. 7B, 27B, 70B, MoE 671B"
            value={parameterCount}
            onChange={(e) => setParameterCount(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              marginBottom: '6px',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {['7B', '8B', '14B', '27B', '32B', '70B', 'MoE', 'Proprietary'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setParameterCount(p)}
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: parameterCount === p ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                  color: parameterCount === p ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${parameterCount === p ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Context Window & Reasoning
          </label>
          <input
            type="text"
            placeholder="e.g. 32k, 128k, 200k, 1M"
            value={contextWindow}
            onChange={(e) => setContextWindow(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              marginBottom: '6px',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {CONTEXT_WINDOW_PILLS.slice(2).map((cw) => (
              <button
                key={cw}
                type="button"
                onClick={() => setContextWindow(cw)}
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: contextWindow === cw ? 'var(--accent-primary-light)' : 'var(--bg-tertiary)',
                  color: contextWindow === cw ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${contextWindow === cw ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}
              >
                {cw}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reasoning Model Checkbox Card */}
      <div
        onClick={() => setIsReasoningModel(!isReasoningModel)}
        style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: isReasoningModel ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-secondary)',
          border: `1px solid ${isReasoningModel ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-color)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={isReasoningModel}
          onChange={(e) => setIsReasoningModel(e.target.checked)}
          style={{ accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
        />
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            🧠 Reasoning / Thinking Model (Chain-of-Thought)
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Enable this flag for reasoning-focused models (e.g. DeepSeek R1, OpenAI o1/o3, QwQ) to distinguish them on leaderboards.
          </div>
        </div>
      </div>

      {/* Artificial Analysis Benchmark Section */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="var(--accent-warning)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Artificial Analysis Benchmark Intelligence
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<RotateCw size={12} className={isFetchingAA ? 'animate-spin' : ''} />}
            onClick={handleFetchArtificialAnalysis}
            disabled={isFetchingAA}
          >
            {isFetchingAA ? 'Matching...' : 'Fetch / Match Stats'}
          </Button>
        </div>

        {aaMatchStatus && (
          <div style={{ fontSize: '11px', color: aaIntelligenceIndex ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
            {aaMatchStatus}
          </div>
        )}

        {/* Benchmark Metric Badges */}
        {aaIntelligenceIndex ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '4px' }}>
            <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Intelligence Index</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {aaIntelligenceIndex.toFixed(1)} / 100
              </div>
            </div>

            {aaEvaluations?.throughputTokSec && (
              <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Throughput Speed</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-success)' }}>
                  {Math.round(aaEvaluations.throughputTokSec)} tok/s
                </div>
              </div>
            )}

            {aaEvaluations?.priceOutputPer1M !== undefined && (
              <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pricing (In / Out)</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ${aaEvaluations.priceInputPer1M ?? 0} / ${aaEvaluations.priceOutputPer1M}
                </div>
              </div>
            )}

            {aaEvaluations?.coding && (
              <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Coding Benchmark</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  {aaEvaluations.coding}%
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Matches with independent Artificial Analysis metrics (Intelligence Index, measured generation throughput, and token pricing).
          </div>
        )}
      </div>

      {/* Row 5: Notes & Metadata */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Notes & Deployment Specifications
        </label>
        <textarea
          rows={2}
          placeholder="Hardware configuration, system prompts, specific model strengths..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Form Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '12px',
          marginTop: '4px',
        }}
      >
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" icon={<Cpu size={14} />} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};
