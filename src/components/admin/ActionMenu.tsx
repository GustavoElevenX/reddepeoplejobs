import { MoreHorizontal } from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

const closeMenuContext = createContext<() => void>(() => undefined);

type ActionMenuProps = {
  label?: string;
  align?: 'left' | 'right';
  children: ReactNode;
  className?: string;
};

export function ActionMenu({ label = 'Ações', align = 'right', children, className }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const left =
      align === 'right'
        ? Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth))
        : Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.left));
    const opensUpward = window.innerHeight - rect.bottom < 260 && rect.top > 260;
    setPosition(
      opensUpward
        ? { bottom: window.innerHeight - rect.top + 8, left, width: menuWidth }
        : { top: rect.bottom + 8, left, width: menuWidth },
    );

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    function closeOnResize() {
      setOpen(false);
    }

    function closeOnScroll(event: Event) {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnResize);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnResize);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [align, open]);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label === 'icon' ? 'Abrir ações' : undefined}
        aria-expanded={open}
        className="focus-ring flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-surface-200 bg-white px-3 text-sm font-bold text-ink-700 transition hover:bg-surface-50"
        onClick={() => setOpen((current) => !current)}
      >
        {label === 'icon' ? <MoreHorizontal size={17} /> : label}
      </button>
      {open
        ? createPortal(
            <closeMenuContext.Provider value={() => setOpen(false)}>
              <div
                ref={menuRef}
                role="menu"
                style={position}
                className="fixed z-[80] max-h-[min(360px,calc(100vh-16px))] overflow-y-auto rounded-xl border border-surface-200 bg-white p-1.5 shadow-2xl"
              >
                {children}
              </div>
            </closeMenuContext.Provider>,
            document.body,
          )
        : null}
    </div>
  );
}

type ActionMenuItemProps = {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionMenuItem({ children, onClick, danger = false, disabled = false }: ActionMenuItemProps) {
  const closeMenu = useContext(closeMenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onClick();
        closeMenu();
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
        danger ? 'text-redde-700 hover:bg-redde-50' : 'text-ink-700 hover:bg-surface-100',
      )}
    >
      {children}
    </button>
  );
}
