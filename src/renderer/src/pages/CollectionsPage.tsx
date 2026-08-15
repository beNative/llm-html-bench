import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Collection, Prompt } from '@shared/types/entities';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

export const CollectionsPage: React.FC = () => {
  const {
    collections,
    refreshCollectionsAndTags,
    setSelectedPromptId,
    setCurrentTab,
    showToast,
  } = useApp();

  const [selectedCol, setSelectedCol] = useState<Collection | null>(null);
  const [colPrompts, setColPrompts] = useState<Prompt[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [newColName, setNewColName] = useState<string>('');
  const [newColDesc, setNewColDesc] = useState<string>('');
  const [editColName, setEditColName] = useState<string>('');
  const [editColDesc, setEditColDesc] = useState<string>('');

  useEffect(() => {
    if (collections.length > 0) {
      if (!selectedCol || !collections.some((c) => c.id === selectedCol.id)) {
        setSelectedCol(collections[0]);
      }
    } else {
      setSelectedCol(null);
    }
  }, [collections, selectedCol]);

  const loadColPrompts = async () => {
    if (selectedCol && window.electronAPI) {
      const pList = await window.electronAPI.getPrompts({ collectionId: selectedCol.id });
      setColPrompts(pList);
    } else {
      setColPrompts([]);
    }
  };

  useEffect(() => {
    loadColPrompts();
    if (selectedCol) {
      setEditColName(selectedCol.name);
      setEditColDesc(selectedCol.description || '');
    }
  }, [selectedCol?.id]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      if (window.electronAPI) {
        const created = await window.electronAPI.createCollection(newColName.trim(), newColDesc.trim() || undefined);
        await refreshCollectionsAndTags();
        setSelectedCol(created);
        showToast(`Collection "${created.name}" created!`, 'success');
        setIsCreateModalOpen(false);
        setNewColName('');
        setNewColDesc('');
      }
    } catch (err: unknown) {
      showToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleUpdateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCol || !editColName.trim()) return;

    try {
      if (window.electronAPI) {
        const updated = await window.electronAPI.updateCollection(
          selectedCol.id,
          editColName.trim(),
          editColDesc.trim() || undefined
        );
        await refreshCollectionsAndTags();
        setSelectedCol(updated);
        showToast(`Suite "${updated.name}" updated!`, 'success');
        setIsEditModalOpen(false);
      }
    } catch (err: unknown) {
      showToast(`Failed to update suite: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleDeleteCollection = async () => {
    if (!selectedCol || !window.electronAPI) return;
    try {
      await window.electronAPI.deleteCollection(selectedCol.id);
      showToast(`Suite "${selectedCol.name}" deleted!`, 'info');
      setIsDeleteModalOpen(false);
      setSelectedCol(null);
      await refreshCollectionsAndTags();
    } catch (err: unknown) {
      showToast(`Failed to delete suite: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleRemovePrompt = async (promptId: string) => {
    if (!selectedCol || !window.electronAPI) return;
    try {
      await window.electronAPI.removePromptFromCollection(promptId, selectedCol.id);
      showToast('Prompt removed from suite', 'info');
      await loadColPrompts();
      await refreshCollectionsAndTags();
    } catch (err: unknown) {
      showToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar: Collections List */}
      <div
        style={{
          width: '300px',
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
            Benchmark Suites ({collections.length})
          </span>
          <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setIsCreateModalOpen(true)}>
            New Suite
          </Button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {collections.map((col) => {
            const isSelected = selectedCol?.id === col.id;
            return (
              <div
                key={col.id}
                onClick={() => setSelectedCol(col)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  marginBottom: '4px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '12px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                  📁 {col.name}
                </div>
                {col.description && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {col.description}
                  </div>
                )}
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {col.prompt_count || 0} benchmark prompt{col.prompt_count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Area: Suite Prompts */}
      {selectedCol ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '20px' }}>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <h1 className="h1">📁 {selectedCol.name}</h1>
              {selectedCol.description && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedCol.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                size="sm"
                variant="secondary"
                icon={<Edit2 size={13} />}
                onClick={() => {
                  setEditColName(selectedCol.name);
                  setEditColDesc(selectedCol.description || '');
                  setIsEditModalOpen(true);
                }}
                title="Edit suite name and description"
              >
                Edit Suite
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={13} />}
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete this benchmark suite"
              >
                Delete Suite
              </Button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '13px' }}>
              Prompts in this Suite ({colPrompts.length})
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 14px' }}>Prompt</th>
                  <th style={{ padding: '8px 14px' }}>Category</th>
                  <th style={{ padding: '8px 14px' }}>Total Runs</th>
                  <th style={{ padding: '8px 14px' }}>Last Tested</th>
                  <th style={{ padding: '8px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {colPrompts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No prompts added to this collection yet. You can assign collections when creating or editing prompts.
                    </td>
                  </tr>
                ) : (
                  colPrompts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="badge">{p.category}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {p.run_count || 0}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        {p.last_tested_at ? new Date(p.last_tested_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPromptId(p.id);
                              setCurrentTab('prompts');
                            }}
                          >
                            Open Prompt →
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<X size={12} color="var(--text-muted)" />}
                            onClick={() => handleRemovePrompt(p.id)}
                            title="Remove prompt from this suite"
                          />
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

      {/* New Collection Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Benchmark Suite Collection"
        subtitle="Group related HTML generation prompts into suites (e.g. 3D/WebGL, Games, Dashboards)"
      >
        <form onSubmit={handleCreateCollection} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Collection Name *
            </label>
            <input
              type="text"
              placeholder="e.g. 3D / WebGL Laboratory, UI Components"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
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
              Description
            </label>
            <input
              type="text"
              placeholder="Description of the benchmark scope and evaluation goals..."
              value={newColDesc}
              onChange={(e) => setNewColDesc(e.target.value)}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Plus size={14} />}>
              Create Suite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Collection Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Benchmark Suite: ${selectedCol?.name}`}
        subtitle="Update suite name and description"
      >
        <form onSubmit={handleUpdateCollection} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Collection Name *
            </label>
            <input
              type="text"
              value={editColName}
              onChange={(e) => setEditColName(e.target.value)}
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
              Description
            </label>
            <input
              type="text"
              value={editColDesc}
              onChange={(e) => setEditColDesc(e.target.value)}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Save size={14} />}>
              Save Suite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Suite Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCollection}
        title={`Delete Suite "${selectedCol?.name}"?`}
        message="Are you sure you want to delete this benchmark suite? Prompts within this suite will NOT be deleted, only the collection grouping will be removed."
        confirmLabel="Delete Suite"
        confirmVariant="danger"
      />
    </div>
  );
};
