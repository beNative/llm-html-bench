import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function useKeyboardShortcuts() {
  const {
    setIsNewPromptModalOpen,
    compareRunIds,
    setCurrentTab,
    showToast,
  } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disallow shortcuts when focused inside an input, textarea, or select
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl && activeEl.getAttribute('contenteditable') === 'true');

      // Prevent browser default Ctrl+R / F5 accidental page reload in renderer
      if ((e.ctrlKey && e.key.toLowerCase() === 'r') || e.key === 'F5') {
        if (!isInputFocused) {
          e.preventDefault();
        }
        return;
      }

      if (isInputFocused) {
        return;
      }

      // Ctrl + N: New Prompt
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewPromptModalOpen(true);
      }

      // Ctrl + Shift + C: Compare Selected Runs
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (compareRunIds.length >= 2) {
          setCurrentTab('compare');
        } else {
          showToast('Select at least 2 model runs to compare', 'info');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsNewPromptModalOpen, compareRunIds, setCurrentTab, showToast]);
}
