"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Search,
  Settings as ProcessIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import ItemSearchModal from "@/components/inventory/ItemSearchModal";

export default function SerialHistoryPage() {
  const router = useRouter();

  // Filters matching Screenshot 5 (2 Rows)
  const [itemCode, setItemCode] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [statusFilter, setStatusFilter] = useState("History Serial");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");

  // Selection & Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Queries
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["serial-history-products"],
    queryFn: async () => {
      const res = await api.get("/products?page_size=200");
      return res.data?.data?.items || res.data?.data || [];
    },
  });

  // Filtered List
  const filteredList = useMemo(() => {
    if (!itemCode && !serialNo) {
      return [];
    }

    return products.filter((p: any) => {
      if (itemCode && !p.code?.toLowerCase().includes(itemCode.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [products, itemCode, serialNo]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginated = filteredList.slice((page - 1) * pageSize, page * pageSize);

  const renderPaginationToolbar = () => (
    <div className="flex items-center gap-1.5">
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
          Hal {filteredList.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || filteredList.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setPage(1);
          refetch();
        }}
        className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95"
        title="Proses Pencarian Riwayat Serial"
      >
        <ProcessIcon className="w-3 h-3 animate-spin-hover" />
        <span>Proses</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. Header: [< Riwayat Serial] + User Context */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Riwayat Serial
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

      {/* 2. Filter Section matching Screenshot 5 (2 Rows) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 space-y-1.5 shadow-2xs">
        {/* ROW 1: Kode Item | No Serial | Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold mb-0.5">Kode Item :</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Pilih kode item..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setIsItemModalOpen(true)}
                className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">No Serial :</label>
            <input
              type="text"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
              placeholder="Nomor serial / batch..."
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status :</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="History Serial">History Serial</option>
              <option value="Tersedia">Tersedia</option>
              <option value="Terjual">Terjual</option>
              <option value="Keluar">Keluar</option>
            </select>
          </div>
        </div>

        {/* ROW 2: Tanggal Dari | Tanggal Sampai */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Dari :</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Sampai :</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Top Toolbar: Pagination + [⚙️ Proses] */}
      <div className="shrink-0">{renderPaginationToolbar()}</div>

      {/* 4. Table matching Screenshot 5 (3 Columns: Kode Item | Nama Item | Jenis) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-3 border-r border-slate-200 w-48">Kode Item</th>
              <th className="py-0.5 px-3 border-r border-slate-200">Nama Item</th>
              <th className="py-0.5 px-3 w-48">Jenis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="py-20 text-center text-slate-400">
                  Memuat data riwayat serial...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-24 text-center text-slate-400 font-normal">
                  No data
                </td>
              </tr>
            ) : (
              paginated.map((p: any) => (
                <tr key={p.id} className="h-6 transition hover:bg-slate-50">
                  <td className="py-0.5 px-3 font-mono border-r border-slate-200">
                    {p.code}
                  </td>
                  <td className="py-0.5 px-3 font-semibold text-slate-800 border-r border-slate-200">
                    {p.name}
                  </td>
                  <td className="py-0.5 px-3 text-slate-600">
                    {p.category?.name || "Obat"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Bottom Toolbar matching Screenshot 5 */}
      <div className="shrink-0 pt-0.5">
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
            Hal {filteredList.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || filteredList.length === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ITEM SEARCH MODAL */}
      <ItemSearchModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={(items: any[]) => {
          if (items && items.length > 0) {
            setItemCode(items[0].code || "");
          }
          setIsItemModalOpen(false);
        }}
      />
    </div>
  );
}
