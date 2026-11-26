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
  Printer,
  CreditCard,
  Building2,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariSupplierModal } from "@/components/purchasing/CariSupplierModal";
import { CariItemModalMode1 } from "@/components/purchasing/CariItemModalMode1";

export interface ReturnItemMode1Row {
  rowId: string;
  purchase_id?: string;
  purchase_item_id?: string;
  invoice_no: string;
  product_id: string;
  unit_id: string;
  code: string;
  name: string;
  brand: string;
  batch_number: string;
  expired_date: string | null;
  purchased_qty: number;
  purchased_unit: string;
  already_returned_qty: number;
  remaining_qty: number;
  current_stock: number;
  qty: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  item_condition: string;
  reason: string;
  total: number;
}

export default function PurchaseReturnMode1Page() {
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
  const [taxCheckbox, setTaxCheckbox] = useState(false);
  const [notes, setNotes] = useState("");
  const [extraFee, setExtraFee] = useState<number>(0);
  const [extraFeeCheckbox, setExtraFeeCheckbox] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"DIAMBIL" | "DIKIRIM">("DIAMBIL");

  // Table items & selection
  const [items, setItems] = useState<ReturnItemMode1Row[]>([]);
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

  // Item Field Changes
  const handleItemFieldChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };

      if (field === "qty") {
        let numVal = Number(val) || 0;
        if (numVal > row.remaining_qty) {
          alert(
            `Jumlah retur (${numVal}) tidak boleh melebihi sisa yang bisa diretur (${row.remaining_qty}).`
          );
          numVal = row.remaining_qty;
        }
        row.qty = numVal;
      } else if (field === "discount_percent") {
        row.discount_percent = Number(val) || 0;
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

  // Add items from Mode 1 Modal
  const handleSelectFromMode1Modal = (selectedList: any[]) => {
    setItems((prev) => {
      const copy = [...prev];
      selectedList.forEach((it) => {
        const rowId = `${it.purchase_id}_${it.purchase_item_id || it.product_id}`;
        const exists = copy.some((ex) => ex.rowId === rowId);
        if (!exists) {
          const defaultQty = it.remaining_qty > 0 ? it.remaining_qty : it.purchased_qty;
          const discount = (defaultQty * it.unit_price * (it.discount_percent || 0)) / 100;

          // Auto set supplier if not chosen yet
          if (!selectedSupplier && it.supplier_id) {
            const supp = suppliers.find((s: any) => s.id === it.supplier_id);
            if (supp) setSelectedSupplier(supp);
            else setSelectedSupplier({ id: it.supplier_id, name: it.supplier_name, code: "-" });
          }

          // Auto set warehouse if not chosen
          if (it.warehouse_id && it.warehouse_id !== warehouseId) {
            setWarehouseId(it.warehouse_id);
          }

          copy.push({
            rowId: rowId,
            purchase_id: it.purchase_id,
            purchase_item_id: it.purchase_item_id,
            invoice_no: it.invoice_no,
            product_id: it.product_id,
            unit_id: it.unit_id,
            code: it.product_code || it.code,
            name: it.product_name || it.name,
            brand: it.brand || "-",
            batch_number: it.batch_number || "",
            expired_date: it.expired_date || null,
            purchased_qty: Number(it.purchased_qty) || 0,
            purchased_unit: it.unit_name || it.unit,
            already_returned_qty: Number(it.already_returned_qty) || 0,
            remaining_qty: Number(it.remaining_qty) || 0,
            current_stock: Number(it.current_stock) || 0,
            qty: defaultQty,
            unit: it.unit_name || it.unit,
            unit_price: Number(it.unit_price) || 0,
            discount_percent: Number(it.discount_percent) || 0,
            item_condition: "BAIK",
            reason: "",
            total: defaultQty * it.unit_price - discount,
          });
        }
      });
      return copy;
    });

    if (selectedRowIndex === null && selectedList.length > 0) {
      setSelectedRowIndex(0);
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
    setExtraFeeCheckbox(false);
    setDeliveryMethod("DIAMBIL");
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

      // Check validations
      for (const it of items) {
        if (it.qty <= 0) {
          throw new Error(`Jumlah retur untuk obat ${it.name} harus lebih dari 0.`);
        }
        if (it.qty > it.remaining_qty) {
          throw new Error(
            `Jumlah retur untuk ${it.name} (${it.qty}) melebihi sisa yang bisa diretur (${it.remaining_qty}).`
          );
        }
      }

      const payload = {
        return_mode: "MODE_1",
        delivery_method: deliveryMethod,
        purchase_id: items[0]?.purchase_id || undefined,
        warehouse_id: warehouseId,
        supplier_id: selectedSupplier.id,
        tax_type: ppnType.toUpperCase(),
        tax_percent: taxPercent,
        other_cost: Number(extraFee) || 0,
        reason: notes || "Retur Faktur Pembelian Obat (Mode 1)",
        computer_name: "WEB-CLIENT",
        items: items.map((it) => ({
          purchase_item_id: it.purchase_item_id,
          product_id: it.product_id,
          unit_id: it.unit_id,
          batch_number: it.batch_number,
          expired_date: it.expired_date,
          item_condition: it.item_condition || "BAIK",
          reason: it.reason || notes || "Retur Faktur",
          original_invoice_no: it.invoice_no,
          brand: it.brand,
          purchased_qty: it.purchased_qty,
          purchased_unit: it.purchased_unit,
          qty: it.qty,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
        })),
      };

      return await api.post("/purchases/returns", payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      alert(
        `Draft Retur Pembelian Mode 1 berhasil disimpan dengan No: ${
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
            <span className="w-1.5 h-3.5 bg-rose-500 rounded-xs inline-block" />
            <span className="font-bold text-slate-800 text-xs sm:text-sm">
              Retur Pembelian Baru (Mode 1 - Berdasarkan Nomor Faktur Asal)
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              / Input Item Berdasarkan Faktur Pembelian PBF
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-medium flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Baru</span>
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
                placeholder="Pilih Supplier atau pilih item faktur..."
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

          <div className="grid grid-cols-12 items-center gap-1">
            <label className="col-span-4 text-slate-600 font-semibold text-[11px]">
              Metode Retur :
            </label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as "DIAMBIL" | "DIKIRIM")}
              className="col-span-8 h-6 px-1.5 border border-emerald-300 rounded text-[11px] font-semibold bg-emerald-50/40 text-emerald-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="DIAMBIL">Diambil Supplier</option>
              <option value="DIKIRIM">Dikirim ke Supplier</option>
            </select>
          </div>
        </div>

        {/* Col 3: Grand Total Display Box */}
        <div className="md:col-span-3 bg-white p-2 rounded border border-rose-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Total Item: <strong className="text-slate-800">{totalItemCount}</strong></span>
            <span>Jenis Obat: <strong className="text-slate-800">{items.length}</strong></span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Total Nilai Retur
            </span>
            <span className="text-base sm:text-lg font-black text-rose-600 font-mono leading-none">
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
                  <th className="py-1 px-2 border-r border-slate-200">No Faktur Asal</th>
                  <th className="py-1 px-2 border-r border-slate-200">Kode & Nama Obat</th>
                  <th className="py-1 px-2 border-r border-slate-200">Batch & ED</th>
                  <th className="py-1 px-1.5 text-center border-r border-slate-200">Kondisi</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Jml Beli</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Sisa Retur</th>
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
                    <td colSpan={13} className="py-16 text-center text-slate-400">
                      Belum ada item dipilih. Klik tombol <strong className="text-emerald-700">[+ Item]</strong> di bawah untuk memilih item dari faktur pembelian asal.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={it.rowId || idx}
                        onClick={() => setSelectedRowIndex(idx)}
                        className={`cursor-pointer transition hover:bg-rose-50/50 ${
                          isSelected ? "bg-rose-100/70 font-semibold text-rose-950" : ""
                        }`}
                      >
                        <td className="py-1 px-1.5 text-center text-slate-500 border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-2 font-mono text-[10.5px] border-r border-slate-100">
                          {it.invoice_no}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-100 max-w-[200px] truncate">
                          <strong className="block text-slate-900">{it.name}</strong>
                          <span className="font-mono text-[9.5px] text-slate-500">{it.code}</span>
                        </td>
                        <td className="py-1 px-2 font-mono text-[10.5px] border-r border-slate-100">
                          <div>Batch: <strong className="text-slate-700">{it.batch_number || "-"}</strong></div>
                          <div className="text-slate-500">ED: {formatDate(it.expired_date)}</div>
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
                        <td className="py-1 px-2 text-right font-mono text-slate-600 border-r border-slate-100">
                          {it.purchased_qty}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 border-r border-slate-100">
                          {it.remaining_qty}
                        </td>
                        <td className="py-0.5 px-1 text-right border-r border-slate-100">
                          <input
                            type="number"
                            min="0.01"
                            max={it.remaining_qty}
                            step="any"
                            value={it.qty || ""}
                            onChange={(e) =>
                              handleItemFieldChange(idx, "qty", parseFloat(e.target.value) || 0)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-bold text-rose-700 bg-white focus:outline-none focus:border-rose-500"
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-100">{it.unit}</td>
                        <td className="py-1 px-2 text-right font-mono text-slate-700 border-r border-slate-100">
                          {formatCurrency(it.unit_price)}
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
                            className="w-12 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-mono bg-white focus:outline-none focus:border-rose-500"
                          />
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-100">
                          <input
                            type="text"
                            placeholder="Alasan retur..."
                            value={it.reason || ""}
                            onChange={(e) =>
                              handleItemFieldChange(idx, "reason", e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-28 h-5 px-1 py-0 border border-slate-300 rounded text-[10.5px] bg-white focus:outline-none focus:border-rose-500"
                          />
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
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
                <span className="text-[9.5px] text-rose-600 font-semibold font-mono">
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
                  <span className="text-slate-500">No Faktur:</span>
                  <span className="font-mono text-slate-800">{selectedItemRow.invoice_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch:</span>
                  <span className="font-mono text-slate-800">{selectedItemRow.batch_number || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expired Date:</span>
                  <span className="font-mono text-slate-800">{formatDate(selectedItemRow.expired_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Bisa Retur:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {selectedItemRow.remaining_qty} {selectedItemRow.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stok Apotek:</span>
                  <span className="font-mono text-blue-700">
                    {selectedItemRow.current_stock} {selectedItemRow.unit}
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
          <span>+ Item (Faktur Pembelian)</span>
        </button>

        <button
          type="button"
          onClick={handleDeleteSelectedRow}
          disabled={selectedRowIndex === null}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40 cursor-pointer"
          title="Hapus Baris"
        >
          <Trash2 className="w-3 h-3 text-rose-500" />
        </button>

        <button
          type="button"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-3 h-3 stroke-[2.5]" />
          <span>{createMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>
      </div>

      {/* MODALS */}
      <CariSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(supp) => setSelectedSupplier(supp)}
      />

      <CariItemModalMode1
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleSelectFromMode1Modal}
        defaultWarehouseId={warehouseId}
        supplierId={selectedSupplier?.id || ""}
      />
    </div>
  );
}
