"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  AlertCircle,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function SalesCommissionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Ketoko Spec (Image 15)
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [sortBy, setSortBy] = useState("Tanggal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [formSalesRepId, setFormSalesRepId] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("KAS");
  const [formTotalAmount, setFormTotalAmount] = useState<number>(0);
  const [formNotes, setFormNotes] = useState("");

  // Queries
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: [
      "sales-commissions",
      keyword,
      selectedWarehouse,
      startDate,
      endDate,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await api.get(`/sales/commissions?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps"],
    queryFn: async () => {
      const res = await api.get("/sales-reps");
      return res.data?.data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/sales/commissions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-commissions"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal membuat pembayaran komisi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/sales/commissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-commissions"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal menghapus pembayaran komisi");
    },
  });

  const resetForm = () => {
    setFormSalesRepId(salesReps[0]?.id || "");
    setFormPaymentMethod("KAS");
    setFormTotalAmount(0);
    setFormNotes("");
    setErrorMsg(null);
  };

  const totalPages = Math.max(1, Math.ceil(commissions.length / pageSize));
  const paginatedCommissions = commissions.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1">
      {/* Pagination pill */}
      <div className="inline-flex items-center border border-slate-300 rounded bg-white text-[11px] text-slate-700 h-6">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-semibold px-2.5 h-full flex items-center text-[11px]">
          Hal {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cari button */}
      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["sales-commissions"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Cari"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* + Tambah button (Green) */}
      <button
        type="button"
        onClick={() => {
          resetForm();
          setModalOpen(true);
        }}
        className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
        <span>Tambah</span>
      </button>

      {/* ✏️ Ubah button */}
      <button
        type="button"
        disabled={!selectedId}
        className="h-6 px-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
      >
        <Pencil className="w-3 h-3 stroke-[2.5]" />
        <span>Ubah</span>
      </button>

      {/* 🗑️ Hapus button */}
      <button
        type="button"
        onClick={() => setDeleteConfirmOpen(true)}
        disabled={!selectedId}
        className="h-6 px-2.5 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
      >
        <Trash2 className="w-3 h-3 stroke-[2.5]" />
        <span>Hapus</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Daftar Pembayaran Komisi Sales
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            33
          </span>
          <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            A
          </span>
          <span>ADMIN2</span>
        </div>
      </div>

      {/* 2. FILTER SECTION (1 Row Matching Image 15) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Kata Kunci :</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Dept/Gudang :</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">UTAMA - APOTEK BERKAT</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Dari :</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Sampai :</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Tanggal">Tanggal</option>
                <option value="No Transaksi">No Transaksi</option>
                <option value="Sales">Sales</option>
                <option value="Total">Total</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="h-6 w-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600 shrink-0"
                title={`Urutan: ${sortDir.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOP TOOLBAR */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* 4. TABLE SECTION (10 Columns Matching Image 15) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-200 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-2 border-r border-slate-200 text-center w-8">Aksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Cara Bayar</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kode Sales</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">User Buat</th>
              <th className="py-0.5 px-2.5">User Ubah</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  Memuat data pembayaran komisi sales...
                </td>
              </tr>
            ) : paginatedCommissions.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedCommissions.map((c: any) => {
                const isSelected = selectedId === c.id;

                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(isSelected ? null : c.id)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-0.5 px-2 border-r border-slate-100 text-center">
                      <button className="text-sky-600 hover:text-sky-800">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      {c.payment_no}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {formatDate(c.date)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {c.payment_method || "KAS"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                      {c.sales_rep?.code || "SLS-01"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                      {c.sales_rep?.name || "Sales Utama"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                      {c.notes || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                      {formatCurrency(c.total_amount)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                      {c.user?.username || "ADMIN2"}
                    </td>
                    <td className="py-0.5 px-2.5 text-slate-400">
                      -
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM TOOLBAR */}
      <div className="shrink-0 pt-0.5">{renderToolbar()}</div>

      {/* CREATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-emerald-600 text-white font-bold text-xs">
              <span>Tambah Pembayaran Komisi Sales</span>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-[11px]">
              {errorMsg && (
                <div className="p-2 bg-red-50 text-red-700 rounded border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1">Sales Representative</label>
                <select
                  value={formSalesRepId}
                  onChange={(e) => setFormSalesRepId(e.target.value)}
                  className="w-full h-7 px-2 border rounded"
                >
                  {salesReps.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || "SLS"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Cara Bayar</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full h-7 px-2 border rounded"
                >
                  <option value="KAS">KAS / TUNAI</option>
                  <option value="BANK_TRANSFER">TRANSFER BANK</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Total Komisi (Rp)</label>
                <input
                  type="number"
                  value={formTotalAmount}
                  onChange={(e) => setFormTotalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-7 px-2 border rounded font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Keterangan</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full h-7 px-2 border rounded"
                  placeholder="Catatan komisi sales..."
                />
              </div>
            </div>

            <div className="px-4 py-2 border-t bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-6 px-3 border border-slate-300 rounded hover:bg-slate-100 text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() =>
                  createMutation.mutate({
                    sales_rep_id: formSalesRepId,
                    payment_method: formPaymentMethod,
                    total_amount: formTotalAmount,
                    notes: formNotes,
                  })
                }
                disabled={createMutation.isPending || !formSalesRepId || formTotalAmount <= 0}
                className="h-6 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold disabled:opacity-50"
              >
                {createMutation.isPending ? "Menyimpan..." : "Simpan Komisi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3 border text-center">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Hapus Pembayaran Komisi</h3>
            <p className="text-slate-600 text-[11px]">
              Apakah Anda yakin ingin menghapus data pembayaran komisi yang dipilih?
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-6 px-3 border rounded hover:bg-slate-100 text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                className="h-6 px-3 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-[11px]"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
