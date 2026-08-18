import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { NavTab } from '../context/AppContext';

export function useKeyboardShortcuts() {
  const {
    setIsNewPromptModalOpen,
    setIsNewModelModalOpen,
    setIsRunBenchmarkModalOpen,
    openAboutModal,
    backupDatabase,
    compareRunIds,
    setCurrentTab,
    toggleLogPanel,
    showToast,
    openCommandPalette,
  } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl + K or Ctrl + P: Open Command Palette (always allowed)
      if (
        (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'k') ||
        (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'p') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p')
      ) {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Check if user is inside an input/textarea/editable
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl && activeEl.getAttribute('contenteditable') === 'true');

      // If Escape is pressed while in an input, blur it
      if (e.key === 'Escape') {
        if (isInputFocused) {
          (activeEl as HTMLElement).blur();
          e.preventDefault();
          return;
        }
      }

      // 2. Global Tab Switchers: Ctrl+1..8 or Alt+1..8
      const isModifierNumber = (e.ctrlKey || e.altKey) && !e.shiftKey;
      if (isModifierNumber) {
        const tabs: NavTab[] = [
          'dashboard',   // 1
          'prompts',     // 2
          'compare',     // 3
          'models',      // 4
          'collections', // 5
          'runs',        // 6
          'settings',    // 7
          'info',        // 8
        ];
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 8) {
          e.preventDefault();
          setCurrentTab(tabs[num - 1]);
          return;
        }
      }

      // 3. Prevent browser default page reload Ctrl+R / F5, route to Run Benchmark Modal or refresh
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setIsRunBenchmarkModalOpen(true);
        return;
      }

      // 4. F12 or Ctrl+L: Toggle Logging Panel
      if (e.key === 'F12' || (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        toggleLogPanel();
        return;
      }

      // 5. F1: About / Help Modal
      if (e.key === 'F1') {
        e.preventDefault();
        openAboutModal();
        return;
      }

      // Guard remaining non-modifier shortcuts from firing during typing in inputs
      if (isInputFocused) {
        return;
      }

      // 6. '/': Open Command Palette
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // 7. Ctrl + N: Create New Prompt
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewPromptModalOpen(true);
        return;
      }

      // 8. Ctrl + M: Create New Model
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsNewModelModalOpen(true);
        return;
      }

      // 9. Ctrl + B: Quick Backup Database
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        backupDatabase();
        return;
      }

      // 10. Ctrl + Shift + C: Open Compare with Selected Runs
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (compareRunIds.length >= 2) {
          setCurrentTab('compare');
        } else {
          showToast('Select at least 2 model runs to compare', 'info');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setIsNewPromptModalOpen,
    setIsNewModelModalOpen,
    setIsRunBenchmarkModalOpen,
    openAboutModal,
    backupDatabase,
    compareRunIds,
    setCurrentTab,
    toggleLogPanel,
    showToast,
    openCommandPalette,
  ]);
}
