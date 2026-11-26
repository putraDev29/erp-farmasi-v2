"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  FileText,
  ClipboardList,
  ChevronLeft as BackIcon,
  CheckCircle2,
  Truck,
  PackageCheck,
  Eye,
  RefreshCw,
  Smartphone,
  ExternalLink,
  XCircle,
  AlertCircle,
  Building,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function MarketplaceOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [courierName, setCourierName] = useState("Kurir Internal Apotek");
  const [trackingNo, setTrackingNo] = useState("");

  // Live Query - Auto-sync with mobile app every 3 seconds
  const { data: orders = [], isLoading, isFetching } = useQuery({
    queryKey: [
      "marketplace-orders",
      keyword,
      selectedWarehouse,
      startDate,
      endDate,
      orderFilter,
      processStatus,
      orderStatus,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (selectedWarehouse && selectedWarehouse !== "all") params.append("warehouse_id", selectedWarehouse);
      if (orderStatus && orderStatus !== "Semua") params.append("status", orderStatus);
      if (processStatus && processStatus !== "Semua") params.append("process_status", processStatus);
      if (orderFilter && orderFilter !== "Semua Pesanan Marketplace") {
        if (orderFilter === "Mobile App") params.append("source", "MOBILE");
        else params.append("source", orderFilter);
      }
      params.append("type", "MARKETPLACE");
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/sales/orders?${params.toString()}`);
      return res.data?.data || [];
    },
    refetchInterval: 3000, // Otomatis sinkron realtime data order mobile & web
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const selectedOrder = orders.find((o: any) => o.id === selectedId);

  // Mutations for Status Transitions (Sync back to Mobile)
  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await api.post(`/sales/orders/${orderId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      alert("✅ Pesanan berhasil diverifikasi dan disetujui! Faktur Penjualan otomatis dibuat dan siap disiapkan gudang.");
    },
    onError: (err: any) => {
      alert("Gagal memverifikasi: " + (err.response?.data?.message || err.message));
    },
  });

  const shipMutation = useMutation({
    mutationFn: async ({ orderId, courier, tracking }: { orderId: string; courier: string; tracking: string }) => {
      return await api.post(`/sales/orders/${orderId}/ship`, {
        delivery_courier: courier,
        delivery_tracking_no: tracking,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      setShipModalOpen(false);
      alert("✅ Status pengiriman berhasil diperbarui menjadi 'DIKIRIM'! Pengguna mobile sekarang dapat melacak pesanan.");
    },
    onError: (err: any) => {
      alert("Gagal memproses pengiriman: " + (err.response?.data?.message || err.message));
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await api.post(`/sales/orders/${orderId}/receive`, {
        received_by: "Admin / Petugas Konfirmasi",
        notes: "Dikonfirmasi selesai lewat Web ERP",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      alert("✅ Konfirmasi penerimaan berhasil! Pesanan telah selesai (COMPLETED) dan tersinkron ke aplikasi mobile.");
    },
    onError: (err: any) => {
      alert("Gagal konfirmasi: " + (err.response?.data?.message || err.message));
    },
  });

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const paginatedOrders = orders.slice((page - 1) * pageSize, page * pageSize);

  const renderStatusBadge = (status: string, processStatusStr: string) => {
    const s = (status || "").toUpperCase();
    if (s === "PENDING" || s === "DRAFT") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Menunggu Verifikasi</span>
        </span>
      );
    }
    if (s === "APPROVED" || s === "DIPROSES") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <CheckCircle2 className="w-3 h-3 text-blue-600" />
          <span>Diproses Gudang</span>
        </span>
      );
    }
    if (s === "DIKIRIM" || s === "SHIPPED") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
          <Truck className="w-3 h-3 text-indigo-600" />
          <span>Dalam Pengiriman</span>
        </span>
      );
    }
    if (s === "SELESAI" || s === "COMPLETED" || s === "DITERIMA") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <PackageCheck className="w-3 h-3 text-emerald-600" />
          <span>Selesai (Diterima)</span>
        </span>
      );
    }
    if (s === "BATAL" || s === "CANCELLED" || s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Dibatalkan</span>
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
        {status}
      </span>
    );
  };

  const renderSourceBadge = (source: string) => {
    const src = (source || "").toUpperCase();
    if (src === "MOBILE" || src === "MARKETPLACE" || src === "APP") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[10px] font-bold">
          <Smartphone className="w-3 h-3 text-emerald-600" />
          <span>Mobile App</span>
        </span>
      );
    }
    if (src === "SHOPEE") {
      return (
        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 border border-orange-300 rounded text-[10px] font-bold">
          Shopee
        </span>
      );
    }
    if (src === "TOKOPEDIA") {
      return (
        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded text-[10px] font-bold">
          Tokopedia
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
        {source || "Marketplace"}
      </span>
    );
  };

  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1 flex-wrap">
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

      {/* Cari / Refresh button */}
      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] })}
        className="h-6 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center gap-1 shadow-2xs cursor-pointer"
        title="Refresh Data Otomatis"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        <span className="text-[11px] font-medium">Refresh Sinkron</span>
      </button>

      {/* Detail Button */}
      <button
        type="button"
        disabled={!selectedOrder}
        onClick={() => setDetailModalOpen(true)}
        className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-40 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5 text-slate-500" />
        <span>Detail Pesanan</span>
      </button>

      {/* Verifikasi & Setujui Button */}
      {selectedOrder && (selectedOrder.status === "PENDING" || selectedOrder.status === "DRAFT") && (
        <button
          type="button"
          disabled={approveMutation.isPending}
          onClick={() => approveMutation.mutate(selectedOrder.id)}
          className="h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
        >
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{approveMutation.isPending ? "Memproses..." : "✓ Setujui Pesanan"}</span>
        </button>
      )}

      {/* Kirim Barang Button */}
      {selectedOrder && (selectedOrder.status === "APPROVED" || selectedOrder.status === "DIPROSES") && (
        <button
          type="button"
          onClick={() => {
            setCourierName(selectedOrder.delivery_courier || "Kurir Apotek");
            setTrackingNo(selectedOrder.delivery_tracking_no || `SJ/${selectedOrder.order_no}`);
            setShipModalOpen(true);
          }}
          className="h-6 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
        >
          <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Kirim Barang (Surat Jalan)</span>
        </button>
      )}

      {/* Konfirmasi Terima Button */}
      {selectedOrder && selectedOrder.status === "DIKIRIM" && (
        <button
          type="button"
          disabled={receiveMutation.isPending}
          onClick={() => receiveMutation.mutate(selectedOrder.id)}
          className="h-6 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
        >
          <PackageCheck className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{receiveMutation.isPending ? "Memproses..." : "Konfirmasi Diterima"}</span>
        </button>
      )}

      {/* Daftar Penjualan button */}
      <Link
        href="/sales/invoices"
        className="h-6 px-2.5 bg-[#4ba3e3] hover:bg-[#388ecf] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 ml-auto"
      >
        <FileText className="w-3 h-3" />
        <span>Daftar Faktur Penjualan</span>
      </Link>

      {/* Log Get Order button */}
      <button
        type="button"
        onClick={() => setLogModalOpen(true)}
        className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
      >
        <ClipboardList className="w-3 h-3 text-slate-500" />
        <span>Log Sinkron Mobile</span>
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
            className="text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Daftar Pesanan Marketplace &amp; Mobile</span>
            </h1>
            
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 text-[10px] font-bold">Sinkron Realtime Aktif</span>
          </span>
          <span className="text-slate-300">|</span>
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
        </div>
      </div>

      {/* 2. FILTER SECTION */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 space-y-1.5 shadow-2xs">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Kata Kunci :</label>
            <input
              type="text"
              placeholder="No SO, No SP, Nama Pemesan..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Gudang Pengirim :</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Gudang</option>
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
            <label className="block text-slate-600 font-semibold mb-0.5">Sumber / Platform :</label>
            <div className="flex gap-1">
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Semua Pesanan Marketplace">Semua Pesanan Marketplace</option>
                <option value="Mobile App">Mobile App Apotek</option>
                <option value="Shopee">Shopee</option>
                <option value="Tokopedia">Tokopedia</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Lazada">Lazada</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status Faktur :</label>
            <select
              value={processStatus}
              onChange={(e) => setProcessStatus(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 text-slate-700 cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu Verifikasi</option>
              <option value="APPROVED">Disetujui / Diproses</option>
              <option value="DIKIRIM">Dalam Pengiriman</option>
              <option value="SELESAI">Selesai (Diterima)</option>
              <option value="BATAL">Dibatalkan</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Tanggal">Tanggal</option>
                <option value="No Transaksi">No Transaksi</option>
                <option value="Pelanggan">Nama Pemesan</option>
                <option value="Total">Total Nilai</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="h-6 w-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600 shrink-0 cursor-pointer"
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

      {/* 4. TABLE VIEW */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No. Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No. SP / Nota Mobile</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Platform</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Pemesan (Apotek / Sarana)</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Alur</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Faktur</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Jml Item</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Catatan</th>
              <th className="py-0.5 px-2.5 text-right">Total Transaksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <RefreshCw className="w-5 h-5 text-sky-500 animate-spin" />
                    <span>Sinkronisasi pesanan mobile &amp; marketplace...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-20 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Smartphone className="w-8 h-8 text-slate-300" />
                    <span className="font-medium text-slate-500">Belum ada pesanan marketplace/mobile yang sesuai kriteria.</span>
                    <span className="text-[10px] text-slate-400">Setiap order obat dari aplikasi mobile akan otomatis masuk ke tabel ini secara realtime.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((s: any) => {
                const isSelected = selectedId === s.id;
                const totalItemsCount = s.items?.length || 0;
                const hasInvoice = !!s.sale_invoice_id || (s.process_status && s.process_status.toLowerCase().includes("faktur"));

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(isSelected ? null : s.id)}
                    onDoubleClick={() => {
                      setSelectedId(s.id);
                      setDetailModalOpen(true);
                    }}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* No Transaksi */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      {s.order_no}
                    </td>

                    {/* No SP / Nota */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                      {s.marketplace_order_no || s.customer_sp_number || "-"}
                    </td>

                    {/* Platform / Source */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {renderSourceBadge(s.source)}
                    </td>

                    {/* Pemesan */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium text-slate-800 max-w-[200px] truncate" title={s.customer?.name || s.marketplace_store}>
                      {s.customer?.name || s.marketplace_store || "Pelanggan Mobile"}
                    </td>

                    {/* Status Alur */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      {renderStatusBadge(s.status, s.process_status)}
                    </td>

                    {/* Status Faktur */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      {hasInvoice ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Sudah Faktur
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                          Belum Faktur
                        </span>
                      )}
                    </td>

                    {/* Tanggal */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-500">
                      {formatDate(s.date)}
                    </td>

                    {/* Jml Item */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-mono">
                      {totalItemsCount} Obat
                    </td>

                    {/* Catatan */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-500 max-w-[150px] truncate" title={s.notes}>
                      {s.notes || "-"}
                    </td>

                    {/* Total */}
                    <td className="py-0.5 px-2.5 text-right font-mono font-bold text-slate-800">
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

      {/* MODAL DETAIL PESANAN MARKETPLACE & STATUS SINKRON */}
      {detailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border text-xs">
            {/* Header */}
            <div className="shrink-0 flex justify-between items-center bg-slate-50 px-4 py-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Detail Pesanan: {selectedOrder.orderNo}
                </h3>
                {renderSourceBadge(selectedOrder.source)}
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Order Info Cards */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Pemesan (Apotek/Sarana):</div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedOrder.customer?.name || selectedOrder.marketplace_store}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-600">
                    Alamat: {selectedOrder.customer?.address || "-"}, {selectedOrder.customer?.city || ""}
                  </div>
                  <div className="text-[10.5px] text-slate-600">
                    Telp: {selectedOrder.customer?.phone || "-"}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Status Alur Transaksi:</div>
                  <div className="pt-0.5">
                    {renderStatusBadge(selectedOrder.status, selectedOrder.process_status)}
                  </div>
                  <div className="text-[10.5px] text-slate-600 mt-1">
                    No. SP Pemesan: <span className="font-mono font-bold">{selectedOrder.customer_sp_number || "-"}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-600">
                    Gudang: {selectedOrder.warehouse?.name || "Gudang Utama Farmasi"}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700 text-xs">
                  Daftar Obat / Barang Pesanan:
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-2.5">Nama Obat</th>
                        <th className="py-1.5 px-2.5 text-center">Qty Pesan</th>
                        <th className="py-1.5 px-2.5 text-right">Harga Satuan</th>
                        <th className="py-1.5 px-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedOrder.items || []).map((it: any, iIdx: number) => (
                        <tr key={it.id || iIdx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5">
                            <div className="font-bold text-slate-800">{it.product?.name || "Item Obat"}</div>
                            <div className="text-[10px] text-slate-400">Kode: {it.product?.code || "-"}</div>
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-bold text-sky-700">
                            {it.qty} {it.unit?.name || "PCS"}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">
                            {formatCurrency(it.unit_price)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800">
                            {formatCurrency(it.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                <div className="text-slate-500 text-[11px]">
                  Catatan: {selectedOrder.notes || "Tidak ada catatan."}
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[11px] mr-2">Total Nilai Pesanan:</span>
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {formatCurrency(selectedOrder.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="shrink-0 bg-slate-50 px-4 py-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[10.5px] text-slate-400">
                Aksi verifikasi di sini otomatis mengupdate status di aplikasi mobile pelanggan.
              </span>
              <div className="flex items-center gap-2">
                {/* Approve Button */}
                {(selectedOrder.status === "PENDING" || selectedOrder.status === "DRAFT") && (
                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => {
                      approveMutation.mutate(selectedOrder.id);
                      setDetailModalOpen(false);
                    }}
                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{approveMutation.isPending ? "Memproses..." : "Setujui Pesanan"}</span>
                  </button>
                )}

                {/* Ship Button */}
                {(selectedOrder.status === "APPROVED" || selectedOrder.status === "DIPROSES") && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      setCourierName(selectedOrder.delivery_courier || "Kurir Apotek");
                      setTrackingNo(selectedOrder.delivery_tracking_no || `SJ/${selectedOrder.order_no}`);
                      setShipModalOpen(true);
                    }}
                    className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Kirim Barang</span>
                  </button>
                )}

                {/* Receive Button */}
                {selectedOrder.status === "DIKIRIM" && (
                  <button
                    type="button"
                    disabled={receiveMutation.isPending}
                    onClick={() => {
                      receiveMutation.mutate(selectedOrder.id);
                      setDetailModalOpen(false);
                    }}
                    className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Konfirmasi Diterima</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="h-7 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGIRIMAN (SURAT JALAN) */}
      {shipModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 space-y-3 border text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Pengiriman Pesanan ({selectedOrder.orderNo})</span>
              </h3>
              <button onClick={() => setShipModalOpen(false)} className="cursor-pointer">✕</button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Kurir / Ekspedisi :</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="Kurir Internal Apotek / JNE / J&T..."
                  className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">No. Surat Jalan / Resi Pelacakan :</label>
                <input
                  type="text"
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  placeholder="SJ/2026/... atau Nomor Resi..."
                  className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <p className="text-[10.5px] text-slate-500 bg-indigo-50 p-2 rounded border border-indigo-100">
                Setelah disimpan, status di aplikasi mobile pelanggan otomatis berubah menjadi <strong>Dalam Pengiriman</strong> beserta info nomor resi/kurir.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShipModalOpen(false)}
                className="h-7 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={shipMutation.isPending}
                onClick={() => shipMutation.mutate({ orderId: selectedOrder.id, courier: courierName, tracking: trackingNo })}
                className="h-7 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{shipMutation.isPending ? "Menyimpan..." : "Simpan & Kirim"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG MODAL */}
      {logModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 space-y-3 border text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <span>Log Sinkronisasi Marketplace &amp; Mobile</span>
              </h3>
              <button onClick={() => setLogModalOpen(false)} className="cursor-pointer">✕</button>
            </div>
            <div className="bg-slate-900 text-emerald-400 p-3 rounded font-mono text-[11px] h-48 overflow-y-auto space-y-1">
              <div>[2026-11-23 16:30:00] INFO: Mobile Order API Gateway connected.</div>
              <div>[2026-11-23 16:30:01] INFO: Listening to mobile checkout events...</div>
              <div>[2026-11-23 16:30:02] STATUS: Bi-directional synchronization ACTIVE.</div>
              <div>[2026-11-23 16:30:03] SUCCESS: Live auto-refresh polling interval set to 3000ms.</div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="h-6 px-3 bg-slate-700 text-white rounded hover:bg-slate-800 text-[11px] cursor-pointer"
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
