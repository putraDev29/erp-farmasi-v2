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
  ChevronLeft as BackIcon,
  FileCheck2,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { sortTableData } from "@/components/common/TableSortSelect";
import { useAuthStore } from "@/lib/auth-store";
import { AlurVerifikasiReturPenjualanModal } from "@/components/sales/AlurVerifikasiReturPenjualanModal";

export default function SalesReturnsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isGudang = Boolean(
    user?.roles?.some((r: any) => {
      const roleName = (typeof r === "string" ? r : r?.name || "").toUpperCase();
      return roleName.includes("GUDANG");
    }) || user?.username?.toLowerCase() === "gudang"
  );
  const isAdmin = !isGudang;

  // Filters matching Ketoko Spec (Image 4)
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals & Menu
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isAlurModalOpen, setIsAlurModalOpen] = useState(false);
  const [selectedReturnForAlurId, setSelectedReturnForAlurId] = useState<string | null>(null);

  // Queries
  const { data: returns = [], isLoading } = useQuery({
    queryKey: [
      "sales-returns",
      keyword,
      selectedWarehouse,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await api.get(`/sales/returns?${params.toString()}`);
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
      return await api.delete(`/sales/returns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
  });

  const sortedReturns = sortTableData(returns, sortOption, {
    getCode: (r: any) => r.return_no,
    getName: (r: any) => r.customer?.name,
    getDate: (r: any) => r.created_at || r.return_date,
  });
  const totalPages = Math.max(1, Math.ceil(sortedReturns.length / pageSize));
  const paginatedReturns = sortedReturns.slice((page - 1) * pageSize, page * pageSize);

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
        onClick={() => queryClient.invalidateQueries({ queryKey: ["sales-returns"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Cari"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* + Tambah dropdown button (Green) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Tambah</span>
        </button>
        {addMenuOpen && (
          <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded shadow-lg py-1 z-30 text-[11px]">
            <Link
              href="/sales/returns/mode1"
              className="block px-3 py-1.5 hover:bg-emerald-50 text-slate-800 font-semibold"
              onClick={() => setAddMenuOpen(false)}
            >
              Retur Baru Mode 1
            </Link>
            <Link
              href="/sales/returns/mode2"
              className="block px-3 py-1.5 hover:bg-emerald-50 text-slate-800 font-semibold border-t border-slate-100"
              onClick={() => setAddMenuOpen(false)}
            >
              Retur Baru Mode 2
            </Link>
          </div>
        )}
      </div>

      {/* ✏️ Ubah button (Blue) */}
      <button
        type="button"
        disabled={!selectedId}
        className="h-6 px-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
      >
        <Pencil className="w-3 h-3 stroke-[2.5]" />
        <span>Ubah</span>
      </button>

      {/* 📋 Alur Verifikasi Retur */}
      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          if (!selectedId) {
            alert("Silakan pilih baris retur penjualan terlebih dahulu.");
            return;
          }
          setSelectedReturnForAlurId(selectedId);
          setIsAlurModalOpen(true);
        }}
        className="h-6 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 cursor-pointer"
        title="Buka Alur Terpadu Verifikasi Retur Penjualan (Pemeriksaan Fisik, Approval, Restock & Jurnal)"
      >
        <FileCheck2 className="w-3.5 h-3.5" />
        <span>Alur Verifikasi</span>
      </button>

      {/* 🗑️ Hapus button (Red) */}
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
            Daftar Retur Penjualan
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

      {/* 2. FILTER SECTION (1 Row matching Image 4) */}
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
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 font-medium shadow-2xs truncate cursor-pointer"
            >
              <option value="created_at_desc">1. Urutan sesuai waktu input paling atas</option>
              <option value="code_asc">2. Kode (A - Z)</option>
              <option value="code_desc">3. Kode (Z - A)</option>
              <option value="name_asc">4. Nama (A - Z)</option>
              <option value="name_desc">5. Nama (Z - A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TOP TOOLBAR */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* 4. TABLE SECTION (8 Columns Matching Image 4) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Alur</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Pajak</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Mode Retur</th>
              <th className="py-0.5 px-2.5">Komputer</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  Memuat data retur penjualan...
                </td>
              </tr>
            ) : paginatedReturns.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedReturns.map((r: any) => {
                const isSelected = selectedId === r.id;

                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(isSelected ? null : r.id)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(r.id);
                          setSelectedReturnForAlurId(r.id);
                          setIsAlurModalOpen(true);
                        }}
                        className="hover:underline text-emerald-700 font-semibold text-left"
                        title="Klik untuk membuka Alur Verifikasi Retur"
                      >
                        {r.return_no}
                      </button>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {formatDate(r.date)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                      {r.customer?.name || "Pelanggan Umum"}
                    </td>
                    <td className="py-0.5 px-2 border-r border-slate-100 text-center">
                      {r.status === "DRAFT" && (
                        <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold text-[10px]">
                          1. Draft
                        </span>
                      )}
                      {(r.status === "VERIFIED_WAREHOUSE" || r.status === "VERIFIKASI_GUDANG") && (
                        <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-[10px]">
                          2. Konfirmasi Gudang
                        </span>
                      )}
                      {(r.status === "APPROVED" || r.status === "DISETUJUI_ADMIN" || r.status === "BARANG_DITERIMA" || r.status === "RESTOCKED") && (
                        <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold text-[10px]">
                          3. Disetujui Admin
                        </span>
                      )}
                      {(r.status === "SELESAI" || r.status === "POSTED") && (
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[10px]">
                          ✓ Selesai
                        </span>
                      )}
                      {(r.status === "REJECTED" || r.status === "DITOLAK") && (
                        <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold text-[10px]">
                          ✕ Ditolak
                        </span>
                      )}
                      {!["DRAFT", "VERIFIED_WAREHOUSE", "VERIFIKASI_GUDANG", "APPROVED", "DISETUJUI_ADMIN", "BARANG_DITERIMA", "RESTOCKED", "SELESAI", "POSTED", "REJECTED", "DITOLAK"].includes(r.status) && (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px]">
                          {r.status || "POSTED"}
                        </span>
                      )}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {r.tax_type || "Non"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                      {formatCurrency(r.total_amount)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                      {r.reason || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                        {r.return_mode || "MODE_1"}
                      </span>
                    </td>
                    <td className="py-0.5 px-2.5 text-slate-500 font-mono">
                      {r.computer_name || "KOMPUTER-01"}
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
            <h3 className="font-bold text-slate-800 text-sm">Hapus Retur Penjualan</h3>
            <p className="text-slate-600 text-[11px]">
              Apakah Anda yakin ingin menghapus dokumen retur yang dipilih?
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
      {/* ALUR VERIFIKASI RETUR PENJUALAN MODAL */}
      <AlurVerifikasiReturPenjualanModal
        isOpen={isAlurModalOpen}
        onClose={() => {
          setIsAlurModalOpen(false);
          setSelectedReturnForAlurId(null);
        }}
        returnId={selectedReturnForAlurId}
        isGudang={isGudang}
        isAdmin={isAdmin}
      />
    </div>
  );
}
