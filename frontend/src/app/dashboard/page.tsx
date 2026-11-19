"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Package,
  CreditCard,
  ShoppingBag,
  ArrowUpRight,
  PlusCircle,
  FileText,
  Boxes,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await api.get("/dashboard/summary");
      return res.data?.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const fin = data?.financials || {};
  const chartData = data?.chart_data || [];
  const topProds = data?.top_products || [];
  const recentSales = data?.recent_sales || [];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-3 text-xs select-none">
      {/* Page Title & Quick Actions */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Ringkasan Eksekutif & Dasbor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Pemantauan performa penjualan, pembelian, kasir, dan persediaan apotek secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Kasir POS Cepat</span>
          </Link>
          <Link
            href="/purchasing/invoices"
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            <span>Input Faktur</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Penjualan</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(data?.sales_summary?.total_amount)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {data?.sales_summary?.total_count || 0} Transaksi Selesai
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Purchases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pengadaan (PO)</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(data?.purchase_summary?.total_amount)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {data?.purchase_summary?.total_count || 0} Faktur Diterima
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laba Kotor Est.</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">
              {formatCurrency(fin.gross_profit)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Estimasi Margin Penjualan</p>
          </div>
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Cash & Bank Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Kas & Bank</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(fin.cash_bank_balance)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Laci Kasir & Rekening Operasional</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Receivables (Piutang) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Piutang Usaha (AR)</p>
            <h3 className="text-xl font-bold text-amber-600 mt-1">
              {formatCurrency(fin.receivables)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Faktur Belum Terbayar</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Payables (Utang) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Utang Usaha (AP)</p>
            <h3 className="text-xl font-bold text-red-600 mt-1">
              {formatCurrency(fin.payables)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Tagihan PBF / Supplier</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Persediaan</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(fin.inventory_valuation)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Moving Average Cost</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peringatan Stok Minimum</p>
            <h3 className="text-xl font-bold text-orange-600 mt-1">
              {data?.low_stock_count || 0} Produk
            </h3>
            <Link href="/inventory/balances?low_stock=true" className="text-[11px] text-orange-600 font-semibold mt-1 flex items-center gap-1 hover:underline">
              Periksa Stok Menipis <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Bestsellers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">
              Tren Transaksi Penjualan vs Pengadaan (6 Bulan Terakhir)
            </h3>
            <span className="text-xs text-slate-400">Dalam Satuan Rupiah (IDR)</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), ""]}
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#fff" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="sales" name="Penjualan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Pembelian" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Obat & Produk Terlaris</span>
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {topProds.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada data transaksi penjualan bulan ini.
                </div>
              ) : (
                topProds.map((item: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Terjual: {item.total_qty} Unit</p>
                    </div>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(item.total_sales)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            href="/reports/sales"
            className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl text-center block transition border border-slate-200"
          >
            Lihat Laporan Penjualan Lengkap
          </Link>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">Transaksi Penjualan & Kasir Terbaru</h3>
          <Link href="/sales/invoices" className="text-xs text-emerald-600 hover:underline font-semibold">
            Semua Faktur Penjualan &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l-lg">No Faktur</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Pelanggan</th>
                <th className="py-2.5 px-3">Tipe</th>
                <th className="py-2.5 px-3">Total</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 rounded-r-lg text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    Belum ada riwayat transaksi penjualan.
                  </td>
                </tr>
              ) : (
                recentSales.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{s.invoice_no}</td>
                    <td className="py-2.5 px-3 text-slate-500">{formatDate(s.date)}</td>
                    <td className="py-2.5 px-3 text-slate-700">{s.customer?.name || "Pelanggan Umum"}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {s.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{formatCurrency(s.total_amount)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        s.payment_status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {s.payment_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <a
                        href={`http://localhost:8080/api/v1/reports/invoices/${s.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        Cetak PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
