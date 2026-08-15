import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Prompt, PromptVersion, ModelRun, HeadToHeadComparison, Tag, Collection } from '@shared/types/entities';
import { DEFAULT_CATEGORIES } from '@shared/constants/defaults';
import { Button } from '../components/common/Button';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { MonacoCodeEditor } from '../components/editor/MonacoCodeEditor';
import {
  Search,
  Plus,
  Columns,
  History,
  Archive,
  Star,
  FileCode,
  Trophy,
} from 'lucide-react';

export const PromptsPage: React.FC = () => {
  const {
    selectedPromptId,
    setSelectedPromptId,
    setIsNewPromptModalOpen,
    openAddOutputModal,
    compareRunIds,
    toggleCompareRunId,
    openCompareWithRuns,
    showToast,
  } = useApp();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'runs' | 'editor' | 'h2h'>('runs');

  // Runs for selected prompt
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [h2hComparisons, setH2hComparisons] = useState<HeadToHeadComparison[]>([]);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'last_tested' | 'run_count'>('last_tested');

  // Prompt Editing State
  const [editedPromptText, setEditedPromptText] = useState<string>('');
  const [versionNotes, setVersionNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const loadPrompts = async () => {
    try {
      if (window.electronAPI) {
        const list = await window.electronAPI.getPrompts({
          search: searchTerm || undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          sortBy,
          sortOrder: sortBy === 'name' ? 'asc' : 'desc',
        });
        setPrompts(list);

        if (list.length > 0) {
          if (!selectedPromptId || !list.some((p) => p.id === selectedPromptId)) {
            setSelectedPromptId(list[0].id);
          }
        } else {
          setActivePrompt(null);
        }
      }
    } catch (err) {
      console.error('Failed to load prompts:', err);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [searchTerm, selectedCategory, sortBy, selectedPromptId]);

  // When selectedPromptId changes, load prompt details, versions, runs
  useEffect(() => {
    if (!selectedPromptId || !window.electronAPI) return;

    window.electronAPI.getPromptById(selectedPromptId).then((p) => {
      setActivePrompt(p);
      if (p) {
        window.electronAPI.getPromptVersions(p.id).then((versions) => {
          setPromptVersions(versions);
          if (versions.length > 0) {
            setSelectedVersionId(versions[0].id);
            setEditedPromptText(versions[0].prompt_text);
          }
        });

        window.electronAPI.getRunsForPrompt(p.id).then((rList) => {
          setRuns(rList);
        });

        window.electronAPI.getComparisonsForPrompt().then((cList) => {
          setH2hComparisons(cList.filter((c) => c.prompt_name === p.name));
        });
      }
    });
  }, [selectedPromptId]);

  // When version selection changes in prompt editor
  const handleVersionChange = (versionId: string) => {
    setSelectedVersionId(versionId);
    const found = promptVersions.find((v) => v.id === versionId);
    if (found) {
      setEditedPromptText(found.prompt_text);
    }
  };

  const handleSaveNewVersion = async () => {
    if (!activePrompt || !editedPromptText.trim()) return;
    setIsSaving(true);
    try {
      if (window.electronAPI) {
        const newVer = await window.electronAPI.createPromptVersion({
          promptId: activePrompt.id,
          promptText: editedPromptText.trim(),
          notes: versionNotes.trim() || undefined,
        });

        showToast(`Saved new Prompt Version ${newVer.version}!`, 'success');
        setVersionNotes('');
        // Reload versions
        const versions = await window.electronAPI.getPromptVersions(activePrompt.id);
        setPromptVersions(versions);
        setSelectedVersionId(newVer.id);
        loadPrompts();
      }
    } catch (err: unknown) {
      showToast(`Failed to save version: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!activePrompt || !window.electronAPI) return;
    const nextArchived = activePrompt.archived === 0;
    await window.electronAPI.archivePrompt(activePrompt.id, nextArchived);
    showToast(nextArchived ? 'Prompt archived' : 'Prompt restored', 'info');
    loadPrompts();
  };

  const currentVersionObj = promptVersions.find((v) => v.id === selectedVersionId);

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left Sidebar: Prompt Library Browser */}
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
        {/* Search & Action Bar */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Prompts ({prompts.length})</span>
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setIsNewPromptModalOpen(true)}>
              New
            </Button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search prompts, tags, text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Category & Sort controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '3px 6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
              }}
            >
              <option value="All">All Categories</option>
              {DEFAULT_CATEGORIES.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at' | 'last_tested' | 'run_count')}
              style={{
                padding: '3px 6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
              }}
            >
              <option value="last_tested">Sort: Last Tested</option>
              <option value="run_count">Sort: Most Runs</option>
              <option value="name">Sort: Name</option>
              <option value="created_at">Sort: Created Date</option>
            </select>
          </div>
        </div>

        {/* Prompt List Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {prompts.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
              No prompts match filter.
            </div>
          ) : (
            prompts.map((p) => {
              const isSelected = p.id === selectedPromptId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPromptId(p.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                    marginBottom: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {p.name}
                    </span>
                    <span className="badge">{p.category}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>
                      {p.run_count || 0} run{p.run_count !== 1 ? 's' : ''} • v{p.version_count || 1}
                    </span>
                    {p.last_tested_at && (
                      <span>Tested {new Date(p.last_tested_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Workspace: Prompt Detail, Runs, Version History & Editor */}
      {activePrompt ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Prompt Header */}
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="h1">{activePrompt.name}</h1>
                <span className="badge badge-primary">{activePrompt.category}</span>
                {activePrompt.archived === 1 && <span className="badge badge-warning">Archived</span>}
              </div>
              {activePrompt.description && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {activePrompt.description}
                </p>
              )}

              {/* Tags & Collections */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {activePrompt.tags?.map((t: Tag) => (
                  <span key={t.id} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    #{t.name}
                  </span>
                ))}
                {activePrompt.collections?.map((c: Collection) => (
                  <span key={c.id} className="badge badge-purple">
                    📁 {c.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Prompt Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                size="sm"
                variant="primary"
                icon={<Plus size={13} />}
                onClick={() => openAddOutputModal(activePrompt.id, selectedVersionId)}
                title="Add Model Output for this prompt"
              >
                Add Output
              </Button>

              <Button
                size="sm"
                variant="secondary"
                icon={<Archive size={13} />}
                onClick={handleArchive}
                title={activePrompt.archived ? 'Restore Prompt' : 'Archive Prompt'}
              >
                {activePrompt.archived ? 'Restore' : 'Archive'}
              </Button>
            </div>
          </div>

          {/* Navigation Tabs (Benchmark History, Prompt Editor, Head-to-Head) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              backgroundColor: 'var(--bg-card)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setActiveTab('runs')}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: activeTab === 'runs' ? 600 : 500,
                  color: activeTab === 'runs' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${activeTab === 'runs' ? 'var(--accent-primary)' : 'transparent'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <History size={14} />
                Benchmark Runs ({runs.length})
              </button>

              <button
                onClick={() => setActiveTab('editor')}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: activeTab === 'editor' ? 600 : 500,
                  color: activeTab === 'editor' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${activeTab === 'editor' ? 'var(--accent-primary)' : 'transparent'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileCode size={14} />
                Prompt & Versions ({promptVersions.length})
              </button>

              <button
                onClick={() => setActiveTab('h2h')}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: activeTab === 'h2h' ? 600 : 500,
                  color: activeTab === 'h2h' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${activeTab === 'h2h' ? 'var(--accent-primary)' : 'transparent'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trophy size={14} />
                Head-to-Head Tests ({h2hComparisons.length})
              </button>
            </div>

            {/* Quick Compare Selected Button */}
            {compareRunIds.length > 0 && (
              <Button
                size="sm"
                variant="primary"
                icon={<Columns size={13} />}
                onClick={() => openCompareWithRuns(compareRunIds)}
              >
                Compare Selected ({compareRunIds.length})
              </Button>
            )}
          </div>

          {/* Tab 1: Benchmark Runs Table */}
          {activeTab === 'runs' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 12px', width: '30px' }}>
                        <span style={{ fontSize: '10px' }}>Select</span>
                      </th>
                      <th style={{ padding: '8px 12px' }}>Model</th>
                      <th style={{ padding: '8px 12px' }}>Prompt Version</th>
                      <th style={{ padding: '8px 12px' }}>Date</th>
                      <th style={{ padding: '8px 12px' }}>Settings / Speed</th>
                      <th style={{ padding: '8px 12px' }}>Overall Score</th>
                      <th style={{ padding: '8px 12px' }}>Visual</th>
                      <th style={{ padding: '8px 12px' }}>Adherence</th>
                      <th style={{ padding: '8px 12px' }}>Functionality</th>
                      <th style={{ padding: '8px 12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No runs recorded for this prompt yet. Click "Add Output" above to record model generations.
                        </td>
                      </tr>
                    ) : (
                      runs.map((r) => {
                        const isChecked = compareRunIds.includes(r.id);
                        return (
                          <tr
                            key={r.id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              backgroundColor: isChecked ? 'var(--accent-primary-light)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCompareRunId(r.id)}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {r.model_display_name || r.model_name}
                              {r.evaluation?.favorite === 1 && (
                                <Star size={11} fill="var(--accent-warning)" color="var(--accent-warning)" style={{ marginLeft: '4px' }} />
                              )}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span className="badge">v{r.prompt_version}</span>
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {new Date(r.started_at).toLocaleDateString()} {new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                              {r.temperature !== null ? `T:${r.temperature} ` : ''}
                              {r.tokens_per_second ? `${r.tokens_per_second} tok/s` : r.output_tokens ? `${r.output_tokens} tok` : 'manual'}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <ScoreBadge score={r.evaluation?.overall_score} size="sm" isManual={r.evaluation?.is_manual_overall === 1} />
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                              {r.evaluation?.visual_score ?? '—'}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                              {r.evaluation?.prompt_adherence_score ?? '—'}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                              {r.evaluation?.functionality_score ?? '—'}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openCompareWithRuns([r.id])}
                              >
                                Preview & Score
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Prompt Editor & Historical Versions */}
          {activeTab === 'editor' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 240px', overflow: 'hidden' }}>
              {/* Editor Workspace */}
              <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', height: '100%' }}>
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Prompt Text — <span style={{ color: 'var(--text-primary)' }}>Version {currentVersionObj?.version || 1}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveNewVersion}
                      disabled={isSaving || editedPromptText === currentVersionObj?.prompt_text}
                    >
                      {isSaving ? 'Saving...' : 'Save as New Version'}
                    </Button>
                  </div>
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <MonacoCodeEditor
                    value={editedPromptText}
                    onChange={setEditedPromptText}
                    language="markdown"
                  />
                </div>

                {/* Version Notes Footer */}
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Change Notes:</span>
                  <input
                    type="text"
                    placeholder="e.g. Added responsive layout requirements, updated animation specs..."
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                    }}
                  />
                </div>
              </div>

              {/* Version History List */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Historical Versions ({promptVersions.length})
                </span>
                {promptVersions.map((v) => {
                  const isCurrent = v.id === selectedVersionId;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleVersionChange(v.id)}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isCurrent ? 'var(--accent-primary-light)' : 'var(--bg-card)',
                        border: `1px solid ${isCurrent ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        marginBottom: '6px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        <span>Version {v.version}</span>
                        <span>{v.run_count || 0} runs</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>
                        {new Date(v.created_at).toLocaleDateString()}
                      </div>
                      {v.notes && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '4px', fontStyle: 'italic' }}>
                          "{v.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Head-to-Head Decisions */}
          {activeTab === 'h2h' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 14px' }}>Left Model</th>
                      <th style={{ padding: '8px 14px' }}>Result</th>
                      <th style={{ padding: '8px 14px' }}>Right Model</th>
                      <th style={{ padding: '8px 14px' }}>Decisive Factor</th>
                      <th style={{ padding: '8px 14px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h2hComparisons.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No pairwise decisions recorded for this prompt yet. Compare 2 models to record head-to-head winners.
                        </td>
                      </tr>
                    ) : (
                      h2hComparisons.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 14px', fontWeight: c.winner === 'left' ? 700 : 400, color: c.winner === 'left' ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                            {c.left_model_name} {c.winner === 'left' ? '👑' : ''}
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <span className={`badge ${c.winner === 'tie' ? '' : 'badge-primary'}`}>
                              {c.winner === 'left' ? 'Left Won' : c.winner === 'right' ? 'Right Won' : 'Tie'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px', fontWeight: c.winner === 'right' ? 700 : 400, color: c.winner === 'right' ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                            {c.right_model_name} {c.winner === 'right' ? '👑' : ''}
                          </td>
                          <td style={{ padding: '8px 14px', color: 'var(--text-secondary)' }}>
                            {c.dimension_reason}
                          </td>
                          <td style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: '11px' }}>
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Select a prompt from the library on the left.
        </div>
      )}
    </div>
  );
};
