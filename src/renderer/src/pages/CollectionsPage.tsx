import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Collection, Prompt } from '@shared/types/entities';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Plus } from 'lucide-react';

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
  const [newColName, setNewColName] = useState<string>('');
  const [newColDesc, setNewColDesc] = useState<string>('');

  useEffect(() => {
    if (collections.length > 0 && !selectedCol) {
      setSelectedCol(collections[0]);
    }
  }, [collections, selectedCol]);

  useEffect(() => {
    if (selectedCol && window.electronAPI) {
      window.electronAPI.getPrompts({ collectionId: selectedCol.id }).then((pList) => {
        setColPrompts(pList);
      });
    }
  }, [selectedCol]);

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
            }}
          >
            <h1 className="h1">📁 {selectedCol.name}</h1>
            {selectedCol.description && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {selectedCol.description}
              </p>
            )}
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
    </div>
  );
};
