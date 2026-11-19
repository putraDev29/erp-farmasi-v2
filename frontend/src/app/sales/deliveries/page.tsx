"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Truck,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function SalesDeliveriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Ketoko Spec (Image 12)
  const [keyword, setKeyword] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [courier, setCourier] = useState("");
  const [status, setStatus] = useState("Semua");
  const [sortBy, setSortBy] = useState("No Transaksi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [trackModalOpen, setTrackModalOpen] = useState(false);

  // Queries
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: [
      "sales-deliveries",
      keyword,
      trackingNo,
      courier,
      status,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (trackingNo) params.append("tracking_no", trackingNo);
      if (courier) params.append("courier", courier);
      if (status && status !== "Semua") params.append("status", status);

      const res = await api.get(`/sales/deliveries?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const totalPages = Math.max(1, Math.ceil(deliveries.length / pageSize));
  const paginatedDeliveries = deliveries.slice((page - 1) * pageSize, page * pageSize);

  const selectedDelivery = deliveries.find((d: any) => d.id === selectedId);

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
            Data Pengiriman
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

      {/* 2. FILTER SECTION (2 Rows Matching Image 12) */}
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
            <label className="block text-slate-600 font-semibold mb-0.5">No Resi :</label>
            <input
              type="text"
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Kurir :</label>
            <input
              type="text"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status Kirim :</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua</option>
              <option value="DIPROSES">Diproses</option>
              <option value="DIKIRIM">Dikirim</option>
              <option value="DITERIMA">Diterima</option>
            </select>
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
                <option value="No Transaksi">No Transaksi</option>
                <option value="Tgl Kirim">Tgl Kirim</option>
                <option value="Kurir">Kurir</option>
                <option value="Status">Status</option>
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
          <div className="pt-4">
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["sales-deliveries"] })}
              className="h-6 px-3 bg-[#4ba3e3] hover:bg-[#388ecf] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR ACTIONS (Matching Image 12) */}
      <div className="shrink-0 flex items-center gap-1.5 py-0.5">
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

        {/* ✏️ Ubah button */}
        <button
          type="button"
          disabled={!selectedId}
          className="h-6 px-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        >
          <Pencil className="w-3 h-3 stroke-[2.5]" />
          <span>Ubah</span>
        </button>

        {/* Lacak Pengiriman button */}
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => setTrackModalOpen(true)}
          className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Lacak Pengiriman</span>
        </button>

        {/* 🖨️ Cetak button */}
        <button
          type="button"
          onClick={() => window.print()}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
        </button>
      </div>

      {/* 4. TABLE SECTION (8 Columns Matching Image 12) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Dari</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kepada</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total Pesan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tgl Kirim</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Ekspedisi</th>
              <th className="py-0.5 px-2.5">No Resi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  Memuat data pengiriman...
                </td>
              </tr>
            ) : paginatedDeliveries.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedDeliveries.map((del: any) => {
                const isSelected = selectedId === del.id;

                return (
                  <tr
                    key={del.id}
                    onClick={() => setSelectedId(isSelected ? null : del.id)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      {del.delivery_no}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {del.sender || "APOTEK BERKAT"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                      {del.recipient}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                      {formatCurrency(del.total_order)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold text-[10px]">
                        {del.status || "DIKIRIM"}
                      </span>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {formatDate(del.delivery_date)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {del.courier || "JNE"}
                    </td>
                    <td className="py-0.5 px-2.5 font-mono text-slate-700">
                      {del.tracking_no || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div className="shrink-0 pt-0.5 flex items-center gap-1.5">
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
            Hal {deliveries.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || deliveries.length === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TRACKING MODAL */}
      {trackModalOpen && selectedDelivery && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-3 border text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                Lacak Pengiriman ({selectedDelivery.tracking_no || selectedDelivery.delivery_no})
              </h3>
              <button onClick={() => setTrackModalOpen(false)}>✕</button>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Ekspedisi:</span>
                <span className="font-bold text-slate-800">{selectedDelivery.courier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penerima:</span>
                <span className="font-medium text-slate-800">{selectedDelivery.recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-600">{selectedDelivery.status}</span>
              </div>
              <div className="border-t pt-2 space-y-2">
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-700">Paket telah diserahkan ke kurir</div>
                    <div className="text-[10px] text-slate-400">18/11/2026 14:00</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-700">Dalam perjalanan menuju kota tujuan</div>
                    <div className="text-[10px] text-slate-400">18/11/2026 16:30</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setTrackModalOpen(false)}
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
