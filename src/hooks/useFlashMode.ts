/**
 * Flash mode hook for card counting trainers
 *
 * In "flash" scaffolding mode, the count overlay is shown briefly when a new
 * card is dealt, then hidden. This hook manages that state.
 */

import { useState, useEffect } from 'react';
import type { ScaffoldingLevel } from '../components/training/shared';
import { TIMING } from '../constants/timing';

interface UseFlashModeOptions {
  /** Current scaffolding level */
  scaffolding: ScaffoldingLevel;
  /** Whether the trainer is actively dealing cards */
  isActive: boolean;
  /** Value that changes when a new card is dealt (e.g., cards.length) */
  triggerValue: number;
  /** How long to show the flash in milliseconds (defaults to TIMING.FLASH_OVERLAY_DURATION) */
  flashDuration?: number;
}

/**
 * Hook for managing flash mode overlay timing.
 *
 * @returns The index of the card that should be flashing, or -1 if none
 *
 * @example
 * ```tsx
 * const flashingCardIndex = useFlashMode({
 *   scaffolding,
 *   isActive: trainingState === 'dealing',
 *   triggerValue: currentHand.cards.length,
 * });
 * ```
 */
export function useFlashMode({
  scaffolding,
  isActive,
  triggerValue,
  flashDuration = TIMING.FLASH_OVERLAY_DURATION,
}: UseFlashModeOptions): number {
  const [flashingIndex, setFlashingIndex] = useState(-1);

  useEffect(() => {
    // Only flash in flash mode when actively dealing
    if (scaffolding !== 'flash' || !isActive || triggerValue === 0) {
      return;
    }

    // Flash the newest item (last index)
    const newestIndex = triggerValue - 1;
    setFlashingIndex(newestIndex);

    const timer = setTimeout(() => {
      setFlashingIndex(-1);
    }, flashDuration);

    return () => clearTimeout(timer);
  }, [triggerValue, scaffolding, isActive, flashDuration]);

  return flashingIndex;
}
