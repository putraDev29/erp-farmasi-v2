"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Check, ShoppingCart, Calendar, Building2 } from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

interface CariPesananModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (po: any) => void;
  supplierId?: string;
}

export const CariPesananModal: React.FC<CariPesananModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  supplierId,
}) => {
  const [keyword, setKeyword] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const { data: pos = [], isLoading } = useQuery({
    queryKey: ["pos-search-modal", keyword, supplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (supplierId) params.append("supplier_id", supplierId);
      const res = await api.get(`/purchases/orders?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleSelect = (po: any) => {
    onSelect(po);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">Pilih Pesanan Pembelian (PO)...</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded transition"
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
                placeholder="Cari nomor PO, supplier, atau catatan..."
                className="w-full h-6 pl-8 pr-3 py-0 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>
        </div>

        {/* Table of Open POs */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 h-7 text-[10.5px]">
              <tr>
                <th className="py-1 px-3 w-16 text-center">Pilih</th>
                <th className="py-1 px-3">No Transaksi</th>
                <th className="py-1 px-3">Tanggal</th>
                <th className="py-1 px-3">Supplier</th>
                <th className="py-1 px-3 text-right">Total PO</th>
                <th className="py-1 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Memuat daftar pesanan...
                  </td>
                </tr>
              ) : pos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Tidak ada pesanan pembelian yang ditemukan.
                  </td>
                </tr>
              ) : (
                pos.map((po: any) => {
                  const isHighlighted = highlightedId === po.id;
                  return (
                    <tr
                      key={po.id}
                      onClick={() => setHighlightedId(po.id)}
                      onDoubleClick={() => handleSelect(po)}
                      className={`cursor-pointer transition-colors h-7 border-b border-slate-100 ${
                        isHighlighted
                          ? "bg-sky-50 text-sky-950 font-medium"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <td className="py-1 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelect(po)}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition"
                        >
                          Pilih
                        </button>
                      </td>
                      <td className="py-1 px-3 font-medium text-slate-800">{po.order_no}</td>
                      <td className="py-1 px-3">{formatDate(po.date)}</td>
                      <td className="py-1 px-3">{po.supplier?.name || "-"}</td>
                      <td className="py-1 px-3 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="py-1 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            po.process_status === "Selesai"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {po.process_status || "Belum Proses"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Ditemukan <strong>{pos.length}</strong> pesanan pembelian. Klik dua kali untuk memilih.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-white text-xs transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CariPesananModal;
