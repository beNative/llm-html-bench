import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DatabaseInfo } from '@shared/types/ipc';
import { ProviderConfig, DiscoveredModel } from '@shared/types/providers';
import { Button } from '../components/common/Button';
import {
  Database,
  Download,
  Upload,
  HardDrive,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Globe,
  Plus,
  RotateCw,
  Trash2,
  Edit2,
  Sparkles,
  Cpu,
} from 'lucide-react';

interface EndpointPreset {
  name: string;
  baseUrl: string;
  type: 'openai-compatible';
  desc: string;
  needsKey: boolean;
}

const PRESETS: EndpointPreset[] = [
  {
    name: 'Local LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    type: 'openai-compatible',
    desc: 'Local inference on GPU / Metal with OpenAI REST format',
    needsKey: false,
  },
  {
    name: 'Local Ollama',
    baseUrl: 'http://localhost:11434/v1',
    type: 'openai-compatible',
    desc: 'Local Ollama daemon running OpenAI-compatible v1 endpoint',
    needsKey: false,
  },
  {
    name: 'OpenRouter Cloud',
    baseUrl: 'https://openrouter.ai/api/v1',
    type: 'openai-compatible',
    desc: 'Aggregated cloud access to Claude, GPT-4, Llama, DeepSeek, Mistral',
    needsKey: true,
  },
  {
    name: 'OpenAI Cloud',
    baseUrl: 'https://api.openai.com/v1',
    type: 'openai-compatible',
    desc: 'Direct official OpenAI API (GPT-4o, o1, o3, etc.)',
    needsKey: true,
  },
  {
    name: 'Local vLLM / SGLang',
    baseUrl: 'http://localhost:8000/v1',
    type: 'openai-compatible',
    desc: 'High-throughput local vLLM or SGLang inference server',
    needsKey: false,
  },
];

