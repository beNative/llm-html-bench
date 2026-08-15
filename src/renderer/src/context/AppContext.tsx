import React, { createContext, useContext, useState, useEffect } from 'react';
import { Collection, Tag, Model } from '@shared/types/entities';

export type NavTab = 'dashboard' | 'prompts' | 'compare' | 'models' | 'collections' | 'runs' | 'settings';

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
  activePromptForOutput: { promptId: string; versionId?: string } | null;
  openAddOutputModal: (promptId: string, versionId?: string) => void;

  // Cached collections & tags & models
  collections: Collection[];
  tags: Tag[];
  models: Model[];
  refreshCollectionsAndTags: () => Promise<void>;
  refreshModels: () => Promise<Model[]>;

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
  const [activePromptForOutput, setActivePromptForOutput] = useState<{ promptId: string; versionId?: string } | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
        activePromptForOutput,
        openAddOutputModal,
        collections,
        tags,
        models,
        refreshCollectionsAndTags,
        refreshModels,
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
