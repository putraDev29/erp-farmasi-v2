"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Wallet,
  X,
  ChevronLeft as BackIcon,
  Printer,
  CheckCircle,
  Truck,
  PackageCheck,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";
import { FakturPenjualanDotMatrixModal } from "@/components/sales/FakturPenjualanDotMatrixModal";
import { RiwayatPembayaranSalesModal } from "@/components/sales/RiwayatPembayaranSalesModal";
import { AlurPenjualanModal } from "@/components/sales/AlurPenjualanModal";
import { TableSortSelect, parseSortValue, sortTableData } from "@/components/common/TableSortSelect";
import { useAuthStore } from "@/lib/auth-store";

const formatUserWithRole = (u: any) => {
  if (!u) return "-";
  const name = u.full_name || u.username || "-";
  if (name.includes("(") && name.includes(")")) return name;
  const role = u.roles?.[0]?.name || u.role?.name || u.role;
  if (role) return `${name} (${role})`;
  return name;
};

export default function SalesInvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isGudang = Boolean(
    user?.roles?.some((r: any) => {
      const roleName = (typeof r === "string" ? r : r?.name || "").toUpperCase();
      return roleName.includes("GUDANG");
    }) || user?.username?.toLowerCase() === "gudang"
  );
  const isAdmin = !isGudang;

  // Filters matching Ketoko Spec (Image 5)
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalSaleId, setPrintModalSaleId] = useState<string | null>(null);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [paymentHistorySaleId, setPaymentHistorySaleId] = useState<string | null>(null);

  // Modal Alur Penjualan Terpadu
  const [isAlurModalOpen, setIsAlurModalOpen] = useState(false);
  const [selectedSaleForAlur, setSelectedSaleForAlur] = useState<any | null>(null);

  // Pengiriman & Surat Jalan (Admin & Gudang)
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [shipTargetSale, setShipTargetSale] = useState<any | null>(null);
  const [shipCourier, setShipCourier] = useState("Kurir Internal Apotek");
  const [shipTrackingNo, setShipTrackingNo] = useState("");
  const [shipRecipient, setShipRecipient] = useState("");
  const [shipDeliveryDate, setShipDeliveryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shipNotes, setShipNotes] = useState("");
  const [shipItems, setShipItems] = useState<
    Array<{
      id: string;
      product_id: string;
      product_code?: string;
      product_name: string;
      qty: number;
      unit_name: string;
      batch_number: string;
      expired_date: string;
    }>
  >([]);

  const handleOpenShipModal = (sale: any) => {
    setShipTargetSale(sale);
    setShipRecipient(sale.customer?.name || "");
    setShipTrackingNo(sale.delivery_order_no || "");
    setShipCourier("Kurir Internal Apotek");
    setShipDeliveryDate(new Date().toISOString().split("T")[0]);
    setShipNotes("");
    const items = (sale.items || []).map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      product_code: it.product?.sku || it.product?.code || "",
      product_name: it.product?.name || "Obat",
      qty: it.qty,
      unit_name: it.unit?.name || "Pcs",
      batch_number: it.batch_number || "",
      expired_date: it.expired_date ? it.expired_date.split("T")[0] : "",
    }));
    setShipItems(items);
    setIsShipModalOpen(true);
  };

  // Konfirmasi Diterima Pelanggan (Admin)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveTargetSale, setReceiveTargetSale] = useState<any | null>(null);
  const [receivedBy, setReceivedBy] = useState("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [receivedProofURL, setReceivedProofURL] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");

  const handleOpenReceiveModal = (sale: any) => {
    setReceiveTargetSale(sale);
    setReceivedBy(sale.customer?.name || "Pelanggan");
    setReceivedDate(new Date().toISOString().split("T")[0]);
    setReceivedProofURL(sale.received_proof_url || "");
    setReceiveNotes("");
    setIsReceiveModalOpen(true);
  };

  // Queries
  const { data: sales = [], isLoading } = useQuery({
    queryKey: [
      "sales-invoices",
      keyword,
      selectedWarehouse,
      startDate,
      endDate,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/sales?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
  });

  // Kirim Barang & Buat Surat Jalan oleh Admin / Gudang (Stok Berkurang & Jurnal Akuntansi)
  const shipMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.post(`/sales/${id}/ship`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      setIsShipModalOpen(false);
      alert("✅ Surat Jalan berhasil dibuat dan barang telah dikirim!\nStok obat telah berkurang dan jurnal akuntansi telah dibukukan.");
    },
    onError: (err: any) => {
      alert("Gagal mengirim barang: " + (err.response?.data?.message || err.message));
    },
  });

  // Konfirmasi Diterima Pelanggan mutation
  const receiveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.post(`/sales/${id}/receive`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      setIsReceiveModalOpen(false);
      alert("✅ Penerimaan barang oleh pelanggan berhasil dikonfirmasi!\nSeluruh alur pesanan penjualan telah SELESAI.");
    },
    onError: (err: any) => {
      alert("Gagal konfirmasi penerimaan: " + (err.response?.data?.message || err.message));
    },
  });

  const sortedSales = sortTableData(sales, sortOption, {
    getCode: (item: any) => item.invoice_no,
    getName: (item: any) => item.customer?.name,
    getDate: (item: any) => item.created_at || item.date,
  });

  const totalPages = Math.max(1, Math.ceil(sortedSales.length / pageSize));
  const paginatedSales = sortedSales.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = (isBottom = false) => (
    <div className="flex items-center gap-1.5 py-1">
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

      {/* Cari button */}
      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["sales-invoices"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Cari"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* + Tambah button (Green) -> Menuju Form Faktur Penjualan Baru (Hanya Admin) */}
      {isAdmin && (
        <Link
          href="/sales/invoices/new"
          className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          title="Tambah Faktur Penjualan Baru"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Tambah</span>
        </Link>
      )}

      {/* ✏️ Ubah button (Blue) -> Menuju Form Edit Penjualan (Hanya Admin) */}
      {isAdmin && (
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => selectedId && router.push(`/sales/invoices/${selectedId}/edit`)}
          className="h-6 px-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        >
          <Pencil className="w-3 h-3 stroke-[2.5]" />
          <span>Ubah</span>
        </button>
      )}

      {/* 📦 Alur Transaksi Penjualan Modal */}
      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          if (!selectedId) {
            alert("Silakan pilih baris transaksi penjualan terlebih dahulu.");
            return;
          }
          const s = sales.find((it: any) => it.id === selectedId);
          setSelectedSaleForAlur(s || { id: selectedId });
          setIsAlurModalOpen(true);
        }}
        className="h-6 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 cursor-pointer"
        title="Buka Alur Terpadu Transaksi Penjualan (Pemesanan, Gudang, Serah Terima & Piutang)"
      >
        <PackageCheck className="w-3.5 h-3.5" />
        <span>Alur Transaksi</span>
      </button>

        {/* 🚚 Kirim Barang & Buat Surat Jalan -> HANYA GUDANG */}
        {isGudang && (
          <button
            type="button"
            onClick={() => {
              const selectedSale = sales.find((s: any) => s.id === selectedId);
              if (selectedSale) handleOpenShipModal(selectedSale);
            }}
            disabled={
              !selectedId ||
              (sales.find((s: any) => s.id === selectedId)?.status !== "MENUNGGU_PENGIRIMAN" &&
                sales.find((s: any) => s.id === selectedId)?.status !== "APPROVED" &&
                sales.find((s: any) => s.id === selectedId)?.status !== "DIPROSES")
            }
            className="h-6 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40 cursor-pointer"
            title="Petugas Gudang: Periksa nomor batch & expired date, buat surat jalan (stok keluar & jurnal akuntansi otomatis)"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Kirim Barang</span>
          </button>
        )}

      {/* 🗑️ Hapus button (Red) -> Hanya Admin */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={!selectedId}
          className="h-6 px-2.5 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        >
          <Trash2 className="w-3 h-3 stroke-[2.5]" />
          <span>Hapus</span>
        </button>
      )}

      {/* Kas Laci button (only on bottom toolbar as shown in screenshot) */}
      {isBottom && (
        <button
          type="button"
          onClick={() => alert("Kas Laci: Rp 1.500.000")}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition ml-2"
        >
          <Wallet className="w-3.5 h-3.5 text-amber-600" />
          <span>Kas Laci</span>
        </button>
      )}
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
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Daftar Penjualan
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

      {/* 2. FILTER SECTION (2 Rows matching Image 5) */}
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
            <label className="block text-slate-600 font-semibold mb-0.5">Dept/Gudang :</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">UTAMA - APOTEK BERKAT</option>
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
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <select
              value={sortOption}
              onChange={(e) => {
                const val = e.target.value;
                setSortOption(val);
                const { sortBy: sb, sortDir: sd } = parseSortValue(val);
                setSortBy(sb);
                setSortDir(sd);
                setPage(1);
              }}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 font-medium shadow-2xs truncate cursor-pointer"
            >
              <option value="created_at_desc">1. Urutan sesuai waktu input paling atas</option>
              <option value="code_asc">2. Kode (A - Z)</option>
              <option value="code_desc">3. Kode (Z - A)</option>
              <option value="name_asc">4. Nama (A - Z)</option>
              <option value="name_desc">5. Nama (Z - A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TOP TOOLBAR */}
      <div className="shrink-0">{renderToolbar(false)}</div>

      {/* 4. TABLE SECTION (16 Columns Matching Image 5 + Status Cetak) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2 border-r border-slate-200 text-center w-14">Aksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Dept/Gudang</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Sales</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Pajak</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Terbayar</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Sisa Piutang</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Bayar</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Alur</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Cetak</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">User Buat</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">User Ubah</th>
              <th className="py-0.5 px-2.5">Komputer</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={17} className="text-center py-12 text-slate-400">
                  Memuat data transaksi penjualan...
                </td>
              </tr>
            ) : paginatedSales.length === 0 ? (
              <tr>
                <td colSpan={17} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedSales.map((s: any) => {
                const isSelected = selectedId === s.id;
                const isPrinted = s.is_printed || (s.print_count || 0) > 0;

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(isSelected ? null : s.id)}
                    onDoubleClick={() => isAdmin && router.push(`/sales/invoices/${s.id}/edit`)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-0.5 px-1.5 border-r border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => router.push(`/sales/invoices/${s.id}/edit`)}
                            className="text-sky-600 hover:text-sky-800 p-0.5 rounded"
                            title="Ubah Transaksi Penjualan"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}

                        {/* Cetak Faktur Dot Matrix (Hanya Boleh 1 Kali) */}
                        <button
                          type="button"
                          disabled={isPrinted}
                          onClick={() => {
                            if (isPrinted) {
                              alert("Faktur ini sudah pernah dicetak sebelumnya! Berdasarkan regulasi farmasi, cetak hanya boleh 1 kali.");
                              return;
                            }
                            setPrintModalSaleId(s.id);
                            setIsPrintModalOpen(true);
                          }}
                          className={`p-0.5 rounded transition ${
                            isPrinted
                              ? "text-slate-300 cursor-not-allowed opacity-40"
                              : "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 cursor-pointer"
                          }`}
                          title={
                            isPrinted
                              ? `Faktur sudah dicetak (${formatDate(s.printed_at || s.date)}) - Hanya boleh 1 kali`
                              : "Cetak Faktur Penjualan (Kertas Continuous Form Dot Matrix)"
                          }
                        >
                          <Printer className="w-3 h-3" />
                        </button>

                        {/* Faktur Pembayaran & Riwayat Piutang */}
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentHistorySaleId(s.id);
                            setIsPaymentHistoryOpen(true);
                          }}
                          className="p-0.5 rounded transition text-amber-600 hover:text-amber-800 hover:bg-amber-50 cursor-pointer"
                          title="Lihat Faktur Pembayaran & Riwayat Piutang"
                        >
                          <Printer className="w-3 h-3 text-amber-600" />
                        </button>
                      </div>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSaleForAlur(s);
                            setSelectedId(s.id);
                            setIsAlurModalOpen(true);
                          }}
                          className="hover:underline cursor-pointer font-bold text-emerald-700"
                          title="Klik untuk melihat alur transaksi penjualan"
                        >
                          {s.invoice_no}
                        </span>
                        {s.sales_order_id && (
                          <span
                            className="text-[9px] px-1 py-0.2 bg-indigo-100 text-indigo-800 font-bold rounded border border-indigo-200"
                            title={`Dikonversi otomatis dari Pesanan Penjualan (SO): ${s.sales_order?.order_no || ""}`}
                          >
                            SO: {s.sales_order?.order_no || "Terkonversi"}
                          </span>
                        )}
                        {s.type === "BACKOFFICE" && (
                          <span className="text-[9px] px-1 py-0.2 bg-blue-100 text-blue-800 font-bold rounded">
                            PBF
                          </span>
                        )}
                        {s.pbf_origin_invoice_no && (
                          <span
                            className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 font-medium rounded"
                            title={`Faktur Asal: ${s.pbf_origin_invoice_no}`}
                          >
                            📎 Asal: {s.pbf_origin_invoice_no}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {formatDate(s.date)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {s.warehouse?.name || "UTAMA"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                      {s.customer?.name || "Pelanggan Umum"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-500">
                      {s.sales_rep?.name || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {s.tax_percent > 0 ? `${s.tax_percent}%` : "Non"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                      {formatCurrency(s.total_amount)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-medium text-emerald-700">
                      {formatCurrency(s.paid_amount || 0)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-medium text-rose-600">
                      {formatCurrency(s.remaining_amount || 0)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      {s.payment_status === "PAID" || (s.remaining_amount <= 0 && s.total_amount > 0) ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Lunas
                        </span>
                      ) : s.paid_amount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Sebagian
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Belum Lunas
                        </span>
                      )}
                    </td>
                    {/* Status Alur Pengiriman */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      {s.status === "MENUNGGU_PENGIRIMAN" || s.status === "APPROVED" || s.status === "DIPROSES" ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {isGudang ? "📦 Siap Kirim" : "📦 Menunggu Gudang"}
                          </span>
                          {isGudang && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenShipModal(s);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 transition cursor-pointer shadow-2xs inline-flex items-center gap-0.5"
                              title="Petugas Gudang: Siapkan obat, periksa batch & expired date, buat surat jalan"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Kirim</span>
                            </button>
                          )}
                        </div>
                      ) : s.status === "DIKIRIM" ? (
                        <div className="flex items-center justify-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300" title={`Surat Jalan: ${s.delivery_order_no || '-'}`}>
                            🚚 Dikirim
                          </span>
                        </div>
                      ) : s.status === "SELESAI" ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Selesai
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {s.status || "Transaksi"}
                        </span>
                      )}
                    </td>
                    {/* Status Cetak */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      {isPrinted ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300 flex items-center justify-center gap-1">
                          <span>✓</span>
                          <span>Sudah Cetak</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          Belum Cetak
                        </span>
                      )}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 max-w-[120px] truncate text-slate-600">
                      {s.notes || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-700">
                      {formatUserWithRole(s.user)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-500">
                      {formatUserWithRole(s.modifier)}
                    </td>
                    <td className="py-0.5 px-2.5 text-slate-700 font-mono text-[10.5px]">
                      {s.computer_name || "ISB-SEWA11-S-NB"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM TOOLBAR (With Kas Laci button as in Image 5) */}
      <div className="shrink-0 pt-0.5">{renderToolbar(true)}</div>

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3 border text-center">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Hapus Faktur Penjualan</h3>
            <p className="text-slate-600 text-[11px]">
              Apakah Anda yakin ingin membatalkan dan menghapus faktur penjualan yang dipilih?
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-6 px-3 border rounded hover:bg-slate-100 text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                className="h-6 px-3 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-[11px]"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PBF & SALES INVOICE DOCUMENTS MODAL (Dual Mode Upload) */}
      {isDocModalOpen && selectedId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <span>📎</span>
                <span>Lampiran Dokumen Faktur Penjualan Farmasi / PBF</span>
              </span>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <PbfDocumentUpload
                entityType="sale"
                entityId={selectedId}
                title="Dokumen Faktur Penjualan & Faktur PBF Asal"
                subtitle="Unggah Scan Surat Pesanan (SP) Pemesan, Faktur Asal saat Pembelian ke PBF, Surat Jalan, dan Faktur Pajak Penjualan"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-xs shadow-2xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK FAKTUR PENJUALAN DOT MATRIX (HANYA BISA DICETAK 1 KALI) */}
      <FakturPenjualanDotMatrixModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        saleId={printModalSaleId}
        onPrintSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
        }}
      />

      {/* MODAL FAKTUR PEMBAYARAN & RIWAYAT PIUTANG */}
      <RiwayatPembayaranSalesModal
        isOpen={isPaymentHistoryOpen}
        onClose={() => setIsPaymentHistoryOpen(false)}
        saleId={paymentHistorySaleId}
      />

      {/* MODAL KONFIRMASI DITERIMA PELANGGAN */}
      {isReceiveModalOpen && receiveTargetSale && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            {/* Header Ketoko Green */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#00c875] text-white font-bold text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Konfirmasi Barang Diterima Pelanggan</span>
              </span>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-[11px]">
              {/* Info Pengiriman */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded p-2.5 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">No. Faktur Penjualan :</span>
                  <span className="font-bold text-slate-800">{receiveTargetSale.invoice_no}</span>
                </div>
                {receiveTargetSale.sales_order && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">No. Pesanan Penjualan (SO) :</span>
                    <span className="font-bold font-mono text-indigo-700">{receiveTargetSale.sales_order.order_no}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">No. Surat Jalan :</span>
                  <span className="font-bold font-mono text-emerald-800">{receiveTargetSale.delivery_order_no || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pelanggan :</span>
                  <span className="font-semibold text-slate-800">{receiveTargetSale.customer?.name || "Pelanggan Umum"}</span>
                </div>
              </div>

              {/* Form Ekspedisi & Penerimaan */}
              <div className="space-y-2">
                <div className="p-2.5 bg-indigo-50/50 rounded border border-indigo-200 space-y-2">
                  <span className="font-bold text-indigo-950 block border-b border-indigo-200 pb-1">
                    🚚 Informasi Ekspedisi / Kurir Pengantar (Verifikasi Admin) :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">Kurir / Ekspedisi :</label>
                      <input
                        type="text"
                        value={shipCourier}
                        onChange={(e) => setShipCourier(e.target.value)}
                        placeholder="Kurir Internal / JNE"
                        className="w-full h-7 px-2 border border-slate-300 rounded text-xs bg-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">No. Surat Jalan / Resi :</label>
                      <input
                        type="text"
                        value={shipTrackingNo}
                        onChange={(e) => setShipTrackingNo(e.target.value)}
                        placeholder="Contoh: SJ-2026/11/0088"
                        className="w-full h-7 px-2 border border-slate-300 rounded text-xs font-mono bg-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-0.5">Tanggal Pengiriman :</label>
                      <input
                        type="date"
                        value={shipDeliveryDate}
                        onChange={(e) => setShipDeliveryDate(e.target.value)}
                        className="w-full h-7 px-2 border border-slate-300 rounded text-xs bg-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Nama Petugas / Apoteker Penerima di Pelanggan :</label>
                  <input
                    type="text"
                    placeholder="Contoh: apt. Budi Santoso / Bagian Penerimaan"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="w-full h-7 px-2 border border-slate-300 rounded text-xs bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Tanggal Diterima :</label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full h-7 px-2 border border-slate-300 rounded text-xs bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Bukti Penerimaan / No. Dokumen Tanda Terima :</label>
                  <input
                    type="text"
                    placeholder="Contoh: DOC-TERIMA-001 / Nomor Resi Berstempel / Link Foto TTD"
                    value={receivedProofURL}
                    onChange={(e) => setReceivedProofURL(e.target.value)}
                    className="w-full h-7 px-2 border border-slate-300 rounded text-xs bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Catatan Kesesuaian Fisik & Kemasan Obat :</label>
                  <textarea
                    rows={2}
                    placeholder="Semua kemasan utuh, nomor batch & tanggal kedaluwarsa sesuai Surat Pesanan..."
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="h-7 px-3 border border-slate-300 rounded hover:bg-slate-100 text-xs text-slate-700 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!receivedBy.trim()) {
                    alert("Nama penerima di pihak pelanggan wajib diisi.");
                    return;
                  }
                  receiveMutation.mutate({
                    id: receiveTargetSale.id,
                    payload: {
                      courier: shipCourier,
                      tracking_no: shipTrackingNo,
                      delivery_date: shipDeliveryDate ? new Date(shipDeliveryDate).toISOString() : undefined,
                      received_by: receivedBy,
                      received_date: receivedDate,
                      received_proof_url: receivedProofURL,
                      notes: receiveNotes,
                    },
                  });
                }}
                disabled={receiveMutation.isPending}
                className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{receiveMutation.isPending ? "Menyimpan..." : "Konfirmasi Diterima Pelanggan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL PENGIRIMAN & SURAT JALAN (Step Persiapan & Pengiriman Obat) */}
      {isShipModalOpen && shipTargetSale && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
            {/* Header Ketoko Green */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#00c875] text-white font-bold text-sm">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-white" />
                <span>Pengiriman Barang & Surat Jalan (Delivery)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsShipModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-[11px]">
              {/* Info Faktur Penjualan */}
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Faktur Penjualan :</span>
                  <span className="font-bold text-slate-800">{shipTargetSale.invoice_no}</span>
                </div>
                {shipTargetSale.sales_order?.order_no && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. Pesanan Penjualan (SO) :</span>
                    <span className="font-semibold text-indigo-700">{shipTargetSale.sales_order.order_no}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan Pemesan :</span>
                  <span className="font-semibold text-slate-800">{shipTargetSale.customer?.name || "Pelanggan Umum"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gudang Pengirim :</span>
                  <span className="font-medium text-slate-700">{shipTargetSale.warehouse?.name || "Gudang Utama Farmasi"}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-500">Total Nilai Tagihan :</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(shipTargetSale.total_amount)}</span>
                </div>
              </div>

              {/* Daftar Obat yang Disiapkan (Pemeriksaan Batch & ED) */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 flex items-center justify-between border-b border-slate-200">
                  <span>Daftar Obat yang Disiapkan :</span>
                  <span className="text-[10px] text-slate-500 font-normal">Wajib periksa fisik barang, isi Nomor Batch & Expired Date</span>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-1 px-2 text-center w-8">No</th>
                        <th className="py-1 px-2">Nama Obat / Barang</th>
                        <th className="py-1 px-2 text-right w-24">Jumlah</th>
                        <th className="py-1 px-2 w-40">No. Batch (Wajib)</th>
                        <th className="py-1 px-2 w-32">Expired Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shipItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="py-1 px-2 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-1 px-2">
                            <div className="font-semibold text-slate-800">{item.product_name}</div>
                            {item.product_code && (
                              <div className="text-[10px] text-slate-400 font-mono">{item.product_code}</div>
                            )}
                          </td>
                          <td className="py-1 px-2 text-right font-medium">
                            {item.qty} {item.unit_name}
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              placeholder="Batch No..."
                              value={item.batch_number}
                              onChange={(e) => {
                                const next = [...shipItems];
                                next[idx] = { ...next[idx], batch_number: e.target.value };
                                setShipItems(next);
                              }}
                              className="w-full h-6 px-1.5 border border-slate-300 rounded font-mono text-[10px] bg-white focus:border-emerald-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="date"
                              value={item.expired_date}
                              onChange={(e) => {
                                const next = [...shipItems];
                                next[idx] = { ...next[idx], expired_date: e.target.value };
                                setShipItems(next);
                              }}
                              className="w-full h-6 px-1.5 border border-slate-300 rounded text-[10px] bg-white focus:border-emerald-500 focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Komentar / Catatan Verifikasi Gudang */}
              <div className="space-y-1 bg-amber-50/60 p-2.5 rounded border border-amber-200">
                <label className="block font-bold text-amber-950 mb-0.5">
                  📝 Komentar / Catatan Verifikasi Gudang :
                </label>
                <textarea
                  rows={2}
                  placeholder="Kondisi kemasan utuh, segel rapi, nomor batch dan tanggal kedaluwarsa telah diverifikasi sesuai fisik..."
                  value={shipNotes}
                  onChange={(e) => setShipNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500">
                  * Informasi ekspedisi dan kurir pengantar akan diinput oleh Admin saat verifikasi pengiriman.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsShipModalOpen(false)}
                className="h-7 px-3 border border-slate-300 rounded hover:bg-slate-100 text-xs text-slate-700 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const missingBatch = shipItems.find((it) => !it.batch_number || it.batch_number.trim() === "");
                  if (missingBatch) {
                    alert(`Wajib mengisi Nomor Batch untuk obat: ${missingBatch.product_name}`);
                    return;
                  }
                  shipMutation.mutate({
                    id: shipTargetSale.id,
                    payload: {
                      notes: shipNotes,
                      items: shipItems.map((it) => ({
                        product_id: it.product_id,
                        batch_number: it.batch_number,
                        expired_date: it.expired_date ? new Date(it.expired_date).toISOString() : null,
                        qty: it.qty,
                      })),
                    },
                  });
                }}
                disabled={shipMutation.isPending}
                className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{shipMutation.isPending ? "Menyimpan Verifikasi..." : "Verifikasi Fisik & Siapkan Obat"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL ALUR TRANSAKSI PENJUALAN TERPADU */}
      <AlurPenjualanModal
        isOpen={isAlurModalOpen}
        onClose={() => {
          setIsAlurModalOpen(false);
          setSelectedSaleForAlur(null);
        }}
        saleId={selectedSaleForAlur?.id || null}
        isGudang={isGudang}
        isAdmin={isAdmin}
      />
    </div>
  );
}
