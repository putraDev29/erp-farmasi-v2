"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  FileText,
  ClipboardList,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function MarketplaceOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Ketoko Spec (Image 2)
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [orderFilter, setOrderFilter] = useState("Semua Pesanan Marketplace");
  const [processStatus, setProcessStatus] = useState("Semua");
  const [orderStatus, setOrderStatus] = useState("");
  const [sortBy, setSortBy] = useState("Tanggal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [logModalOpen, setLogModalOpen] = useState(false);

  // Queries
  const { data: sales = [], isLoading } = useQuery({
    queryKey: [
      "marketplace-orders",
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
      params.append("type", "MARKETPLACE");
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

  const totalPages = Math.max(1, Math.ceil(sales.length / pageSize));
  const paginatedSales = sales.slice((page - 1) * pageSize, page * pageSize);

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
        onClick={() => queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Cari"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Daftar Penjualan button (Sky blue like screenshot) */}
      <Link
        href="/sales/invoices"
        className="h-6 px-2.5 bg-[#4ba3e3] hover:bg-[#388ecf] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95"
      >
        <FileText className="w-3 h-3" />
        <span>Daftar Penjualan</span>
      </Link>

      {/* Log Get Order button (White with border) */}
      <button
        type="button"
        onClick={() => setLogModalOpen(true)}
        className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition"
      >
        <ClipboardList className="w-3 h-3 text-slate-500" />
        <span>Log Get Order</span>
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
            Daftar Pesanan Marketplace
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

      {/* 2. FILTER SECTION (2 Rows matching Image 2) */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Pesanan :</label>
            <div className="flex gap-1">
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Semua Pesanan Marketplace">Semua Pesanan Marketplace</option>
                <option value="Shopee">Shopee</option>
                <option value="Tokopedia">Tokopedia</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Lazada">Lazada</option>
              </select>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600 shrink-0"
                title="Get Order dari Marketplace"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status Proses :</label>
            <select
              value={processStatus}
              onChange={(e) => setProcessStatus(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua</option>
              <option value="PROCESSED">Sudah Jadi Faktur</option>
              <option value="UNPROCESSED">Belum Jadi Faktur</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status Pesanan :</label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 text-slate-500"
            >
              <option value="">Select...</option>
              <option value="READY_TO_SHIP">Perlu Dikirim</option>
              <option value="SHIPPED">Dalam Pengiriman</option>
              <option value="DELIVERED">Selesai</option>
              <option value="CANCELLED">Batal</option>
            </select>
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
                <option value="Marketplace">Marketplace</option>
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

      {/* 4. TABLE VIEW (10 Columns Matching Image 2) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Nota (Marketplace)</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Marketplace</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama Toko</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Status Pesanan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Jumlah Pesan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Jumlah Terima</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  Memuat data pesanan marketplace...
                </td>
              </tr>
            ) : paginatedSales.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedSales.map((s: any) => {
                const isSelected = selectedId === s.id;
                const totalQty = s.items?.reduce((sum: number, it: any) => sum + (it.qty || 0), 0) || 0;

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(isSelected ? null : s.id)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      {s.invoice_no}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                      {s.notes?.includes("MP:") ? s.notes : "231118XX998AA"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">
                        Shopee
                      </span>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                      Apotek Berkat Official
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">
                        READY_TO_SHIP
                      </span>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {formatDate(s.date)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right">
                      {totalQty.toFixed(2)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right text-slate-500">
                      0.00
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                      {s.notes || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 text-right font-bold text-slate-800">
                      {formatCurrency(s.total_amount)}
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

      {/* LOG MODAL */}
      {logModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 space-y-3 border text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                Log Get Order Marketplace
              </h3>
              <button onClick={() => setLogModalOpen(false)}>✕</button>
            </div>
            <div className="bg-slate-900 text-emerald-400 p-3 rounded font-mono text-[11px] h-48 overflow-y-auto space-y-1">
              <div>[2026-11-18 18:25:01] INFO: Initializing Shopee Open API sync...</div>
              <div>[2026-11-18 18:25:02] INFO: Token validated for shop: Apotek Berkat Official</div>
              <div>[2026-11-18 18:25:03] SUCCESS: Fetched 0 new pending orders.</div>
              <div>[2026-11-18 18:25:04] INFO: Tokopedia API status: IDLE</div>
              <div>[2026-11-18 18:25:05] SYNC COMPLETE. Next check in 5 minutes.</div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="h-6 px-3 bg-slate-700 text-white rounded hover:bg-slate-800 text-[11px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
