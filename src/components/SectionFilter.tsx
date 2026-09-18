import { useEffect, useRef, useState } from 'react';

interface Props {
  areas: string[];
  selected: string[]; // vacío = "Completo" (todas)
  onChange: (next: string[]) => void;
}

export function SectionFilter({ areas, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const toggleArea = (area: string) => {
    if (selected.includes(area)) {
      onChange(selected.filter((a) => a !== area));
    } else {
      onChange([...selected, area]);
    }
  };

  const label = selected.length === 0
    ? 'Completo'
    : selected.length === 1
      ? selected[0]
      : `${selected.length} secciones`;

  return (
    <div className="section-filter" ref={rootRef}>
      <button
        type="button"
        className="section-filter-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label}</span>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="section-filter-panel" role="listbox" aria-multiselectable="true">
          <label className="section-filter-option section-filter-option--all">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => onChange([])}
            />
            Completo
          </label>
          <div className="section-filter-divider" />
          {areas.map((a) => (
            <label key={a} className="section-filter-option">
              <input
                type="checkbox"
                checked={selected.includes(a)}
                onChange={() => toggleArea(a)}
              />
              {a}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
