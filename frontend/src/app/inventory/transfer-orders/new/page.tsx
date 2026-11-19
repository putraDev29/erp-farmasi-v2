"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  ChevronLeft as BackIcon,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import ItemSearchModal from "@/components/inventory/ItemSearchModal";

export default function NewTransferOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dateStr, setDateStr] = useState("18/11/2026 19:41:22");
  const [deliveryDate, setDeliveryDate] = useState("2026-11-18");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [orderStatus, setOrderStatus] = useState("PENDING");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  React.useEffect(() => {
    if (warehouses.length > 0) {
      if (!fromWarehouseId) setFromWarehouseId(warehouses[0].id);
      if (!toWarehouseId && warehouses.length > 1) {
        setToWarehouseId(warehouses[1].id);
      } else if (!toWarehouseId) {
        setToWarehouseId(warehouses[0].id);
      }
    }
  }, [warehouses, fromWarehouseId, toWarehouseId]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/inventory/transfer-orders", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-orders"] });
      router.push("/inventory/transfer-orders");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal menyimpan pesanan transfer");
    },
  });

  const handleAddItemFromPicker = (selectedProducts: any[]) => {
    const newItems = [...items];
    selectedProducts.forEach((p) => {
      const exists = newItems.find((it) => it.product_id === p.id);
      if (!exists) {
        newItems.push({
          product_id: p.id,
          product_code: p.code,
          product_name: p.name,
          brand: p.brand?.name || "-",
          qty: 1,
          received_qty: 0,
          unit_id: p.base_unit_id || null,
          unit_name: p.unit_name || p.unit?.name || "PCS",
        });
      }
    });
    setItems(newItems);
  };

  const updateItemRow = (idx: number, field: string, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  };

  const removeItemRow = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    setSelectedItemIndex(null);
  };

  const totalItemsCount = items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
  const totalReceivedCount = items.reduce((acc, it) => acc + (Number(it.received_qty) || 0), 0);

  const handleSave = () => {
    if (items.length === 0) {
      setErrorMsg("Harap masukkan minimal 1 item barang untuk dipesan!");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setErrorMsg("Gudang asal (Keluar Dari) dan gudang tujuan (Masuk Ke) tidak boleh sama!");
      return;
    }
    setErrorMsg(null);
    createMutation.mutate({
      from_warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId,
      delivery_date: deliveryDate,
      status: orderStatus,
      notes,
      items: items.map((it) => ({
        product_id: it.product_id,
        product_code: it.product_code,
        product_name: it.product_name,
        brand: it.brand,
        qty: Number(it.qty),
        unit_id: it.unit_id,
        unit_name: it.unit_name,
      })),
    });
  };

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
            Pesanan Item Transfer Baru
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

      {errorMsg && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. FORM FIELDS (Screenshot 8) */}
      <div className="shrink-0 bg-white p-2.5 rounded border border-slate-200 shadow-2xs space-y-2 text-[11px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="w-24 text-slate-600 font-semibold">No Transaksi :</label>
              <input
                type="text"
                disabled
                value="Auto"
                className="flex-1 h-6 px-2 border border-slate-300 rounded bg-slate-50 text-[11px] text-slate-500"
              />
            </div>
            <div className="flex items-center">
              <label className="w-24 text-slate-600 font-semibold">Keluar Dari :</label>
              <select
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                className="flex-1 h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="w-20 text-slate-600 font-semibold">Tanggal :</label>
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="flex-1 h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center">
              <label className="w-20 text-slate-600 font-semibold">Masuk Ke :</label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="flex-1 h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="w-28 text-slate-600 font-semibold">Status Pesanan :</label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="flex-1 h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">Diproses</option>
                <option value="COMPLETED">Selesai</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ITEM TABLE (7 Columns matching Screenshot 8) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold">
              <th className="py-1 px-2 border-r border-slate-200 text-center w-10">No</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Kode</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Merek</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right w-24">Jumlah</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right w-24">Jml Terima</th>
              <th className="py-1 px-2.5 text-center w-24">Satuan</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-24 text-center text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const isSelected = selectedItemIndex === idx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedItemIndex(idx)}
                    className={`border-b border-slate-200 cursor-pointer ${
                      isSelected ? "bg-amber-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-1 px-2 border-r border-slate-200 text-center text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {it.product_code}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {it.product_name}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {it.brand}
                    </td>
                    <td className="py-0.5 px-1 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={it.qty}
                        onChange={(e) => updateItemRow(idx, "qty", Number(e.target.value))}
                        className="w-full h-6 px-1.5 text-right border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right text-slate-600">
                      {(it.received_qty || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-1 px-2.5 text-center text-slate-600">
                      {it.unit_name}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. TABLE ACTIONS & SUMMARY BAR */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1 text-[11px]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setItemSearchOpen(true)}
            className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Item</span>
          </button>
          <button
            type="button"
            disabled={selectedItemIndex === null}
            onClick={() => selectedItemIndex !== null && removeItemRow(selectedItemIndex)}
            className="h-6 w-7 bg-white border border-slate-300 hover:bg-slate-50 text-red-500 rounded flex items-center justify-center shadow-2xs disabled:opacity-40"
            title="Hapus Baris"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-semibold">Tanggal Kirim :</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-semibold">Keterangan :</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan pesanan transfer..."
              className="h-6 w-52 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">Item :</span>
            <span className="font-bold text-slate-800 border border-dashed border-slate-300 px-2 py-0.5 rounded bg-slate-50">
              {totalItemsCount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">Terima :</span>
            <span className="font-bold text-slate-800 border border-dashed border-slate-300 px-2 py-0.5 rounded bg-slate-50">
              {totalReceivedCount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM TOOLBAR (Matching Screenshot 8) */}
      <div className="shrink-0 flex items-center gap-1.5 pt-1 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            setItems([]);
            setNotes("");
            setSelectedItemIndex(null);
          }}
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Tambah</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={createMutation.isPending}
          className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{createMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/inventory/transfer-orders")}
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-red-600 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
        </button>
      </div>

      {/* Modal Cari Item */}
      <ItemSearchModal
        isOpen={itemSearchOpen}
        onClose={() => setItemSearchOpen(false)}
        onSelect={handleAddItemFromPicker}
      />
    </div>
  );
}
