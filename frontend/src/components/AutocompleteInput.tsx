"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Search, Loader2, X } from "lucide-react";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  onSelect?: (value: string) => void;
}

export function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder = "Digite para buscar...",
  loading = false,
  disabled = false,
  error = false,
  id,
  onSelect,
}: AutocompleteInputProps) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState(value);
  const containerRef          = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const listRef               = useRef<HTMLUListElement>(null);
  const [highlighted, setHighlighted] = useState(-1);

  // Sync external value → internal query
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 40);

  const select = useCallback((val: string) => {
    setQuery(val);
    onChange(val);
    onSelect?.(val);
    setOpen(false);
    setHighlighted(-1);
  }, [onChange, onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true); return; }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted(h => Math.min(h + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted(h => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlighted >= 0 && filtered[highlighted]) select(filtered[highlighted]);
        else setOpen(false);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  // Scroll highlighted into view
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search
          size={13}
          style={{
            position: "absolute", left: 11, top: "50%",
            transform: "translateY(-50%)",
            color: open ? "var(--brand)" : "var(--text-muted)",
            pointerEvents: "none",
            transition: "color 0.2s",
          }}
        />
        <input
          ref={inputRef}
          id={id}
          className="input"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            paddingLeft: 30,
            paddingRight: 32,
            fontSize: "13px",
            borderColor: error
              ? "var(--error)"
              : open
              ? "var(--brand)"
              : undefined,
            transition: "border-color 0.2s",
          }}
          onChange={e => {
            const v = e.target.value;
            setQuery(v);
            onChange(v);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => {
            setOpen(true);
            setHighlighted(-1);
          }}
          onKeyDown={handleKeyDown}
        />
        {/* Right icon: loader / clear / chevron */}
        <span
          style={{
            position: "absolute", right: 10, top: "50%",
            transform: "translateY(-50%)",
            display: "flex", alignItems: "center",
            color: "var(--text-muted)", cursor: "pointer",
          }}
          onClick={() => {
            if (query) { setQuery(""); onChange(""); inputRef.current?.focus(); setOpen(true); }
            else { setOpen(o => !o); inputRef.current?.focus(); }
          }}
        >
          {loading ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : query ? (
            <X size={13} />
          ) : (
            <ChevronDown
              size={14}
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          )}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          ref={listRef}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            zIndex: 9999,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            maxHeight: 240,
            overflowY: "auto",
            listStyle: "none",
            margin: 0, padding: "4px 0",
          }}
        >
          {loading ? (
            <li style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Carregando...
            </li>
          ) : filtered.length === 0 ? (
            <li style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "12px" }}>
              {query ? `Nenhum resultado para "${query}" - mas pode digitar livremente.` : "Nenhuma opção"}
            </li>
          ) : (
            filtered.map((opt, i) => {
              const isHL = i === highlighted;
              // highlight matching part
              const idx = opt.toLowerCase().indexOf(query.toLowerCase());
              const before = opt.slice(0, idx);
              const match  = opt.slice(idx, idx + query.length);
              const after  = opt.slice(idx + query.length);
              return (
                <li
                  key={opt}
                  onMouseDown={e => { e.preventDefault(); select(opt); }}
                  onMouseEnter={() => setHighlighted(i)}
                  style={{
                    padding: "9px 14px",
                    fontSize: "13px",
                    cursor: "pointer",
                    background: isHL ? "var(--brand-light)" : "transparent",
                    color: isHL ? "var(--brand)" : "var(--text-primary)",
                    transition: "background 0.1s",
                  }}
                >
                  {idx >= 0 && query ? (
                    <>{before}<strong style={{ color: "var(--brand)" }}>{match}</strong>{after}</>
                  ) : opt}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
