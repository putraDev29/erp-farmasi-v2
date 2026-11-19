"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Cog,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function SalesPriceHistoryPage() {
  const router = useRouter();

  // Filters matching Ketoko Spec (Image 11)
  const [itemFrom, setItemFrom] = useState("");
  const [itemTo, setItemTo] = useState("");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [customerId, setCustomerId] = useState("");
  const [salesRepId, setSalesRepId] = useState("");

  // Sort dropdowns (Right Block)
  const [sort1, setSort1] = useState("Tanggal");
  const [sortDir1, setSortDir1] = useState<"asc" | "desc">("desc");
  const [sort2, setSort2] = useState("Pelanggan");
  const [sortDir2, setSortDir2] = useState<"asc" | "desc">("asc");
  const [sort3, setSort3] = useState("Kode Item");
  const [sortDir3, setSortDir3] = useState<"asc" | "desc">("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
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

  const { data: priceHistory = [], isLoading, refetch } = useQuery({
    queryKey: [
      "sales-price-history",
      customerId,
      salesRepId,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerId && customerId !== "all") params.append("customer_id", customerId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const res = await api.get(`/sales/price-history?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const totalPages = Math.max(1, Math.ceil(priceHistory.length / pageSize));
  const paginatedData = priceHistory.slice((page - 1) * pageSize, page * pageSize);

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
            History Harga Jual
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

      {/* 2. SPLIT FILTER SECTION (Matching Image 11) */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-12 gap-2 text-[11px]">
        {/* Left Block (col-span-8) */}
        <div className="md:col-span-8 bg-white p-2 rounded border border-slate-200 shadow-2xs space-y-1.5">
          {/* Row 1: Item Dari & Sampai */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Item Dari :</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Kode Item Asal"
                  value={itemFrom}
                  onChange={(e) => setItemFrom(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
                />
                <button
                  type="button"
                  className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Item Sampai :</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Kode Item Tujuan"
                  value={itemTo}
                  onChange={(e) => setItemTo(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
                />
                <button
                  type="button"
                  className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Tanggal Dari & Sampai */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Dari :</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Sampai :</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
              />
            </div>
          </div>

          {/* Row 3: Pelanggan & Sales */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Pelanggan :</label>
              <div className="flex gap-1">
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-700"
                >
                  <option value="all">Semua Pelanggan</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Sales :</label>
              <div className="flex gap-1">
                <select
                  value={salesRepId}
                  onChange={(e) => setSalesRepId(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-500"
                >
                  <option value="">Select...</option>
                  {salesReps.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Pagination & Proses */}
          <div className="flex items-center gap-2 pt-1">
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

            <button
              type="button"
              onClick={() => refetch()}
              className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <Cog className="w-3.5 h-3.5" />
              <span>Proses</span>
            </button>
          </div>
        </div>

        {/* Right Block (col-span-4) Order By Box */}
        <div className="md:col-span-4 bg-white p-2 rounded border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-center">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <div className="flex gap-1">
              <select
                value={sort1}
                onChange={(e) => setSort1(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white"
              >
                <option value="Tanggal">Tanggal</option>
                <option value="Pelanggan">Pelanggan</option>
                <option value="Kode Item">Kode Item</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir1((p) => (p === "asc" ? "desc" : "asc"))}
                className="h-6 w-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600 shrink-0"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <div className="flex gap-1">
              <select
                value={sort2}
                onChange={(e) => setSort2(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white"
              >
                <option value="Pelanggan">Pelanggan</option>
                <option value="Tanggal">Tanggal</option>
                <option value="Kode Item">Kode Item</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir2((p) => (p === "asc" ? "desc" : "asc"))}
                className="h-6 w-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600 shrink-0"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <div className="flex gap-1">
              <select
                value={sort3}
                onChange={(e) => setSort3(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white"
              >
                <option value="Kode Item">Kode Item</option>
                <option value="Tanggal">Tanggal</option>
                <option value="Pelanggan">Pelanggan</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir3((p) => (p === "asc" ? "desc" : "asc"))}
                className="h-6 w-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600 shrink-0"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABLE SECTION (9 Columns Matching Image 11) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-200 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Pelanggan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kode Item</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama Item</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Jumlah</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Satuan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Harga</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Potongan</th>
              <th className="py-0.5 px-2.5">Pajak</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  Memuat data histori harga jual...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-24 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedData.map((row: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 h-6">
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                    {row.customer_name || "Pelanggan Umum"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-emerald-700 font-semibold">
                    {row.invoice_no}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono">
                    {row.product_code}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    {row.product_name}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 text-right">
                    {row.qty}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    {row.unit_name || "Pcs"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                    {formatCurrency(row.unit_price)}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 text-right text-slate-500">
                    {row.discount ? formatCurrency(row.discount) : "0"}
                  </td>
                  <td className="py-0.5 px-2.5">
                    {row.tax_percent > 0 ? `${row.tax_percent}%` : "Non"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
