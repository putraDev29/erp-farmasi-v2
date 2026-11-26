"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, AlertTriangle, Package, Warehouse } from "lucide-react";
import { api, formatCurrency } from "@/lib/api";
import { TableSortSelect, sortTableData } from "@/components/common/TableSortSelect";

export default function StockBalancesPage() {
  const [warehouseID, setWarehouseID] = useState("");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState<string>("created_at_desc");

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["stock-balances", warehouseID, search, lowStockOnly],
    queryFn: async () => {
      let url = `/inventory/balances?search=${encodeURIComponent(search)}`;
      if (warehouseID) url += `&warehouse_id=${warehouseID}`;
      if (lowStockOnly) url += `&low_stock=true`;
      const res = await api.get(url);
      return res.data?.data || [];
    },
  });

  const sortedBalances = sortTableData(balances, sortOption, {
    getCode: (b: any) => b.product?.sku || b.product?.code,
    getName: (b: any) => b.product?.name,
    getDate: (b: any) => b.created_at || b.updated_at,
  });

  const totalValue = sortedBalances?.reduce((acc: number, b: any) => acc + b.qty * b.avg_cost, 0) || 0;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* Header & Total Valuation */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Saldo Persediaan & Stok Gudang</h1>
          
        </div>
        <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-50 text-purple-600 rounded flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Valuasi Persediaan</span>
            <span className="text-xs font-bold text-slate-900">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="shrink-0 bg-white p-1.5 rounded border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-2 items-center text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode obat, barcode, nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-6 pl-8 pr-3 py-0 text-[11px] bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={warehouseID}
            onChange={(e) => setWarehouseID(e.target.value)}
            className="w-full h-6 py-0 px-2 text-[11px] bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Fasilitas Gudang</option>
            {warehouses?.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-64">
          <TableSortSelect
            value={sortOption}
            onChange={(val) => setSortOption(val)}
            compact
          />
        </div>

        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`h-6 px-2.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition whitespace-nowrap shadow-2xs ${
            lowStockOnly
              ? "bg-amber-100 text-amber-800 border border-amber-300 font-bold"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Hanya Stok Menipis</span>
        </button>
      </div>

      {/* Balances Table */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
              <tr>
                <th className="py-3 px-4">Gudang</th>
                <th className="py-3 px-4">Kode Produk</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Satuan</th>
                <th className="py-3 px-4 text-center">Fisik</th>
                <th className="py-3 px-4 text-center">Tersedia</th>
                <th className="py-3 px-4">Harga Pokok Rata-rata</th>
                <th className="py-3 px-4 text-right">Total Nilai (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">Memuat saldo persediaan...</td></tr>
              ) : sortedBalances?.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">Tidak ada saldo stok yang cocok.</td></tr>
              ) : (
                sortedBalances?.map((b: any) => {
                  const isLow = b.product && b.available_qty <= b.product.min_stock;
                  const itemVal = b.qty * b.avg_cost;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-medium text-slate-700">{b.warehouse?.name}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{b.product?.code}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{b.product?.name}</span>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 font-bold mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Stok Minimum ({b.product?.min_stock})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{b.product?.category?.name || "-"}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{b.product?.base_unit?.name || "-"}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{b.qty}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          isLow ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {b.available_qty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatCurrency(b.avg_cost)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(itemVal)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
}
