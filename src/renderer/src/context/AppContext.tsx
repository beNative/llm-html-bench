import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Collection, Tag, Model } from '@shared/types/entities';
import { LogEntry, LogLevel, LogConfig } from '@shared/types/ipc';

export type NavTab = 'dashboard' | 'prompts' | 'compare' | 'models' | 'collections' | 'runs' | 'settings' | 'info';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  selectedPromptId: string | null;
  setSelectedPromptId: (id: string | null) => void;
  selectedPromptVersionId: string | null;
  setSelectedPromptVersionId: (id: string | null) => void;
  selectedModelId: string | null;
  setSelectedModelId: (id: string | null) => void;
  compareRunIds: string[];
  setCompareRunIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleCompareRunId: (runId: string) => void;
  clearCompareRunIds: () => void;
  openCompareWithRuns: (runIds: string[]) => void;

  // Global modals
  isNewPromptModalOpen: boolean;
  setIsNewPromptModalOpen: (open: boolean) => void;
  isAddOutputModalOpen: boolean;
  setIsAddOutputModalOpen: (open: boolean) => void;
  isNewModelModalOpen: boolean;
  setIsNewModelModalOpen: (open: boolean) => void;
  isRunBenchmarkModalOpen: boolean;
  setIsRunBenchmarkModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  activePromptForOutput: { promptId: string; versionId?: string } | null;
  openAddOutputModal: (promptId: string, versionId?: string) => void;

  // Cached collections & tags & models
  collections: Collection[];
  tags: Tag[];
  models: Model[];
  refreshCollectionsAndTags: () => Promise<void>;
  refreshModels: () => Promise<Model[]>;

  // Logging Panel & Stream
  isLogPanelOpen: boolean;
  setIsLogPanelOpen: (open: boolean) => void;
  toggleLogPanel: () => void;
  logs: LogEntry[];
  logConfig: LogConfig | null;
  logCounts: { total: number; debug: number; info: number; warning: number; error: number };
  addLog: (level: LogLevel, source: string, message: string, details?: string) => Promise<void>;
  clearLogs: () => Promise<void>;
  setLogAutoSave: (enabled: boolean) => Promise<void>;
  openLogFolder: () => Promise<void>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedPromptVersionId, setSelectedPromptVersionId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [compareRunIds, setCompareRunIds] = useState<string[]>([]);

  const [isNewPromptModalOpen, setIsNewPromptModalOpen] = useState(false);
  const [isAddOutputModalOpen, setIsAddOutputModalOpen] = useState(false);
  const [isNewModelModalOpen, setIsNewModelModalOpen] = useState(false);
  const [isRunBenchmarkModalOpen, setIsRunBenchmarkModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activePromptForOutput, setActivePromptForOutput] = useState<{ promptId: string; versionId?: string } | null>(null);

  const openCommandPalette = () => {
    setIsCommandPaletteOpen(true);
  };

  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Logging Panel State
  const [isLogPanelOpen, setIsLogPanelOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logConfig, setLogConfig] = useState<LogConfig | null>(null);

  const toggleLogPanel = () => {
    setIsLogPanelOpen((prev) => !prev);
  };

  const logCounts = useMemo(() => {
    let debug = 0;
    let info = 0;
    let warning = 0;
    let error = 0;
    for (const log of logs) {
      if (log.level === 'DEBUG') debug++;
      else if (log.level === 'INFO') info++;
      else if (log.level === 'WARNING') warning++;
      else if (log.level === 'ERROR') error++;
    }
    return { total: logs.length, debug, info, warning, error };
  }, [logs]);

  const addLog = async (level: LogLevel, source: string, message: string, details?: string) => {
    if (window.electronAPI) {
      await window.electronAPI.addLog(level, source, message, details);
    }
  };

  const clearLogs = async () => {
    if (window.electronAPI) {
      await window.electronAPI.clearLogs();
      setLogs([]);
    }
  };

  const setLogAutoSave = async (enabled: boolean) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.setLogAutoSave(enabled);
      setLogConfig((prev) =>
        prev ? { ...prev, autoSaveToFile: enabled, logFilePath: res.logFilePath } : null
      );
      showToast(`Log file persistence ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }
  };

  const openLogFolder = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openLogFolder();
    }
  };

  const refreshCollectionsAndTags = async () => {
    try {
      if (window.electronAPI) {
        const [c, t] = await Promise.all([
          window.electronAPI.getCollections(),
          window.electronAPI.getTags(),
        ]);
        setCollections(c);
        setTags(t);
      }
    } catch (err) {
      console.error('Failed to load collections/tags:', err);
    }
  };

  const refreshModels = async (): Promise<Model[]> => {
    try {
      if (window.electronAPI) {
        const mList = await window.electronAPI.getModels();
        setModels(mList);
        return mList;
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
    return [];
  };

  useEffect(() => {
    refreshCollectionsAndTags();
    refreshModels();

    if (window.electronAPI) {
      // Load initial logs and config
      window.electronAPI.getLogs().then((initialLogs) => setLogs(initialLogs)).catch(() => {});
      window.electronAPI.getLogConfig().then((cfg) => setLogConfig(cfg)).catch(() => {});

      // Subscribe to real-time log broadcasts
      const cleanupLogs = window.electronAPI.onNewLog((entry) => {
        setLogs((prev) => [...prev.slice(-1999), entry]);
      });

      return () => {
        cleanupLogs();
      };
    }
  }, []);

  const toggleCompareRunId = (runId: string) => {
    setCompareRunIds((prev) => {
      if (prev.includes(runId)) {
        return prev.filter((id) => id !== runId);
      }
      if (prev.length >= 4) {
        showToast('Maximum 4 model runs can be compared simultaneously', 'info');
        return prev;
      }
      return [...prev, runId];
    });
  };

  const clearCompareRunIds = () => {
    setCompareRunIds([]);
  };

  const openCompareWithRuns = (runIds: string[]) => {
    setCompareRunIds(runIds.slice(0, 4));
    setCurrentTab('compare');
  };

  const openAddOutputModal = (promptId: string, versionId?: string) => {
    setActivePromptForOutput({ promptId, versionId });
    setIsAddOutputModalOpen(true);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        selectedPromptId,
        setSelectedPromptId,
        selectedPromptVersionId,
        setSelectedPromptVersionId,
        selectedModelId,
        setSelectedModelId,
        compareRunIds,
        setCompareRunIds,
        toggleCompareRunId,
        clearCompareRunIds,
        openCompareWithRuns,
        isNewPromptModalOpen,
        setIsNewPromptModalOpen,
        isAddOutputModalOpen,
        setIsAddOutputModalOpen,
        isNewModelModalOpen,
        setIsNewModelModalOpen,
        isRunBenchmarkModalOpen,
        setIsRunBenchmarkModalOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        openCommandPalette,
        activePromptForOutput,
        openAddOutputModal,
        collections,
        tags,
        models,
        refreshCollectionsAndTags,
        refreshModels,
        isLogPanelOpen,
        setIsLogPanelOpen,
        toggleLogPanel,
        logs,
        logConfig,
        logCounts,
        addLog,
        clearLogs,
        setLogAutoSave,
        openLogFolder,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
