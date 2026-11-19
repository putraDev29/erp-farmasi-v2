"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { api, formatDate } from "@/lib/api";

export default function AssemblyFinishedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Ketoko Reference (Image 4)
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formProcessId, setFormProcessId] = useState("");
  const [formCustomerCode, setFormCustomerCode] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formProductName, setFormProductName] = useState("");
  const [formTotalProcess, setFormTotalProcess] = useState<number>(1);
  const [formDate, setFormDate] = useState("2026-11-18");
  const [formNotes, setFormNotes] = useState("");

  // Queries
  const { data: finishedList = [], isLoading } = useQuery({
    queryKey: [
      "assembly-finished",
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
      if (selectedWarehouse && selectedWarehouse !== "all") params.append("warehouse_id", selectedWarehouse);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/assembly/finished?${params.toString()}`);
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

  const { data: processes = [] } = useQuery({
    queryKey: ["assembly-processes-select"],
    queryFn: async () => {
      const res = await api.get("/assembly/processes");
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

  React.useEffect(() => {
    if (warehouses.length > 0 && !formWarehouseId) {
      setFormWarehouseId(warehouses[0].id);
    }
  }, [warehouses, formWarehouseId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/assembly/finished", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assembly-finished"] });
      queryClient.invalidateQueries({ queryKey: ["assembly-processes"] });
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal membuat proses jadi");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/assembly/finished/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assembly-finished"] });
      setEditModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui proses jadi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/assembly/finished/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assembly-finished"] });
      setSelectedId(null);
      setDeleteConfirmOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Gagal menghapus proses jadi");
    },
  });

  const resetForm = () => {
    setFormProcessId("");
    setFormCustomerCode("");
    setFormCustomerName("");
    setFormProductId("");
    setFormProductName("");
    setFormTotalProcess(1);
    setFormDate("2026-11-18");
    setFormNotes("");
    setErrorMsg(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    if (warehouses.length > 0) setFormWarehouseId(warehouses[0].id);
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedId) return;
    const item = finishedList.find((f: any) => f.id === selectedId);
    if (!item) return;

    setFormWarehouseId(item.warehouse_id || (warehouses[0]?.id || ""));
    setFormCustomerCode(item.customer_code || "");
    setFormCustomerName(item.customer_name || "");
    setFormProductId(item.product_id || "");
    setFormProductName(item.product_name || "");
    setFormTotalProcess(item.total_process || 1);
    setFormDate(item.date ? item.date.substring(0, 10) : "2026-11-18");
    setFormNotes(item.notes || "");
    setErrorMsg(null);
    setEditModalOpen(true);
  };

  const handleProcessChange = (procId: string) => {
    setFormProcessId(procId);
    const proc = processes.find((p: any) => p.id === procId);
    if (proc) {
      setFormCustomerCode(proc.customer_code || "");
      setFormCustomerName(proc.customer_name || "");
      setFormProductId(proc.product_id || "");
      setFormProductName(proc.product_name || "");
      const remaining = Math.max(1, (proc.process_qty || 1) - (proc.finished_qty || 0));
      setFormTotalProcess(remaining);
      if (proc.warehouse_id) setFormWarehouseId(proc.warehouse_id);
    }
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      warehouse_id: formWarehouseId,
      assembly_process_id: formProcessId || null,
      customer_code: formCustomerCode,
      customer_name: formCustomerName,
      product_id: formProductId || null,
      product_name: formProductName,
      total_process: Number(formTotalProcess),
      date: formDate,
      notes: formNotes,
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    updateMutation.mutate({
      id: selectedId,
      payload: {
        customer_code: formCustomerCode,
        customer_name: formCustomerName,
        product_name: formProductName,
        total_process: Number(formTotalProcess),
        notes: formNotes,
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(finishedList.length / pageSize));
  const paginatedFinished = finishedList.slice((page - 1) * pageSize, page * pageSize);

  // Render Toolbar Component (Used top and bottom as in screenshot)
  const renderToolbar = () => (
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
          Hal {finishedList.length === 0 ? "1/0" : `${page}/${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || finishedList.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cari button */}
      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["assembly-finished"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Cari"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* + Tambah button (Green) */}
      <button
        type="button"
        onClick={handleOpenCreate}
        className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
        <span>Tambah</span>
      </button>

      {/* ✏️ Ubah button (Blue) */}
      <button
        type="button"
        onClick={handleOpenEdit}
        disabled={!selectedId}
        className="h-6 px-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
      >
        <Pencil className="w-3 h-3 stroke-[2.5]" />
        <span>Ubah</span>
      </button>

      {/* 🗑️ Hapus button (Red) */}
      <button
        type="button"
        onClick={() => setDeleteConfirmOpen(true)}
        disabled={!selectedId}
        className="h-6 px-2.5 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
      >
        <Trash2 className="w-3 h-3 stroke-[2.5]" />
        <span>Hapus</span>
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
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Proses Jadi
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
              placeholder="Cari transaksi / pelanggan..."
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
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Tanggal">Tanggal</option>
                <option value="No Transaksi">No Transaksi</option>
                <option value="Nama">Nama</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="h-6 w-7 border border-slate-300 rounded flex items-center justify-center hover:bg-slate-100 bg-white"
                title="Arah Urutan"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOP TOOLBAR */}
      <div className="shrink-0">
        {renderToolbar()}
      </div>

      {/* 4. MAIN DATA TABLE (8 Columns matching Screenshot 4) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-10 shadow-2xs">
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold">
              <th className="py-1 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Kode Pelanggan</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right">Total Proses</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-1 px-2.5 border-r border-slate-200">User Buat</th>
              <th className="py-1 px-2.5">User Ubah</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Memuat data...
                </td>
              </tr>
            ) : paginatedFinished.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-24 text-center text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedFinished.map((item: any) => {
                const isSelected = selectedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(isSelected ? null : item.id)}
                    className={`border-b border-slate-200 cursor-pointer transition ${
                      isSelected ? "bg-amber-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {item.finished_no}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {item.customer_code || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {item.customer_name || item.product_name || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right text-slate-700">
                      {(item.total_process || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600 max-w-xs truncate">
                      {item.notes || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {item.created_by_name || "ADMIN2"}
                    </td>
                    <td className="py-1 px-2.5 text-slate-600">
                      {item.updated_by_name || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM TOOLBAR */}
      <div className="shrink-0 pt-0.5">
        {renderToolbar()}
      </div>

      {/* MODAL TAMBAH PROSES JADI */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-800">Tambah Proses Jadi (Hasil Perakitan)</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-4 space-y-2.5 text-xs">
              {errorMsg && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Gudang Penyimpanan :</label>
                  <select
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    required
                    className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tanggal :</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Dari Proses Perakitan (Opsional) :</label>
                <select
                  value={formProcessId}
                  onChange={(e) => handleProcessChange(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Input Proses Jadi Langsung --</option>
                  {processes.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      [{p.process_no}] {p.customer_name || p.product_name} (Proses: {p.process_qty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kode Pelanggan :</label>
                  <input
                    type="text"
                    value={formCustomerCode}
                    onChange={(e) => setFormCustomerCode(e.target.value)}
                    placeholder="Kode..."
                    className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama / Keterangan :</label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="Nama pelanggan / batch..."
                    className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Produk Hasil Jadi :</label>
                <select
                  value={formProductId}
                  onChange={(e) => {
                    setFormProductId(e.target.value);
                    const p = products.find((pr: any) => pr.id === e.target.value);
                    if (p) setFormProductName(p.name);
                  }}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Pilih Barang Jadi --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Total Proses Jadi :</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formTotalProcess}
                  onChange={(e) => setFormTotalProcess(Number(e.target.value))}
                  required
                  className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Keterangan :</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan hasil perakitan..."
                  className="w-full p-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-6 px-3 border border-slate-300 rounded text-slate-600 hover:bg-slate-100 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="h-6 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-xs transition disabled:opacity-50"
                >
                  {createMutation.isPending ? "Menyimpan..." : "Simpan Jadi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UBAH PROSES JADI */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-800">Ubah Data Proses Jadi</h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-4 space-y-2.5 text-xs">
              {errorMsg && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kode Pelanggan :</label>
                  <input
                    type="text"
                    value={formCustomerCode}
                    onChange={(e) => setFormCustomerCode(e.target.value)}
                    className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama :</label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Total Proses :</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formTotalProcess}
                  onChange={(e) => setFormTotalProcess(Number(e.target.value))}
                  required
                  className="w-full h-6 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Keterangan :</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="h-6 px-3 border border-slate-300 rounded text-slate-600 hover:bg-slate-100 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="h-6 px-4 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-xs transition disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-slate-200 p-4 text-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Hapus Proses Jadi</h3>
            <p className="text-slate-600">
              Apakah Anda yakin ingin menghapus data proses jadi yang dipilih?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-6 px-3 border border-slate-300 rounded text-slate-600 hover:bg-slate-100 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                disabled={deleteMutation.isPending}
                className="h-6 px-3 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded text-xs transition disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
