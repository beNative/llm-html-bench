import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Prompt, Collection } from '@shared/types/entities';
import { DEFAULT_CATEGORIES } from '@shared/constants/defaults';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Save, Plus, X, Tag } from 'lucide-react';

interface EditPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt | null;
  onUpdated: (updated: Prompt) => void;
}

export const EditPromptModal: React.FC<EditPromptModalProps> = ({
  isOpen,
  onClose,
  prompt,
  onUpdated,
}) => {
  const { collections, showToast } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (prompt && isOpen) {
      setName(prompt.name || '');
      if (DEFAULT_CATEGORIES.includes(prompt.category as any)) {
        setCategory(prompt.category);
        setCustomCategory('');
      } else {
        setCategory('Custom');
        setCustomCategory(prompt.category || '');
      }
      setDescription(prompt.description || '');
      setTags(prompt.tags?.map((t) => t.name) || []);
      setSelectedCollectionIds(prompt.collections?.map((c) => c.id) || []);
    }
  }, [prompt, isOpen]);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setTags(tags.filter((t) => t !== tagName));
  };

  const handleToggleCollection = (colId: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !name.trim()) return;

    const finalCategory = category === 'Custom' ? customCategory.trim() || 'General' : category;

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        const updated = await window.electronAPI.updatePrompt({
          id: prompt.id,
          name: name.trim(),
          category: finalCategory,
          description: description.trim() || undefined,
          tags,
          collectionIds: selectedCollectionIds,
        });

        showToast(`Prompt "${updated.name}" updated successfully!`, 'success');
        onUpdated(updated);
        onClose();
      }
    } catch (err: unknown) {
      showToast(`Failed to update prompt: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!prompt) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Prompt: ${prompt.name}`}
      subtitle="Update benchmark prompt metadata, category, tags, and suite collections"
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Prompt Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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

        {/* Category */}
        <div style={{ display: 'grid', gridTemplateColumns: category === 'Custom' ? '1fr 1fr' : '1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Category
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
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Custom">+ Custom Category...</option>
            </select>
          </div>

          {category === 'Custom' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Custom Category Name
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. 3D WebGL"
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
          )}
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Description
          </label>
          <textarea
            rows={2}
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
              resize: 'vertical',
            }}
          />
        </div>

        {/* Tags */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Tags
          </label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Tag size={12} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Add a tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 26px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                }}
              />
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={handleAddTag}>
              <Plus size={12} /> Add
            </Button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tags.map((t) => (
              <span
                key={t}
                className="badge"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}
              >
                #{t}
                <X
                  size={11}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleRemoveTag(t)}
                />
              </span>
            ))}
          </div>
        </div>

        {/* Suites / Collections */}
        {collections.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Assign to Benchmark Suites
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                backgroundColor: 'var(--bg-primary)',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                maxHeight: '110px',
                overflowY: 'auto',
              }}
            >
              {collections.map((col: Collection) => {
                const checked = selectedCollectionIds.includes(col.id);
                return (
                  <label
                    key={col.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleCollection(col.id)}
                    />
                    <span>📁 {col.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '12px',
          }}
        >
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={<Save size={13} />} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
