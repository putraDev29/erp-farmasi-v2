"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Check, User, Phone, MapPin, Building2 } from "lucide-react";
import { api } from "@/lib/api";

interface CariPelangganModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: any) => void;
  selectedId?: string;
}

export const CariPelangganModal: React.FC<CariPelangganModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedId,
}) => {
  const [keyword, setKeyword] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(selectedId || null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers-search-modal", keyword],
    queryFn: async () => {
      const res = await api.get(`/customers?search=${encodeURIComponent(keyword)}`);
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleSelect = (c: any) => {
    onSelect(c);
    onClose();
  };

  const selectedCustomer = customers.find((c: any) => c.id === highlightedId);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header - Ketoko Green Theme */}
        <div className="px-4 py-2.5 bg-[#00c875] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-white" />
            <h3 className="font-bold text-white text-sm">Pilih Pelanggan / Sarana Pemesan...</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded transition"
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
                placeholder="Cari kode, nama pelanggan, telepon, alamat, izin sarana..."
                className="w-full h-7 pl-8 pr-3 py-0 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 text-slate-400" />
            </div>
            <button
              type="button"
              className="h-7 px-3.5 bg-[#00c875] hover:bg-[#00b066] text-white rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-y-auto max-h-[380px] flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 w-10 text-center">Pilih</th>
                <th className="py-2 px-3 w-28">Kode</th>
                <th className="py-2 px-3">Nama Pelanggan</th>
                <th className="py-2 px-3 w-32">Kategori</th>
                <th className="py-2 px-3 w-32">Telepon</th>
                <th className="py-2 px-3">Alamat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Memuat data pelanggan...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data pelanggan.
                  </td>
                </tr>
              ) : (
                customers.map((c: any) => {
                  const isChosen = highlightedId === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setHighlightedId(c.id)}
                      onDoubleClick={() => handleSelect(c)}
                      className={`cursor-pointer transition ${
                        isChosen
                          ? "bg-emerald-50 font-medium text-emerald-950"
                          : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="radio"
                          name="selected_customer"
                          checked={isChosen}
                          onChange={() => setHighlightedId(c.id)}
                          className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{c.code || "CUST-001"}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {c.name}
                        {c.is_pharmacy_facility && (
                          <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                            {c.pharmacy_type || "PBF/Sarana"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {c.customer_group || c.pharmacy_type || "Reguler"}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{c.phone || "-"}</td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{c.address || "-"}</td>
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
            Ditemukan: <strong className="text-slate-800">{customers.length}</strong> pelanggan
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              className="h-7 px-3 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium rounded transition"
            >
              Tanpa Pelanggan (Umum)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-3.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!selectedCustomer}
              onClick={() => selectedCustomer && handleSelect(selectedCustomer)}
              className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded shadow-2xs transition disabled:opacity-40 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Pilih Pelanggan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
