"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  Calendar,
  AlertCircle,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Package,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { TableSortSelect, sortTableData } from "@/components/common/TableSortSelect";

type FilterType = "all" | "expired" | "1_week" | "2_weeks" | "30_days" | "2_months" | "3_months";

interface ExpiredDrugItem {
  id: string;
  code: string;
  barcode: string;
  name: string;
  batch_number: string;
  expired_date: string;
  expired_date_str: string;
  days_remaining: number;
  status: string;
  status_label: string;
  category_name: string;
  brand_name: string;
  unit_name: string;
  rack: string;
  current_stock: number;
  purchase_price: number;
  selling_price: number;
  risk_value: number;
}

export default function ExpiredDrugsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Initial filter from query param if available (e.g., ?filter=1_week)
  const initialFilter = (searchParams.get("filter") as FilterType) || "all";
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockOnly, setStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<ExpiredDrugItem | null>(null);
  const [editBatch, setEditBatch] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Categories query
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data?.data || [];
    },
  });

  // Expired Drugs query
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["expired-drugs", filter, search, selectedCategory, stockOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter) params.append("filter", filter);
      if (search) params.append("search", search);
      if (selectedCategory && selectedCategory !== "ALL") params.append("category_id", selectedCategory);
      if (stockOnly) params.append("stock_only", "true");

      const res = await api.get(`/inventory/expired-drugs?${params.toString()}`);
      return res.data?.data || { items: [], metrics: {} };
    },
  });

  const items: ExpiredDrugItem[] = data?.items || [];
  const metrics = data?.metrics || {
    count_expired: 0,
    count_1_week: 0,
    count_2_weeks: 0,
    count_30_days: 0,
    count_2_months: 0,
    count_3_months: 0,
    total_risk_stock_qty: 0,
    total_risk_value: 0,
    total_monitored: 0,
  };

  // Pagination & Sorting
  const sortedItems = useMemo(() => {
    return sortTableData(items, sortOption, {
      getCode: (item: any) => item.code,
      getName: (item: any) => item.name,
      getDate: (item: any) => item.expired_date,
    });
  }, [items, sortOption]);

  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  // Handle Edit Save
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      setIsUpdating(true);
      await api.put(`/inventory/expired-drugs/${editingItem.id}`, {
        batch_number: editBatch.trim(),
        expired_date: editDate,
      });
      queryClient.invalidateQueries({ queryKey: ["expired-drugs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setEditingItem(null);
    } catch (err: any) {
      alert("Gagal memperbarui data kadaluarsa: " + (err.response?.data?.message || err.message));
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: ExpiredDrugItem) => {
    setEditingItem(item);
    setEditBatch(item.batch_number || "");
    setEditDate(item.expired_date_str || "");
  };

  // Helper for Status Badge
  const renderStatusBadge = (item: ExpiredDrugItem) => {
    if (item.days_remaining < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-sm animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          KADALUARSA ({Math.abs(item.days_remaining)} hr lalu)
        </span>
      );
    }
    if (item.days_remaining <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          KRITIS ({item.days_remaining} hari lagi)
        </span>
      );
    }
    if (item.days_remaining <= 14) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800 border border-orange-300">
          <Clock className="w-3.5 h-3.5 text-orange-600" />
          ≤ 2 MINGGU ({item.days_remaining} hr)
        </span>
      );
    }
    if (item.days_remaining <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          ≤ 30 HARI ({item.days_remaining} hr)
        </span>
      );
    }
    if (item.days_remaining <= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
          ≤ 2 BULAN ({item.days_remaining} hr)
        </span>
      );
    }
    if (item.days_remaining <= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-sky-100 text-sky-800 border border-sky-200">
          ≤ 3 BULAN ({item.days_remaining} hr)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        AMAN (&gt; 3 bln)
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4 text-xs select-none p-1 sm:p-2">
      {/* Header & Title */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Monitoring Obat Kadaluarsa (ED) & Mendekati Expired
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                CDOB / BPOM
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            Segarkan
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Sudah Expired */}
        <button
          onClick={() => {
            setFilter("expired");
            setPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            filter === "expired"
              ? "bg-rose-50 border-rose-400 ring-2 ring-rose-300"
              : "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30"
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="font-semibold text-[11px]">Sudah Kadaluarsa</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-700">{metrics.count_expired}</div>
          <p className="text-[10px] text-rose-600/80 font-medium mt-0.5">Lewat tanggal ED</p>
        </button>

        {/* Card 2: <= 1 Minggu */}
        <button
          onClick={() => {
            setFilter("1_week");
            setPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            filter === "1_week"
              ? "bg-red-50 border-red-400 ring-2 ring-red-300"
              : "bg-white border-slate-200 hover:border-red-300 hover:bg-red-50/30"
          }`}
        >
          <div className="flex items-center justify-between text-red-600 mb-1">
            <span className="font-semibold text-[11px]">≤ 1 Minggu (Kritis)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-red-700">{metrics.count_1_week}</div>
          <p className="text-[10px] text-red-600/80 font-medium mt-0.5">Masa simpan &le; 7 hari</p>
        </button>

        {/* Card 3: <= 2 Minggu */}
        <button
          onClick={() => {
            setFilter("2_weeks");
            setPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            filter === "2_weeks"
              ? "bg-orange-50 border-orange-400 ring-2 ring-orange-300"
              : "bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/30"
          }`}
        >
          <div className="flex items-center justify-between text-orange-600 mb-1">
            <span className="font-semibold text-[11px]">≤ 2 Minggu</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-orange-700">{metrics.count_2_weeks}</div>
          <p className="text-[10px] text-orange-600/80 font-medium mt-0.5">Masa simpan &le; 14 hari</p>
        </button>

        {/* Card 4: <= 30 Hari */}
        <button
          onClick={() => {
            setFilter("30_days");
            setPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            filter === "30_days"
              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
              : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="font-semibold text-[11px]">≤ 30 Hari</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-700">{metrics.count_30_days}</div>
          <p className="text-[10px] text-amber-600/80 font-medium mt-0.5">Masa simpan &le; 1 bulan</p>
        </button>

        {/* Card 5: <= 2 Bulan */}
        <button
          onClick={() => {
            setFilter("2_months");
            setPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            filter === "2_months"
              ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300"
              : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="font-semibold text-[11px]">≤ 2 Bulan</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-700">{metrics.count_2_months}</div>
          <p className="text-[10px] text-blue-600/80 font-medium mt-0.5">Masa simpan &le; 60 hari</p>
        </button>

        {/* Card 6: <= 3 Bulan */}
        <button
          onClick={() => {
            setFilter("3_months");
            setPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            filter === "3_months"
              ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300"
              : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="font-semibold text-[11px]">≤ 3 Bulan</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{metrics.count_3_months}</div>
          <p className="text-[10px] text-indigo-600/80 font-medium mt-0.5">Masa simpan &le; 90 hari</p>
        </button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Periode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter ED:
          </span>
          {[
            { id: "all", label: "Semua Terdata" },
            { id: "expired", label: "Sudah Expired", badge: metrics.count_expired, color: "bg-rose-500" },
            { id: "1_week", label: "1 Minggu (≤ 7 Hari)", badge: metrics.count_1_week, color: "bg-red-500" },
            { id: "2_weeks", label: "2 Minggu (≤ 14 Hari)", badge: metrics.count_2_weeks, color: "bg-orange-500" },
            { id: "30_days", label: "30 Hari (≤ 1 Bulan)", badge: metrics.count_30_days, color: "bg-amber-500" },
            { id: "2_months", label: "2 Bulan (≤ 60 Hari)", badge: metrics.count_2_months, color: "bg-blue-500" },
            { id: "3_months", label: "3 Bulan (≤ 90 Hari)", badge: metrics.count_3_months, color: "bg-indigo-500" },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFilter(tab.id as FilterType);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : `${tab.color} text-white`
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Extra Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari obat, no. batch, barcode, kode..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            >
              <option value="ALL">-- Semua Kategori --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="w-56">
              <TableSortSelect
                value={sortOption}
                onChange={(val) => {
                  setSortOption(val);
                  setPage(1);
                }}
                timeLabel="Urutan sesuai waktu input paling atas"
                compact
              />
            </div>

            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer ml-1 select-none">
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(e) => {
                  setStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span>Hanya yang ada stok (&gt; 0)</span>
            </label>
          </div>

          <div className="text-slate-500 text-xs self-center">
            Menampilkan <span className="font-bold text-slate-800">{items.length}</span> item obat
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">No</th>
                <th className="py-2.5 px-3">Kode &amp; Barcode</th>
                <th className="py-2.5 px-3 min-w-[200px]">Nama Obat / Produk</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">No. Batch / Lot</th>
                <th className="py-2.5 px-3">Tanggal ED</th>
                <th className="py-2.5 px-3">Status Masa Simpan</th>
                <th className="py-2.5 px-3 text-right">Stok Fisik</th>
                <th className="py-2.5 px-3 text-right">Harga Beli</th>
                <th className="py-2.5 px-3 text-right">Nilai Stok Berisiko</th>
                <th className="py-2.5 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data obat kadaluarsa...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    Tidak ada obat yang cocok dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const rowNum = (page - 1) * pageSize + idx + 1;
                  const isExp = item.days_remaining < 0;
                  const isCrit = item.days_remaining >= 0 && item.days_remaining <= 7;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isExp
                          ? "bg-rose-50/30"
                          : isCrit
                          ? "bg-red-50/20"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                        {rowNum}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{item.code}</div>
                        {item.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono">{item.barcode}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Merek: {item.brand_name || "-"}</span>
                          {item.rack && <span>• Rak: {item.rack}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {item.category_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[11px]">
                          {item.batch_number || "NON-BATCH"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">
                          {formatDate(item.expired_date)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.expired_date_str}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderStatusBadge(item)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-black text-xs ${
                            item.current_stock <= 0
                              ? "text-slate-400"
                              : isExp
                              ? "text-rose-600"
                              : isCrit
                              ? "text-red-600"
                              : "text-slate-800"
                          }`}
                        >
                          {item.current_stock.toLocaleString("id-ID")}
                        </span>{" "}
                        <span className="text-[10px] text-slate-500 font-medium">{item.unit_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                        {formatCurrency(item.purchase_price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(item.risk_value)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => openEditModal(item)}
                          title="Perbarui Batch & Tanggal ED"
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>
              Halaman <span className="font-bold text-slate-800">{page}</span> dari{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </span>
            <span>•</span>
            <span>
              Total Nilai Risiko Stok:{" "}
              <span className="font-bold text-rose-600 font-mono">
                {formatCurrency(metrics.total_risk_value)}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg font-semibold text-xs transition ${
                    page === p
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Edit Batch & Tanggal ED */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Ubah Batch &amp; Tanggal Kadaluarsa
                  </h3>
                  <p className="text-[11px] text-slate-400">Pembaruan data batch / lot CDOB</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Produk / Obat:</div>
                <div className="font-bold text-slate-800">{editingItem.name}</div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Kode: {editingItem.code} • Stok: {editingItem.current_stock} {editingItem.unit_name}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor Batch / Lot
                </label>
                <input
                  type="text"
                  value={editBatch}
                  onChange={(e) => setEditBatch(e.target.value)}
                  placeholder="Contoh: BATCH-2026-X01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-mono font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Kadaluarsa (ED)
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-semibold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Format: Tahun-Bulan-Tanggal (YYYY-MM-DD)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition disabled:opacity-50"
              >
                {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
