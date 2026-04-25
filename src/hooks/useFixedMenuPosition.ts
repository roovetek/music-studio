import { useLayoutEffect, useState, useCallback, type RefObject, type CSSProperties } from 'react';

const GAP = 8;
const VIEWPORT_PAD = 12;

/**
 * Viewport-fixed coordinates for a menu anchored to a trigger.
 * - `down`: list opens below the trigger (e.g. header theme picker).
 * - `up`: list opens above the trigger without affecting document height (e.g. bottom of page).
 */
export function useFixedMenuPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  placement: 'up' | 'down',
  maxVh = 45,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !open) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const cap = (window.innerHeight * maxVh) / 100;
    const vw = window.innerWidth;
    // Keep panel aligned to trigger and inside horizontal viewport
    const w = rect.width;
    let left = Math.round(rect.left);
    const minL = VIEWPORT_PAD;
    const maxL = Math.max(minL, vw - VIEWPORT_PAD - w);
    left = Math.min(Math.max(left, minL), maxL);
    const box: CSSProperties = {
      position: 'fixed',
      left,
      width: w,
      zIndex: 300,
      overflowY: 'auto',
      boxSizing: 'border-box',
    };

    if (placement === 'down') {
      const top = Math.round(rect.bottom + GAP);
      const maxH = Math.min(cap, window.innerHeight - top - VIEWPORT_PAD);
      setStyle({
        ...box,
        top,
        maxHeight: Math.max(120, maxH),
      });
    } else {
      const availableAbove = Math.max(0, rect.top - GAP - VIEWPORT_PAD);
      const maxH = Math.min(cap, availableAbove);
      const bottom = window.innerHeight - rect.top + GAP;
      setStyle({
        ...box,
        bottom,
        maxHeight: Math.max(100, maxH),
      });
    }
  }, [open, placement, maxVh, triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    update();
  }, [open, update]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, update]);

  return open ? style : {};
}
