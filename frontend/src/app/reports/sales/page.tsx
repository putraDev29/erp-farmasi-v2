"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Download, Printer } from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function SalesReportPage() {
  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales-report"],
    queryFn: async () => {
      const res = await api.get("/sales");
      return res.data?.data || [];
    },
  });

  const totalRevenue = sales?.reduce((acc: number, s: any) => acc + s.total_amount, 0) || 0;
  const totalPaid = sales?.reduce((acc: number, s: any) => acc + s.paid_amount, 0) || 0;
  const totalReceivables = sales?.reduce((acc: number, s: any) => acc + s.remaining_amount, 0) || 0;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Laporan Penjualan & Kasir Apotek</h1>
          <p className="text-[11px] text-slate-500">Rekapitulasi omset, pelunasan kasir, dan piutang penjualan.</p>
        </div>

        {/* Excel Export Button */}
        <a
          href="http://localhost:8080/api/v1/reports/sales/excel"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition shadow-2xs w-fit"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor ke Excel (.xlsx)</span>
        </a>
      </div>

      {/* Summary KPI Cards */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Omset Penjualan</span>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(totalRevenue)}</h3>
        </div>
        <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">Penerimaan Kas & Bank</span>
          <h3 className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(totalPaid)}</h3>
        </div>
        <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Piutang Tertunggak</span>
          <h3 className="text-sm font-bold text-amber-600 mt-0.5">{formatCurrency(totalReceivables)}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-3 px-4">No Faktur</th>
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Pelanggan</th>
              <th className="py-3 px-4">Tipe</th>
              <th className="py-3 px-4">Subtotal</th>
              <th className="py-3 px-4">Total Tagihan</th>
              <th className="py-3 px-4">Terbayar</th>
              <th className="py-3 px-4">Sisa Piutang</th>
              <th className="py-3 px-4 text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">Memuat laporan penjualan...</td></tr>
            ) : (
              sales?.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.invoice_no}</td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(s.date)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{s.customer?.name || "Pelanggan Umum"}</td>
                  <td className="py-3 px-4 text-slate-600">{s.type}</td>
                  <td className="py-3 px-4 text-slate-600">{formatCurrency(s.subtotal)}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(s.total_amount)}</td>
                  <td className="py-3 px-4 text-emerald-600 font-semibold">{formatCurrency(s.paid_amount)}</td>
                  <td className="py-3 px-4 text-amber-600 font-bold">{formatCurrency(s.remaining_amount)}</td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={`http://localhost:8080/api/v1/reports/invoices/${s.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      Cetak
                    </a>
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
