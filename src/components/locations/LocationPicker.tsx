import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Location, LocationGroup } from '@/types';

export interface LocationPickerHandle {
  focus: () => void;
}

interface LocationPickerProps {
  value: string | undefined;
  onChange: (code: string | undefined) => void;
  locations: Location[];
  onAdvance?: () => void;
  placeholder?: string;
  className?: string;
}

const GROUP_ORDER: LocationGroup[] = ['AWNING', 'GR2', 'FABRICATION'];

const POPUP_WIDTH = 480;
const POPUP_MARGIN = 8;

export const LocationPicker = forwardRef<LocationPickerHandle, LocationPickerProps>(
  function LocationPicker(
    { value, onChange, locations, onAdvance, placeholder = 'Select location', className },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => triggerRef.current?.focus(),
    }));

    const grouped = useMemo(() => {
      const byGroup = new Map<LocationGroup, Location[]>();
      for (const g of GROUP_ORDER) byGroup.set(g, []);
      for (const l of locations) byGroup.get(l.group)?.push(l);
      for (const g of GROUP_ORDER) {
        byGroup.get(g)!.sort((a, b) => a.sort_order - b.sort_order);
      }
      return GROUP_ORDER
        .map(group => ({ group, items: byGroup.get(group)! }))
        .filter(s => s.items.length > 0);
    }, [locations]);

    // Position the popup relative to the trigger, flipping above if needed.
    useLayoutEffect(() => {
      if (!open || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popupHeight = popupRef.current?.offsetHeight ?? 360;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = rect.right - POPUP_WIDTH;
      if (left < POPUP_MARGIN) left = POPUP_MARGIN;
      if (left + POPUP_WIDTH > vw - POPUP_MARGIN) left = vw - POPUP_WIDTH - POPUP_MARGIN;

      let top = rect.bottom + 6;
      if (top + popupHeight > vh - POPUP_MARGIN) {
        const above = rect.top - popupHeight - 6;
        top = above > POPUP_MARGIN ? above : Math.max(POPUP_MARGIN, vh - popupHeight - POPUP_MARGIN);
      }

      setPosition({ top, left });
    }, [open]);

    // Close on outside mousedown, Escape, scroll, or resize.
    useEffect(() => {
      if (!open) return;
      const onMouseDown = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t)) return;
        if (popupRef.current?.contains(t)) return;
        setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };
      const onReflow = () => setOpen(false);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('keydown', onKey);
      window.addEventListener('resize', onReflow);
      window.addEventListener('scroll', onReflow, true);
      return () => {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', onReflow);
        window.removeEventListener('scroll', onReflow, true);
      };
    }, [open]);

    const commit = useCallback(
      (code: string | undefined) => {
        onChange(code);
        setOpen(false);
        // Let React flush the close before the parent moves focus.
        queueMicrotask(() => {
          onAdvance?.();
        });
      },
      [onAdvance, onChange]
    );

    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`group w-full h-9 px-3 pr-8 border border-neutral-200 rounded-lg bg-white text-sm tabular-nums text-left transition-colors hover:border-neutral-300 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 ${
            value ? 'text-neutral-900 font-medium' : 'text-neutral-400'
          } ${className || ''} relative`}
        >
          <span className="block truncate">{value || placeholder}</span>
          {value && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear location"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(undefined);
                triggerRef.current?.focus();
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>

        {open && position && createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Choose a location"
            className="fixed z-[60] bg-white rounded-xl shadow-card-hover border border-neutral-200/80 p-4 overflow-y-auto"
            style={{
              top: position.top,
              left: position.left,
              width: `min(${POPUP_WIDTH}px, calc(100vw - 16px))`,
              maxHeight: `min(70vh, 520px)`,
            }}
          >
            <div className="space-y-4">
              {grouped.map(({ group, items }) => (
                <div key={group}>
                  <div className="text-[10px] font-medium tracking-wide uppercase text-neutral-400 mb-2">
                    {group}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(loc => {
                      const isSelected = loc.code === value;
                      return (
                        <button
                          key={loc.code}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            commit(loc.code);
                          }}
                          className={`px-2.5 py-1.5 text-xs tabular-nums rounded-md border transition-colors ${
                            isSelected
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-900 hover:text-white hover:border-neutral-900'
                          }`}
                        >
                          {loc.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }
);
