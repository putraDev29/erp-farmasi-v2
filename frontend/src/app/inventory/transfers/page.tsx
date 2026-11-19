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
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatDate } from "@/lib/api";

export default function TransfersListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [sortBy, setSortBy] = useState("Tanggal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: [
      "transfers",
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
      if (selectedWarehouse && selectedWarehouse !== "all") params.append("warehouse_id", selectedWarehouse);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/inventory/transfers?${params.toString()}`);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/inventory/transfers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setSelectedId(null);
      setDeleteConfirmOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Gagal menghapus item transfer");
    },
  });

  const totalPages = Math.max(1, Math.ceil(transfers.length / pageSize));
  const paginated = transfers.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1">
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
          Hal {transfers.length === 0 ? "1/0" : `${page}/${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || transfers.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["transfers"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Cari"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={() => router.push("/inventory/transfers/new")}
        className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
        <span>Tambah</span>
      </button>

      <button
        type="button"
        disabled={!selectedId}
        className="h-6 px-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
      >
        <Pencil className="w-3 h-3 stroke-[2.5]" />
        <span>Ubah</span>
      </button>

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
      {/* 1. TOP HEADER */}
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
            Daftar Item Transfer
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

      {/* 2. FILTER SECTION (Matching Screenshot 10/11) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 space-y-1.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Kata Kunci :</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari transaksi..."
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
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="h-6 w-7 border border-slate-300 rounded flex items-center justify-center hover:bg-slate-100 bg-white"
                title="Arah Urutan"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOP TOOLBAR */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* 4. MAIN DATA TABLE (8 Columns matching Screenshot 10/11) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold">
              <th className="py-1 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Dari</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Tujuan</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-1 px-2.5 border-r border-slate-200">User Buat</th>
              <th className="py-1 px-2.5 border-r border-slate-200">User Ubah</th>
              <th className="py-1 px-2.5">Komputer</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Memuat data...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-24 text-center text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginated.map((tr: any) => {
                const isSelected = selectedId === tr.id;
                return (
                  <tr
                    key={tr.id}
                    onClick={() => setSelectedId(isSelected ? null : tr.id)}
                    className={`border-b border-slate-200 cursor-pointer transition ${
                      isSelected ? "bg-amber-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {tr.transfer_no}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {formatDate(tr.date)}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {tr.from_warehouse?.name || "UTAMA"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {tr.to_warehouse?.name || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600 max-w-xs truncate">
                      {tr.notes || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {tr.created_by_name || "ADMIN2"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {tr.updated_by_name || "-"}
                    </td>
                    <td className="py-1 px-2.5 text-slate-600">
                      {tr.computer_name || "SERVER"}
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

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-slate-200 p-4 text-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Hapus Item Transfer</h3>
            <p className="text-slate-600">
              Apakah Anda yakin ingin menghapus data item transfer yang dipilih?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-6 px-3 border border-slate-300 rounded text-slate-600 hover:bg-slate-100 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                disabled={deleteMutation.isPending}
                className="h-6 px-3 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded text-xs transition disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
