"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Package } from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

export default function InventoryReportPage() {
  const { data: balances, isLoading } = useQuery({
    queryKey: ["inventory-report"],
    queryFn: async () => {
      const res = await api.get("/inventory/balances");
      return res.data?.data || [];
    },
  });

  const totalItems = balances?.reduce((acc: number, b: any) => acc + b.qty, 0) || 0;
  const totalValuation = balances?.reduce((acc: number, b: any) => acc + b.qty * b.avg_cost, 0) || 0;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Laporan Nilai Persediaan Obat & Gudang</h1>
          <p className="text-[11px] text-slate-500">Valuasi inventori komprehensif berbasis metode Moving Average Costing.</p>
        </div>

        {/* Excel Export Button */}
        <a
          href="http://localhost:8080/api/v1/reports/inventory/excel"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition shadow-2xs w-fit"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor ke Excel (.xlsx)</span>
        </a>
      </div>

      {/* Summary Cards */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Kuantitas Fisik Obat</span>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">{totalItems} Unit Terdaftar</h3>
          </div>
          <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Nilai Aset Persediaan</span>
            <h3 className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(totalValuation)}</h3>
          </div>
          <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-3 px-4">Gudang</th>
              <th className="py-3 px-4">Kode</th>
              <th className="py-3 px-4">Nama Produk</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4">Satuan</th>
              <th className="py-3 px-4 text-center">Stok Fisik</th>
              <th className="py-3 px-4">HPP Rata-rata</th>
              <th className="py-3 px-4 text-right">Total Nilai Persediaan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Memuat data persediaan...</td></tr>
            ) : (
              balances?.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-semibold text-slate-700">{b.warehouse?.name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.product?.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{b.product?.name}</td>
                  <td className="py-3 px-4 text-slate-600">{b.product?.category?.name || "-"}</td>
                  <td className="py-3 px-4 text-slate-700">{b.product?.base_unit?.name || "-"}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">{b.qty}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{formatCurrency(b.avg_cost)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(b.qty * b.avg_cost)}
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
