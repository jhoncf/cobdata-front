// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchKeyboard } from '../hooks/useSearchKeyboard';

function createKeyboardEvent(key: string): React.KeyboardEvent {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent;
}

describe('useSearchKeyboard', () => {
  const defaultProps = {
    totalItems: 5,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    isOpen: true,
  };

  it('should start with focusIndex at 0', () => {
    const { result } = renderHook(() => useSearchKeyboard(defaultProps));
    expect(result.current.focusIndex).toBe(0);
  });

  describe('ArrowDown', () => {
    it('should increment focusIndex on ArrowDown', () => {
      const { result } = renderHook(() => useSearchKeyboard(defaultProps));

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(result.current.focusIndex).toBe(1);
    });

    it('should not exceed totalItems - 1 (no wrap)', () => {
      const { result } = renderHook(() =>
        useSearchKeyboard({ ...defaultProps, totalItems: 3 }),
      );

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      expect(result.current.focusIndex).toBe(2);
    });

    it('should not respond to ArrowDown when totalItems is 0', () => {
      const { result } = renderHook(() =>
        useSearchKeyboard({ ...defaultProps, totalItems: 0 }),
      );

      const event = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusIndex).toBe(0);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should call preventDefault on ArrowDown when totalItems > 0', () => {
      const { result } = renderHook(() => useSearchKeyboard(defaultProps));

      const event = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('ArrowUp', () => {
    it('should decrement focusIndex on ArrowUp', () => {
      const { result } = renderHook(() => useSearchKeyboard(defaultProps));

      // First move down, then up
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });
      expect(result.current.focusIndex).toBe(2);

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'));
      });
      expect(result.current.focusIndex).toBe(1);
    });

    it('should not go below 0 (no wrap)', () => {
      const { result } = renderHook(() => useSearchKeyboard(defaultProps));

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'));
        result.current.handleKeyDown(createKeyboardEvent('ArrowUp'));
      });

      expect(result.current.focusIndex).toBe(0);
    });

    it('should not respond to ArrowUp when totalItems is 0', () => {
      const { result } = renderHook(() =>
        useSearchKeyboard({ ...defaultProps, totalItems: 0 }),
      );

      const event = createKeyboardEvent('ArrowUp');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusIndex).toBe(0);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Enter', () => {
    it('should call onSelect with current focusIndex when panel is open', () => {
      const onSelect = vi.fn();
      const { result } = renderHook(() =>
        useSearchKeyboard({ ...defaultProps, onSelect }),
      );

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Enter'));
      });

      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('should not call onSelect when panel is closed', () => {
      const onSelect = vi.fn();
      const { result } = renderHook(() =>
        useSearchKeyboard({ ...defaultProps, onSelect, isOpen: false }),
      );

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Enter'));
      });

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should not call onSelect when totalItems is 0', () => {
      const onSelect = vi.fn();
      const { result } = renderHook(() =>
        useSearchKeyboard({ ...defaultProps, onSelect, totalItems: 0 }),
      );

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Enter'));
      });

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should call preventDefault on Enter when conditions met', () => {
      const { result } = renderHook(() => useSearchKeyboard(defaultProps));

      const event = createKeyboardEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Escape', () => {
    it('should call onClose when panel is open', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useSearchKeyboard({ ...defaultProps, onClose }),
      );

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Escape'));
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('should not call onClose when panel is closed', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useSearchKeyboard({ ...defaultProps, onClose, isOpen: false }),
      );

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('Escape'));
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call preventDefault on Escape when panel is open', () => {
      const { result } = renderHook(() => useSearchKeyboard(defaultProps));

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('focusIndex reset', () => {
    it('should reset focusIndex to 0 when totalItems changes', () => {
      const { result, rerender } = renderHook(
        (props) => useSearchKeyboard(props),
        { initialProps: defaultProps },
      );

      // Move focus down
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
        result.current.handleKeyDown(createKeyboardEvent('ArrowDown'));
      });
      expect(result.current.focusIndex).toBe(2);

      // Change totalItems (simulating new search results)
      rerender({ ...defaultProps, totalItems: 10 });

      expect(result.current.focusIndex).toBe(0);
    });

    it('should reset focusIndex to 0 when isOpen transitions from false to true', () => {
      const { result, rerender } = renderHook(
        (props) => useSearchKeyboard(props),
        { initialProps: { ...defaultProps, isOpen: false } },
      );

      // isOpen is false, now transition to true
      rerender({ ...defaultProps, isOpen: true });

      expect(result.current.focusIndex).toBe(0);
    });
  });
});
