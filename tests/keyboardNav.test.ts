import { describe, it, expect } from 'vitest';

describe('Windows-Native Keyboard Navigation Logic', () => {
  const itemCount = 20;
  const pageSize = 6;

  function calculateNextIndex(
    key: string,
    currentIndex: number,
    total: number,
    page: number = 6
  ): number {
    if (total === 0) return currentIndex;
    switch (key) {
      case 'ArrowDown':
        return currentIndex < total - 1 ? currentIndex + 1 : (currentIndex < 0 ? 0 : currentIndex);
      case 'ArrowUp':
        return currentIndex > 0 ? currentIndex - 1 : 0;
      case 'Home':
        return 0;
      case 'End':
        return Math.max(0, total - 1);
      case 'PageDown':
        return Math.min(total - 1, (currentIndex < 0 ? 0 : currentIndex) + page);
      case 'PageUp':
        return Math.max(0, (currentIndex < 0 ? 0 : currentIndex) - page);
      default:
        return currentIndex;
    }
  }

  it('navigates single steps with ArrowDown and ArrowUp', () => {
    expect(calculateNextIndex('ArrowDown', 0, itemCount)).toBe(1);
    expect(calculateNextIndex('ArrowDown', 19, itemCount)).toBe(19); // Clamp at bottom
    expect(calculateNextIndex('ArrowUp', 5, itemCount)).toBe(4);
    expect(calculateNextIndex('ArrowUp', 0, itemCount)).toBe(0); // Clamp at top
  });

  it('jumps to extremes with Home and End', () => {
    expect(calculateNextIndex('Home', 12, itemCount)).toBe(0);
    expect(calculateNextIndex('End', 3, itemCount)).toBe(19);
    expect(calculateNextIndex('End', 0, 1)).toBe(0);
  });

  it('paginates by page size with PageDown and PageUp', () => {
    expect(calculateNextIndex('PageDown', 2, itemCount, pageSize)).toBe(8);
    expect(calculateNextIndex('PageDown', 17, itemCount, pageSize)).toBe(19); // Clamps to end
    expect(calculateNextIndex('PageUp', 15, itemCount, pageSize)).toBe(9);
    expect(calculateNextIndex('PageUp', 3, itemCount, pageSize)).toBe(0); // Clamps to top
  });

  it('handles empty lists gracefully', () => {
    expect(calculateNextIndex('ArrowDown', -1, 0)).toBe(-1);
    expect(calculateNextIndex('Home', -1, 0)).toBe(-1);
    expect(calculateNextIndex('End', -1, 0)).toBe(-1);
  });

  it('cycles detail tabs accurately with Left/Right arrows or numeric keys', () => {
    const tabs = ['preview', 'html', 'raw', 'metadata', 'eval'];
    
    // Cycle right
    const curIdx = 0;
    const nextIdx = curIdx < tabs.length - 1 ? curIdx + 1 : 0;
    expect(tabs[nextIdx]).toBe('html');

    // Cycle left with wrap
    const curIdx2 = 0;
    const prevIdx = curIdx2 > 0 ? curIdx2 - 1 : tabs.length - 1;
    expect(tabs[prevIdx]).toBe('eval');

    // Direct number mapping (1-indexed)
    const keyNum = '3';
    expect(tabs[parseInt(keyNum, 10) - 1]).toBe('raw');
  });
});
