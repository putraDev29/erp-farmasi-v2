"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertCircle,
  Package,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariSupplierModal } from "@/components/purchasing/CariSupplierModal";
import { CariItemModal } from "@/components/purchasing/CariItemModal";

export interface ReturnItemMode2Row {
  rowId: string;
  product_id: string;
  unit_id: string;
  code: string;
  name: string;
  brand: string;
  batch_number: string;
  expired_date: string | null;
  max_qty: number;
  qty: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  item_condition: string;
  reason: string;
  total: number;
  available_batches?: any[];
}

export default function PurchaseReturnMode2Page() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Header State
  const [returnNo, setReturnNo] = useState("Auto");
  const [returnDate, setReturnDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [ppnType, setPpnType] = useState<"Non" | "Include" | "Exclude">("Non");
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [extraFee, setExtraFee] = useState<number>(0);

  // Table items & selection
  const [items, setItems] = useState<ReturnItemMode2Row[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // Queries
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

  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
  });

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  useEffect(() => {
    if (ppnType === "Include" || ppnType === "Exclude") {
      setTaxPercent(11);
    } else {
      setTaxPercent(0);
    }
  }, [ppnType]);

  // Calculations
  const totalItemCount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }, [items]);

  const subTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    if (taxPercent <= 0) return 0;
    if (ppnType === "Include") {
      return (subTotal * taxPercent) / (100 + taxPercent);
    }
    return (subTotal * taxPercent) / 100;
  }, [subTotal, taxPercent, ppnType]);

  const grandTotal = useMemo(() => {
    if (ppnType === "Include") {
      return subTotal + (Number(extraFee) || 0);
    }
    return subTotal + taxAmount + (Number(extraFee) || 0);
  }, [subTotal, taxAmount, extraFee, ppnType]);

  // Handle field changes
  const handleItemFieldChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };

      if (field === "qty") {
        let numVal = Number(val) || 0;
        if (row.max_qty > 0 && numVal > row.max_qty) {
          alert(`Jumlah retur (${numVal}) melebihi stok bets yang tersedia (${row.max_qty}).`);
          numVal = row.max_qty;
        }
        row.qty = numVal;
      } else if (field === "unit_price") {
        row.unit_price = Number(val) || 0;
      } else if (field === "discount_percent") {
        row.discount_percent = Number(val) || 0;
      } else if (field === "selected_batch") {
        const batch = row.available_batches?.find((b: any) => b.batch_number === val);
        if (batch) {
          row.batch_number = batch.batch_number;
          row.expired_date = batch.expired_date;
          row.max_qty = Number(batch.current_qty) || 0;
          if (row.qty > row.max_qty) {
            row.qty = row.max_qty;
          }
          if (batch.purchase_price) {
            row.unit_price = Number(batch.purchase_price);
          }
        } else {
          row.batch_number = val;
        }
      } else {
        (row as any)[field] = val;
      }

      const discount = (row.qty * row.unit_price * (row.discount_percent || 0)) / 100;
      row.total = row.qty * row.unit_price - discount;
      copy[index] = row;
      return copy;
    });
  };

  const handleDeleteSelectedRow = () => {
    if (selectedRowIndex === null || !items[selectedRowIndex]) return;
    setItems((prev) => prev.filter((_, i) => i !== selectedRowIndex));
    setSelectedRowIndex(null);
  };

  // Add Item from standard CariItemModal
  const handleSelectItemFromModal = async (product: any) => {
    const exists = items.some((it) => it.product_id === product.id);
    if (exists) {
      alert(`Produk ${product.name} sudah ada di dalam tabel retur.`);
      return;
    }

    const defaultUnit =
      units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
    const unitId = product.base_unit_id || product.unit_id || defaultUnit?.id;
    const unitName = product.base_unit?.name || product.unit?.name || defaultUnit?.name || "PCS";
    let price = Number(product.purchase_price) || Number(product.cost_price) || 0;

    // Fetch batches for this product
    let batches: any[] = [];
    try {
      const res = await api.get(
        `/purchases/product-batches?product_id=${product.id}&warehouse_id=${warehouseId || ""}`
      );
      batches = res.data?.data || [];
    } catch (e) {
      console.warn("Could not fetch batches:", e);
    }

    // Try to get latest purchase price from price history if supplier selected
    if (selectedSupplier?.id) {
      try {
        const histRes = await api.get(
          `/purchases/price-history?supplier_id=${selectedSupplier.id}&item_id=${product.id}`
        );
        const hist = histRes.data?.data;
        if (hist && hist.length > 0 && hist[0].unit_price) {
          price = Number(hist[0].unit_price);
        }
      } catch (e) {
        console.warn("Could not fetch price history:", e);
      }
    }

    const firstBatch = batches[0];
    const initialBatchNo = firstBatch?.batch_number || product.batch_number || "";
    const initialED = firstBatch?.expired_date || product.expired_date || null;
    const initialMaxQty = firstBatch?.current_qty || product.stock || 9999;
    if (firstBatch?.purchase_price) {
      price = Number(firstBatch.purchase_price);
    }

    const newRow: ReturnItemMode2Row = {
      rowId: `${Date.now()}_${Math.random()}`,
      product_id: product.id,
      unit_id: unitId,
      code: product.code || "",
      name: product.name || "",
      brand: product.brand?.name || product.brand_name || "-",
      batch_number: initialBatchNo,
      expired_date: initialED,
      max_qty: initialMaxQty,
      qty: 1,
      unit: unitName,
      unit_price: price,
      discount_percent: 0,
      item_condition: "BAIK",
      reason: "",
      total: price,
      available_batches: batches,
    };

    setItems((prev) => [...prev, newRow]);
    if (selectedRowIndex === null) {
      setSelectedRowIndex(items.length);
    }
  };

  // Reset form
  const handleResetForm = () => {
    if (items.length > 0 && !confirm("Kosongkan form untuk membuat Retur baru?")) {
      return;
    }
    setReturnNo("Auto");
    setSelectedSupplier(null);
    setItems([]);
    setSelectedRowIndex(null);
    setNotes("");
    setExtraFee(0);
  };

  // Mutation to save return
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplier?.id) {
        throw new Error("Pilih supplier terlebih dahulu.");
      }
      if (!warehouseId) {
        throw new Error("Pilih gudang terlebih dahulu.");
      }
      if (items.length === 0) {
        throw new Error("Daftar item retur tidak boleh kosong. Klik [+ Item].");
      }

      for (const it of items) {
        if (it.qty <= 0) {
          throw new Error(`Jumlah retur untuk obat ${it.name} harus lebih dari 0.`);
        }
        if (it.max_qty > 0 && it.qty > it.max_qty) {
          throw new Error(
            `Jumlah retur untuk obat ${it.name} (${it.qty}) melebihi stok bets (${it.max_qty}).`
          );
        }
      }

      const defaultUnit =
        units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];

      const payload = {
        return_mode: "MODE_2",
        warehouse_id: warehouseId,
        supplier_id: selectedSupplier.id,
        tax_type: ppnType.toUpperCase(),
        tax_percent: taxPercent,
        other_cost: Number(extraFee) || 0,
        reason: notes || "Retur Pembelian Obat Langsung (Mode 2)",
        computer_name: "WEB-CLIENT",
        items: items.map((it) => ({
          product_id: it.product_id,
          unit_id: it.unit_id || defaultUnit?.id,
          brand: it.brand,
          batch_number: it.batch_number,
          expired_date: it.expired_date,
          item_condition: it.item_condition || "BAIK",
          reason: it.reason || notes || "Retur Mode 2",
          purchased_qty: it.qty,
          purchased_unit: it.unit,
          qty: it.qty,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
        })),
      };

      return await api.post("/purchases/returns", payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      alert(
        `Draft Retur Pembelian Mode 2 berhasil disimpan dengan No: ${
          res.data?.data?.return_no || "RB-OK"
        }!\nStatus: DRAFT. Silakan lanjutkan ke tahap Verifikasi Gudang.`
      );
      router.push("/purchasing/returns");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan retur: " + (err.response?.data?.message || err.message));
    },
  });

  const selectedItemRow = selectedRowIndex !== null ? items[selectedRowIndex] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 flex flex-col h-full min-h-0 text-xs select-none gap-1 overflow-y-auto md:overflow-hidden">
      {/* 1. Header Bar: Title + Context Buttons */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/purchasing/returns")}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 transition"
            title="Kembali ke Daftar Retur"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-3.5 bg-slate-700 rounded-xs inline-block" />
            <span className="font-bold text-slate-800 text-xs sm:text-sm">
              Retur Pembelian Baru (Mode 2 - Input Item Langsung &amp; Pilih Bets)
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              / Pilih Supplier, Obat, Batch &amp; ED dari Stok Apotek
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-medium flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Baru</span>
          </button>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="h-6 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            <span>{createMutation.isPending ? "Menyimpan..." : "Simpan (Draft)"}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Form Fields */}
      <div className="shrink-0 bg-slate-50 p-1.5 rounded border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-1.5 text-xs">
        {/* Col 1: No Transaksi, Tanggal, Supplier */}
        <div className="md:col-span-5 space-y-1">
          <div className="grid grid-cols-12 items-center gap-1">
            <label className="col-span-3 text-slate-600 font-semibold text-[11px]">
              No Transaksi :
            </label>
            <input
              type="text"
              readOnly
              value={returnNo}
              className="col-span-9 h-6 px-2 border border-slate-300 rounded bg-slate-100 text-[11px] font-mono text-slate-600 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-12 items-center gap-1">
            <label className="col-span-3 text-slate-600 font-semibold text-[11px]">
              Tanggal :
            </label>
            <input
              type="text"
              readOnly
              value={returnDate}
              className="col-span-9 h-6 px-2 border border-slate-300 rounded bg-slate-100 text-[11px] font-mono text-slate-600 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-12 items-center gap-1">
            <label className="col-span-3 text-slate-600 font-semibold text-[11px]">
              Supplier / PBF :
            </label>
            <div className="col-span-9 flex gap-1">
              <input
                type="text"
                readOnly
                placeholder="Pilih Supplier / Distributor PBF..."
                value={
                  selectedSupplier
                    ? `${selectedSupplier.code ? selectedSupplier.code + " - " : ""}${selectedSupplier.name}`
                    : ""
                }
                className="flex-1 h-6 px-2 border border-slate-300 rounded bg-white text-[11px] text-slate-800 truncate"
              />
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="w-6 h-6 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center justify-center shrink-0"
                title="Cari Supplier"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Col 2: Dept/Gudang, Pajak, Keterangan */}
        <div className="md:col-span-4 space-y-1">
          <div className="grid grid-cols-12 items-center gap-1">
            <label className="col-span-4 text-slate-600 font-semibold text-[11px]">
              Dept / Gudang :
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="col-span-8 h-6 px-1.5 border border-slate-300 rounded text-[11px] bg-white cursor-pointer truncate"
            >
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-12 items-center gap-1">
            <label className="col-span-4 text-slate-600 font-semibold text-[11px]">
              Pajak PPN :
            </label>
            <div className="col-span-8 flex items-center gap-1">
              <select
                value={ppnType}
                onChange={(e) => setPpnType(e.target.value as any)}
                className="flex-1 h-6 px-1 border border-slate-300 rounded text-[11px] bg-white"
              >
                <option value="Non">Non</option>
                <option value="Include">Include</option>
                <option value="Exclude">Exclude</option>
              </select>
              <input
                type="number"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                disabled={ppnType === "Non"}
                className="w-12 h-6 px-1 border border-slate-300 rounded text-right text-[11px] disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-500">%</span>
            </div>
          </div>

          <div className="grid grid-cols-12 items-center gap-1">
            <label className="col-span-4 text-slate-600 font-semibold text-[11px]">
              Keterangan :
            </label>
            <input
              type="text"
              placeholder="Alasan retur..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-8 h-6 px-2 border border-slate-300 rounded text-[11px] bg-white"
            />
          </div>
        </div>

        {/* Col 3: Grand Total Display Box */}
        <div className="md:col-span-3 bg-white p-2 rounded border border-slate-300 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Total Item: <strong className="text-slate-800">{totalItemCount}</strong></span>
            <span>Jenis Obat: <strong className="text-slate-800">{items.length}</strong></span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Total Nilai Retur
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 font-mono leading-none">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Content: Table (col-10) + Sidebar (col-2) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-1.5 overflow-hidden">
        {/* Table View (col-10) */}
        <div className="md:col-span-10 border border-slate-300 rounded bg-white flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-1 px-1.5 text-center w-8 border-r border-slate-200">No</th>
                  <th className="py-1 px-2 border-r border-slate-200">Kode Item</th>
                  <th className="py-1 px-2 border-r border-slate-200">Nama Item</th>
                  <th className="py-1 px-2 border-r border-slate-200">Pilih Bets &amp; ED</th>
                  <th className="py-1 px-1.5 text-center border-r border-slate-200">Kondisi</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Stok Bets</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Jml Retur</th>
                  <th className="py-1 px-1.5 border-r border-slate-200">Satuan</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Harga Pokok</th>
                  <th className="py-1 px-1.5 text-right border-r border-slate-200">Pot %</th>
                  <th className="py-1 px-2 border-r border-slate-200">Alasan</th>
                  <th className="py-1 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400">
                      Belum ada item dipilih. Klik tombol <strong className="text-emerald-700">[+ Item]</strong> di bawah untuk memilih obat dari master item.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={it.rowId || idx}
                        onClick={() => setSelectedRowIndex(idx)}
                        className={`cursor-pointer transition hover:bg-slate-50 ${
                          isSelected ? "bg-slate-100 font-semibold text-slate-900" : ""
                        }`}
                      >
                        <td className="py-1 px-1.5 text-center text-slate-500 border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-2 font-mono text-[10.5px] border-r border-slate-100">
                          {it.code}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-100 max-w-[200px] truncate">
                          <strong className="block text-slate-900">{it.name}</strong>
                          <span className="text-[10px] text-slate-500">{it.brand}</span>
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-100">
                          {it.available_batches && it.available_batches.length > 0 ? (
                            <select
                              value={it.batch_number}
                              onChange={(e) =>
                                handleItemFieldChange(idx, "selected_batch", e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="h-5 px-1 border border-slate-300 rounded text-[10.5px] font-mono bg-white font-medium"
                            >
                              {it.available_batches.map((b: any) => (
                                <option key={b.id || b.batch_number} value={b.batch_number}>
                                  {b.batch_number} (ED: {formatDate(b.expired_date)} - S:{b.current_qty})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="No Batch"
                                value={it.batch_number}
                                onChange={(e) =>
                                  handleItemFieldChange(idx, "batch_number", e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 h-5 px-1 border border-slate-300 rounded text-[10px] font-mono"
                              />
                              <input
                                type="date"
                                value={it.expired_date ? it.expired_date.split("T")[0] : ""}
                                onChange={(e) =>
                                  handleItemFieldChange(idx, "expired_date", e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 h-5 px-1 border border-slate-300 rounded text-[10px]"
                              />
                            </div>
                          )}
                        </td>
                        <td className="py-0.5 px-1 text-center border-r border-slate-100">
                          <select
                            value={it.item_condition}
                            onChange={(e) =>
                              handleItemFieldChange(idx, "item_condition", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 px-1 border border-slate-300 rounded text-[10px] bg-white font-medium"
                          >
                            <option value="BAIK">Baik</option>
                            <option value="RUSAK">Rusak</option>
                            <option value="KEDALUWARSA">Kadaluarsa</option>
                            <option value="TIDAK_SESUAI_SP">Tidak Sesuai</option>
                          </select>
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-blue-700 border-r border-slate-100">
                          {it.max_qty || "-"}
                        </td>
                        <td className="py-0.5 px-1 text-right border-r border-slate-100">
                          <input
                            type="number"
                            min="0.01"
                            max={it.max_qty || undefined}
                            step="any"
                            value={it.qty || ""}
                            onChange={(e) =>
                              handleItemFieldChange(idx, "qty", parseFloat(e.target.value) || 0)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-bold text-rose-700 bg-white focus:outline-none focus:border-slate-500"
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-100">{it.unit}</td>
                        <td className="py-0.5 px-1 text-right border-r border-slate-100">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.unit_price || ""}
                            onChange={(e) =>
                              handleItemFieldChange(idx, "unit_price", parseFloat(e.target.value) || 0)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-mono bg-white focus:outline-none focus:border-slate-500"
                          />
                        </td>
                        <td className="py-0.5 px-1 text-right border-r border-slate-100">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={it.discount_percent || ""}
                            onChange={(e) =>
                              handleItemFieldChange(
                                idx,
                                "discount_percent",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-12 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-mono bg-white focus:outline-none focus:border-slate-500"
                          />
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-100">
                          <input
                            type="text"
                            placeholder="Alasan..."
                            value={it.reason || ""}
                            onChange={(e) =>
                              handleItemFieldChange(idx, "reason", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-24 h-5 px-1 py-0 border border-slate-300 rounded text-[10.5px] bg-white"
                          />
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatCurrency(it.total)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Info / Summary Sidebar (col-2) */}
        <div className="md:col-span-2 border border-slate-300 rounded bg-white p-2 flex flex-col justify-between overflow-y-auto h-full min-h-0 text-xs">
          <div className="space-y-1.5">
            <h4 className="text-[10.5px] font-bold text-slate-700 border-b border-slate-100 pb-1 flex items-center justify-between">
              <span>Detail Item Terpilih</span>
              {selectedItemRow && (
                <span className="text-[9.5px] text-slate-600 font-semibold font-mono">
                  {selectedItemRow.code}
                </span>
              )}
            </h4>
            {selectedItemRow ? (
              <div className="space-y-1 text-slate-600 text-[10.5px]">
                <div>
                  <span className="text-slate-400 block text-[9.5px]">Nama Obat:</span>
                  <strong className="text-slate-800 text-[11px] block leading-tight">
                    {selectedItemRow.name}
                  </strong>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-slate-100">
                  <span className="text-slate-500">Merek:</span>
                  <span className="text-slate-700">{selectedItemRow.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch Terpilih:</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {selectedItemRow.batch_number || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expired Date:</span>
                  <span className="font-mono text-slate-800">
                    {formatDate(selectedItemRow.expired_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stok Bets Ini:</span>
                  <span className="font-mono text-blue-700 font-bold">
                    {selectedItemRow.max_qty} {selectedItemRow.unit}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-0.5">
                  <span className="text-slate-500">Jml Retur:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {selectedItemRow.qty} {selectedItemRow.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Harga Beli:</span>
                  <span className="font-mono text-slate-800">
                    {formatCurrency(selectedItemRow.unit_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(selectedItemRow.total)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 italic text-[10.5px]">
                Pilih atau klik baris item dalam tabel untuk melihat detail informasi.
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 text-center">
            Standar Retur CDOB Apotek
          </div>
        </div>
      </div>

      {/* 4. Table Action Buttons under table */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0 py-0.5">
        <button
          type="button"
          onClick={() => setIsItemModalOpen(true)}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <span>+ Item Obat</span>
        </button>

        <button
          type="button"
          onClick={handleDeleteSelectedRow}
          disabled={selectedRowIndex === null}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Hapus Baris"
        >
          <Trash2 className="w-3 h-3 text-rose-500" />
        </button>
      </div>

      {/* MODALS */}
      <CariSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(supp) => setSelectedSupplier(supp)}
      />

      <CariItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleSelectItemFromModal}
        defaultWarehouseId={warehouseId}
      />
    </div>
  );
}
