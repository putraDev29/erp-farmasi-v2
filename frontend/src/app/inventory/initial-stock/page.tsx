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
  AlertTriangle,
  X,
  AlertCircle,
  ChevronLeft as BackIcon,
  Check,
  Undo2,
  FileSpreadsheet,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";
import ItemSearchModal from "@/components/inventory/ItemSearchModal";

export default function InitialStockPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dateStr, setDateStr] = useState("2023-01-01");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetAllConfirmOpen, setResetAllConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state (Matching Screenshot 15)
  const [formProductId, setFormProductId] = useState("");
  const [formProductCode, setFormProductCode] = useState("");
  const [formProductName, setFormProductName] = useState("");
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formQty, setFormQty] = useState<number>(0);
  const [formUnitName, setFormUnitName] = useState("PCS");
  const [formUnitPrice, setFormUnitPrice] = useState<number>(0);

  // Queries
  const { data: initialData, isLoading } = useQuery({
    queryKey: ["initial-stock", keyword],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      const res = await api.get(`/inventory/initial-stock?${params.toString()}`);
      return res.data;
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  React.useEffect(() => {
    if (warehouses.length > 0 && !formWarehouseId) {
      setFormWarehouseId(warehouses[0].id);
    }
  }, [warehouses, formWarehouseId]);

  const stockList = initialData?.data || [];
  const meta = initialData?.meta || {
    total_items: stockList.reduce((acc: number, it: any) => acc + (it.qty || 0), 0),
    sub_total: stockList.reduce((acc: number, it: any) => acc + (it.total_price || 0), 0),
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/inventory/initial-stock", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal menyimpan saldo awal");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/inventory/initial-stock/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
      setEditModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui saldo awal");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/inventory/initial-stock/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-stock"] });
      setSelectedId(null);
      setDeleteConfirmOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Gagal menghapus data saldo awal");
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      return await api.delete("/inventory/initial-stock/reset/all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
      setResetAllConfirmOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Gagal mereset saldo awal");
    },
  });

  const resetForm = () => {
    setFormProductId("");
    setFormProductCode("");
    setFormProductName("");
    setFormQty(0);
    setFormUnitPrice(0);
    setFormUnitName("PCS");
    setErrorMsg(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    if (warehouses.length > 0) setFormWarehouseId(warehouses[0].id);
    setModalOpen(true);
  };

  const handleOpenEdit = (itemToEdit?: any) => {
    const item = itemToEdit || stockList.find((s: any) => s.id === selectedId);
    if (!item) return;

    setFormProductId(item.product_id);
    setFormProductCode(item.product_code);
    setFormProductName(item.product_name);
    setFormWarehouseId(item.warehouse_id || (warehouses[0]?.id || ""));
    setFormQty(item.qty || 0);
    setFormUnitPrice(item.unit_price || 0);
    setFormUnitName(item.unit_name || "PCS");
    setErrorMsg(null);
    setEditModalOpen(true);
  };

  const handleItemPickerSelect = (selected: any[]) => {
    if (selected.length > 0) {
      const p = selected[0];
      setFormProductId(p.id);
      setFormProductCode(p.code);
      setFormProductName(p.name);
      setFormUnitName(p.unit_name || p.unit?.name || "PCS");
      setFormUnitPrice(p.purchase_price || p.buy_price || 0);
    }
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId) {
      setErrorMsg("Pilih item barang terlebih dahulu!");
      return;
    }
    createMutation.mutate({
      warehouse_id: formWarehouseId,
      product_id: formProductId,
      qty: Number(formQty),
      unit_name: formUnitName,
      unit_price: Number(formUnitPrice),
      date: dateStr,
      notes: "Saldo Awal",
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    updateMutation.mutate({
      id: selectedId,
      payload: {
        qty: Number(formQty),
        unit_price: Number(formUnitPrice),
        notes: "Ubah Saldo Awal",
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(stockList.length / pageSize));
  const paginated = stockList.slice((page - 1) * pageSize, page * pageSize);

  const calculatedTotal = (Number(formQty) || 0) * (Number(formUnitPrice) || 0);

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. TOP HEADER */}
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
            Saldo Awal
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

      {/* 2. WARNING BANNER (Matching Screenshot 14) */}
      <div className="shrink-0 bg-[#fffbeb] border border-[#fef3c7] p-2 rounded text-[11px] text-amber-900 space-y-1">
        <div className="flex items-center gap-1 font-bold text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>PENTING :</span>
        </div>
        <ol className="list-decimal list-inside space-y-0.5 text-[10.5px] leading-relaxed text-slate-700">
          <li>Saldo Awal Item berfungsi untuk mengisi stok awal barang sebelum memakai program. Hanya diisi satu kali saat mulai memakai program.</li>
          <li>Saldo Awal Item diisi setelah input item barang dan sebelum adanya transaksi (baik pembelian, penjualan, dan lainnya). Pastikan stok dan harga sudah sesuai pada saat pengisian saldo awal.</li>
          <li>Mengubah Saldo Awal Item setelah terjadi transaksi akan mengakibatkan kesalahan pada perhitungan HPP (Gunakan Pembelian/Penjualan/Item Masuk/Item Keluar untuk menambah atau mengurangi stok setelah adanya transaksi).</li>
        </ol>
      </div>

      {/* 3. FILTER BAR */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <label className="text-slate-600 font-semibold">Tanggal :</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-1 max-w-md">
          <label className="text-slate-600 font-semibold">Kata Kunci :</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari kode atau nama item..."
            className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["initial-stock"] })}
          className="h-6 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded text-[11px] inline-flex items-center gap-1 font-semibold"
        >
          <Search className="w-3 h-3" />
          <span>Cari</span>
        </button>
      </div>

      {/* 4. TABLE SECTION (8 Columns matching Screenshot 14) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
            <tr>
              <th className="py-1 px-2 border-r border-slate-200 text-center w-8">
                <Pencil className="w-3 h-3 mx-auto text-slate-500" />
              </th>
              <th className="py-1 px-2.5 border-r border-slate-200">Kode Item</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Gudang</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right">Jumlah</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-center">Satuan</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right">Harga</th>
              <th className="py-1 px-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Memuat data saldo awal...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-24 text-center text-slate-400">
                  Tidak ada data saldo awal
                </td>
              </tr>
            ) : (
              paginated.map((item: any) => {
                const isSelected = selectedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(isSelected ? null : item.id)}
                    className={`border-b border-slate-200 cursor-pointer transition ${
                      isSelected ? "bg-amber-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-1 px-2 border-r border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(item.id);
                          handleOpenEdit(item);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                        title="Ubah"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {item.product_code}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {item.product_name}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {item.warehouse_name || item.warehouse?.name || "UTAMA"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right font-medium text-slate-800">
                      {(item.qty || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-center text-slate-600">
                      {item.unit_name || "PCS"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right text-slate-700">
                      {(item.unit_price || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-right font-medium text-slate-800">
                      {(item.total_price || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM TOOLBAR & SUMMARY (Matching Screenshot 14) */}
      <div className="shrink-0 pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
        {/* Pagination & Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
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
              Hal {stockList.length === 0 ? "1/0" : `${page}/${totalPages}`}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || stockList.length === 0}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="h-6 w-7 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded flex items-center justify-center shadow-2xs transition active:scale-95"
            title="Tambah Data"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenEdit()}
            disabled={!selectedId}
            className="h-6 w-7 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
            title="Ubah"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={!selectedId}
            className="h-6 w-7 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
            title="Hapus"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setResetAllConfirmOpen(true)}
            className="h-6 px-2.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus Saldo Awal</span>
          </button>

          <button
            type="button"
            onClick={() => alert("Fitur Impor Excel Saldo Awal siap digunakan")}
            className="h-6 px-2.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Import Data Excel</span>
          </button>
        </div>

        {/* Right Summary boxes */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Tot. Item :</span>
            <span className="font-bold text-slate-800 border border-slate-300 px-2 py-0.5 rounded bg-white">
              {(meta.total_items || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Sub Total :</span>
            <span className="font-bold text-emerald-700 border border-slate-300 px-2 py-0.5 rounded bg-white">
              {(meta.sub_total || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 6. MODAL TAMBAH DATA (Matching Screenshot 15) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border border-slate-300 overflow-hidden text-[11px]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Tambah Data....</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-3 space-y-2.5">
              {errorMsg && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Kode Item :</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={formProductCode}
                    onChange={(e) => setFormProductCode(e.target.value)}
                    placeholder="Pilih kode item..."
                    className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setItemSearchOpen(true)}
                    className="h-6 w-7 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-slate-600"
                    title="Cari Item"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Keterangan :</label>
                <textarea
                  rows={2}
                  value={formProductName}
                  onChange={(e) => setFormProductName(e.target.value)}
                  placeholder="Nama barang..."
                  className="w-full p-1.5 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Gudang :</label>
                <select
                  value={formWarehouseId}
                  onChange={(e) => setFormWarehouseId(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
                >
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-0.5">Jumlah :</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formQty}
                    onChange={(e) => setFormQty(Number(e.target.value))}
                    required
                    className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-right focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-0.5">Satuan :</label>
                  <select
                    value={formUnitName}
                    onChange={(e) => setFormUnitName(e.target.value)}
                    className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PCS">PCS</option>
                    <option value="TAB">TAB</option>
                    <option value="BOX">BOX</option>
                    <option value="TUBE">TUBE</option>
                    <option value="BTL">BTL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Harga :</label>
                <input
                  type="number"
                  step="0.01"
                  value={formUnitPrice}
                  onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                  required
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-right focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Total :</label>
                <input
                  type="text"
                  disabled
                  value={formatCurrency(calculatedTotal)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-right bg-slate-50 font-bold text-slate-800"
                />
              </div>

              {/* Modal Buttons (Screenshot 15) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  className="h-6 px-2.5 bg-white border border-slate-300 text-slate-700 rounded text-[11px] shadow-2xs"
                >
                  Data Serial
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="h-6 px-3 bg-white border border-emerald-400 text-emerald-700 hover:bg-emerald-50 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{createMutation.isPending ? "Simpan..." : "Simpan"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-6 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL UBAH DATA */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border border-slate-300 overflow-hidden text-[11px]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Ubah Data Saldo Awal</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-3 space-y-2.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Kode Item :</label>
                <input
                  type="text"
                  disabled
                  value={formProductCode}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-slate-50 text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Keterangan :</label>
                <input
                  type="text"
                  disabled
                  value={formProductName}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-slate-50 text-slate-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-0.5">Jumlah :</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formQty}
                    onChange={(e) => setFormQty(Number(e.target.value))}
                    required
                    className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-right focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-0.5">Satuan :</label>
                  <input
                    type="text"
                    disabled
                    value={formUnitName}
                    className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-slate-50 text-slate-700 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Harga :</label>
                <input
                  type="number"
                  step="0.01"
                  value={formUnitPrice}
                  onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                  required
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-right focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Total :</label>
                <input
                  type="text"
                  disabled
                  value={formatCurrency(calculatedTotal)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-right bg-slate-50 font-bold text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="h-6 px-3 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] shadow-2xs"
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="h-6 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] shadow-2xs"
                >
                  Kembali
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
            <h3 className="font-bold text-slate-800 text-sm">Hapus Saldo Awal Item</h3>
            <p className="text-slate-600">
              Apakah Anda yakin ingin menghapus data saldo awal untuk item ini?
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

      {/* CONFIRM RESET ALL MODAL */}
      {resetAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-slate-200 p-4 text-xs space-y-3">
            <h3 className="font-bold text-red-700 text-sm">Reset Seluruh Saldo Awal</h3>
            <p className="text-slate-600">
              ⚠️ Peringatan: Tindakan ini akan menghapus seluruh data saldo awal barang di sistem. Apakah Anda yakin?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetAllConfirmOpen(false)}
                className="h-6 px-3 border border-slate-300 rounded text-slate-600 hover:bg-slate-100 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => resetAllMutation.mutate()}
                disabled={resetAllMutation.isPending}
                className="h-6 px-3 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded text-xs transition disabled:opacity-50"
              >
                {resetAllMutation.isPending ? "Mereset..." : "Ya, Reset Semua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Item Search Modal */}
      <ItemSearchModal
        isOpen={itemSearchOpen}
        onClose={() => setItemSearchOpen(false)}
        onSelect={handleItemPickerSelect}
      />
    </div>
  );
}
