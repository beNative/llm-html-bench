import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Cpu } from 'lucide-react';

export const NewModelModal: React.FC = () => {
  const {
    isNewModelModalOpen,
    setIsNewModelModalOpen,
    showToast,
    refreshModels,
    setSelectedModelId,
  } = useApp();

  const [provider, setProvider] = useState('OpenAI');
  const [modelName, setModelName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [modelVersion, setModelVersion] = useState('');
  const [modelFamily, setModelFamily] = useState('');
  const [parameterCount, setParameterCount] = useState('');
  const [architecture, setArchitecture] = useState('');
  const [quantization, setQuantization] = useState('');
  const [localOrCloud, setLocalOrCloud] = useState<'cloud' | 'local'>('cloud');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider.trim() || !modelName.trim()) {
      showToast('Please provide Provider and Model Name', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        const created = await window.electronAPI.createModel({
          provider: provider.trim(),
          modelName: modelName.trim(),
          displayName: displayName.trim() || `${provider.trim()} ${modelName.trim()}`,
          modelVersion: modelVersion.trim() || undefined,
          modelFamily: modelFamily.trim() || undefined,
          parameterCount: parameterCount.trim() || undefined,
          architecture: architecture.trim() || undefined,
          quantization: quantization.trim() || undefined,
          localOrCloud,
          notes: notes.trim() || undefined,
        });

        await refreshModels();
        setSelectedModelId(created.id);
        showToast(`Model "${created.display_name}" registered!`, 'success');
        setIsNewModelModalOpen(false);

        // Reset
        setModelName('');
        setDisplayName('');
        setModelVersion('');
        setModelFamily('');
        setParameterCount('');
        setArchitecture('');
        setQuantization('');
        setNotes('');
      }
    } catch (err: unknown) {
      showToast(`Failed to register model: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isNewModelModalOpen}
      onClose={() => setIsNewModelModalOpen(false)}
      title="Register New Model"
      subtitle="Track benchmarks across specific model releases, parameter scales, and quantizations"
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Provider / Organization *
            </label>
            <input
              type="text"
              placeholder="e.g. Alibaba, OpenAI, Anthropic, Google, DeepSeek, Meta, Local"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              required
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

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Model Identifier / Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Qwen3.8-27B, gpt-5.6, claude-3-7-sonnet"
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
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder={modelName ? `${provider} ${modelName}` : 'Custom display label'}
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

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Deployment Type
            </label>
            <select
              value={localOrCloud}
              onChange={(e) => setLocalOrCloud(e.target.value as 'local' | 'cloud')}
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
              <option value="cloud">Cloud API</option>
              <option value="local">Local Inference</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              Model Family:
            </label>
            <input
              type="text"
              placeholder="e.g. Qwen3.8, GPT-5, Claude 3.7"
              value={modelFamily}
              onChange={(e) => setModelFamily(e.target.value)}
              style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              Parameters:
            </label>
            <input
              type="text"
              placeholder="e.g. 27B, 70B, MoE"
              value={parameterCount}
              onChange={(e) => setParameterCount(e.target.value)}
              style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              Quantization:
            </label>
            <input
              type="text"
              placeholder="e.g. FP16, Q4_K_M, NVFP4"
              value={quantization}
              onChange={(e) => setQuantization(e.target.value)}
              style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
            Notes / Architecture Details:
          </label>
          <input
            type="text"
            placeholder="e.g. Context window size, specialized reasoning tuning, GPU backend..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <Button type="button" variant="ghost" onClick={() => setIsNewModelModalOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} icon={<Cpu size={14} />}>
            {isSubmitting ? 'Registering...' : 'Register Model'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
