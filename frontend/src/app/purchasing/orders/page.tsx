"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import MasterToolbarButtons from "@/components/common/MasterToolbarButtons";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters state matching Screenshot 3
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [processStatus, setProcessStatus] = useState("Semua");
  const [orderStatus, setOrderStatus] = useState("Semua");
  const [sortBy, setSortBy] = useState("Tanggal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formExpectedDate, setFormExpectedDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTaxPercent, setFormTaxPercent] = useState<number>(11);
  const [formDiscount, setFormDiscount] = useState<number>(0);
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
  const { data: pos = [], isLoading } = useQuery({
    queryKey: [
      "purchase-orders",
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
      if (selectedWarehouse && selectedWarehouse !== "all") params.append("warehouse_id", selectedWarehouse);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (processStatus && processStatus !== "Semua") params.append("process_status", processStatus);
      if (orderStatus && orderStatus !== "Semua") params.append("status", orderStatus);
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/purchases/orders?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
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
      const res = await api.get("/products?page_size=100");
      return res.data?.data?.items || [];
    },
  });

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(pos.length / pageSize));
  const paginatedPOs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return pos.slice(start, start + pageSize);
  }, [pos, page, pageSize]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/purchases/orders", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal membuat Pesanan Pembelian");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/purchases/orders/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setEditModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal mengupdate Pesanan Pembelian");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/purchases/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus Pesanan Pembelian");
    },
  });

  const resetForm = () => {
    setFormSupplierId(suppliers[0]?.id || "");
    setFormWarehouseId(warehouses[0]?.id || "");
    setFormExpectedDate("");
    setFormNotes("");
    setFormTaxPercent(11);
    setFormDiscount(0);
    if (products.length > 0) {
      setFormItems([
        {
          product_id: products[0].id,
          unit_id: products[0].base_unit_id,
          qty: 1,
          unit_price: products[0].purchase_price || 0,
          discount: 0,
        },
      ]);
    } else {
      setFormItems([]);
    }
    setErrorMsg(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (po: any) => {
    setSelectedId(po.id);
    setFormSupplierId(po.supplier_id || "");
    setFormWarehouseId(po.warehouse_id || "");
    setFormExpectedDate(po.expected_date ? po.expected_date.split("T")[0] : "");
    setFormNotes(po.notes || "");
    setFormTaxPercent(po.tax_percent || 0);
    setFormDiscount(po.discount || 0);
    if (po.items && po.items.length > 0) {
      setFormItems(
        po.items.map((it: any) => ({
          product_id: it.product_id,
          unit_id: it.unit_id,
          qty: it.qty,
          unit_price: it.unit_price,
          discount: it.discount || 0,
        }))
      );
    }
    setEditModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setFormItems([
      ...formItems,
      {
        product_id: products[0].id,
        unit_id: products[0].base_unit_id,
        qty: 1,
        unit_price: products[0].purchase_price || 0,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...formItems];
    if (field === "product_id") {
      const prod = products.find((p: any) => p.id === val);
      updated[index] = {
        ...updated[index],
        product_id: val,
        unit_id: prod?.base_unit_id || updated[index].unit_id,
        unit_price: prod?.purchase_price || 0,
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setFormItems(updated);
  };

  const formSubtotal = formItems.reduce(
    (sum, it) => sum + it.qty * it.unit_price - (it.discount || 0),
    0
  );
  const formTaxAmount = (formSubtotal - formDiscount) * (formTaxPercent / 100);
  const formTotalAmount = formSubtotal - formDiscount + formTaxAmount;

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierId) {
      setErrorMsg("Pilih supplier terlebih dahulu");
      return;
    }
    if (formItems.length === 0) {
      setErrorMsg("Minimal harus ada 1 item pesanan");
      return;
    }
    createMutation.mutate({
      supplier_id: formSupplierId,
      warehouse_id: formWarehouseId || undefined,
      expected_date: formExpectedDate ? new Date(formExpectedDate) : undefined,
      notes: formNotes,
      tax_percent: formTaxPercent,
      discount: formDiscount,
      items: formItems,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    updateMutation.mutate({
      id: selectedId,
      payload: {
        supplier_id: formSupplierId,
        warehouse_id: formWarehouseId || undefined,
        expected_date: formExpectedDate ? new Date(formExpectedDate) : undefined,
        notes: formNotes,
        tax_percent: formTaxPercent,
        discount: formDiscount,
        items: formItems,
      },
    });
  };

  const selectedPO = pos.find((p: any) => p.id === selectedId);

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. HEADER BAR */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-4 bg-emerald-600 rounded-xs inline-block" />
            Daftar Pesanan Pembelian
          </h1>
          <p className="text-[10.5px] text-slate-500">
            Manajemen dokumen purchase order (PO) dan pemesanan barang ke pemasok
          </p>
        </div>
      </div>

      {/* 2. FILTER SECTION (Ketoko Filter Spec - Compact Modern) */}
      <div className="shrink-0 bg-white p-2.5 rounded-lg shadow-2xs border border-slate-200 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          {/* Kata Kunci */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Kata Kunci :</label>
            <input
              type="text"
              placeholder="No PO / Supplier / Catatan"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Dept / Gudang */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Dept/Gudang :</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 truncate"
            >
              <option value="all">Semua Gudang</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Dari */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Tanggal Dari :</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Tanggal Sampai */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Tanggal Sampai :</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Status Proses */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Status Proses :</label>
            <select
              value={processStatus}
              onChange={(e) => setProcessStatus(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="Semua">Semua</option>
              <option value="Belum Proses">Belum Proses</option>
              <option value="Proses Sebagian">Proses Sebagian</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          {/* Status Pesanan */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Status Pesanan :</label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="Semua">Semua</option>
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Urut Berdasar */}
          <div className="lg:col-span-1">
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Urut Berdasar :</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
              >
                <option value="Tanggal">Tanggal</option>
                <option value="No Transaksi">No Transaksi</option>
                <option value="Supplier">Supplier</option>
                <option value="Total">Total</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="h-6 w-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600 shrink-0"
                title={`Urutan: ${sortDir.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR ACTIONS (< Hal 1/X >, Cari, +, ✏️, 🗑️, Cetak) */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 text-xs">
          {/* Pagination Controls */}
          <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-2xs h-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition rounded-l"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold px-2.5 h-full flex items-center text-xs text-slate-700">
              Hal {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition rounded-r"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <MasterToolbarButtons
            addHref="/purchasing/orders/new"
            onEdit={() => {
              if (selectedId) router.push(`/purchasing/orders/${selectedId}/edit`);
            }}
            editDisabled={!selectedId}
            onDelete={() => setDeleteConfirmOpen(true)}
            deleteDisabled={!selectedId}
            onPrint={() => setPrintModalOpen(true)}
            printDisabled={!selectedId}
          />
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Total: <strong className="text-slate-800">{pos.length}</strong> pesanan ditemukan
        </div>
      </div>

      {/* 4. TABLE VIEW (14 Columns Matching Spec) */}
      <div className="flex-1 min-h-0 bg-white rounded-lg shadow-2xs border border-slate-300 overflow-auto">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-7 text-[10.5px]">
            <tr>
              <th className="py-1 px-2 w-8 text-center border-r border-slate-200">Aksi</th>
              <th className="py-1 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Tanggal Kirim</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Dept/Gudang</th>
              <th className="py-1 px-2 border-r border-slate-200">Kode Supplier</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Nama Supplier</th>
              <th className="py-1 px-2 text-right border-r border-slate-200">Jumlah Pesan</th>
              <th className="py-1 px-2 text-right border-r border-slate-200">Jumlah Terima</th>
              <th className="py-1 px-2.5 text-right border-r border-slate-200">Pajak</th>
              <th className="py-1 px-2.5 text-right border-r border-slate-200">Total</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-1 px-2 border-r border-slate-200">User Buat</th>
              <th className="py-1 px-2">User Ubah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={14} className="text-center py-8 text-slate-400">
                  Memuat data pesanan pembelian...
                </td>
              </tr>
            ) : paginatedPOs.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-8 text-slate-400">
                  Tidak ada data pesanan pembelian.
                </td>
              </tr>
            ) : (
              paginatedPOs.map((p: any) => {
                const isSelected = selectedId === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    onDoubleClick={() => router.push(`/purchasing/orders/${p.id}/edit`)}
                    className={`cursor-pointer transition-colors h-7 border-b border-slate-100 ${
                      isSelected
                        ? "bg-sky-50 text-sky-950 font-medium"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <td className="py-0.5 px-2 text-center border-r border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/purchasing/orders/${p.id}/edit`);
                        }}
                        className="p-0.5 rounded hover:bg-slate-200 text-sky-600 transition"
                        title="Edit PO"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-0.5 px-2.5 font-semibold text-slate-900 border-r border-slate-100 font-mono">
                      {p.order_no}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">{formatDate(p.date)}</td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                      {p.expected_date ? formatDate(p.expected_date) : "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-700">
                      {p.warehouse?.name || "UTAMA - APOTEK"}
                    </td>
                    <td className="py-0.5 px-2 border-r border-slate-100 font-mono text-[10.5px] text-slate-600">
                      {p.supplier?.code || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 font-medium text-slate-900 border-r border-slate-100">
                      {p.supplier?.name || "-"}
                    </td>
                    <td className="py-0.5 px-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                      {p.total_ordered_qty || p.items?.reduce((s: number, i: any) => s + i.qty, 0) || 0}
                    </td>
                    <td className="py-0.5 px-2 text-right font-mono text-slate-500 border-r border-slate-100">
                      {p.total_received_qty || 0}
                    </td>
                    <td className="py-0.5 px-2.5 text-right font-mono text-slate-600 border-r border-slate-100">
                      {formatCurrency(p.tax_amount || 0)}
                    </td>
                    <td className="py-0.5 px-2.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-100">
                      {formatCurrency(p.total_amount)}
                    </td>
                    <td className="py-0.5 px-2.5 text-slate-500 max-w-xs truncate border-r border-slate-100">
                      {p.notes || "-"}
                    </td>
                    <td className="py-0.5 px-2 text-slate-600 border-r border-slate-100">
                      {p.user?.full_name || p.user?.username || "Admin"}
                    </td>
                    <td className="py-0.5 px-2 text-slate-400">
                      {p.modifier?.full_name || p.modifier?.username || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div className="shrink-0 pt-0.5 flex items-center justify-between">
        <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-2xs h-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition rounded-l"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold px-2.5 h-full flex items-center text-xs text-slate-700">
            Hal {pos.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || pos.length === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition rounded-r"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. MODAL TAMBAH / EDIT PO */}
      {(modalOpen || editModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalOpen ? "Tambah Pesanan Pembelian (PO) Baru" : `Ubah PO: ${selectedPO?.order_no}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Lengkapi data pemesanan obat, supplier, gudang penerima, dan item pesanan
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditModalOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={modalOpen ? handleSaveCreate : handleSaveEdit}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    required
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gudang / Dept</label>
                  <select
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">-- Pilih Gudang --</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Estimasi Kirim</label>
                  <input
                    type="date"
                    value={formExpectedDate}
                    onChange={(e) => setFormExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Daftar Item Pesanan</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Item
                  </button>
                </div>

                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Produk</th>
                        <th className="py-2 px-3 w-28">Jumlah</th>
                        <th className="py-2 px-3 w-36">Harga Satuan</th>
                        <th className="py-2 px-3 w-28">Potongan</th>
                        <th className="py-2 px-3 text-right w-36">Subtotal</th>
                        <th className="py-2 px-2 w-10 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formItems.map((item, idx) => {
                        const lineTotal = item.qty * item.unit_price - item.discount;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3">
                              <select
                                value={item.product_id}
                                onChange={(e) => handleItemChange(idx, "product_id", e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                              >
                                {products.map((p: any) => (
                                  <option key={p.id} value={p.id}>
                                    {p.code} - {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) =>
                                  handleItemChange(idx, "qty", parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) =>
                                  handleItemChange(idx, "unit_price", parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                min="0"
                                value={item.discount}
                                onChange={(e) =>
                                  handleItemChange(idx, "discount", parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right"
                              />
                            </td>
                            <td className="py-1.5 px-3 text-right font-semibold text-slate-800">
                              {formatCurrency(lineTotal)}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Summary & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Keterangan / Catatan</label>
                  <textarea
                    rows={3}
                    placeholder="Catatan tambahan untuk supplier..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal :</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(formSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Diskon Transaksi :</span>
                    <input
                      type="number"
                      min="0"
                      value={formDiscount}
                      onChange={(e) => setFormDiscount(parseFloat(e.target.value) || 0)}
                      className="w-28 px-2 py-0.5 border border-slate-300 rounded text-right text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">PPN (%) :</span>
                    <input
                      type="number"
                      min="0"
                      value={formTaxPercent}
                      onChange={(e) => setFormTaxPercent(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-0.5 border border-slate-300 rounded text-right text-xs"
                    />
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                    <span className="text-slate-900">Total Akhir :</span>
                    <span className="text-emerald-700">{formatCurrency(formTotalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditModalOpen(false);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL KONFIRMASI HAPUS */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-800">Hapus Pesanan Pembelian?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Yakin ingin menghapus dokumen PO <strong>{selectedPO?.order_no}</strong>? Data yang dihapus tidak dapat dipulihkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus PO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CETAK PO */}
      {printModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 print:p-0">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <h3 className="font-bold text-base text-slate-800">Cetak Pesanan Pembelian (PO)</h3>
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Printable Document Sheet */}
            <div className="border border-slate-200 p-6 rounded-xl bg-slate-50/50 space-y-4 text-xs font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">APOTEK BERKAT PURNAMA</h2>
                  <p className="text-[11px] text-slate-500">Jl. Farmasi Sehat No. 10, Jakarta Pusat</p>
                  <p className="text-[11px] text-slate-500">Telp: (021) 555-8989 | Izin Apotek: 1982/APT/2026</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-amber-600">SURAT PESANAN (PO)</h3>
                  <p className="font-mono text-slate-800 font-bold">{selectedPO.order_no}</p>
                  <p className="text-slate-500 text-[11px]">{formatDate(selectedPO.date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-slate-700">Kepada Supplier :</p>
                  <p className="font-bold text-slate-900">{selectedPO.supplier?.name}</p>
                  <p className="text-slate-500">{selectedPO.supplier?.address || "Alamat Supplier"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-700">Tujuan Pengiriman :</p>
                  <p className="font-bold text-slate-900">{selectedPO.warehouse?.name || "Gudang Utama"}</p>
                  <p className="text-slate-500">
                    Est. Tgl Kirim: {selectedPO.expected_date ? formatDate(selectedPO.expected_date) : "-"}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-left mt-2">
                <thead className="bg-slate-200/60 font-semibold text-slate-700">
                  <tr>
                    <th className="border border-slate-300 p-1.5 text-center w-8">No</th>
                    <th className="border border-slate-300 p-1.5">Kode</th>
                    <th className="border border-slate-300 p-1.5">Nama Item</th>
                    <th className="border border-slate-300 p-1.5 text-right w-16">Jumlah</th>
                    <th className="border border-slate-300 p-1.5 text-right w-24">Harga</th>
                    <th className="border border-slate-300 p-1.5 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="border border-slate-300 p-1.5 text-center">{i + 1}</td>
                      <td className="border border-slate-300 p-1.5 font-mono">{it.product?.code}</td>
                      <td className="border border-slate-300 p-1.5">{it.product?.name}</td>
                      <td className="border border-slate-300 p-1.5 text-right">{it.qty} {it.unit?.name}</td>
                      <td className="border border-slate-300 p-1.5 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-semibold">{formatCurrency(it.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="border border-slate-300 p-1.5 text-right font-bold">Total :</td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold text-emerald-700">{formatCurrency(selectedPO.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-4 pt-4 text-center">
                <div>
                  <p className="text-slate-600 mb-10">Pemesanan Dibuat Oleh,</p>
                  <p className="font-bold underline">{selectedPO.user?.full_name || "Admin Apotek"}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-10">Disetujui Supplier,</p>
                  <p className="font-bold underline">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Cetak Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
