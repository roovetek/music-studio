import { useRef, useState, useEffect, useId, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useFixedMenuPosition } from '../../hooks/useFixedMenuPosition';

export type ThemedSelectOption = {
  value: string;
  label: string;
  /** Second line in dropdown (e.g. theme description) */
  sublabel?: string;
};

export type ThemedSelectGroup = { label: string; options: ThemedSelectOption[] };

/** How each Visual Style option row is painted (only when `optionPreview="theme"`). */
export type ThemedSelectThemeSwatchLayout =
  | 'appGradient'
  | 'visualizer'
  | 'frame'
  | 'select';

const SWATCH_LAYOUT_CLASS: Record<ThemedSelectThemeSwatchLayout, string> = {
  appGradient: 'themed-select-theme-swatch--app-gradient',
  visualizer: 'themed-select-theme-swatch--visualizer',
  frame: 'themed-select-theme-swatch--frame',
  select: 'themed-select-theme-swatch--select',
};

function ThemeOptionSwatch({
  dataTheme,
  label,
  sublabel,
  layout,
}: {
  dataTheme: string;
  label: string;
  sublabel?: string;
  layout: ThemedSelectThemeSwatchLayout;
}) {
  const swatchClass = `themed-select-theme-swatch ${SWATCH_LAYOUT_CLASS[layout]}`;
  return (
    <span data-theme={dataTheme} className={swatchClass}>
      <span className="themed-select-theme-swatch__bar" aria-hidden />
      {layout === 'frame' ? <span className="themed-select-theme-swatch__track" aria-hidden /> : null}
      <span className="themed-select-theme-swatch__text">
        <span className="themed-select-theme-swatch__name">{label}</span>
        {sublabel ? <span className="themed-select-theme-swatch__sub">{sublabel}</span> : null}
      </span>
    </span>
  );
}

type ThemedSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options?: ThemedSelectOption[];
  groups?: ThemedSelectGroup[];
  placement: 'up' | 'down';
  id?: string;
  'aria-label'?: string;
  triggerClassName: string;
  disabled?: boolean;
  maxVh?: number;
  /**
   * `theme`: each option row is wrapped in `data-theme={value}` and shows that palette
   * (app visual style picker only; value must be a `data-theme` id from index.css).
   */
  optionPreview?: 'default' | 'theme';
  /**
   * Row skin for the theme swatch; ignored unless `optionPreview="theme"`.
   * @default 'appGradient'
   */
  themeSwatchLayout?: ThemedSelectThemeSwatchLayout;
};

function flattenGroups(groups: ThemedSelectGroup[]): ThemedSelectOption[] {
  return groups.flatMap((g) => g.options);
}

export function ThemedSelect({
  value,
  onChange,
  options: flatOptions,
  groups,
  placement,
  id,
  'aria-label': ariaLabel,
  triggerClassName,
  disabled,
  maxVh = 45,
  optionPreview = 'default',
  themeSwatchLayout = 'appGradient',
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const panelStyle = useFixedMenuPosition(open, triggerRef, placement, maxVh);
  const appShellEl =
    typeof document !== 'undefined'
      ? (document.querySelector('.app-shell') as HTMLElement | null)
      : null;

  if (!groups && !flatOptions) {
    throw new Error('ThemedSelect: pass options or groups');
  }

  const allOptions: ThemedSelectOption[] = groups
    ? flattenGroups(groups)
    : (flatOptions as ThemedSelectOption[]);
  const selected = allOptions.find((o) => o.value === value);
  const displayLabel =
    selected && selected.sublabel
      ? `${selected.label} [${selected.sublabel}]`
      : (selected?.label ?? value);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDocMouseDown(e: MouseEvent) {
      const node = e.target as Node;
      if (
        containerRef.current?.contains(node) ||
        panelRef.current?.contains(node)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        setOpen((o) => !o);
      }
    }
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault();
      if (!disabled) {
        setOpen(true);
      }
    }
  };

  const optionBtn = (opt: ThemedSelectOption) => {
    const isActive = opt.value === value;
    if (optionPreview === 'theme') {
      return (
        <button
          type="button"
          key={opt.value}
          role="option"
          aria-selected={isActive}
          className={`themed-select-option themed-select-option--theme themed-select-swatch-host w-full text-left ${
            isActive ? 'is-active' : ''
          }`}
          onClick={() => pick(opt.value)}
        >
          <ThemeOptionSwatch
            dataTheme={opt.value}
            label={opt.label}
            sublabel={opt.sublabel}
            layout={themeSwatchLayout}
          />
        </button>
      );
    }
    return (
      <button
        type="button"
        key={opt.value}
        role="option"
        aria-selected={isActive}
        className={`themed-select-option w-full text-left ${isActive ? 'is-active' : ''}`}
        onClick={() => pick(opt.value)}
      >
        {opt.sublabel ? `${opt.label} [${opt.sublabel}]` : opt.label}
      </button>
    );
  };

  // Portal to .app-shell so `position:fixed` uses the viewport. Ancestors with
  // `backdrop-filter` (e.g. app header, glass panel) would otherwise be the containing
  // block and viewport-based coords from getBoundingClientRect would not line up.
  const listContent = groups
    ? groups.map((g) => (
        <div key={g.label} className="themed-select-group" role="group" aria-label={g.label}>
          <div className="themed-select-group-label">{g.label}</div>
          {g.options.map((opt) => optionBtn({ ...opt }))}
        </div>
      ))
    : allOptions.map((opt) => optionBtn(opt));

  const panel = (
    <div
      ref={panelRef}
      id={listId}
      role="listbox"
      className={`themed-select-panel metronome-menu rounded-lg py-1 shadow-2xl${
        optionPreview === 'theme' ? ' themed-select-panel--style-picker' : ''
      }`}
      style={panelStyle}
    >
      {listContent}
    </div>
  );

  const useThemeSwatchTrigger = optionPreview === 'theme' && selected;

  return (
    <div className="themed-select relative w-full" ref={containerRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        className={`${triggerClassName}${
          useThemeSwatchTrigger ? ' themed-select-swatch-host themed-select-trigger--theme' : ''
        }`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
      >
        {useThemeSwatchTrigger ? (
          <span className="themed-select-value flex w-full min-w-0 items-center justify-between gap-2 text-left">
            <span className="min-w-0 flex-1">
              <ThemeOptionSwatch
                dataTheme={value}
                label={selected.label}
                sublabel={selected.sublabel}
                layout={themeSwatchLayout}
              />
            </span>
            <ChevronDown
              className={`themed-select-chevron h-4 w-4 flex-shrink-0 transition-transform ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </span>
        ) : (
          <span className="themed-select-value flex w-full min-w-0 items-center justify-between gap-2 text-left">
            <span className="truncate">{displayLabel}</span>
            <ChevronDown
              className={`themed-select-chevron h-4 w-4 flex-shrink-0 transition-transform ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </span>
        )}
      </button>

      {open && (appShellEl ? createPortal(panel, appShellEl) : panel)}
    </div>
  );
}
