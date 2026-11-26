"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  AlertCircle,
  FileText,
  RotateCcw,
  CheckCircle2,
  Boxes,
  Truck,
  Building2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { sortTableData } from "@/components/common/TableSortSelect";
import { AlurVerifikasiReturModal } from "@/components/purchasing/AlurVerifikasiReturModal";

export default function PurchaseReturnsPage() {
  const queryClient = useQueryClient();

  // Filters state
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [activeWorkflowReturnId, setActiveWorkflowReturnId] = useState<string | null>(null);

  // Queries
  const { data: returns = [], isLoading } = useQuery({
    queryKey: [
      "purchase-returns",
      keyword,
      selectedWarehouse,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (selectedWarehouse && selectedWarehouse !== "all") params.append("warehouse_id", selectedWarehouse);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await api.get(`/purchases/returns?${params.toString()}`);
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

  // Client-side filtering by status
  const filteredReturns = useMemo(() => {
    if (!statusFilter || statusFilter === "all") return returns;
    return returns.filter((r: any) => {
      if (statusFilter === "SELESAI") {
        return r.status === "SELESAI" || r.status === "POSTED";
      }
      return r.status === statusFilter;
    });
  }, [returns, statusFilter]);

  // Client-side sorting & pagination
  const sortedReturns = sortTableData(filteredReturns, sortOption, {
    getCode: (r: any) => r.return_no,
    getName: (r: any) => r.supplier?.name,
    getDate: (r: any) => r.created_at || r.date,
  });
  const totalPages = Math.max(1, Math.ceil(sortedReturns.length / pageSize));
  const paginatedReturns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedReturns.slice(start, start + pageSize);
  }, [sortedReturns, page, pageSize]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/purchases/returns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      alert("Gagal menghapus retur: " + (err.response?.data?.message || err.message));
    },
  });

  const selectedReturn = returns.find((r: any) => r.id === selectedId);

  const renderStatusBadge = (status: string) => {
    const s = status || "DRAFT";
    if (s === "SELESAI" || s === "POSTED") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          <span>Selesai</span>
        </span>
      );
    }
    if (s === "DITOLAK") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <ShieldAlert className="w-3 h-3" />
          <span>Ditolak</span>
        </span>
      );
    }
    if (s === "MENUNGGU_KONFIRMASI_PBF") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
          <Building2 className="w-3 h-3" />
          <span>Konfirmasi PBF</span>
        </span>
      );
    }
    if (s === "DALAM_PENGIRIMAN") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
          <Truck className="w-3 h-3" />
          <span>Dalam Kirim</span>
        </span>
      );
    }
    if (s === "DISETUJUI_ADMIN") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <CheckCircle2 className="w-3 h-3" />
          <span>Disetujui Admin</span>
        </span>
      );
    }
    if (s === "VERIFIKASI_GUDANG") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Boxes className="w-3 h-3" />
          <span>Verifikasi Gudang</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-slate-150 text-slate-700 border border-slate-300">
        <Clock className="w-3 h-3" />
        <span>Draft</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. HEADER BAR */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-rose-500 rounded-xs inline-block" />
            Daftar Retur Pembelian Obat
          </h1>
          
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/purchasing/returns/mode1"
            className="h-6 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retur Baru Mode 1</span>
          </Link>
          <Link
            href="/purchasing/returns/mode2"
            className="h-6 px-3 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Retur Baru Mode 2</span>
          </Link>
        </div>
      </div>

      {/* 2. FILTER SECTION */}
      <div className="shrink-0 bg-white p-2 rounded-lg shadow-2xs border border-slate-200 space-y-1.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-1.5 text-xs">
          {/* Kata Kunci */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Kata Kunci :</label>
            <input
              type="text"
              placeholder="No Retur / Supplier / Alasan"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Dept / Gudang */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Dept/Gudang :</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-rose-500 truncate"
            >
              <option value="all">Semua Gudang</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Alur */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Status Alur :</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-rose-500 truncate font-medium"
            >
              <option value="all">Semua Status</option>
              <option value="DRAFT">1. Draft</option>
              <option value="VERIFIKASI_GUDANG">2. Verifikasi Gudang</option>
              <option value="DISETUJUI_ADMIN">3. Disetujui Admin</option>
              <option value="DALAM_PENGIRIMAN">4. Dalam Pengiriman</option>
              <option value="MENUNGGU_KONFIRMASI_PBF">5. Konfirmasi PBF</option>
              <option value="SELESAI">6. Selesai (Final)</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>

          {/* Tanggal Dari */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Tanggal Dari :</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Tanggal Sampai */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Tanggal Sampai :</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Urut Berdasar */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Urut Berdasar :</label>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-rose-500 font-medium shadow-2xs truncate cursor-pointer"
            >
              <option value="created_at_desc">1. Input Paling Baru</option>
              <option value="code_asc">2. No Transaksi (A - Z)</option>
              <option value="code_desc">3. No Transaksi (Z - A)</option>
              <option value="name_asc">4. Supplier (A - Z)</option>
              <option value="name_desc">5. Supplier (Z - A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR ACTIONS */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs">
          {/* Pagination Controls */}
          <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-2xs h-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition rounded-l"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold px-2.5 h-full flex items-center text-xs text-slate-700">
              Hal {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition rounded-r"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Return Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setModeSelectOpen(!modeSelectOpen)}
              className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
              <span>Tambah Retur</span>
            </button>
            {modeSelectOpen && (
              <div className="absolute left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-xs animate-in fade-in">
                <Link
                  href="/purchasing/returns/mode1"
                  className="block px-3 py-1.5 hover:bg-rose-50 text-slate-800 font-medium"
                  onClick={() => setModeSelectOpen(false)}
                >
                  <strong className="block text-rose-700 text-xs">Retur Baru Mode 1</strong>
                  <span className="text-[10px] text-slate-500">Berdasarkan Faktur Asal</span>
                </Link>
                <Link
                  href="/purchasing/returns/mode2"
                  className="block px-3 py-1.5 hover:bg-rose-50 text-slate-800 font-medium border-t border-slate-100"
                  onClick={() => setModeSelectOpen(false)}
                >
                  <strong className="block text-slate-800 text-xs">Retur Baru Mode 2</strong>
                  <span className="text-[10px] text-slate-500">Input Item Langsung</span>
                </Link>
              </div>
            )}
          </div>

          {/* Action Button: Alur Verifikasi Retur */}
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) {
                setActiveWorkflowReturnId(selectedId);
                setWorkflowModalOpen(true);
              }
            }}
            className="h-6 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>Alur Verifikasi Retur</span>
          </button>

          <button
            type="button"
            disabled={!selectedId}
            onClick={() => setDeleteConfirmOpen(true)}
            className="h-6 px-3 bg-[#f095a5] hover:bg-[#e28395] text-white font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>Hapus</span>
          </button>

          <button
            type="button"
            disabled={!selectedId}
            onClick={() => setPrintModalOpen(true)}
            className="h-6 px-3 bg-[#9faab5] hover:bg-[#8e9aa5] text-white font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>Cetak Retur</span>
          </button>
        </div>

        <div className="text-[10.5px] text-slate-500 font-medium">
          Total: <strong className="text-slate-800">{sortedReturns.length}</strong> retur ditemukan
        </div>
      </div>

      {/* 4. TABLE VIEW */}
      <div className="flex-1 min-h-0 bg-white rounded-lg shadow-2xs border border-slate-300 overflow-auto">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6.5 text-[10.5px]">
            <tr>
              <th className="py-0.5 px-2 w-16 text-center border-r border-slate-200">Aksi</th>
              <th className="py-0.5 px-2 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2 border-r border-slate-200 text-center">Status Alur</th>
              <th className="py-0.5 px-2 border-r border-slate-200">Dept/Gudang</th>
              <th className="py-0.5 px-1.5 border-r border-slate-200">Kode Supplier</th>
              <th className="py-0.5 px-2 border-r border-slate-200">Nama Supplier</th>
              <th className="py-0.5 px-2 text-right border-r border-slate-200">Pajak</th>
              <th className="py-0.5 px-2 text-right border-r border-slate-200">Total</th>
              <th className="py-0.5 px-2 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-1.5 text-center border-r border-slate-200">Mode</th>
              <th className="py-0.5 px-2 border-r border-slate-200">User Buat</th>
              <th className="py-0.5 px-2 border-r border-slate-200">User Ubah</th>
              <th className="py-0.5 px-2">Komputer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={14} className="text-center py-8 text-slate-400">
                  Memuat data retur pembelian...
                </td>
              </tr>
            ) : paginatedReturns.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-8 text-slate-400">
                  Tidak ada data retur pembelian.
                </td>
              </tr>
            ) : (
              paginatedReturns.map((r: any) => {
                const isSelected = selectedId === r.id;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    onDoubleClick={() => {
                      setActiveWorkflowReturnId(r.id);
                      setWorkflowModalOpen(true);
                    }}
                    className={`cursor-pointer transition-colors h-6.5 border-b border-slate-100 ${
                      isSelected
                        ? "bg-rose-50/70 font-medium text-slate-900"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <td className="py-0.5 px-2 text-center border-r border-slate-100">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(r.id);
                            setActiveWorkflowReturnId(r.id);
                            setWorkflowModalOpen(true);
                          }}
                          className="text-rose-600 hover:text-rose-800 p-0.5 hover:bg-rose-100 rounded inline-flex items-center"
                          title="Buka Alur Verifikasi Retur"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(r.id);
                            setPrintModalOpen(true);
                          }}
                          className="text-slate-600 hover:text-slate-800 p-0.5 hover:bg-slate-100 rounded inline-flex items-center"
                          title="Lihat Bukti Retur"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-0.5 px-2 font-mono font-medium text-slate-800 border-r border-slate-100">
                      {r.return_no}
                    </td>
                    <td className="py-0.5 px-2 text-slate-600 border-r border-slate-100">
                      {formatDate(r.date)}
                    </td>
                    <td className="py-0.5 px-2 text-center border-r border-slate-100">
                      {renderStatusBadge(r.status)}
                    </td>
                    <td className="py-0.5 px-2 text-slate-600 border-r border-slate-100">
                      {r.warehouse?.name || "UTAMA - APOTEK"}
                    </td>
                    <td className="py-0.5 px-1.5 font-mono text-slate-500 border-r border-slate-100">
                      {r.supplier?.code || "-"}
                    </td>
                    <td className="py-0.5 px-2 font-medium text-slate-800 border-r border-slate-100">
                      {r.supplier?.name || "-"}
                    </td>
                    <td className="py-0.5 px-2 text-right font-mono text-slate-600 border-r border-slate-100">
                      {formatCurrency(r.tax_amount || 0)}
                    </td>
                    <td className="py-0.5 px-2 text-right font-mono font-semibold text-rose-700 border-r border-slate-100">
                      {formatCurrency(r.total_amount)}
                    </td>
                    <td className="py-0.5 px-2 text-slate-500 max-w-xs truncate border-r border-slate-100">
                      {r.reason || "-"}
                    </td>
                    <td className="py-0.5 px-1.5 text-center border-r border-slate-100">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-semibold ${
                          r.return_mode === "MODE_1"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {r.return_mode === "MODE_1" ? "Mode 1" : "Mode 2"}
                      </span>
                    </td>
                    <td className="py-0.5 px-2 text-slate-600 border-r border-slate-100">
                      {r.user?.username || "-"}
                    </td>
                    <td className="py-0.5 px-2 text-slate-600 border-r border-slate-100">
                      {r.modifier?.username || "-"}
                    </td>
                    <td className="py-0.5 px-2 text-slate-500 text-[10px]">
                      {r.computer_name || "WEB"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div className="shrink-0 pt-0.5 flex items-center justify-between">
        <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-2xs h-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition rounded-l"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold px-2.5 h-full flex items-center text-xs text-slate-700">
            Hal {sortedReturns.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || sortedReturns.length === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition rounded-r"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. MODAL ALUR VERIFIKASI RETUR */}
      <AlurVerifikasiReturModal
        isOpen={workflowModalOpen}
        onClose={() => setWorkflowModalOpen(false)}
        returnId={activeWorkflowReturnId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
        }}
      />

      {/* 6. MODAL KONFIRMASI HAPUS */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-800">Hapus Dokumen Retur?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Yakin ingin menghapus dokumen retur <strong>{selectedReturn?.return_no}</strong>?
                {selectedReturn?.status === "DALAM_PENGIRIMAN" || selectedReturn?.status === "SELESAI" ? (
                  <span className="block mt-1 text-rose-600 font-bold">
                    Dokumen yang sudah dikirim atau selesai tidak dapat dihapus.
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Retur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CETAK NOTA RETUR BERSTANDAR CDOB */}
      {printModalOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 print:p-0 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <h3 className="font-bold text-base text-slate-800">Cetak Bukti Retur Pembelian Obat</h3>
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Printable Document Sheet */}
            <div className="border border-slate-200 p-6 rounded-xl bg-white space-y-4 text-xs font-sans print:border-none print:p-0">
              <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">PT FARMASI MEDIKA NUSANTARA</h2>
                  <p className="text-[11px] text-slate-500">Jl. Farmasi Raya No. 128, Jakarta Pusat</p>
                  <p className="text-[11px] text-slate-500">Izin PBF / SIA: 442/0129/SIA/DPMPTSP/2026 • Telp: (021) 555-8899</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-rose-600">SURAT PENGEMBALIAN BARANG (RETUR)</h3>
                  <p className="font-mono text-slate-800 font-bold text-xs">{selectedReturn.return_no}</p>
                  <p className="text-slate-500 text-[11px]">{formatDate(selectedReturn.date)}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">
                    Status: {selectedReturn.status || "DRAFT"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-600 text-[10.5px]">Distributor / Supplier PBF Tujuan :</p>
                  <p className="font-bold text-slate-900 text-xs">{selectedReturn.supplier?.name}</p>
                  <p className="text-slate-500 text-[10.5px]">{selectedReturn.supplier?.address || "Alamat Supplier"}</p>
                  <p className="text-slate-500 text-[10.5px]">Telp: {selectedReturn.supplier?.phone || "-"}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-right">
                  <p className="font-semibold text-slate-600 text-[10.5px]">Gudang Pengirim Apotek :</p>
                  <p className="font-bold text-slate-900 text-xs">{selectedReturn.warehouse?.name || "Gudang Utama"}</p>
                  <p className="text-slate-500 text-[10.5px]">Alasan Retur: <strong>{selectedReturn.reason || "-"}</strong></p>
                  {selectedReturn.pbf_return_doc_no && (
                    <p className="text-emerald-700 text-[10.5px] font-bold">
                      No Nota Retur PBF: {selectedReturn.pbf_return_doc_no}
                    </p>
                  )}
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-left mt-2 text-[10.5px]">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="border border-slate-300 p-1.5 text-center w-8">No</th>
                    <th className="border border-slate-300 p-1.5">Kode & Nama Obat</th>
                    <th className="border border-slate-300 p-1.5 text-center">Batch & ED</th>
                    <th className="border border-slate-300 p-1.5 text-center">Kondisi</th>
                    <th className="border border-slate-300 p-1.5 text-right w-16">Qty Retur</th>
                    <th className="border border-slate-300 p-1.5 text-right w-20">Harga Pokok</th>
                    <th className="border border-slate-300 p-1.5 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReturn.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="border border-slate-300 p-1.5 text-center">{i + 1}</td>
                      <td className="border border-slate-300 p-1.5">
                        <strong className="block text-slate-900">{it.product?.name}</strong>
                        <span className="font-mono text-[9.5px] text-slate-500">{it.product?.code}</span>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono">
                        <div>{it.batch_number || "-"}</div>
                        <div className="text-slate-500">{formatDate(it.expired_date)}</div>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center">
                        <span className="px-1 py-0.2 bg-slate-100 rounded text-[9.5px]">
                          {it.item_condition || "BAIK"}
                        </span>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-bold text-rose-700">
                        {it.qty} {it.unit?.name || "PCS"}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono">
                        {formatCurrency(it.unit_price)}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-semibold font-mono">
                        {formatCurrency(it.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="border border-slate-300 p-1.5 text-right font-bold">
                      Subtotal Nilai Retur :
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold font-mono">
                      {formatCurrency(selectedReturn.sub_total || selectedReturn.total_amount)}
                    </td>
                  </tr>
                  {selectedReturn.tax_amount > 0 && (
                    <tr>
                      <td colSpan={6} className="border border-slate-300 p-1.5 text-right font-bold">
                        Pajak (PPN) :
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-bold font-mono">
                        {formatCurrency(selectedReturn.tax_amount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={6} className="border border-slate-300 p-1.5 text-right font-bold text-rose-700">
                      Total Nilai Retur Pembelian :
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold font-mono text-rose-700">
                      {formatCurrency(selectedReturn.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* 4 SIGNATURE BOXES (STANDAR CDOB BPOM) */}
              <div className="grid grid-cols-4 gap-2 pt-6 text-center text-[10px]">
                <div className="border border-slate-200 p-2 rounded">
                  <p className="text-slate-600 mb-12">1. Dibuat Oleh (Admin),</p>
                  <p className="font-bold underline">{selectedReturn.user?.full_name || selectedReturn.user?.username || "Admin Apotek"}</p>
                  <p className="text-slate-400">Tgl: {formatDate(selectedReturn.date)}</p>
                </div>
                <div className="border border-slate-200 p-2 rounded">
                  <p className="text-slate-600 mb-12">2. Diperiksa Fisik (Gudang),</p>
                  <p className="font-bold underline">{selectedReturn.warehouse_verifier?.full_name || "Petugas Gudang"}</p>
                  <p className="text-slate-400">
                    {selectedReturn.warehouse_verified_at ? formatDate(selectedReturn.warehouse_verified_at) : "(               )"}
                  </p>
                </div>
                <div className="border border-slate-200 p-2 rounded">
                  <p className="text-slate-600 mb-12">3. Disetujui (Apoteker/Pimpinan),</p>
                  <p className="font-bold underline">{selectedReturn.admin_approver?.full_name || "Apoteker Penanggung Jawab"}</p>
                  <p className="text-slate-400">
                    {selectedReturn.admin_approved_at ? formatDate(selectedReturn.admin_approved_at) : "(               )"}
                  </p>
                </div>
                <div className="border border-slate-200 p-2 rounded">
                  <p className="text-slate-600 mb-12">4. Diterima Oleh (Distributor PBF),</p>
                  <p className="font-bold underline">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</p>
                  <p className="text-slate-400">Cap / Tanda Tangan PBF</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Dokumen Retur</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
