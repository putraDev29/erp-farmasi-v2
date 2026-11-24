"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ShieldAlert,
  Clock,
  X,
  ExternalLink,
  Truck,
  Search,
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
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseTab, setPurchaseTab] = useState<string>("ALL");
  const [purchasePageSize, setPurchasePageSize] = useState<number>(8);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await api.get("/dashboard/summary");
      return res.data?.data;
    },
  });

  // Popup obat expired & mendekati expired (≤ 1 minggu) saat pertama kali buka halaman dashboard
  useEffect(() => {
    if (data?.expiring_critical_count && data.expiring_critical_count > 0) {
      const hasShown = sessionStorage.getItem("hasShownExpiryAlertModal");
      if (!hasShown) {
        setShowExpiryModal(true);
        sessionStorage.setItem("hasShownExpiryAlertModal", "true");
      }
    }
  }, [data?.expiring_critical_count]);

  const inProgressPurchases = data?.in_progress_purchases || {};
  const inProgressItems: any[] = inProgressPurchases.items || [];

  const inTransitCount = useMemo(() => {
    return inProgressItems.filter(
      (item: any) =>
        item.status === "DALAM_PENGIRIMAN" ||
        item.status === "SEBAGIAN_DIKIRIM" ||
        item.status === "MENUNGGU_PENERIMAAN"
    ).length;
  }, [inProgressItems]);

  const warehouseCount = useMemo(() => {
    return inProgressItems.filter((item: any) => item.status === "VERIFIKASI_GUDANG").length;
  }, [inProgressItems]);

  const filteredPurchaseItems = useMemo(() => {
    return inProgressItems.filter((item: any) => {
      const q = purchaseSearch.toLowerCase().trim();
      const matchSearch =
        q === "" ||
        (item.product_name && item.product_name.toLowerCase().includes(q)) ||
        (item.product_code && item.product_code.toLowerCase().includes(q)) ||
        (item.doc_no && item.doc_no.toLowerCase().includes(q)) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(q)) ||
        (item.warehouse_name && item.warehouse_name.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (purchaseTab === "ALL") return true;
      if (purchaseTab === "DALAM_PENGIRIMAN") {
        return (
          item.status === "DALAM_PENGIRIMAN" ||
          item.status === "SEBAGIAN_DIKIRIM" ||
          item.status === "MENUNGGU_PENERIMAAN"
        );
      }
      if (purchaseTab === "VERIFIKASI_GUDANG") {
        return item.status === "VERIFIKASI_GUDANG";
      }
      return true;
    });
  }, [inProgressItems, purchaseSearch, purchaseTab]);

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
  const expiringCount = data?.expiring_critical_count || 0;
  const expiringItems = data?.expiring_critical_items || [];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-3 text-xs select-none relative">
      {/* Page Title & Quick Actions */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Ringkasan Eksekutif &amp; Dasbor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Pemantauan performa penjualan, pembelian, kasir, dan persediaan apotek secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {expiringCount > 0 && (
            <button
              onClick={() => setShowExpiryModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm animate-pulse"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Peringatan ED ({expiringCount})</span>
            </button>
          )}

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

      {/* Banner Peringatan Obat Expired Kritis */}
      {expiringCount > 0 && (
        <div className="shrink-0 bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight flex items-center gap-2">
                Peringatan: {expiringCount} Obat Kadaluarsa / Kritis (≤ 1 Minggu)
              </div>
              <p className="text-[11px] text-white/90">
                Terdapat obat yang telah kadaluarsa atau mendekati tanggal ED dalam 7 hari. Lakukan pengecekan &amp; karantina obat segera.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowExpiryModal(true)}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition"
            >
              Buka Popup Detail
            </button>
            <Link
              href="/inventory/expired?filter=1_week"
              className="px-3 py-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs transition shadow-sm flex items-center gap-1"
            >
              Menu Obat ED <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pengadaan (Faktur Selesai)</p>
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

          {/* Barang Pembelian Masih Proses / Pengiriman */}
          <div
            onClick={() => {
              document.getElementById("in-progress-purchases-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-white p-5 rounded-2xl border border-sky-200/90 hover:border-sky-400 shadow-sm flex items-center justify-between cursor-pointer transition hover:shadow-md group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500 rounded-l-2xl"></div>
            <div>
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-600" />
                <span>Pengadaan Dlm Pengiriman &amp; Proses</span>
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {inProgressPurchases.total_items || 0} <span className="text-xs font-semibold text-slate-500">Item Barang</span>
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-sky-600">
                  {formatCurrency(inProgressPurchases.total_amount)}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {inProgressPurchases.total_docs || 0} Dokumen
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-sky-50 group-hover:bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 shrink-0 transition">
              <Truck className="w-6 h-6" />
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Kas &amp; Bank</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(fin.cash_bank_balance)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Laci Kasir &amp; Rekening Operasional</p>
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

          {/* Low Stock Alert */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peringatan Stok Minimum</p>
              <h3 className="text-xl font-bold text-orange-600 mt-1">
                {data?.low_stock_count || 0} Produk
              </h3>
              <Link
                href="/inventory/minimum-stock"
                className="text-[11px] text-orange-600 font-semibold mt-1 flex items-center gap-1 hover:underline"
              >
                Periksa Stok Menipis <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          {/* Expired Drugs Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Obat Kritis &amp; Expired</p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">
                {expiringCount} Obat
              </h3>
              <Link
                href="/inventory/expired?filter=1_week"
                className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 hover:underline"
              >
                Monitoring Obat ED <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert className="w-6 h-6" />
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
                  <span>Obat &amp; Produk Terlaris</span>
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

        {/* ======================================================== */}
        {/* CARD DATA BARANG PEMBELIAN MASIH PROSES & DALAM PENGIRIMAN */}
        {/* ======================================================== */}
        <div
          id="in-progress-purchases-section"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4"
        >
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    Barang Pembelian Dalam Proses &amp; Pengiriman
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">
                    {inProgressPurchases.total_items || 0} Item ({inProgressPurchases.total_docs || 0} Dokumen)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Monitoring faktur pembelian ke distributor PBF yang sedang dalam perjalanan atau menunggu pemeriksaan gudang.
                </p>
              </div>
            </div>

            {/* Search & Links */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari obat, PBF, No. Faktur..."
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="pl-8 pr-7 py-1.5 border border-slate-200 rounded-xl text-xs w-48 sm:w-60 focus:outline-none focus:border-sky-500 bg-slate-50 focus:bg-white transition"
                />
                {purchaseSearch && (
                  <button
                    onClick={() => setPurchaseSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Link
                href="/purchasing/invoices"
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition shrink-0"
              >
                Faktur Pembelian &rarr;
              </Link>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPurchaseTab("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                purchaseTab === "ALL"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              Semua ({inProgressItems.length})
            </button>
            <button
              type="button"
              onClick={() => setPurchaseTab("DALAM_PENGIRIMAN")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                purchaseTab === "DALAM_PENGIRIMAN"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dalam Pengiriman PBF ({inTransitCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setPurchaseTab("VERIFIKASI_GUDANG")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                purchaseTab === "VERIFIKASI_GUDANG"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Pemeriksaan Gudang ({warehouseCount})</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200/70">
                <tr>
                  <th className="py-2.5 px-3">No. Dokumen</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Distributor / PBF</th>
                  <th className="py-2.5 px-3">Nama Obat / Barang</th>
                  <th className="py-2.5 px-3 text-center">Qty Belum Datang</th>
                  <th className="py-2.5 px-3">Gudang Tujuan</th>
                  <th className="py-2.5 px-3 text-right">Nilai Estimasi</th>
                  <th className="py-2.5 px-3 text-center">Status Alur</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchaseItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Truck className="w-8 h-8 text-slate-300" />
                        <span className="font-medium">Tidak ada barang pembelian yang sedang dalam proses pengiriman saat ini.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPurchaseItems.slice(0, purchasePageSize).map((item: any, idx: number) => {
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                        {/* No Dokumen */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              FAKTUR
                            </span>
                            <span className="font-bold text-slate-800">{item.doc_no}</span>
                          </div>
                        </td>

                        {/* Tanggal */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                          {formatDate(item.date)}
                        </td>

                        {/* PBF */}
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap max-w-[180px] truncate" title={item.supplier_name}>
                          {item.supplier_name}
                        </td>

                        {/* Nama Barang */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 leading-tight">{item.product_name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Kode: {item.product_code || "-"}</span>
                          </div>
                        </td>

                        {/* Qty Belum Datang */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-sky-50 text-sky-700 border border-sky-200">
                            {item.pending_qty} {item.unit_name}
                          </span>
                        </td>

                        {/* Gudang */}
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {item.warehouse_name || "Gudang Utama"}
                        </td>

                        {/* Nilai Estimasi */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatCurrency(item.total_amount)}
                        </td>

                        {/* Status Alur */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {item.status === "DALAM_PENGIRIMAN" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Truck className="w-3 h-3" />
                              <span>Dalam Pengiriman PBF</span>
                            </span>
                          ) : item.status === "SEBAGIAN_DIKIRIM" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Clock className="w-3 h-3" />
                              <span>Dikirim Sebagian</span>
                            </span>
                          ) : item.status === "VERIFIKASI_GUDANG" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Boxes className="w-3 h-3" />
                              <span>Pemeriksaan Gudang</span>
                            </span>
                          ) : item.status === "MENUNGGU_PENERIMAAN" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Menunggu Penerimaan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <span>Pemesanan Baru</span>
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <Link
                            href={`/purchasing/invoices?search=${encodeURIComponent(item.doc_no)}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-[11px] transition shadow-2xs"
                          >
                            <span>Buka Transaksi</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Controls */}
          {filteredPurchaseItems.length > 8 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <div>
                Menampilkan{" "}
                <strong>{Math.min(purchasePageSize, filteredPurchaseItems.length)}</strong> dari{" "}
                <strong>{filteredPurchaseItems.length}</strong> item barang
              </div>
              <div className="flex items-center gap-2">
                {purchasePageSize < filteredPurchaseItems.length ? (
                  <button
                    type="button"
                    onClick={() => setPurchasePageSize((prev) => prev + 12)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                  >
                    Tampilkan Lebih Banyak ({filteredPurchaseItems.length - purchasePageSize} lagi)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPurchasePageSize(8)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                  >
                    Tampilkan Lebih Ringkas (8 Item)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Transaksi Penjualan &amp; Kasir Terbaru</h3>
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
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.payment_status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
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

      {/* ======================================================== */}
      {/* POPUP MODAL PERINGATAN OBAT EXPIRED ≤ 1 MINGGU           */}
      {/* ======================================================== */}
      {showExpiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-rose-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight">
                      Peringatan Obat Expired &amp; Mendekati ED
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/25 text-white">
                      ≤ 1 Minggu
                    </span>
                  </div>
                  <p className="text-xs text-rose-100 mt-0.5">
                    Sistem mendeteksi {expiringCount} item obat telah kadaluarsa atau kadaluarsa dalam waktu &le; 7 hari.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExpiryModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-1.5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Notice */}
            <div className="bg-rose-50 border-b border-rose-100 p-3 px-5 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Tindakan yang Disarankan (CDOB):</strong> Segera pisahkan produk fisik dari etalase ke area karantina atau lakukan proses retur ke PBF / Distributor.
              </span>
            </div>

            {/* Modal List Table */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">No</th>
                    <th className="py-2 px-3">Kode &amp; Nama Obat</th>
                    <th className="py-2 px-3">No. Batch</th>
                    <th className="py-2 px-3">Tanggal ED</th>
                    <th className="py-2 px-3">Sisa Waktu</th>
                    <th className="py-2 px-3 text-right">Stok</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiringItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Tidak ada obat yang kadaluarsa dalam 1 minggu.
                      </td>
                    </tr>
                  ) : (
                    expiringItems.map((item: any, idx: number) => {
                      const isExpired = item.days_remaining < 0;
                      return (
                        <tr
                          key={item.id || idx}
                          className={`hover:bg-slate-50 transition ${
                            isExpired ? "bg-rose-50/40" : "bg-red-50/20"
                          }`}
                        >
                          <td className="py-2.5 px-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[10px]">
                              {item.batch_number || "NON-BATCH"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                            {formatDate(item.expired_date)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {item.status_label}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-800">
                            {item.current_stock} <span className="text-[10px] text-slate-500 font-normal">{item.unit_name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isExpired
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {isExpired ? "EXPIRED" : "KRITIS"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-slate-500 text-xs">
                Peringatan ini dapat dibuka kembali melalui tombol di header dasbor.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpiryModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
                >
                  Tutup / Mengerti
                </button>
                <Link
                  href="/inventory/expired?filter=1_week"
                  onClick={() => setShowExpiryModal(false)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
                >
                  Buka Menu Obat ED Lengkap
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
