"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Hash, Edit2, Search, Check, AlertCircle, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const TX_NAMES: Record<string, string> = {
  PO: "Pesanan Pembelian (Purchase Order)",
  PI: "Faktur Pembelian (Purchase Invoice)",
  RB: "Retur Pembelian (Purchase Return)",
  SO: "Pesanan Penjualan (Sales Order)",
  SI: "Faktur Penjualan & Kasir POS",
  SR: "Retur Penjualan (Sales Return)",
  ST: "Transfer Item Antar Gudang",
  OP: "Stock Opname Penyesuaian",
  AO: "Pesanan Perakitan Obat",
  PAY_IN: "Kas Masuk / Pembayaran Piutang",
  PAY_OUT: "Kas Keluar / Pembayaran Hutang",
  JV: "Jurnal Umum Akuntansi",
  PR: "Permintaan Pembelian",
};

export default function NumberingTransactionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form fields
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [counterLength, setCounterLength] = useState(5);
  const [resetPeriod, setResetPeriod] = useState("YEARLY");
  const [currentNumber, setCurrentNumber] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data: formats = [], isLoading } = useQuery({
    queryKey: ["numbering-transactions"],
    queryFn: async () => {
      const res = await api.get("/settings/numbering?category=transaction");
      return res.data?.data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/settings/numbering/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["numbering-transactions"] });
      setEditingItem(null);
      setToastMsg("Format nomor transaksi berhasil diperbarui!");
      setTimeout(() => setToastMsg(null), 3500);
    },
  });

  const handleOpenEdit = (f: any) => {
    setEditingItem(f);
    setPrefix(f.prefix || "");
    setSuffix(f.suffix || "");
    setCounterLength(f.counter_length || 5);
    setResetPeriod(f.reset_period || "YEARLY");
    setCurrentNumber(f.current_number || 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateMutation.mutate({
      id: editingItem.id,
      payload: {
        prefix,
        suffix,
        counter_length: Number(counterLength),
        reset_period: resetPeriod,
        current_number: Number(currentNumber),
      },
    });
  };

  const filteredFormats = useMemo(() => {
    if (!search.trim()) return formats;
    const q = search.toLowerCase();
    return formats.filter(
      (f: any) =>
        f.doc_type?.toLowerCase().includes(q) ||
        f.prefix?.toLowerCase().includes(q) ||
        (TX_NAMES[f.doc_type] || "").toLowerCase().includes(q)
    );
  }, [formats, search]);

  const generateExample = (f: any) => {
    const num = String((f.current_number || 0) + 1).padStart(f.counter_length || 5, "0");
    const yearMonth = "2026/11/";
    return `${f.prefix || ""}${yearMonth}${num}${f.suffix || ""}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {toastMsg && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Setting Nomor Transaksi</h1>
        </div>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 pl-8 pr-2.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-medium"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col min-h-0 space-y-2 overflow-hidden">
        <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 flex flex-col shadow-2xs overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200">Jenis Dokumen Transaksi</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Awalan (Prefix)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Panjang Digit</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Nomor Terakhir</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Siklus Reset</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Contoh Format Keluaran</th>
                  <th className="py-2.5 px-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-600" />
                      <span>Memuat format nomor transaksi...</span>
                    </td>
                  </tr>
                ) : filteredFormats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada format transaksi ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredFormats.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        {TX_NAMES[f.doc_type] || f.doc_type}
                        <span className="ml-1.5 text-[10px] font-mono text-slate-400">({f.doc_type})</span>
                      </td>
                      <td className="py-2 px-3 font-bold text-emerald-700 font-mono border-r border-slate-200">
                        {f.prefix}
                      </td>
                      <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                        {f.counter_length} Digit
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                        {f.current_number}
                      </td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-200">
                        {f.reset_period}
                      </td>
                      <td className="py-2 px-3 font-mono text-cyan-700 font-bold border-r border-slate-200">
                        {generateExample(f)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(f)}
                          className="h-6 px-2 bg-sky-500 hover:bg-sky-600 text-white rounded font-bold text-[10px] flex items-center justify-center gap-1 mx-auto transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Ubah</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL EDIT */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-xs text-slate-800">
                Ubah Format: {TX_NAMES[editingItem.doc_type] || editingItem.doc_type}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Awalan Dokumen (Prefix) *
                </label>
                <input
                  type="text"
                  required
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Contoh: INV/"
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Panjang Digit
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={10}
                    value={counterLength}
                    onChange={(e) => setCounterLength(Number(e.target.value))}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nomor Terakhir
                  </label>
                  <input
                    type="number"
                    value={currentNumber}
                    onChange={(e) => setCurrentNumber(Number(e.target.value))}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Siklus Reset Nomor
                </label>
                <select
                  value={resetPeriod}
                  onChange={(e) => setResetPeriod(e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-slate-300 rounded font-semibold text-slate-800"
                >
                  <option value="YEARLY">YEARLY (Reset ke 1 Setiap Tahun Baru)</option>
                  <option value="MONTHLY">MONTHLY (Reset ke 1 Setiap Bulan Baru)</option>
                  <option value="DAILY">DAILY (Reset ke 1 Setiap Hari Baru)</option>
                  <option value="NEVER">NEVER (Berlanjut Tanpa Reset)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="h-8 px-3 bg-white border border-slate-300 text-slate-700 font-bold rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
