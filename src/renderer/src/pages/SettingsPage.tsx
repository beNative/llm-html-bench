import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DatabaseInfo } from '@shared/types/ipc';
import { ProviderConfig } from '@shared/types/providers';
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
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useApp();

  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);

  // Selected or New Provider form
  const [providerName, setProviderName] = useState<string>('Local LM Studio / Ollama');
  const [providerBaseUrl, setProviderBaseUrl] = useState<string>('http://localhost:1234/v1');
  const [providerApiKey, setProviderApiKey] = useState<string>('');
  const [isTestingProvider, setIsTestingProvider] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const loadData = async () => {
    try {
      if (window.electronAPI) {
        const [info, pConfigs] = await Promise.all([
          window.electronAPI.getDatabaseInfo(),
          window.electronAPI.getProviderConfigs(),
        ]);
        setDbInfo(info);
        setProviders(pConfigs);
        if (pConfigs.length > 0) {
          setProviderName(pConfigs[0].name);
          setProviderBaseUrl(pConfigs[0].baseUrl);
          setProviderApiKey(pConfigs[0].apiKey || '');
        }
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

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerBaseUrl.trim()) return;

    try {
      if (window.electronAPI) {
        const config: ProviderConfig = {
          id: providers.length > 0 ? providers[0].id : 'default-openai',
          name: providerName.trim() || 'OpenAI Compatible',
          type: 'openai-compatible',
          baseUrl: providerBaseUrl.trim(),
          apiKey: providerApiKey.trim() || undefined,
          enabled: true,
        };

        await window.electronAPI.saveProviderConfig(config);
        showToast('Provider configuration saved with encrypted credentials', 'success');
        loadData();
      }
    } catch (err: unknown) {
      showToast(`Save failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleTestConnection = async () => {
    setIsTestingProvider(true);
    setTestResult(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.testProviderConnection({
          id: 'test',
          name: providerName,
          type: 'openai-compatible',
          baseUrl: providerBaseUrl.trim(),
          apiKey: providerApiKey.trim() || undefined,
          enabled: true,
        });

        if (res.success) {
          setTestResult({ success: true, msg: 'Connection successful! Endpoint responded.' });
        } else {
          setTestResult({ success: false, msg: res.error || 'Connection failed.' });
        }
      }
    } catch (err: unknown) {
      setTestResult({ success: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsTestingProvider(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 className="h1">Settings & Benchmark Database</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Manage persistent SQLite benchmark storage, automated backups, dataset portability, and LLM API providers.
        </p>
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
          <h2 className="h2">SQLite Database Status</h2>
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

      {/* LLM API Provider Configuration */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Globe size={18} color="var(--accent-purple)" />
          <h2 className="h2">OpenAI-Compatible LLM Provider Endpoint</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Configure an OpenAI-compatible endpoint to execute live benchmark tests directly against cloud or local inference engines (OpenAI, OpenRouter, LM Studio, Ollama, vLLM). API keys are encrypted at rest via Electron safeStorage.
        </p>

        <form onSubmit={handleSaveProvider} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Provider Name / Preset:
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="e.g. OpenAI Cloud, OpenRouter, Local LM Studio"
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
              Base URL:
            </label>
            <input
              type="text"
              value={providerBaseUrl}
              onChange={(e) => setProviderBaseUrl(e.target.value)}
              placeholder="http://localhost:1234/v1 or https://api.openai.com/v1"
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
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              API Key (Optional for local models):
            </label>
            <input
              type="password"
              value={providerApiKey}
              onChange={(e) => setProviderApiKey(e.target.value)}
              placeholder="sk-..."
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
          </div>

          {testResult && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: testResult.success ? 'var(--accent-success-light)' : 'var(--accent-danger-light)',
                color: testResult.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {testResult.msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <Button type="submit" variant="primary" size="sm">
              Save Provider Configuration
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isTestingProvider}
              onClick={handleTestConnection}
            >
              {isTestingProvider ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
