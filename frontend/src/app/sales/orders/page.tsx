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
  X,
  AlertCircle,
  ChevronLeft as BackIcon,
  Truck,
  CheckCircle,
  FileText,
  Printer,
  Eye,
  Settings,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { TableSortSelect, parseSortValue, sortTableData } from "@/components/common/TableSortSelect";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";
import { CariObatSalesModal } from "@/components/sales/CariObatSalesModal";
import { useAuthStore } from "@/lib/auth-store";

const formatUserWithRole = (u: any) => {
  if (!u) return "-";
  const name = u.full_name || u.username || "-";
  if (name.includes("(") && name.includes(")")) return name;
  const role = u.roles?.[0]?.name || u.role?.name || u.role;
  if (role) return `${name} (${role})`;
  return name;
};

export default function SalesOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isGudang = Boolean(
    user?.roles?.some((r: any) => {
      const roleName = (typeof r === "string" ? r : r?.name || "").toUpperCase();
      return roleName.includes("GUDANG");
    }) || user?.username?.toLowerCase() === "gudang"
  );

  const isAdmin = Boolean(
    !isGudang &&
      (!user?.roles ||
        user.roles.length === 0 ||
        user.roles.some((r: any) => {
          const roleName = (typeof r === "string" ? r : r?.name || "").toUpperCase();
          return (
            roleName.includes("ADMIN") ||
            roleName.includes("SUPER") ||
            roleName.includes("APOTEKER") ||
            roleName.includes("KEUANGAN")
          );
        }) ||
        user?.username?.toLowerCase() === "admin")
  );

  // Filters matching Ketoko Spec (Image 1)
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [orderFilter, setOrderFilter] = useState("Semua Pesanan");
  const [processStatus, setProcessStatus] = useState("Semua");
  const [orderStatus, setOrderStatus] = useState("");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formSalesRepId, setFormSalesRepId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTaxPercent, setFormTaxPercent] = useState<number>(0);
  const [formDiscount, setFormDiscount] = useState<number>(0);
  // PBF & SP Compliance fields
  const [formCustomerSPNumber, setFormCustomerSPNumber] = useState("");
  const [formCustomerSPDate, setFormCustomerSPDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formCustomerSPType, setFormCustomerSPType] = useState("REGULER");
  const [formPBFOriginInvoiceNo, setFormPBFOriginInvoiceNo] = useState("");
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalTargetId, setDocModalTargetId] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [orderDraftId, setOrderDraftId] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "so-" + Date.now()));
  const [formItems, setFormItems] = useState<
    Array<{
      product_id: string;
      unit_id: string;
      qty: number;
      unit_price: number;
      discount: number;
    }>
  >([]);

  // Queries
  const { data: orders = [], isLoading } = useQuery({
    queryKey: [
      "sales-orders",
      keyword,
      selectedWarehouse,
      startDate,
      endDate,
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
      if (orderStatus && orderStatus !== "Semua") params.append("status", orderStatus);
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/sales/orders?${params.toString()}`);
      return res.data?.data || [];
    },
  });

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

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => {
      const res = await api.get("/products?page_size=150");
      return res.data?.data?.items || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/sales/orders", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal membuat pesanan penjualan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/sales/orders/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      setEditModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal memperbarui pesanan penjualan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/sales/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal menghapus pesanan penjualan");
    },
  });

  // Step 2 & 3: Verifikasi & Persetujuan Admin (Auto Konversi ke Menu Penjualan)
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.put(`/sales/orders/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      alert("✅ Pesanan penjualan berhasil disetujui Admin!\nDokumen otomatis masuk ke Menu Penjualan (menunggu Gudang menyiapkan & mengirim barang).");
    },
    onError: (err: any) => {
      alert("Gagal menyetujui pesanan: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setFormCustomerId(customers[0]?.id || "");
    setFormSalesRepId("");
    setFormNotes("");
    setFormTaxPercent(0);
    setFormDiscount(0);
    setFormCustomerSPNumber("");
    setFormCustomerSPDate(new Date().toISOString().split("T")[0]);
    setFormCustomerSPType("REGULER");
    setFormPBFOriginInvoiceNo("");
    setFormItems([]);
    setErrorMsg(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    if (products.length > 0) {
      const firstP = products[0];
      setFormItems([
        {
          product_id: firstP.id,
          unit_id: firstP.base_unit_id || "",
          qty: 1,
          unit_price: firstP.selling_price || 0,
          discount: 0,
        },
      ]);
    }
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    const item = orders.find((o: any) => o.id === selectedId);
    if (!item) return;
    setFormCustomerId(item.customer_id);
    setFormSalesRepId(item.sales_rep_id || "");
    setFormNotes(item.notes || "");
    setFormTaxPercent(item.tax_percent || 0);
    setFormDiscount(item.discount || 0);
    setFormCustomerSPNumber(item.customer_sp_number || "");
    setFormCustomerSPDate(item.customer_sp_date ? item.customer_sp_date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setFormCustomerSPType(item.customer_sp_type || "REGULER");
    setFormPBFOriginInvoiceNo(item.pbf_origin_invoice_no || "");
    setEditModalOpen(true);
  };

  const handleSelectProductFromModal = (prod: any) => {
    const existingIdx = formItems.findIndex((it) => it.product_id === prod.id);
    if (existingIdx >= 0) {
      const updated = [...formItems];
      updated[existingIdx].qty += 1;
      setFormItems(updated);
    } else {
      setFormItems([
        ...formItems,
        {
          product_id: prod.id,
          unit_id: prod.base_unit_id || "",
          qty: 1,
          unit_price: prod.selling_price || 0,
          discount: 0,
        },
      ]);
    }
  };

  const handleAddItemRow = () => {
    setIsItemModalOpen(true);
  };

  const handleRemoveItemRow = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...formItems];
    if (field === "product_id") {
      const p = products.find((pr: any) => pr.id === val);
      updated[idx] = {
        ...updated[idx],
        product_id: val,
        unit_id: p?.base_unit_id || updated[idx].unit_id,
        unit_price: p?.selling_price || 0,
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: val };
    }
    setFormItems(updated);
  };

  const formSubtotal = formItems.reduce(
    (acc, it) => acc + (it.qty * it.unit_price - (it.discount || 0)),
    0
  );
  const formTaxAmount = (formSubtotal - formDiscount) * (formTaxPercent / 100);
  const formTotalAmount = formSubtotal - formDiscount + formTaxAmount;

  const sortedOrders = sortTableData(orders, sortOption, {
    getCode: (item: any) => item.order_no,
    getName: (item: any) => item.customer?.name,
    getDate: (item: any) => item.created_at || item.date,
  });

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const paginatedOrders = sortedOrders.slice((page - 1) * pageSize, page * pageSize);

  // Render Toolbar Component (Used top and bottom as in screenshot)
  const renderToolbar = () => {
    const selectedSO = orders.find((o: any) => o.id === selectedId);

    return (
      <div className="flex flex-wrap items-center justify-between gap-1.5 py-1 w-full">
        <div className="flex flex-wrap items-center gap-1.5">
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
            onClick={() => queryClient.invalidateQueries({ queryKey: ["sales-orders"] })}
            className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
            title="Cari"
          >
            <Search className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

        {/* + Tambah button (Green) -> HANYA ADMIN */}
        {isAdmin && (
          <Link
            href="/sales/orders/new"
            className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Tambah Pesanan Penjualan Baru (Sales Order)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Tambah</span>
          </Link>
        )}

        {/* ✏️ Ubah button (Blue) -> HANYA ADMIN */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => selectedId && router.push(`/sales/orders/${selectedId}/edit`)}
            disabled={!selectedId}
            className="h-6 px-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
          >
            <Pencil className="w-3 h-3 stroke-[2.5]" />
            <span>Ubah</span>
          </button>
        )}

        {/* 🛡️ Verifikasi & Setujui Pesanan -> HANYA ADMIN */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              if (!selectedSO) return;
              if (
                confirm(
                  `Verifikasi dan setujui pesanan ${selectedSO.order_no}?\n\nPesanan akan otomatis dikonversi masuk ke Menu Penjualan dan diteruskan ke Gudang untuk penyiapan obat.`
                )
              ) {
                approveMutation.mutate(selectedSO.id);
              }
            }}
            disabled={!selectedId || (selectedSO?.status !== "PENDING" && selectedSO?.status !== "DRAFT")}
            className="h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40 cursor-pointer"
            title="Verifikasi ketersediaan stok, harga, & termin, lalu setujui pesanan (otomatis masuk Menu Penjualan)"
          >
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Setujui Pesanan</span>
          </button>
        )}

        {/* 🗑️ Hapus button (Red) -> HANYA ADMIN */}
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
      </div>

      {/* Counter right side matching Image 2 */}
      <div className="text-[11px] text-slate-500 font-medium shrink-0 pr-1">
        Total: <strong className="text-slate-800">{orders.length}</strong> pesanan ditemukan
      </div>
    </div>
  );
};

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
            Daftar Pesanan Penjualan
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

      {/* 2. FILTER SECTION (Ketoko Spec - 2 Rows) */}
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
            <label className="block text-slate-600 font-semibold mb-0.5">Pesanan :</label>
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua Pesanan">Semua Pesanan</option>
              <option value="Pesanan Langsung">Pesanan Langsung</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status Proses :</label>
            <select
              value={processStatus}
              onChange={(e) => setProcessStatus(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua</option>
              <option value="PROCESSED">Sudah Diproses</option>
              <option value="UNPROCESSED">Belum Diproses</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status Pesanan :</label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 text-slate-500"
            >
              <option value="">Select...</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
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
      <div className="shrink-0">
        {renderToolbar()}
      </div>

      {/* 4. TABLE SECTION (13 Columns Matching Image 2 - Ketoko Format) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-200 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 h-6 sticky top-0 z-10 shadow-2xs">
            <tr>
              <th className="py-0.5 px-2 border-r border-slate-200 text-center w-14">Aksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal Kirim</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Dept/Gudang</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kode Pelanggan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama Pelanggan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Jumlah Pesan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Jumlah Terkirim</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Pajak</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center">Status Bayar</th>
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
                  Memuat data pesanan penjualan...
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={17} className="text-center py-20 text-slate-400">
                  Belum ada transaksi pesanan penjualan ditemukan
                </td>
              </tr>
            ) : (
              paginatedOrders.map((so: any) => {
                const isSelected = selectedId === so.id;
                const totalQty = so.items?.reduce((sum: number, it: any) => sum + (it.qty || 0), 0) || 0;
                const deliveredQty = so.items?.reduce((sum: number, it: any) => sum + (it.delivered_qty || 0), 0) || (so.status === "DIKIRIM" || so.status === "DITERIMA" || so.status === "SELESAI" ? totalQty : 0);

                return (
                  <tr
                    key={so.id}
                    onClick={() => setSelectedId(isSelected ? null : so.id)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected
                        ? "bg-emerald-50/80 text-slate-900 font-medium"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Aksi icons */}
                    <td className="py-0.5 px-1.5 border-r border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit icon (Blue Pencil) -> Admin Only */}
                        {isAdmin && (
                          <Link
                            href={`/sales/orders/${so.id}/edit`}
                            className="p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Ubah / Buka Pesanan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        )}

                        {/* Step 2: Verifikasi & Setujui Pesanan -> Admin Only */}
                        {isAdmin && (so.status === "PENDING" || so.status === "DRAFT" || !so.status) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Verifikasi & setujui pesanan ${so.order_no}?\n\nPesanan akan otomatis masuk ke Menu Penjualan dan diteruskan ke Gudang untuk penyiapan obat.`
                                )
                              ) {
                                approveMutation.mutate(so.id);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 transition cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            title="Verifikasi stok & syarat, lalu setujui pesanan (otomatis masuk Menu Penjualan)"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Setujui</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* No Transaksi */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-bold text-slate-800">
                      <Link href={`/sales/orders/${so.id}/edit`} className="hover:text-emerald-700 hover:underline">
                        {so.order_no}
                      </Link>
                    </td>

                    {/* Tanggal */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                      {formatDate(so.date)}
                    </td>

                    {/* Tanggal Kirim */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                      {so.delivery_date ? formatDate(so.delivery_date) : (so.expected_date ? formatDate(so.expected_date) : "-")}
                    </td>

                    {/* Dept/Gudang */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-700">
                      {so.warehouse?.name || "Gudang Utama Farmasi"}
                    </td>

                    {/* Kode Pelanggan */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                      {so.customer?.code || "01"}
                    </td>

                    {/* Nama Pelanggan */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium text-slate-800">
                      {so.customer?.name || "Pelanggan Umum"}
                    </td>

                    {/* Jumlah Pesan */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-medium text-slate-800">
                      {Number(totalQty).toLocaleString("id-ID")}
                    </td>

                    {/* Jumlah Terkirim */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-medium text-slate-800">
                      {Number(deliveredQty).toLocaleString("id-ID")}
                    </td>

                    {/* Pajak */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right text-slate-600">
                      {so.tax_amount > 0 ? formatCurrency(so.tax_amount) : "Rp 0"}
                    </td>

                    {/* Total (Bold Green matching Image 2) */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-emerald-700">
                      {formatCurrency(so.total_amount)}
                    </td>

                    {/* Status badge */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      <span
                        className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold ${
                          so.status === "SELESAI"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : so.status === "DITERIMA"
                            ? "bg-teal-100 text-teal-800 border border-teal-300"
                            : so.status === "DIKIRIM"
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                            : so.status === "APPROVED" || so.status === "DIPROSES"
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : so.status === "BATAL"
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {so.status === "APPROVED" ? "MASUK PENJUALAN" : (so.status || "PENDING")}
                      </span>
                    </td>

                    {/* Status Bayar badge */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      {so.payment_status === "PAID" || (Number(so.remaining_amount) <= 0 && Number(so.total_amount) > 0) ? (
                        <span className="inline-block px-2 py-0.2 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                          Lunas
                        </span>
                      ) : so.payment_status === "PARTIAL" || (Number(so.paid_amount) > 0 || Number(so.dp_amount) > 0) ? (
                        <span className="inline-block px-2 py-0.2 rounded text-[10px] font-bold bg-[#fffbeb] text-[#d97706] border border-[#fde68a]">
                          Sebagian
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.2 rounded text-[10px] font-bold bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">
                          Tempo (0)
                        </span>
                      )}
                    </td>

                    {/* Keterangan */}
                    <td className="py-0.5 px-2.5 max-w-xs truncate text-slate-600 border-r border-slate-100">
                      {so.notes || "-"}
                    </td>

                    {/* User Buat */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-700">
                      {formatUserWithRole(so.user)}
                    </td>

                    {/* User Ubah */}
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-500">
                      {formatUserWithRole(so.modifier)}
                    </td>

                    {/* Komputer */}
                    <td className="py-0.5 px-2.5 text-slate-700 font-mono text-[10.5px]">
                      {so.computer_name || "ISB-SEWA11-S-NB"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM TOOLBAR (Matching Image 1) */}
      <div className="shrink-0 pt-0.5">
        {renderToolbar()}
      </div>

      {/* CREATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-[#00c875] text-white font-bold text-xs">
              <span>Tambah Pesanan Penjualan (SO)</span>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto text-[11px]">
              {errorMsg && (
                <div className="p-2 bg-red-50 text-red-700 rounded border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Pelanggan</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full h-7 px-2 border rounded"
                  >
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code || "CUST"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Sales</label>
                  <select
                    value={formSalesRepId}
                    onChange={(e) => setFormSalesRepId(e.target.value)}
                    className="w-full h-7 px-2 border rounded"
                  >
                    <option value="">Pilih Sales (Opsional)...</option>
                    {salesReps.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Compliance Farmasi & PBF */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-lg p-2.5 space-y-2">
                <span className="font-bold text-emerald-900 block text-[11px]">
                  📋 Legalitas Surat Pesanan (SP) & Faktur Pembelian PBF Asal
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      No. SP Pemesan :
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: SP/APOTEK-A/2026/XI/12"
                      value={formCustomerSPNumber}
                      onChange={(e) => setFormCustomerSPNumber(e.target.value)}
                      className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      Tanggal SP Pemesan :
                    </label>
                    <input
                      type="date"
                      value={formCustomerSPDate}
                      onChange={(e) => setFormCustomerSPDate(e.target.value)}
                      className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      Jenis SP Farmasi (BPOM) :
                    </label>
                    <select
                      value={formCustomerSPType}
                      onChange={(e) => setFormCustomerSPType(e.target.value)}
                      className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-xs font-semibold text-emerald-800"
                    >
                      <option value="REGULER">SP REGULER (Bebas/Keras)</option>
                      <option value="NARKOTIKA">SP NARKOTIKA</option>
                      <option value="PSIKOTROPIKA">SP PSIKOTROPIKA</option>
                      <option value="PREKURSOR">SP PREKURSOR</option>
                      <option value="OOT">SP OBAT-OBAT TERTENTU (OOT)</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-slate-700 font-semibold">
                        No. Faktur PBF Asal :
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setDocModalTargetId(orderDraftId);
                          setIsDocModalOpen(true);
                        }}
                        className="text-[10px] text-blue-700 hover:text-blue-900 font-bold bg-blue-100 hover:bg-blue-200 px-1.5 py-0.2 rounded transition"
                      >
                        📎 Upload Faktur PBF Asal
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="No Faktur saat kulakan ke PBF"
                      value={formPBFOriginInvoiceNo}
                      onChange={(e) => setFormPBFOriginInvoiceNo(e.target.value)}
                      className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-800">Daftar Item Pesanan Penjualan</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition"
                  >
                    <span>+ Item (Cari Item...)</span>
                  </button>
                </div>
                <table className="w-full border text-[11px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-1 border text-left">Produk</th>
                      <th className="p-1 border text-center w-16">Qty</th>
                      <th className="p-1 border text-right w-24">Harga</th>
                      <th className="p-1 border text-right w-24">Subtotal</th>
                      <th className="p-1 border text-center w-8">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formItems.map((it, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-1 border">
                          <select
                            value={it.product_id}
                            onChange={(e) => handleItemChange(idx, "product_id", e.target.value)}
                            className="w-full h-6 px-1 border rounded text-[11px]"
                          >
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1 border">
                          <input
                            type="number"
                            min="1"
                            value={it.qty}
                            onChange={(e) => handleItemChange(idx, "qty", parseFloat(e.target.value) || 0)}
                            className="w-full h-6 px-1 border rounded text-center text-[11px]"
                          />
                        </td>
                        <td className="p-1 border">
                          <input
                            type="number"
                            value={it.unit_price}
                            onChange={(e) => handleItemChange(idx, "unit_price", parseFloat(e.target.value) || 0)}
                            className="w-full h-6 px-1 border rounded text-right text-[11px]"
                          />
                        </td>
                        <td className="p-1 border text-right font-medium">
                          {formatCurrency(it.qty * it.unit_price)}
                        </td>
                        <td className="p-1 border text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="bg-slate-50 p-2.5 rounded border flex justify-between items-center font-bold">
                <span>Total Akhir :</span>
                <span className="text-base text-emerald-700">
                  {formatCurrency(formTotalAmount)}
                </span>
              </div>
            </div>

            <div className="px-4 py-2 border-t bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-6 px-3 border border-slate-300 rounded hover:bg-slate-100 text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() =>
                  createMutation.mutate({
                    customer_id: formCustomerId,
                    sales_rep_id: formSalesRepId || undefined,
                    customer_sp_number: formCustomerSPNumber,
                    customer_sp_date: formCustomerSPDate ? new Date(formCustomerSPDate) : undefined,
                    customer_sp_type: formCustomerSPType,
                    pbf_origin_invoice_no: formPBFOriginInvoiceNo,
                    notes: formNotes,
                    tax_percent: formTaxPercent,
                    discount: formDiscount,
                    items: formItems,
                  })
                }
                disabled={createMutation.isPending || formItems.length === 0}
                className="h-6 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold disabled:opacity-50"
              >
                {createMutation.isPending ? "Menyimpan..." : "Simpan Pesanan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3 border text-center">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Hapus Pesanan Penjualan</h3>
            <p className="text-slate-600 text-[11px]">
              Apakah Anda yakin ingin menghapus dokumen pesanan penjualan yang dipilih?
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

      {/* EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-[#00c875] text-white font-bold text-xs">
              <span>Ubah Pesanan Penjualan (SO)</span>
              <button onClick={() => setEditModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto text-[11px]">
              {errorMsg && (
                <div className="p-2 bg-red-50 text-red-700 rounded border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Pelanggan</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full h-7 px-2 border rounded"
                  >
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code || "CUST"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Sales</label>
                  <select
                    value={formSalesRepId}
                    onChange={(e) => setFormSalesRepId(e.target.value)}
                    className="w-full h-7 px-2 border rounded"
                  >
                    <option value="">Pilih Sales (Opsional)...</option>
                    {salesReps.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Compliance Farmasi & PBF */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-lg p-2.5 space-y-2">
                <span className="font-bold text-emerald-900 block text-[11px]">
                  📋 Legalitas Surat Pesanan (SP) & Faktur Pembelian PBF Asal
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      No. SP Pemesan :
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: SP/APOTEK-A/2026/XI/12"
                      value={formCustomerSPNumber}
                      onChange={(e) => setFormCustomerSPNumber(e.target.value)}
                      className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      Tanggal SP Pemesan :
                    </label>
                    <input
                      type="date"
                      value={formCustomerSPDate}
                      onChange={(e) => setFormCustomerSPDate(e.target.value)}
                      className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      Jenis SP Farmasi (BPOM) :
                    </label>
                    <select
                      value={formCustomerSPType}
                      onChange={(e) => setFormCustomerSPType(e.target.value)}
                      className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-xs font-semibold text-emerald-800"
                    >
                      <option value="REGULER">SP REGULER (Bebas/Keras)</option>
                      <option value="NARKOTIKA">SP NARKOTIKA</option>
                      <option value="PSIKOTROPIKA">SP PSIKOTROPIKA</option>
                      <option value="PREKURSOR">SP PREKURSOR</option>
                      <option value="OOT">SP OBAT-OBAT TERTENTU (OOT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      No. Faktur Pembelian PBF Asal :
                    </label>
                    <input
                      type="text"
                      placeholder="No Faktur saat kulakan ke PBF"
                      value={formPBFOriginInvoiceNo}
                      onChange={(e) => setFormPBFOriginInvoiceNo(e.target.value)}
                      className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Catatan pesanan..."
                />
              </div>

              {/* Upload Document Shortcut */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDocModalTargetId(selectedId);
                    setIsDocModalOpen(true);
                  }}
                  className="w-full h-7 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold rounded text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>📎</span>
                  <span>Kelola Lampiran Dokumen SP & Faktur PBF Asal</span>
                </button>
              </div>
            </div>

            <div className="px-4 py-2 border-t bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="h-6 px-3 border border-slate-300 rounded hover:bg-slate-100 text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedId) return;
                  updateMutation.mutate({
                    id: selectedId,
                    payload: {
                      customer_id: formCustomerId,
                      sales_rep_id: formSalesRepId || undefined,
                      customer_sp_number: formCustomerSPNumber,
                      customer_sp_date: formCustomerSPDate ? new Date(formCustomerSPDate) : undefined,
                      customer_sp_type: formCustomerSPType,
                      pbf_origin_invoice_no: formPBFOriginInvoiceNo,
                      notes: formNotes,
                      tax_percent: formTaxPercent,
                      discount: formDiscount,
                    },
                  });
                }}
                disabled={updateMutation.isPending}
                className="h-6 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded text-[11px] font-semibold disabled:opacity-50"
              >
                {updateMutation.isPending ? "Menyimpan..." : "Perbarui Pesanan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PBF & SALES ORDER DOCUMENTS MODAL (Dual Mode Upload) */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-[#00c875] text-white border-b border-emerald-600 flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <span>📎</span>
                <span>Lampiran Dokumen Penjualan Farmasi / PBF (CDOB BPOM)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <PbfDocumentUpload
                entityType="sales_order"
                entityId={docModalTargetId || selectedId || ""}
                title="Dokumen Pesanan & Faktur Pembelian PBF Asal"
                subtitle="Unggah Scan Surat Pesanan (SP) Asli Pemesan, Faktur Asal saat Pembelian ke PBF, Surat Jalan, dan Faktur Pajak"
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



      {/* CARI ITEM MODAL */}
      <CariObatSalesModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleSelectProductFromModal}
        saleType="PBF"
        warehouseId={selectedWarehouse !== "all" ? selectedWarehouse : undefined}
      />

    </div>
  );
}