export const SettingsPage: React.FC = () => {
  const { showToast, refreshModels } = useApp();

  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);

  // Editing or adding provider state
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string>('Local LM Studio');
  const [providerBaseUrl, setProviderBaseUrl] = useState<string>('http://localhost:1234/v1');
  const [providerApiKey, setProviderApiKey] = useState<string>('');
  const [isTestingProvider, setIsTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; msg: string }>>({});

  // Model Auto-discovery state per provider
  const [discoveringProviderId, setDiscoveringProviderId] = useState<string | null>(null);
  const [discoveredModelsMap, setDiscoveredModelsMap] = useState<Record<string, DiscoveredModel[]>>({});
  const [showDiscoveredFor, setShowDiscoveredFor] = useState<string | null>(null);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [info, pConfigs] = await Promise.all([
          window.electronAPI.getDatabaseInfo(),
          window.electronAPI.getProviderConfigs(),
        ]);
        setDbInfo(info);
        setProviders(pConfigs || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBackup = async () => {
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.backupDatabase();
        if (res.success) {
          showToast(`Database backed up to ${res.filePath}`, 'success');
        }
      }
    } catch (err: unknown) {
      showToast(`Backup failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleRestore = async () => {
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.restoreDatabase('');
        if (res.success) {
          showToast('Database restored successfully!', 'success');
          loadData();
        }
      }
    } catch (err: unknown) {
      showToast(`Restore failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleVacuum = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.vacuumDatabase();
        showToast('Database vacuumed and defragmented!', 'success');
        loadData();
      }
    } catch (err: unknown) {
      showToast(`Vacuum failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleOpenFolder = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openDatabaseFolder();
    }
  };

  const handleExportDataset = async () => {
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.exportDatasetToFile();
        if (res.success) {
          showToast(`Benchmark dataset exported to ${res.filePath}`, 'success');
        }
      }
    } catch (err: unknown) {
      showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleImportDataset = async () => {
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.importDatasetFromFile();
        if (res.success) {
          showToast(`Imported ${res.importedCount} benchmark records!`, 'success');
          loadData();
        }
      }
    } catch (err: unknown) {
      showToast(`Import failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const applyPreset = (preset: EndpointPreset) => {
    setEditingProviderId(null);
    setProviderName(preset.name);
    setProviderBaseUrl(preset.baseUrl);
    setProviderApiKey('');
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerBaseUrl.trim()) return;

    try {
      if (window.electronAPI) {
        const configId = editingProviderId || `provider-${Date.now()}`;
        const config: ProviderConfig = {
          id: configId,
          name: providerName.trim() || 'Custom Endpoint',
          type: 'openai-compatible',
          baseUrl: providerBaseUrl.trim(),
          apiKey: providerApiKey.trim() || undefined,
          enabled: true,
        };

        await window.electronAPI.saveProviderConfig(config);
        showToast(`Provider "${config.name}" saved with encrypted credentials`, 'success');
        setEditingProviderId(null);
        setProviderName('Local LM Studio');
        setProviderBaseUrl('http://localhost:1234/v1');
        setProviderApiKey('');
        await loadData();
      }
    } catch (err: unknown) {
      showToast(`Save failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleEditProvider = (p: ProviderConfig) => {
    setEditingProviderId(p.id);
    setProviderName(p.name);
    setProviderBaseUrl(p.baseUrl);
    setProviderApiKey(p.apiKey || '');
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.deleteProviderConfig(id);
        showToast(`Provider "${name}" removed`, 'info');
        if (editingProviderId === id) {
          setEditingProviderId(null);
        }
        await loadData();
      }
    } catch (err: unknown) {
      showToast(`Delete failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleTestProvider = async (config: ProviderConfig) => {
    setIsTestingProvider(config.id);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.testProviderConnection(config);
        setTestResults((prev) => ({
          ...prev,
          [config.id]: {
            success: res.success,
            msg: res.success ? 'Endpoint responded successfully!' : res.error || 'Connection failed',
          },
        }));
      }
    } catch (err: unknown) {
      setTestResults((prev) => ({
        ...prev,
        [config.id]: { success: false, msg: err instanceof Error ? err.message : String(err) },
      }));
    } finally {
      setIsTestingProvider(null);
    }
  };

  const handleDiscoverModels = async (config: ProviderConfig) => {
    setDiscoveringProviderId(config.id);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.fetchProviderModels(config);
        if (res.success) {
          setDiscoveredModelsMap((prev) => ({ ...prev, [config.id]: res.models }));
          setShowDiscoveredFor(config.id);
          showToast(`Discovered ${res.models.length} models on ${config.name}!`, 'success');
        } else {
          showToast(`Discovery failed: ${res.error || 'No models returned'}`, 'error');
        }
      }
    } catch (err: unknown) {
      showToast(`Discovery error: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setDiscoveringProviderId(null);
    }
  };

  const handleRegisterModelToCatalog = async (modelId: string, modelName: string, providerName: string) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.createModel({
          modelName: modelId,
          displayName: modelName || modelId,
          provider: providerName,
        });
        showToast(`Model "${modelName}" registered in benchmark catalog!`, 'success');
        await refreshModels();
      }
    } catch (err: unknown) {
      showToast(`Failed to register model: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 className="h1">Settings & Benchmark Database</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Manage multi-provider LLM endpoints, model auto-discovery, persistent SQLite database storage, and dataset portability.
        </p>
      </div>

      {/* Multi-Provider LLM Endpoints Management */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          padding: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} color="var(--accent-primary)" />
            <h2 className="h2">Configured LLM Provider Endpoints ({providers.length})</h2>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Configure multiple local and cloud OpenAI-compatible endpoints (Ollama, LM Studio, OpenRouter, OpenAI, vLLM). Discover available models directly with zero manual entry.
        </p>

        {/* Providers List Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {providers.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No provider endpoints configured. Add one below using a quick preset or custom URL.
            </div>
          ) : (
            providers.map((p) => {
              const test = testResults[p.id];
              const discovered = discoveredModelsMap[p.id];
              const isShowingDiscovered = showDiscoveredFor === p.id;

              return (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} />
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {p.name}
                      </span>
                      <span className="badge" style={{ fontSize: '10px' }}>
                        {p.type}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<RotateCw size={11} className={discoveringProviderId === p.id ? 'spin-anim' : ''} />}
                        onClick={() => handleDiscoverModels(p)}
                        disabled={discoveringProviderId === p.id}
                      >
                        {discoveringProviderId === p.id ? 'Discovering...' : 'Auto-Discover Models'}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isTestingProvider === p.id}
                        onClick={() => handleTestProvider(p)}
                      >
                        {isTestingProvider === p.id ? 'Testing...' : 'Test Connection'}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Edit2 size={12} />}
                        onClick={() => handleEditProvider(p)}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 size={12} color="var(--accent-danger)" />}
                        onClick={() => handleDeleteProvider(p.id, p.name)}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <strong>Endpoint URL:</strong> <span className="font-mono">{p.baseUrl}</span>
                    </div>
                    <div>
                      <strong>API Key:</strong> {p.apiKey ? '••••••••' : 'None (Local / Open)'}
                    </div>
                  </div>

                  {test && (
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: test.success ? 'var(--accent-success-light)' : 'var(--accent-danger-light)',
                        color: test.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {test.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      {test.msg}
                    </div>
                  )}

                  {/* Discovered Models List Tray */}
                  {isShowingDiscovered && discovered && (
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={12} color="var(--accent-purple)" />
                          Discovered Models ({discovered.length}):
                        </span>
                        <button
                          onClick={() => setShowDiscoveredFor(null)}
                          style={{ fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}
                        >
                          Close
                        </button>
                      </div>

                      {discovered.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No models found at this endpoint.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                          {discovered.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                                backgroundColor: 'var(--bg-card)',
                                borderRadius: 'var(--radius-xs)',
                                fontSize: '11px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                <Cpu size={12} color="var(--text-muted)" />
                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{m.id}</span>
                                {m.ownedBy && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({m.ownedBy})</span>}
                              </div>

                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<Plus size={11} />}
                                onClick={() => handleRegisterModelToCatalog(m.id, m.name, p.name)}
                                style={{ height: '20px', fontSize: '10px', padding: '1px 6px' }}
                              >
                                Register to Catalog
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add / Edit Endpoint Form with 1-Click Presets */}
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {editingProviderId ? 'Edit Provider Endpoint' : 'Add New Provider Endpoint'}
            </h3>
            {editingProviderId && (
              <Button size="sm" variant="ghost" onClick={() => setEditingProviderId(null)}>
                Cancel Editing
              </Button>
            )}
          </div>

          {/* Quick Presets Bar */}
          {!editingProviderId && (
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Quick Presets:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PRESETS.map((pr) => (
                  <button
                    key={pr.name}
                    type="button"
                    onClick={() => applyPreset(pr)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: providerBaseUrl === pr.baseUrl ? 'var(--accent-primary-light)' : 'var(--bg-card)',
                      color: providerBaseUrl === pr.baseUrl ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${providerBaseUrl === pr.baseUrl ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {pr.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveProvider} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Provider Name / Label:
                </label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="e.g. Local LM Studio, Ollama, OpenRouter"
                  required
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Base URL (OpenAI REST / v1):
                </label>
                <input
                  type="text"
                  value={providerBaseUrl}
                  onChange={(e) => setProviderBaseUrl(e.target.value)}
                  placeholder="http://localhost:1234/v1 or https://openrouter.ai/api/v1"
                  required
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                API Key (Optional for local Ollama / LM Studio):
              </label>
              <input
                type="password"
                value={providerApiKey}
                onChange={(e) => setProviderApiKey(e.target.value)}
                placeholder="sk-or-v1-... or sk-..."
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <Button type="submit" variant="primary" size="sm" icon={<Plus size={13} />}>
                {editingProviderId ? 'Update Endpoint' : 'Add Endpoint'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Database Management Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Database size={18} color="var(--accent-primary)" />
          <h2 className="h2">SQLite Database Storage</h2>
        </div>

        {dbInfo && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Location</div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all', marginTop: '2px' }}>
                {dbInfo.filePath}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Database Size & Version</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {(dbInfo.sizeBytes / 1024).toFixed(1)} KB (Schema v{dbInfo.version})
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Records</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {dbInfo.counts.prompts} Prompts • {dbInfo.counts.runs} Runs • {dbInfo.counts.comparisons} H2H
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={handleBackup}>
            Backup Database
          </Button>
          <Button variant="secondary" size="sm" icon={<Upload size={13} />} onClick={handleRestore}>
            Restore Database
          </Button>
          <Button variant="secondary" size="sm" icon={<HardDrive size={13} />} onClick={handleVacuum}>
            Vacuum & Optimize
          </Button>
          <Button variant="ghost" size="sm" icon={<FolderOpen size={13} />} onClick={handleOpenFolder}>
            Open Database Folder
          </Button>
        </div>
      </div>

      {/* Artificial Analysis Benchmark Intelligence Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent-warning)" />
            <h2 className="h2" style={{ margin: 0 }}>Artificial Analysis Benchmark Intelligence</h2>
          </div>
          <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: 'var(--accent-warning)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
            Live & Offline Benchmarking
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
          Fetch and correlate independent quality benchmarks (Intelligence Index 0–100, GPQA, MMLU, measured throughput speeds, and token pricing) from <strong>Artificial Analysis</strong> across all your registered models. Works out of the box with the bundled offline dataset, or optionally provide an API key for live real-time metrics.
        </p>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="password"
            placeholder="Artificial Analysis API Key (optional for live queries)..."
            value={providerApiKey.startsWith('aa_') ? providerApiKey : ''}
            onChange={(e) => setProviderApiKey(e.target.value)}
            style={{
              flex: 1,
              minWidth: '280px',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          />

          <Button
            variant="primary"
            size="sm"
            icon={<RotateCw size={13} />}
            onClick={async () => {
              try {
                if (window.electronAPI) {
                  showToast('Synchronizing models with Artificial Analysis...', 'info');
                  const res = await window.electronAPI.syncAllModelBenchmarks(providerApiKey);
                  if (res.success) {
                    showToast(res.message || `Synchronized ${res.updatedCount} models!`, 'success');
                    await refreshModels();
                  } else {
                    showToast(res.message || 'Sync completed', 'info');
                  }
                }
              } catch (err: any) {
                showToast(`Sync failed: ${err.message}`, 'error');
              }
            }}
          >
            Sync All Models with Artificial Analysis
          </Button>
        </div>
      </div>

      {/* Dataset Export / Import */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Download size={18} color="var(--accent-success)" />
          <h2 className="h2">Benchmark Dataset Portability (JSON)</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Export or import complete benchmark datasets (prompts, versions, models, runs, outputs, and evaluations) formatted as a portable JSON package.
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" size="sm" icon={<Download size={14} />} onClick={handleExportDataset}>
            Export Dataset (JSON)
          </Button>
          <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={handleImportDataset}>
            Import Dataset (JSON)
          </Button>
        </div>
      </div>
    </div>
  );
};
