import { useEffect, useCallback } from 'react';

export interface UseListKeyboardNavOptions {
  itemCount: number;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onActivate?: (index: number) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  itemSelector?: string;
  pageSize?: number;
  isEnabled?: boolean;
  onExtraKey?: (e: KeyboardEvent, currentIndex: number) => boolean | void;
}

/**
 * Windows-native keyboard navigation hook for lists, catalogs, and master panes.
 * Supports:
 * - ArrowDown: Next item
 * - ArrowUp: Previous item
 * - Home: First item
 * - End: Last item
 * - PageDown: Jump down by pageSize
 * - PageUp: Jump up by pageSize
 * - Enter / Space: Activate/toggle current item
 * - Auto-scrolls the active element into view
 * - Gracefully respects input focus & blurs on Escape
 */
export function useListKeyboardNav({
  itemCount,
  selectedIndex,
  onSelectIndex,
  onActivate,
  containerRef,
  itemSelector = '[data-list-item="true"]',
  pageSize = 5,
  isEnabled = true,
  onExtraKey,
}: UseListKeyboardNavOptions) {
  // Auto-scroll selected item into view inside container
  const scrollItemIntoView = useCallback((index: number) => {
    if (!containerRef?.current || index < 0) return;
    const container = containerRef.current;
    // Delay slightly to ensure render has updated if needed
    requestAnimationFrame(() => {
      const items = container.querySelectorAll(itemSelector);
      if (items && items[index]) {
        (items[index] as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }, [containerRef, itemSelector]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in a form input element
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl && activeEl.getAttribute('contenteditable') === 'true');

      // If user presses Escape while in an input, blur it so they can use keyboard list navigation
      if (e.key === 'Escape' && isInputFocused) {
        (activeEl as HTMLElement).blur();
        e.preventDefault();
        return;
      }

      if (isInputFocused) return;

      // Allow caller to intercept custom key events first
      if (onExtraKey) {
        const handled = onExtraKey(e, selectedIndex);
        if (handled) {
          e.preventDefault();
          return;
        }
      }

      if (itemCount === 0) return;

      // Standard Windows list navigation keys
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = selectedIndex < itemCount - 1 ? selectedIndex + 1 : (selectedIndex < 0 ? 0 : selectedIndex);
        onSelectIndex(next);
        scrollItemIntoView(next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = selectedIndex > 0 ? selectedIndex - 1 : 0;
        onSelectIndex(prev);
        scrollItemIntoView(prev);
      } else if (e.key === 'Home') {
        e.preventDefault();
        onSelectIndex(0);
        scrollItemIntoView(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        const last = itemCount - 1;
        onSelectIndex(last);
        scrollItemIntoView(last);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        const next = Math.min(itemCount - 1, (selectedIndex < 0 ? 0 : selectedIndex) + pageSize);
        onSelectIndex(next);
        scrollItemIntoView(next);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        const prev = Math.max(0, (selectedIndex < 0 ? 0 : selectedIndex) - pageSize);
        onSelectIndex(prev);
        scrollItemIntoView(prev);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (onActivate && selectedIndex >= 0 && selectedIndex < itemCount) {
          e.preventDefault();
          onActivate(selectedIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, itemCount, selectedIndex, onSelectIndex, onActivate, scrollItemIntoView, pageSize, onExtraKey]);
}
