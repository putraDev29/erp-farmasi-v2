"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  Wallet,
  FileBarChart,
  Printer,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { StrukKasirThermalModal } from "@/components/sales/StrukKasirThermalModal";

export default function CashierListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Ketoko Spec (Image 8)
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [sortBy, setSortBy] = useState("Tanggal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showPending, setShowPending] = useState(false);

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPrintReceiptOpen, setIsPrintReceiptOpen] = useState(false);
  const [printReceiptSaleId, setPrintReceiptSaleId] = useState<string | null>(null);

  // Queries
  const { data: sales = [], isLoading } = useQuery({
    queryKey: [
      "cashier-sales",
      keyword,
      selectedWarehouse,
      startDate,
      endDate,
      sortBy,
      sortDir,
      showPending,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("type", "POS");
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/sales?${params.toString()}`);
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-sales"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
  });

  const totalPages = Math.max(1, Math.ceil(sales.length / pageSize));
  const paginatedSales = sales.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1 flex-wrap">
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
        onClick={() => queryClient.invalidateQueries({ queryKey: ["cashier-sales"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Cari"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* + Tambah button (Opens Penjualan Kasir Baru) */}
      <Link
        href="/sales/cashier/new"
        className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
        title="Buka Penjualan Kasir Baru (Retail OTC)"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
        <span>Tambah</span>
      </Link>

      {/* ✏️ Ubah button */}
      <button
        type="button"
        disabled={!selectedId}
        onClick={() => selectedId && router.push(`/sales/cashier/${selectedId}/edit`)}
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

      {/* 🖨️ Cetak Struk button */}
      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          if (selectedId) {
            setPrintReceiptSaleId(selectedId);
            setIsPrintReceiptOpen(true);
          }
        }}
        className="h-6 px-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        title="Cetak Struk Kasir Thermal (58mm / 80mm)"
      >
        <Printer className="w-3 h-3 stroke-[2.5]" />
        <span>Cetak Struk</span>
      </button>

      {/* Laporan button */}
      <Link
        href="/reports/sales"
        className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
      >
        <FileBarChart className="w-3.5 h-3.5 text-indigo-600" />
        <span>Laporan</span>
      </Link>

      {/* Kas Laci button */}
      <button
        type="button"
        onClick={() => alert("Informasi Kas Laci Kasir (1-1110 KAS KECIL):\nSemua transaksi kasir otomatis masuk ke Akun Kas Kecil.")}
        className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
      >
        <Wallet className="w-3.5 h-3.5 text-amber-600" />
        <span>Kas Laci (Kas Kecil)</span>
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
            Daftar Kasir
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

      {/* 2. FILTER SECTION (2 Rows Matching Image 8) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 space-y-1.5 shadow-2xs">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
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
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px] items-center">
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
                <option value="Pelanggan">Pelanggan</option>
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
          <div className="flex items-center gap-2 pt-4">
            <input
              type="checkbox"
              id="pendingCheck"
              checked={showPending}
              onChange={(e) => setShowPending(e.target.checked)}
              className="w-3.5 h-3.5 border rounded"
            />
            <label htmlFor="pendingCheck" className="text-slate-700 font-semibold cursor-pointer">
              Tampil Pending
            </label>
          </div>
        </div>
      </div>

      {/* 3. TOP TOOLBAR */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* 4. TABLE SECTION (15 Columns Matching Image 8) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-200 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-2 border-r border-slate-200 text-center w-8">Aksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Dept/Gudang</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Sales</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Pajak</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tipe Bayar</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Bayar (POS)</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">User Buat</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">User Ubah</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Komputer</th>
              <th className="py-0.5 px-2.5">Komputer Update</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={15} className="text-center py-12 text-slate-400">
                  Memuat data transaksi kasir...
                </td>
              </tr>
            ) : paginatedSales.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedSales.map((s: any) => {
                const isSelected = selectedId === s.id;

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(isSelected ? null : s.id)}
                    onDoubleClick={() => router.push(`/sales/cashier/${s.id}/edit`)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-0.5 px-2 border-r border-slate-100 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/sales/cashier/${s.id}/edit`);
                          }}
                          className="text-sky-600 hover:text-sky-800 p-0.5"
                          title="Ubah / Lihat Transaksi"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintReceiptSaleId(s.id);
                            setIsPrintReceiptOpen(true);
                          }}
                          className="text-emerald-600 hover:text-emerald-800 p-0.5"
                          title="Cetak Struk Kasir Thermal"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      {s.invoice_no}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {formatDate(s.date)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {s.warehouse?.name || "UTAMA"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                      {s.customer?.name || "Pelanggan Umum"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-500">
                      {s.sales_rep?.name || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {s.tax_percent > 0 ? `${s.tax_percent}%` : "Non"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                      {formatCurrency(s.total_amount)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {s.payments?.[0]?.method || "Tunai"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      <span className="px-2 py-0.5 bg-[#00c875] text-white rounded font-bold text-[10px]">
                        LUNAS
                      </span>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 max-w-[120px] truncate text-slate-600">
                      {s.notes || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                      {s.user?.username || "ADMIN2"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-400">
                      -
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-500">
                      KOMPUTER-01
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

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3 border text-center">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Hapus Transaksi Kasir</h3>
            <p className="text-slate-600 text-[11px]">
              Apakah Anda yakin ingin membatalkan transaksi kasir yang dipilih?
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

      {/* MODAL CETAK STRUK KASIR THERMAL */}
      <StrukKasirThermalModal
        isOpen={isPrintReceiptOpen}
        onClose={() => {
          setIsPrintReceiptOpen(false);
          setPrintReceiptSaleId(null);
        }}
        saleId={printReceiptSaleId}
      />
    </div>
  );
}
