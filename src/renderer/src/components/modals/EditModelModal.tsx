import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Model } from '@shared/types/entities';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Save } from 'lucide-react';

const COMMON_PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral', 'Ollama', 'LM Studio', 'vLLM', 'Local', 'DeepSeek', 'xAI', 'Cohere'];

interface EditModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: Model | null;
  onUpdated: (updated: Model) => void;
}

export const EditModelModal: React.FC<EditModelModalProps> = ({
  isOpen,
  onClose,
  model,
  onUpdated,
}) => {
  const { refreshModels, showToast } = useApp();

  const [provider, setProvider] = useState('OpenAI');
  const [modelName, setModelName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [modelFamily, setModelFamily] = useState('');
  const [parameterCount, setParameterCount] = useState('');
  const [architecture, setArchitecture] = useState('');
  const [quantization, setQuantization] = useState('');
  const [localOrCloud, setLocalOrCloud] = useState<'cloud' | 'local'>('cloud');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (model && isOpen) {
      setProvider(model.provider || 'OpenAI');
      setModelName(model.model_name || '');
      setDisplayName(model.display_name || '');
      setModelFamily(model.model_family || '');
      setParameterCount(model.parameter_count || '');
      setArchitecture(model.architecture || '');
      setQuantization(model.quantization || '');
      setLocalOrCloud((model.local_or_cloud as 'cloud' | 'local') || 'cloud');
      setNotes(model.notes || '');
    }
  }, [model, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !modelName.trim()) return;

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        const updated = await window.electronAPI.updateModel(model.id, {
          provider: provider.trim(),
          modelName: modelName.trim(),
          displayName: displayName.trim() || `${provider} ${modelName}`,
          modelFamily: modelFamily.trim() || undefined,
          parameterCount: parameterCount.trim() || undefined,
          architecture: architecture.trim() || undefined,
          quantization: quantization.trim() || undefined,
          localOrCloud,
          notes: notes.trim() || undefined,
        });

        await refreshModels();
        showToast(`Model "${updated.display_name}" updated successfully!`, 'success');
        onUpdated(updated);
        onClose();
      }
    } catch (err: unknown) {
      showToast(`Failed to update model: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!model) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Model: ${model.display_name}`}
      subtitle="Update model provider, parameter count, architecture, quantization, and metadata"
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Provider & Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Provider *
            </label>
            <input
              type="text"
              required
              list="providers-list-edit"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
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
            <datalist id="providers-list-edit">
              {COMMON_PROVIDERS.map((p: string) => (
                <option key={p} value={p} />
              ))}
            </datalist>
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
              <option value="cloud">Cloud API</option>
              <option value="local">Local Inference (Ollama/LM Studio/vLLM)</option>
            </select>
          </div>
        </div>

        {/* Model Identifier & Display Name */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Model Identifier / API String *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. gpt-4o, claude-3-5-sonnet"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
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
              Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. OpenAI GPT-4o"
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

        {/* Family & Parameters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Model Family
            </label>
            <input
              type="text"
              placeholder="e.g. GPT-4, Llama 3, Claude 3.5"
              value={modelFamily}
              onChange={(e) => setModelFamily(e.target.value)}
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
              Parameter Count
            </label>
            <input
              type="text"
              placeholder="e.g. 70B, 8x22B, 27B"
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
              }}
            />
          </div>
        </div>

        {/* Architecture & Quantization */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Architecture
            </label>
            <input
              type="text"
              placeholder="e.g. Dense Transformer, MoE"
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
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Quantization
            </label>
            <input
              type="text"
              placeholder="e.g. FP16, Q4_K_M, FP8"
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
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Notes / Deployment Details
          </label>
          <textarea
            rows={2}
            placeholder="Additional details about hardware, context windows, API tier..."
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

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={<Save size={13} />} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Model'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
