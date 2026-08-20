import { useState, useEffect, useCallback, useRef } from 'react';
import type React from 'react';

export interface UseSearchKeyboardOptions {
  totalItems: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  isOpen: boolean;
}

export interface UseSearchKeyboardReturn {
  focusIndex: number;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useSearchKeyboard({
  totalItems,
  onSelect,
  onClose,
  isOpen,
}: UseSearchKeyboardOptions): UseSearchKeyboardReturn {
  const [focusIndex, setFocusIndex] = useState(0);
  const prevIsOpenRef = useRef(isOpen);

  // Reset focusIndex when totalItems changes (new search results)
  useEffect(() => {
    setFocusIndex(0);
  }, [totalItems]);

  // Reset focusIndex when isOpen transitions from false to true
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setFocusIndex(0);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          if (totalItems > 0) {
            e.preventDefault();
            setFocusIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
          }
          break;

        case 'ArrowUp':
          if (totalItems > 0) {
            e.preventDefault();
            setFocusIndex((prev) => (prev > 0 ? prev - 1 : prev));
          }
          break;

        case 'Enter':
          if (totalItems > 0 && isOpen) {
            e.preventDefault();
            onSelect(focusIndex);
          }
          break;

        case 'Escape':
          if (isOpen) {
            e.preventDefault();
            onClose();
          }
          break;
      }
    },
    [totalItems, isOpen, onSelect, onClose, focusIndex],
  );

  return {
    focusIndex,
    handleKeyDown,
  };
}
