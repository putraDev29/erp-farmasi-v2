"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Check, Building2, Phone, MapPin } from "lucide-react";
import { api } from "@/lib/api";

interface CariSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (supplier: any) => void;
  selectedId?: string;
}

export const CariSupplierModal: React.FC<CariSupplierModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedId,
}) => {
  const [keyword, setKeyword] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(selectedId || null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers-search", keyword],
    queryFn: async () => {
      const res = await api.get(`/suppliers?search=${encodeURIComponent(keyword)}`);
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleSelect = (s: any) => {
    onSelect(s);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#00c875] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-white" />
            <h3 className="font-bold text-white text-sm">Pilih Supplier...</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter / Search */}
        <div className="p-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari kode, nama supplier, telepon, alamat..."
                className="w-full h-6 pl-8 pr-3 py-0 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 text-slate-400" />
            </div>
            <button
              type="button"
              onClick={() => {}}
              className="h-6 px-3.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
        </div>

        {/* Supplier Table */}
        <div className="overflow-y-auto max-h-[400px] flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 w-10 text-center">Pilih</th>
                <th className="py-2 px-3 w-28">Kode</th>
                <th className="py-2 px-3">Nama Supplier</th>
                <th className="py-2 px-3 w-36">Telepon</th>
                <th className="py-2 px-3">Alamat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Memuat data supplier...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data supplier.
                  </td>
                </tr>
              ) : (
                suppliers.map((s: any) => {
                  const isChosen = highlightedId === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setHighlightedId(s.id)}
                      onDoubleClick={() => handleSelect(s)}
                      className={`cursor-pointer transition ${
                        isChosen
                          ? "bg-sky-50 font-medium text-sky-950"
                          : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="radio"
                          name="selected_supplier"
                          checked={isChosen}
                          onChange={() => setHighlightedId(s.id)}
                          className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{s.code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{s.phone || "-"}</td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{s.address || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Ditemukan: <strong className="text-slate-800">{suppliers.length}</strong> supplier
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium text-xs transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!highlightedId}
              onClick={() => {
                const s = suppliers.find((x: any) => x.id === highlightedId);
                if (s) handleSelect(s);
              }}
              className="px-4 py-1.5 bg-[#009b62] hover:bg-[#008754] text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pilih Supplier</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
