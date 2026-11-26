"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  RotateCcw,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  BarChart3,
  Percent,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { downloadExcel } from "@/lib/reportExport";

/**
 * Standard Indonesian Accounting Currency Formatter:
 * Negative values formatted in parentheses: (Rp 1.000.000)
 */
function formatAccountingCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(abs);

  if (isNegative) {
    return `(${formatted})`;
  }
  return formatted;
}

export default function ProfitAndLossPage() {
  // ----------------------------------------------------
  // Date Filters
  // ----------------------------------------------------
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>("this_month");
  const [chartMode, setChartMode] = useState<"daily" | "monthly">("daily");
  const [metricView, setMetricView] = useState<"revenue_expense" | "all" | "profit_only">("revenue_expense");

  // Table UI State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    cogs: true,
    opex: true,
    other: true,
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Ledger Drilldown Modal State
  const [drilldownAccount, setDrilldownAccount] = useState<any | null>(null);

  // ----------------------------------------------------
  // Query Profit & Loss Data
  // ----------------------------------------------------
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["profit-and-loss", startDate, endDate],
    queryFn: async () => {
      const res = await api.get(
        `/accounting/profit-and-loss?start_date=${startDate}&end_date=${endDate}`
      );
      return res.data?.data;
    },
  });

  // ----------------------------------------------------
  // Query Ledger for Drilldown
  // ----------------------------------------------------
  const {
    data: ledgerData,
    isLoading: isLedgerLoading,
  } = useQuery({
    queryKey: ["drilldown-ledger", drilldownAccount?.id, startDate, endDate],
    queryFn: async () => {
      if (!drilldownAccount?.id) return null;
      const res = await api.get(
        `/accounting/ledger?account_id=${drilldownAccount.id}&start_date=${startDate}&end_date=${endDate}`
      );
      return res.data?.data;
    },
    enabled: !!drilldownAccount?.id,
  });

  // ----------------------------------------------------
  // Quick Filter Handlers
  // ----------------------------------------------------
  const handleQuickFilter = (type: "today" | "this_month" | "last_month" | "this_year") => {
    setActiveQuickFilter(type);

    if (type === "today") {
      const dateStr = "2026-11-24";
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (type === "this_month") {
      setStartDate("2026-11-01");
      setEndDate("2026-11-30");
    } else if (type === "last_month") {
      setStartDate("2026-10-01");
      setEndDate("2026-10-31");
    } else if (type === "this_year") {
      setStartDate("2026-01-01");
      setEndDate("2026-12-31");
    }
  };

  const handleResetFilter = () => {
    setActiveQuickFilter("this_month");
    setStartDate("2026-11-01");
    setEndDate("2026-11-30");
    setSearchTerm("");
  };

  // Section toggle helper
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const setAllSections = (expanded: boolean) => {
    setExpandedSections({
      revenue: expanded,
      cogs: expanded,
      opex: expanded,
      other: expanded,
    });
  };

  // ----------------------------------------------------
  // Data extraction
  // ----------------------------------------------------
  const revAccounts = data?.revenue_accounts || [];
  const cogsAccounts = data?.cogs_accounts || [];
  const opexAccounts = data?.operating_expense_accounts || [];
  const otherIncAccounts = data?.other_income_accounts || [];
  const otherExpAccounts = data?.other_expense_accounts || [];

  const totalRevenue = data?.total_revenue || 0;
  const totalCOGS = data?.total_cogs || 0;
  const grossProfit = data?.gross_profit || 0;
  const grossMargin = data?.gross_profit_margin || 0;
  const totalOpex = data?.total_operating_expense || 0;
  const opexRatio = data?.opex_ratio || 0;
  const operatingProfit = data?.operating_profit || 0;
  const totalOtherIncome = data?.total_other_income || 0;
  const totalOtherExpense = data?.total_other_expense || 0;
  const netOther = data?.net_other || 0;
  const ebt = data?.earnings_before_tax || 0;
  const taxExpense = data?.tax_expense || 0;
  const netProfit = data?.net_profit || 0;
  const netMargin = data?.net_profit_margin || 0;

  // Chart Data: choose between daily or monthly
  const monthlyTrends = data?.monthly_trends || [];
  const dailyTrends = data?.daily_trends || [];
  const chartData = chartMode === "daily" && dailyTrends.length > 0 ? dailyTrends : monthlyTrends;

  // ----------------------------------------------------
  // Search Filter on Accounts
  // ----------------------------------------------------
  const filterAccounts = (list: any[]) => {
    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  };

  const filteredRevAccounts = useMemo(() => filterAccounts(revAccounts), [revAccounts, searchTerm]);
  const filteredCogsAccounts = useMemo(() => filterAccounts(cogsAccounts), [cogsAccounts, searchTerm]);
  const filteredOpexAccounts = useMemo(() => filterAccounts(opexAccounts), [opexAccounts, searchTerm]);
  const filteredOtherIncAccounts = useMemo(() => filterAccounts(otherIncAccounts), [otherIncAccounts, searchTerm]);
  const filteredOtherExpAccounts = useMemo(() => filterAccounts(otherExpAccounts), [otherExpAccounts, searchTerm]);

  // ----------------------------------------------------
  // Export Excel Handler
  // ----------------------------------------------------
  const handleExportExcel = () => {
    const headers = ["Kategori", "Kode Akun", "Nama Akun", "Tipe", "Debet (IDR)", "Kredit (IDR)", "Saldo Net (IDR)"];
    const rows: (string | number)[][] = [];

    // Revenue
    rows.push(["1. PENDAPATAN OPERASIONAL", "", "", "", "", "", ""]);
    revAccounts.forEach((a: any) => {
      rows.push(["Pendapatan", a.code, a.name, a.subtype || a.type, a.debit, a.credit, a.net_impact]);
    });
    rows.push(["Subtotal Pendapatan Bersih", "", "", "", "", "", totalRevenue]);

    // COGS
    rows.push(["2. HARGA POKOK PENJUALAN", "", "", "", "", "", ""]);
    cogsAccounts.forEach((a: any) => {
      rows.push(["HPP", a.code, a.name, a.subtype || a.type, a.debit, a.credit, a.net_impact]);
    });
    rows.push(["Subtotal Total HPP", "", "", "", "", "", totalCOGS]);
    rows.push(["LABA KOTOR (GROSS PROFIT)", "", "", "", "", "", grossProfit]);

    // Opex
    rows.push(["3. BEBAN OPERASIONAL & UMUM", "", "", "", "", "", ""]);
    opexAccounts.forEach((a: any) => {
      rows.push(["Beban Operasional", a.code, a.name, a.subtype || a.type, a.debit, a.credit, a.net_impact]);
    });
    rows.push(["Subtotal Beban Operasional", "", "", "", "", "", totalOpex]);
    rows.push(["LABA USAHA OPERASIONAL", "", "", "", "", "", operatingProfit]);

    // Other
    rows.push(["4. PENDAPATAN & BEBAN LAIN-LAIN", "", "", "", "", "", ""]);
    otherIncAccounts.forEach((a: any) => {
      rows.push(["Pendapatan Lain", a.code, a.name, a.subtype || a.type, a.debit, a.credit, a.net_impact]);
    });
    otherExpAccounts.forEach((a: any) => {
      rows.push(["Beban Lain", a.code, a.name, a.subtype || a.type, a.debit, a.credit, a.net_impact]);
    });
    rows.push(["Subtotal Pendapatan/Beban Lain (Net)", "", "", "", "", "", netOther]);
    rows.push(["LABA SEBELUM PAJAK (EBT)", "", "", "", "", "", ebt]);
    rows.push(["Beban Pajak Penghasilan", "", "", "", "", "", taxExpense]);
    rows.push(["LABA BERSIH SETELAH PAJAK", "", "", "", "", "", netProfit]);

    const filename = `Laporan_Laba_Rugi_${startDate}_sd_${endDate}`;
    downloadExcel(filename, "Laba Rugi", headers, rows);
  };

  // ----------------------------------------------------
  // Print Handler
  // ----------------------------------------------------
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-3 text-xs select-none relative print:bg-white print:p-0">
      {/* ======================================================== */}
      {/* 1. HEADER: Title, Breadcrumbs, Action Buttons            */}
      {/* ======================================================== */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-2 print:border-none">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-0.5 print:hidden">
            <Link href="/dashboard" className="hover:text-emerald-700 transition">
              Beranda
            </Link>
            <span>/</span>
            <Link href="/accounting/accounts" className="hover:text-emerald-700 transition">
              Akuntansi
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Laporan Laba Rugi</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
              Laporan Laba Rugi (Income Statement)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 print:hidden">
              Periode Real-Time
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 print:text-[10px]">
            Ikhtisar Kinerja Keuangan, Pendapatan, HPP, Beban Operasional, dan Profitabilitas Apotek
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-semibold text-xs shadow-2xs transition"
            title="Download Spreadsheet Excel (.xls)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-semibold text-xs shadow-2xs transition"
            title="Cetak atau Simpan sebagai PDF"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            title="Muat Ulang Data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-emerald-600" : "text-slate-600"}`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FILTER BAR: Dates, Quick Filters, Submit              */}
      {/* ======================================================== */}
      <div className="shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date range inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Rentang Tanggal:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveQuickFilter("custom");
                }}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50/50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-slate-400 font-bold">&ndash;</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveQuickFilter("custom");
                }}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50/50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-2xs transition"
            >
              Tampilkan
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs transition"
            >
              Reset
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFilter("today")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                activeQuickFilter === "today"
                  ? "bg-white text-emerald-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter("this_month")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                activeQuickFilter === "this_month"
                  ? "bg-white text-emerald-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter("last_month")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                activeQuickFilter === "last_month"
                  ? "bg-white text-emerald-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter("this_year")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                activeQuickFilter === "this_year"
                  ? "bg-white text-emerald-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tahun Ini
            </button>
          </div>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-4 text-center border-b border-slate-400 pb-3">
        <h2 className="text-xl font-bold uppercase tracking-wide">Apotek &amp; Distribusi Farmasi</h2>
        <h1 className="text-lg font-black uppercase text-slate-900 mt-1">Laporan Laba Rugi Komprehensif</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Periode: {formatDate(startDate)} s/d {formatDate(endDate)}
        </p>
      </div>

      {/* ======================================================== */}
      {/* 3. SUMMARY KPI CARDS (4 Cards Grid)                      */}
      {/* ======================================================== */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Gagal memuat laporan laba rugi: {(error as any)?.message || "Terjadi kesalahan sistem"}</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          {/* Card 1: Pendapatan Bersih */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Pendapatan Bersih
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-1">
                  {formatAccountingCurrency(totalRevenue)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>Basis Omset Usaha</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                100% Total
              </span>
            </div>
          </div>

          {/* Card 2: Laba Kotor */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Laba Kotor (Gross)
                </span>
                <div className={`text-base sm:text-lg font-black font-mono mt-1 ${grossProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {formatAccountingCurrency(grossProfit)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>Margin Kotor (GPM)</span>
              <span className={`font-semibold px-1.5 py-0.2 rounded border ${
                grossMargin >= 0
                  ? "text-teal-800 bg-teal-50 border-teal-200"
                  : "text-rose-700 bg-rose-50 border-rose-200"
              }`}>
                {grossMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 3: Beban Operasional & Lain-lain */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Beban Usaha (Operasional)
                </span>
                <div className="text-base sm:text-lg font-black text-slate-800 font-mono mt-1">
                  {formatAccountingCurrency(totalOpex)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span>{totalOtherExpense > 0 ? `+ Beban Lain: ${formatCurrency(totalOtherExpense)}` : "Rasio Beban (OPEX)"}</span>
              <span className="font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                {totalOtherExpense > 0 ? `Total Beban: ${formatCurrency(totalOpex + totalOtherExpense)}` : `${opexRatio.toFixed(1)}%`}
              </span>
            </div>
          </div>

          {/* Card 4: Laba Bersih / Rugi Bersih */}
          <div className={`p-3.5 rounded-xl border shadow-2xs hover:shadow-xs transition relative overflow-hidden flex flex-col justify-between ${
            netProfit >= 0
              ? "bg-emerald-50/70 border-emerald-200"
              : "bg-rose-50/80 border-rose-300 ring-1 ring-rose-200"
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                  netProfit >= 0 ? "text-emerald-800" : "text-rose-700"
                }`}>
                  {netProfit >= 0 ? "Laba Bersih (Net Profit)" : "Rugi Bersih (Net Defisit)"}
                </span>
                <div className={`text-base sm:text-lg font-black font-mono mt-1 ${netProfit >= 0 ? "text-emerald-800" : "text-rose-700"}`}>
                  {formatAccountingCurrency(netProfit)}
                </div>
              </div>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                netProfit >= 0
                  ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                  : "bg-rose-100 border-rose-300 text-rose-700"
              }`}>
                {netProfit >= 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600">
              <span className="font-semibold text-rose-800">
                {netProfit >= 0 ? "Surplus Usaha" : "Rugi / Defisit Periode"}
              </span>
              <span className={`font-black px-1.5 py-0.2 rounded border ${
                netProfit >= 0
                  ? "text-emerald-900 bg-emerald-100 border-emerald-300"
                  : "text-rose-900 bg-rose-100 border-rose-300"
              }`}>
                {netProfit >= 0 ? `Net Margin: ${netMargin.toFixed(1)}%` : `Rugi: ${Math.abs(netMargin).toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. GRAFIK TREN (Pendapatan vs Beban vs Laba)             */}
      {/* ======================================================== */}
      {!isLoading && chartData.length > 0 && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:hidden space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Grafik Tren Kinerja Keuangan
                </h3>
                <span className="text-[10px] text-slate-400">
                  {metricView === "revenue_expense"
                    ? "Perbandingan Omset Penjualan & Biaya (Semua Batang Positif Ke Atas)"
                    : metricView === "profit_only"
                    ? "Tren Profitabilitas Bersih (Surplus vs Defisit Harian)"
                    : "Semua Metrik Finansial (Pendapatan, HPP, Beban & Laba Bersih)"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Metric View Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-[10px]">
                <button
                  type="button"
                  onClick={() => setMetricView("revenue_expense")}
                  className={`px-2 py-0.5 rounded transition ${
                    metricView === "revenue_expense"
                      ? "bg-white text-emerald-800 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tampilkan hanya Pendapatan, HPP, dan Beban (semua batang ke atas)"
                >
                  Pendapatan vs Beban
                </button>
                <button
                  type="button"
                  onClick={() => setMetricView("all")}
                  className={`px-2 py-0.5 rounded transition ${
                    metricView === "all"
                      ? "bg-white text-indigo-700 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tampilkan semua termasuk Laba Bersih (ada nilai minus jika beban > omset)"
                >
                  Semua Metrik
                </button>
                <button
                  type="button"
                  onClick={() => setMetricView("profit_only")}
                  className={`px-2 py-0.5 rounded transition ${
                    metricView === "profit_only"
                      ? "bg-white text-indigo-700 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tampilkan khusus Laba / Rugi Bersih"
                >
                  Laba Bersih Saja
                </button>
              </div>

              {/* Toggle Daily vs Monthly */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-[10px]">
                <button
                  type="button"
                  onClick={() => setChartMode("daily")}
                  disabled={dailyTrends.length === 0}
                  className={`px-2 py-0.5 rounded transition ${
                    chartMode === "daily"
                      ? "bg-white text-slate-800 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Harian ({dailyTrends.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode("monthly")}
                  className={`px-2 py-0.5 rounded transition ${
                    chartMode === "monthly"
                      ? "bg-white text-slate-800 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Bulanan ({monthlyTrends.length})
                </button>
              </div>
            </div>
          </div>

          {metricView === "all" && (
            <div className="px-2.5 py-1 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-800 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>Penjelasan Grafik ke Bawah:</strong> Batang biru (Laba Bersih) mengarah ke bawah (minus) pada tanggal tertentu (seperti 01/11 dan 22/11) karena pada hari tersebut ada pengeluaran beban/biaya yang lebih besar daripada pendapatan penjualan. Pilih tab <strong>&quot;Pendapatan vs Beban&quot;</strong> di atas jika ingin melihat perbandingan nilai omset dan biaya yang selalu mengarah ke atas.
              </span>
            </div>
          )}

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={metricView === "revenue_expense" ? [0, "auto"] : ["auto", "auto"]}
                  tickFormatter={(val) => {
                    const abs = Math.abs(val);
                    if (abs >= 1000000) return `${(val / 1000000).toFixed(0)}Jt`;
                    if (abs >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                    return `${val}`;
                  }}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const rev = Number(payload.find((p) => p.dataKey === "revenue")?.value || 0);
                      const cogs = Number(payload.find((p) => p.dataKey === "cogs")?.value || 0);
                      const exp = Number(payload.find((p) => p.dataKey === "expense")?.value || 0);
                      const net = Number(payload.find((p) => p.dataKey === "net_profit")?.value || 0);

                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg border border-slate-700 text-[11px] min-w-[200px] space-y-1">
                          <div className="font-bold border-b border-slate-700 pb-1 text-slate-300">
                            Periode: {label}
                          </div>
                          {(metricView === "all" || metricView === "revenue_expense") && (
                            <>
                              <div className="flex justify-between items-center text-emerald-400">
                                <span>Pendapatan:</span>
                                <span className="font-mono font-bold">{formatAccountingCurrency(rev)}</span>
                              </div>
                              <div className="flex justify-between items-center text-amber-400">
                                <span>HPP:</span>
                                <span className="font-mono font-bold">({formatAccountingCurrency(cogs)})</span>
                              </div>
                              <div className="flex justify-between items-center text-rose-400">
                                <span>Beban Operasional:</span>
                                <span className="font-mono font-bold">({formatAccountingCurrency(exp)})</span>
                              </div>
                            </>
                          )}
                          {(metricView === "all" || metricView === "profit_only") && (
                            <div className={`flex justify-between items-center pt-1 border-t border-slate-700 font-bold ${
                              net >= 0 ? "text-emerald-300" : "text-rose-400"
                            }`}>
                              <span>Laba Bersih:</span>
                              <span className="font-mono">{formatAccountingCurrency(net)}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                  formatter={(value) => <span className="text-slate-600 font-medium">{value}</span>}
                />
                {(metricView === "all" || metricView === "revenue_expense") && (
                  <>
                    <Bar dataKey="revenue" name="Pendapatan Bersih" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="cogs" name="HPP" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="expense" name="Beban Operasional" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  </>
                )}
                {(metricView === "all" || metricView === "profit_only") && (
                  <Bar dataKey="net_profit" name="Laba Bersih" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={30} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. DETAIL LAPORAN LABA RUGI (HIERARCHICAL STATEMENT)     */}
      {/* ======================================================== */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col print:border-none print:shadow-none">
        {/* Table Toolbar */}
        <div className="shrink-0 p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Rincian Hierarki Laporan Keuangan</span>
            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setAllSections(true)}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 transition"
              >
                Buka Semua
              </button>
              <button
                type="button"
                onClick={() => setAllSections(false)}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 transition"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          {/* Quick Account Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
            <input
              type="text"
              placeholder="Cari akun rekening..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Statement Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-3 sm:p-4 space-y-4 print:p-0 print:space-y-3">
          {/* ---------------------------------------------------- */}
          {/* SEKSI 1: PENDAPATAN OPERASIONAL (REVENUE)            */}
          {/* ---------------------------------------------------- */}
          <div className="border border-slate-200 rounded-lg overflow-hidden print:border-none">
            <button
              type="button"
              onClick={() => toggleSection("revenue")}
              className="w-full px-3 py-2 bg-emerald-50/60 hover:bg-emerald-50 flex items-center justify-between text-left transition border-b border-emerald-100 print:bg-white print:border-b-2 print:border-slate-800"
            >
              <div className="flex items-center gap-2">
                {expandedSections.revenue ? (
                  <ChevronDown className="w-4 h-4 text-emerald-700 print:hidden" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-emerald-700 print:hidden" />
                )}
                <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] sm:text-xs">
                  1. Pendapatan Operasional (Operating Revenue)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({filteredRevAccounts.length} akun)
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-800 text-xs">
                {formatAccountingCurrency(totalRevenue)}
              </span>
            </button>

            {expandedSections.revenue && (
              <div className="divide-y divide-slate-100 text-xs">
                {filteredRevAccounts.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 italic text-[11px]">
                    Tidak ada transaksi pendapatan pada periode ini.
                  </div>
                ) : (
                  filteredRevAccounts.map((a: any) => (
                    <div
                      key={a.id}
                      onClick={() => setDrilldownAccount(a)}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-emerald-50/40 cursor-pointer transition group"
                      title="Klik untuk membuka rincian jurnal buku besar akun ini"
                    >
                      <div className="flex items-center gap-2 pl-4 sm:pl-6">
                        <span className="font-mono text-slate-500 font-semibold text-[11px] group-hover:text-emerald-700">
                          {a.code}
                        </span>
                        <span className="text-slate-800 font-medium group-hover:underline">
                          {a.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-semibold ${
                          a.net_impact < 0 ? "text-rose-600" : "text-slate-900"
                        }`}>
                          {formatAccountingCurrency(a.net_impact)}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Subtotal Pendapatan */}
                <div className="px-3 py-2 bg-slate-50/70 font-bold flex justify-between items-center text-slate-800 border-t border-slate-200">
                  <span className="pl-4 uppercase text-[11px]">Total Pendapatan Bersih:</span>
                  <span className="font-mono text-emerald-700 font-black text-xs">
                    {formatAccountingCurrency(totalRevenue)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SEKSI 2: HARGA POKOK PENJUALAN (HPP / COGS)          */}
          {/* ---------------------------------------------------- */}
          <div className="border border-slate-200 rounded-lg overflow-hidden print:border-none">
            <button
              type="button"
              onClick={() => toggleSection("cogs")}
              className="w-full px-3 py-2 bg-amber-50/60 hover:bg-amber-50 flex items-center justify-between text-left transition border-b border-amber-100 print:bg-white print:border-b-2 print:border-slate-800"
            >
              <div className="flex items-center gap-2">
                {expandedSections.cogs ? (
                  <ChevronDown className="w-4 h-4 text-amber-700 print:hidden" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-amber-700 print:hidden" />
                )}
                <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] sm:text-xs">
                  2. Harga Pokok Penjualan (Cost of Goods Sold - HPP)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({filteredCogsAccounts.length} akun)
                </span>
              </div>
              <span className="font-mono font-bold text-amber-800 text-xs">
                ({formatAccountingCurrency(totalCOGS)})
              </span>
            </button>

            {expandedSections.cogs && (
              <div className="divide-y divide-slate-100 text-xs">
                {filteredCogsAccounts.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 italic text-[11px]">
                    Tidak ada transaksi HPP pada periode ini.
                  </div>
                ) : (
                  filteredCogsAccounts.map((a: any) => (
                    <div
                      key={a.id}
                      onClick={() => setDrilldownAccount(a)}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-amber-50/40 cursor-pointer transition group"
                      title="Klik untuk membuka rincian jurnal buku besar akun ini"
                    >
                      <div className="flex items-center gap-2 pl-4 sm:pl-6">
                        <span className="font-mono text-slate-500 font-semibold text-[11px] group-hover:text-amber-700">
                          {a.code}
                        </span>
                        <span className="text-slate-800 font-medium group-hover:underline">
                          {a.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-900">
                          {formatAccountingCurrency(a.net_impact)}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Subtotal HPP */}
                <div className="px-3 py-2 bg-slate-50/70 font-bold flex justify-between items-center text-slate-800 border-t border-slate-200">
                  <span className="pl-4 uppercase text-[11px]">Total Beban Pokok Penjualan (HPP):</span>
                  <span className="font-mono text-amber-800 font-black text-xs">
                    ({formatAccountingCurrency(totalCOGS)})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* HIGHLIGHT: LABA KOTOR (GROSS PROFIT)                 */}
          {/* ---------------------------------------------------- */}
          <div className="p-3 rounded-lg bg-teal-50/90 border border-teal-200 flex items-center justify-between shadow-2xs print:bg-slate-100 print:border-slate-400">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-teal-900 uppercase tracking-wider text-xs sm:text-sm">
                  Laba Kotor (Gross Profit)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300 print:hidden">
                  GPM: {grossMargin.toFixed(1)}%
                </span>
              </div>
              <span className="text-[10px] text-teal-700 mt-0.5 block print:hidden">
                Formula: Pendapatan Bersih dikurangi Harga Pokok Penjualan
              </span>
            </div>
            <span className={`text-base font-black font-mono ${
              grossProfit >= 0 ? "text-teal-800" : "text-rose-700"
            }`}>
              {formatAccountingCurrency(grossProfit)}
            </span>
          </div>

          {/* ---------------------------------------------------- */}
          {/* SEKSI 3: BEBAN OPERASIONAL & UMUM (OPEX)             */}
          {/* ---------------------------------------------------- */}
          <div className="border border-slate-200 rounded-lg overflow-hidden print:border-none">
            <button
              type="button"
              onClick={() => toggleSection("opex")}
              className="w-full px-3 py-2 bg-slate-100/70 hover:bg-slate-100 flex items-center justify-between text-left transition border-b border-slate-200 print:bg-white print:border-b-2 print:border-slate-800"
            >
              <div className="flex items-center gap-2">
                {expandedSections.opex ? (
                  <ChevronDown className="w-4 h-4 text-slate-700 print:hidden" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-700 print:hidden" />
                )}
                <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] sm:text-xs">
                  3. Beban Operasional &amp; Administrasi Umum (OPEX)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({filteredOpexAccounts.length} akun)
                </span>
              </div>
              <span className="font-mono font-bold text-slate-800 text-xs">
                ({formatAccountingCurrency(totalOpex)})
              </span>
            </button>

            {expandedSections.opex && (
              <div className="divide-y divide-slate-100 text-xs">
                {filteredOpexAccounts.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 italic text-[11px]">
                    Tidak ada biaya operasional pada periode ini.
                  </div>
                ) : (
                  filteredOpexAccounts.map((a: any) => (
                    <div
                      key={a.id}
                      onClick={() => setDrilldownAccount(a)}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition group"
                      title="Klik untuk membuka rincian jurnal buku besar akun ini"
                    >
                      <div className="flex items-center gap-2 pl-4 sm:pl-6">
                        <span className="font-mono text-slate-500 font-semibold text-[11px] group-hover:text-indigo-600">
                          {a.code}
                        </span>
                        <span className="text-slate-800 font-medium group-hover:underline">
                          {a.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-900">
                          {formatAccountingCurrency(a.net_impact)}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Subtotal Opex */}
                <div className="px-3 py-2 bg-slate-50/70 font-bold flex justify-between items-center text-slate-800 border-t border-slate-200">
                  <span className="pl-4 uppercase text-[11px]">Total Beban Operasional:</span>
                  <span className="font-mono text-rose-700 font-black text-xs">
                    ({formatAccountingCurrency(totalOpex)})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* HIGHLIGHT: LABA USAHA OPERASIONAL (OPERATING PROFIT) */}
          {/* ---------------------------------------------------- */}
          <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-between shadow-2xs print:bg-white print:border-slate-400">
            <div>
              <span className="font-bold text-slate-900 uppercase tracking-wider text-xs sm:text-sm">
                Laba Usaha Operasional (Operating Profit)
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block print:hidden">
                Formula: Laba Kotor dikurangi Total Beban Operasional
              </span>
            </div>
            <span className={`text-base font-black font-mono ${
              operatingProfit >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}>
              {formatAccountingCurrency(operatingProfit)}
            </span>
          </div>

          {/* ---------------------------------------------------- */}
          {/* SEKSI 4: PENDAPATAN & BEBAN LAIN-LAIN                */}
          {/* ---------------------------------------------------- */}
          <div className="border border-slate-200 rounded-lg overflow-hidden print:border-none">
            <button
              type="button"
              onClick={() => toggleSection("other")}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/70 flex items-center justify-between text-left transition border-b border-slate-200 print:bg-white print:border-b-2 print:border-slate-800"
            >
              <div className="flex items-center gap-2">
                {expandedSections.other ? (
                  <ChevronDown className="w-4 h-4 text-slate-700 print:hidden" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-700 print:hidden" />
                )}
                <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] sm:text-xs">
                  4. Pendapatan &amp; Beban Non-Operasional (Lain-lain)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({filteredOtherIncAccounts.length + filteredOtherExpAccounts.length} akun)
                </span>
              </div>
              <span className={`font-mono font-bold text-xs ${
                netOther >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}>
                {formatAccountingCurrency(netOther)}
              </span>
            </button>

            {expandedSections.other && (
              <div className="divide-y divide-slate-100 text-xs">
                {/* 4.A Pendapatan Lain-lain */}
                <div className="px-3 py-1 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-4">
                  Pendapatan Lain-lain (Kepala 7)
                </div>
                {filteredOtherIncAccounts.length === 0 ? (
                  <div className="px-4 py-1 text-slate-400 italic text-[11px]">
                    Tidak ada pendapatan lain-lain.
                  </div>
                ) : (
                  filteredOtherIncAccounts.map((a: any) => (
                    <div
                      key={a.id}
                      onClick={() => setDrilldownAccount(a)}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2 pl-4 sm:pl-6">
                        <span className="font-mono text-slate-500 font-semibold text-[11px] group-hover:text-emerald-600">
                          {a.code}
                        </span>
                        <span className="text-slate-800 font-medium group-hover:underline">
                          {a.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <span className="font-mono font-semibold text-emerald-700">
                        {formatAccountingCurrency(a.net_impact)}
                      </span>
                    </div>
                  ))
                )}

                {/* 4.B Beban Lain-lain */}
                <div className="px-3 py-1 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-4 border-t border-slate-100">
                  Beban Lain-lain (Kepala 8)
                </div>
                {filteredOtherExpAccounts.length === 0 ? (
                  <div className="px-4 py-1 text-slate-400 italic text-[11px]">
                    Tidak ada beban lain-lain.
                  </div>
                ) : (
                  filteredOtherExpAccounts.map((a: any) => (
                    <div
                      key={a.id}
                      onClick={() => setDrilldownAccount(a)}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2 pl-4 sm:pl-6">
                        <span className="font-mono text-slate-500 font-semibold text-[11px] group-hover:text-rose-600">
                          {a.code}
                        </span>
                        <span className="text-slate-800 font-medium group-hover:underline">
                          {a.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-rose-600 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <span className="font-mono font-semibold text-rose-700">
                        ({formatAccountingCurrency(a.net_impact)})
                      </span>
                    </div>
                  ))
                )}

                {/* Subtotal Other */}
                <div className="px-3 py-2 bg-slate-50/70 font-bold flex justify-between items-center text-slate-800 border-t border-slate-200">
                  <span className="pl-4 uppercase text-[11px]">Total Pendapatan &amp; Beban Lain (Net):</span>
                  <span className={`font-mono font-black text-xs ${netOther >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatAccountingCurrency(netOther)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* HIGHLIGHT: LABA SEBELUM PAJAK (EBT)                  */}
          {/* ---------------------------------------------------- */}
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between font-bold text-slate-800">
            <span className="uppercase text-[11px]">Laba Sebelum Pajak Penghasilan (EBT):</span>
            <span className={`font-mono text-xs ${ebt >= 0 ? "text-emerald-700 font-black" : "text-rose-700 font-black"}`}>
              {formatAccountingCurrency(ebt)}
            </span>
          </div>

          {/* ---------------------------------------------------- */}
          {/* BEBAN PAJAK PENGHASILAN (TAX)                        */}
          {/* ---------------------------------------------------- */}
          <div className="px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-700">
            <span className="text-[11px]">5. Beban Pajak Penghasilan (PPh Badan/Final):</span>
            <span className="font-mono font-semibold">
              {formatAccountingCurrency(taxExpense)}
            </span>
          </div>

          {/* ---------------------------------------------------- */}
          {/* FINAL GRAND TOTAL: LABA BERSIH (NET PROFIT)          */}
          {/* ---------------------------------------------------- */}
          <div className={`p-4 rounded-xl text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            netProfit >= 0
              ? "bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-900 border border-emerald-700"
              : "bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-900"
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider block">
                  Laba Bersih Setelah Pajak (Net Profit)
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  netProfit >= 0
                    ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                    : "bg-rose-500/30 text-rose-200 border border-rose-400/40"
                }`}>
                  {netProfit >= 0 ? "Surplus Keuntungan" : "Defisit Operasional"}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Laba bersih akhir yang menambah ekuitas saldo laba (Retained Earnings) pada Neraca Keuangan.
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                Net Profit Margin: {netMargin.toFixed(1)}%
              </span>
              <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}>
                {formatAccountingCurrency(netProfit)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. DRILLDOWN MODAL: DETAIL JURNAL BUKU BESAR             */}
      {/* ======================================================== */}
      {drilldownAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold text-xs sm:text-sm">
                      {drilldownAccount.code}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-white">
                      {drilldownAccount.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      Normal: {drilldownAccount.normal_balance}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Rincian Mutasi Buku Besar: {formatDate(startDate)} s/d {formatDate(endDate)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrilldownAccount(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Summary Badges */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Saldo Awal</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatAccountingCurrency(ledgerData?.opening_balance || 0)}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Debet</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatAccountingCurrency(ledgerData?.total_debit || 0)}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Kredit</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatAccountingCurrency(ledgerData?.total_credit || 0)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block text-right">Saldo Akhir</span>
                <span className="font-mono font-black text-sm text-indigo-700">
                  {formatAccountingCurrency(ledgerData?.ending_balance || 0)}
                </span>
              </div>
            </div>

            {/* Modal Table Entries */}
            <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4">
              {isLedgerLoading ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RotateCcw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                  <span className="text-xs">Memuat detail jurnal buku besar...</span>
                </div>
              ) : !ledgerData?.entries || ledgerData.entries.length <= 1 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-xs font-semibold">Tidak ada transaksi jurnal pada rentang tanggal ini.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Akun ini belum memiliki mutasi debet/kredit antara {formatDate(startDate)} hingga {formatDate(endDate)}.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-200">Tanggal</th>
                      <th className="py-2 px-3 border-r border-slate-200">No. Dokumen / Ref</th>
                      <th className="py-2 px-3 border-r border-slate-200">Keterangan Transaksi</th>
                      <th className="py-2 px-3 text-right border-r border-slate-200">Debet</th>
                      <th className="py-2 px-3 text-right border-r border-slate-200">Kredit</th>
                      <th className="py-2 px-3 text-right">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerData.entries.map((line: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-1.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                          {line.date ? formatDate(line.date) : "-"}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-100 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {line.doc_no || "-"}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-100 text-slate-700 max-w-xs truncate" title={line.description}>
                          {line.description || "-"}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-100 text-right font-mono text-slate-900">
                          {line.debit > 0 ? formatAccountingCurrency(line.debit) : "-"}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-100 text-right font-mono text-slate-900">
                          {line.credit > 0 ? formatAccountingCurrency(line.credit) : "-"}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-indigo-700">
                          {formatAccountingCurrency(line.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Total {ledgerData?.entries?.length || 0} baris mutasi buku besar
              </span>
              <button
                type="button"
                onClick={() => setDrilldownAccount(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition"
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
