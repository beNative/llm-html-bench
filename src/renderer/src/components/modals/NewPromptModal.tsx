import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DEFAULT_CATEGORIES } from '@shared/constants/defaults';
import { MonacoCodeEditor } from '../editor/MonacoCodeEditor';
import { Plus } from 'lucide-react';

export const NewPromptModal: React.FC = () => {
  const {
    isNewPromptModalOpen,
    setIsNewPromptModalOpen,
    collections,
    refreshCollectionsAndTags,
    setSelectedPromptId,
    showToast,
  } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedColIds, setSelectedColIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a prompt name', 'error');
      return;
    }
    if (!promptText.trim()) {
      showToast('Please enter the benchmark prompt text', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        const tags = tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        const prompt = await window.electronAPI.createPrompt({
          name: name.trim(),
          category,
          description: description.trim() || undefined,
          promptText: promptText.trim(),
          tags,
          collectionIds: selectedColIds,
        });

        await refreshCollectionsAndTags();
        setSelectedPromptId(prompt.id);
        showToast(`Created prompt "${prompt.name}" (Version 1)`, 'success');
        setIsNewPromptModalOpen(false);

        // Reset
        setName('');
        setDescription('');
        setPromptText('');
        setTagsInput('');
        setSelectedColIds([]);
      }
    } catch (err: unknown) {
      showToast(`Failed to create prompt: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isNewPromptModalOpen}
      onClose={() => setIsNewPromptModalOpen(false)}
      title="Create Benchmark Prompt"
      subtitle="Define an HTML generation task to test models over time"
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Prompt Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Interactive 3D Solar System, Financial Dashboard, Pong Game"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              {DEFAULT_CATEGORIES.map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Description (Optional)
          </label>
          <input
            type="text"
            placeholder="Short explanation of requirements and evaluation criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            Prompt Text (Version 1) *
          </label>
          <div style={{ height: '200px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <MonacoCodeEditor
              value={promptText}
              onChange={setPromptText}
              language="markdown"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="3D, WebGL, single-file, game, canvas"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
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
            <div className="field-hint">
              <span>Separate tags with commas to categorize tasks</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Collections / Benchmark Suites
            </label>
            <select
              multiple
              value={selectedColIds}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                setSelectedColIds(opts);
              }}
              style={{
                width: '100%',
                height: '60px',
                padding: '4px 6px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
              }}
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
            <div className="field-hint">
              <span>Hold <kbd className="keycap">Ctrl</kbd> to select multiple suites</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
          <Button type="button" variant="ghost" onClick={() => setIsNewPromptModalOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} icon={<Plus size={14} />}>
            {isSubmitting ? 'Creating...' : 'Create Prompt (v1)'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
