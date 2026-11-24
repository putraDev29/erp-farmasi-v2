"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

export interface AccountOption {
  id?: string;
  code?: string;
  account_code?: string;
  name?: string;
  account_name?: string;
  category?: string;
  classification?: string;
  balance?: number;
  [key: string]: any;
}

export interface SearchableAccountSelectProps {
  accounts: AccountOption[];
  value: string;
  onChange: (value: string, account?: AccountOption) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export const SearchableAccountSelect: React.FC<SearchableAccountSelectProps> = ({
  accounts = [],
  value,
  onChange,
  placeholder = "Select / Pilih Akun...",
  className = "",
  disabled = false,
  allowClear = true,
  buttonClassName = "",
  dropdownClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputSearchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize account representation
  const normalizedAccounts = useMemo(() => {
    return (accounts || []).map((acc) => {
      const code = acc.code || acc.account_code || "";
      const name = acc.name || acc.account_name || "";
      const id = String(acc.id || code || "");
      const category = acc.category || acc.classification || "";
      return {
        ...acc,
        _id: id,
        _code: code,
        _name: name,
        _category: category,
        _label: code ? `${code} - ${name}` : name,
      };
    });
  }, [accounts]);

  // Selected account
  const selectedAccount = useMemo(() => {
    if (!value || value === "all" || value === "Select...") return null;
    return (
      normalizedAccounts.find(
        (a) => a._id === String(value) || a._code === String(value) || a.id === value
      ) || null
    );
  }, [normalizedAccounts, value]);

  // Filtered accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return normalizedAccounts;
    const q = search.toLowerCase().trim();
    return normalizedAccounts.filter(
      (a) =>
        a._code.toLowerCase().includes(q) ||
        a._name.toLowerCase().includes(q) ||
        a._category.toLowerCase().includes(q)
    );
  }, [normalizedAccounts, search]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setHighlightIndex(0);
      setTimeout(() => {
        inputSearchRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < filteredAccounts.length ? prev + 1 : prev));
      scrollIntoView(highlightIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : 0));
      scrollIntoView(highlightIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredAccounts[highlightIndex]) {
        handleSelect(filteredAccounts[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-account-item]");
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  };

  const handleSelect = (item: any) => {
    onChange(item._id, item);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-left font-sans text-xs select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-6 px-1.5 py-0 flex items-center justify-between border border-slate-300 rounded bg-white text-left text-[11px] hover:border-slate-400 focus:outline-none focus:border-sky-500 transition ${
          disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "cursor-pointer"
        } ${buttonClassName}`}
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedAccount ? (
            <>
              {selectedAccount._code && (
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shrink-0 text-[10px]">
                  {selectedAccount._code}
                </span>
              )}
              <span className="font-medium text-slate-800 truncate">
                {selectedAccount._name}
              </span>
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-0.5 ml-1 shrink-0 text-slate-400">
          {allowClear && selectedAccount && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
              title="Hapus pilihan akun"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3 h-3 text-slate-500 transition-transform ${
              isOpen ? "rotate-180 text-sky-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-md bg-white border border-slate-300 rounded shadow-xl z-50 overflow-hidden flex flex-col text-xs animate-in fade-in-50 zoom-in-95 duration-100 ${dropdownClassName}`}
          style={{ zIndex: 9999 }}
        >
          {/* Search Box Header */}
          <div className="p-1.5 bg-slate-50 border-b border-slate-200">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
              <input
                ref={inputSearchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder="Ketik kode atau nama akun..."
                className="w-full h-6 pl-7 pr-6 py-0 bg-white border border-slate-300 rounded text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Accounts List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-0.5"
          >
            {filteredAccounts.length === 0 ? (
              <div className="py-6 px-3 text-center text-slate-400 text-[11px]">
                Tidak ditemukan akun dengan kata kunci &quot;{search}&quot;
              </div>
            ) : (
              filteredAccounts.map((item, idx) => {
                const isSelected = selectedAccount?._id === item._id;
                const isHighlighted = highlightIndex === idx;

                return (
                  <div
                    key={item._id || idx}
                    data-account-item
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`px-2 py-1.5 flex items-center justify-between cursor-pointer transition text-[11px] rounded ${
                      isSelected
                        ? "bg-sky-50 text-sky-900 font-semibold"
                        : isHighlighted
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {item._code && (
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded text-[10px] shrink-0">
                          {item._code}
                        </span>
                      )}
                      <span className="truncate">{item._name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item._category && (
                        <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200 uppercase">
                          {item._category}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer showing count */}
          <div className="px-2 py-1 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Ditemukan: <strong>{filteredAccounts.length}</strong> akun</span>
            <span className="text-slate-400">Tekan Enter untuk memilih</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableAccountSelect;
