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
  Receipt,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";
import { CariSupplierModal } from "@/components/purchasing/CariSupplierModal";
import { CariItemModal } from "@/components/purchasing/CariItemModal";

export interface ReturnItemMode2Row {
  rowId: string;
  product_id: string;
  unit_id: string;
  code: string;
  name: string;
  brand: string;
  qty: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  total: number;
}

export default function PurchaseReturnMode2Page() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Header State matching Screenshot 10
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

  // Handle Qty / Price / Discount changes
  const handleItemFieldChange = (index: number, field: string, val: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: val };
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
  const handleSelectItemFromModal = (product: any) => {
    const exists = items.some((it) => it.product_id === product.id);
    if (exists) {
      alert(`Produk ${product.name} sudah ada di dalam tabel retur.`);
      return;
    }

    const defaultUnit =
      units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
    const unitId = product.base_unit_id || product.unit_id || defaultUnit?.id;
    const unitName = product.base_unit?.name || product.unit?.name || defaultUnit?.name || "PCS";
    const price = Number(product.purchase_price) || Number(product.cost_price) || 0;

    const newRow: ReturnItemMode2Row = {
      rowId: `${Date.now()}_${Math.random()}`,
      product_id: product.id,
      unit_id: unitId,
      code: product.code || "",
      name: product.name || "",
      brand: product.brand?.name || product.brand_name || "-",
      qty: 1,
      unit: unitName,
      unit_price: price,
      discount_percent: 0,
      total: price,
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
    setExtraFeeCheckbox(false);
  };

  // Mutation to save return
  const createMutation = useMutation({
    mutationFn: async (isPotongHutang: boolean = false) => {
      if (!selectedSupplier?.id) {
        throw new Error("Pilih supplier terlebih dahulu.");
      }
      if (!warehouseId) {
        throw new Error("Pilih gudang terlebih dahulu.");
      }
      if (items.length === 0) {
        throw new Error("Daftar item retur tidak boleh kosong. Klik [+ Item].");
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
        reason:
          notes || (isPotongHutang ? "Retur Pembelian (Potong Hutang)" : "Retur Pembelian (Mode 2)"),
        computer_name: "WEB-CLIENT",
        items: items.map((it) => ({
          product_id: it.product_id,
          unit_id: it.unit_id || defaultUnit?.id,
          brand: it.brand,
          purchased_qty: it.qty,
          purchased_unit: it.unit,
          qty: it.qty,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
        })),
      };

      return await api.post("/purchases/returns", payload);
    },
    onSuccess: (res: any, variables: boolean) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      alert(
        `Retur Pembelian Mode 2 berhasil disimpan dengan No: ${
          res.data?.data?.return_no || "RB-OK"
        }`
      );
      if (variables) {
        // Potongan Hutang navigates directly to Bayar Hutang
        router.push("/purchasing/payments");
      } else {
        router.push("/purchasing/returns");
      }
    },
    onError: (err: any) => {
      alert("Gagal menyimpan retur: " + (err.response?.data?.message || err.message));
    },
  });

  const selectedItemRow = selectedRowIndex !== null ? items[selectedRowIndex] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 flex flex-col h-full min-h-0 text-xs select-none gap-1 overflow-y-auto md:overflow-hidden">
      {/* 1. Header: [< Retur Pembelian Baru Mode 2] + Context */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/purchasing/returns")}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
            title="Kembali ke Daftar Retur"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">
            Retur Pembelian Baru Mode 2
          </h1>
        </div>

        {/* User context badge */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[9px]">
            33
          </span>
          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold text-[10px]">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">
              A
            </span>
            <span>ADMIN2</span>
          </div>
        </div>
      </div>

      {/* 2. Top Header Form matching Screenshot 10 (2 Rows) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 shrink-0 bg-slate-50/40 p-1 rounded border border-slate-200/80 text-[11px]">
        {/* ROW 1: No Transaksi (col-3) | Tanggal (col-3) | Supplier (col-6) */}
        <div className="md:col-span-3">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">
            No Transaksi :
          </label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {returnNo}
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">Tanggal :</label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {returnDate}
          </div>
        </div>

        <div className="md:col-span-6">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">Supplier :</label>
          <div className="flex gap-1">
            <div
              onClick={() => setIsSupplierModalOpen(true)}
              className="flex-1 h-6 px-2 flex items-center border border-slate-300 rounded bg-white text-slate-800 text-[11px] cursor-pointer hover:border-sky-500 truncate"
            >
              {selectedSupplier ? (
                <span className="font-semibold text-slate-900">
                  {selectedSupplier.code} - {selectedSupplier.name}
                </span>
              ) : (
                <span className="text-slate-400">Select...</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(true)}
              className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              title="Cari Supplier"
            >
              <Search className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ROW 2: Dari (col-6) | PPN (col-6) */}
        <div className="md:col-span-6">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">
            Dari :
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full h-6 px-1.5 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer truncate"
          >
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-6">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">PPN :</label>
          <select
            value={ppnType}
            onChange={(e) => setPpnType(e.target.value as any)}
            className="w-full h-6 px-1.5 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="Non">Non</option>
            <option value="Include">Include</option>
            <option value="Exclude">Exclude</option>
          </select>
        </div>
      </div>

      {/* 3. Main Body: 9-Column Table (Left) + Detail Info Panel (Right) matching Screenshot 10 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 flex-1 min-h-[220px]">
        {/* Left: 9-Column Retur Mode 2 Table (col-10) */}
        <div className="md:col-span-10 border border-slate-300 rounded bg-white overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 whitespace-nowrap">
                <tr>
                  <th className="py-1 px-1.5 text-center w-8 border-r border-slate-200">No</th>
                  <th className="py-1 px-2 border-r border-slate-200">Kode Item</th>
                  <th className="py-1 px-2 border-r border-slate-200">Nama</th>
                  <th className="py-1 px-2 border-r border-slate-200">Merek</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Jumlah</th>
                  <th className="py-1 px-2 border-r border-slate-200">Satuan</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Harga</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Pot %</th>
                  <th className="py-1 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      No data
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={it.rowId || idx}
                        onClick={() => setSelectedRowIndex(idx)}
                        className={`cursor-pointer transition hover:bg-sky-50/60 ${
                          isSelected ? "bg-sky-100/70 font-semibold text-sky-900" : ""
                        }`}
                      >
                        <td className="py-1 px-1.5 text-center text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-2 font-mono whitespace-nowrap border-r border-slate-200">
                          {it.code}
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap border-r border-slate-200">
                          {it.name}
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap text-slate-500 border-r border-slate-200">
                          {it.brand}
                        </td>
                        <td className="py-0.5 px-1 text-right border-r border-slate-200">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={it.qty || ""}
                            onChange={(e) =>
                              handleItemFieldChange(idx, "qty", parseFloat(e.target.value) || 0)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-bold text-rose-700 bg-white focus:outline-none focus:border-sky-500"
                          />
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200">{it.unit}</td>
                        <td className="py-0.5 px-1 text-right border-r border-slate-200">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.unit_price || ""}
                            onChange={(e) =>
                              handleItemFieldChange(idx, "unit_price", parseFloat(e.target.value) || 0)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-mono bg-white focus:outline-none focus:border-sky-500"
                          />
                        </td>
                        <td className="py-0.5 px-1 text-right border-r border-slate-200">
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
                            className="w-12 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-mono bg-white focus:outline-none focus:border-sky-500"
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
        <div className="md:col-span-2 border border-slate-300 rounded bg-white p-2 flex flex-col justify-between overflow-hidden">
          <div className="space-y-1.5">
            <h4 className="text-[10.5px] font-bold text-slate-700 border-b border-slate-100 pb-1">
              Detail Item Terpilih
            </h4>
            {selectedItemRow ? (
              <div className="space-y-1 text-slate-600 text-[10.5px]">
                <div>
                  <span className="text-slate-400 block text-[9.5px]">Kode & Nama:</span>
                  <strong className="text-slate-800 text-[11px] block leading-tight">
                    {selectedItemRow.name}
                  </strong>
                  <span className="text-[10px] text-slate-500">{selectedItemRow.code}</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-slate-100">
                  <span className="text-slate-500">Merek:</span>
                  <span className="font-medium text-slate-700">{selectedItemRow.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jml Retur:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {selectedItemRow.qty} {selectedItemRow.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Harga Retur:</span>
                  <span className="font-mono text-slate-800">
                    {formatCurrency(selectedItemRow.unit_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Potongan:</span>
                  <span className="font-mono text-slate-800">{selectedItemRow.discount_percent}%</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 italic text-[10.5px]">
                Pilih atau klik baris item dalam tabel untuk melihat detail informasi.
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 text-center">
            Apotek Berkat Purnama
          </div>
        </div>
      </div>

      {/* 4. Table Action Buttons under table: [+ Item] [🗑️] [Data Serial] */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0 py-0.5">
        <button
          type="button"
          onClick={() => setIsItemModalOpen(true)}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <Plus className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
          <span>+ Item</span>
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

        <button
          type="button"
          disabled
          className="h-6 px-2 bg-white border border-slate-300 text-slate-400 rounded font-medium text-[10.5px] flex items-center gap-1 cursor-not-allowed opacity-60"
        >
          <span>Data Serial</span>
        </button>
      </div>

      {/* 5. Bottom Calculation & Notes matching Screenshot 10 (2 Rows) */}
      <div className="bg-slate-50/70 border border-slate-300 rounded p-1 sm:p-1.5 space-y-1 text-xs shadow-2xs shrink-0">
        {/* ROW 1: Keterangan (col-6) | Item (col-2) | Sub Total (col-2) | Biaya (col-2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          <div className="md:col-span-6">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Keterangan :
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan retur..."
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Item :
            </label>
            <input
              type="text"
              readOnly
              value={totalItemCount.toFixed(2)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-slate-100 text-right font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Sub Total :
            </label>
            <input
              type="text"
              readOnly
              value={subTotal.toLocaleString("id-ID", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-slate-100 text-right font-mono font-semibold"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Biaya :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="any"
                value={extraFee || ""}
                placeholder="0.00"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setExtraFee(val);
                  setExtraFeeCheckbox(val > 0);
                }}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
              />
              <input
                type="checkbox"
                checked={extraFeeCheckbox}
                onChange={(e) => {
                  setExtraFeeCheckbox(e.target.checked);
                  if (!e.target.checked) setExtraFee(0);
                }}
                className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ROW 2: Empty space (col-6) | Pjk % (col-2) | Nom Pajak (col-2) | Total Akhir (col-2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          <div className="md:col-span-6"></div>

          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pjk % :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="any"
                value={taxPercent || ""}
                placeholder="0.00"
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
              />
              <input
                type="checkbox"
                checked={taxCheckbox}
                onChange={(e) => setTaxCheckbox(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Nom Pajak :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                readOnly
                value={taxAmount.toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-slate-100 text-right font-mono"
              />
              <input
                type="checkbox"
                checked={taxCheckbox}
                onChange={(e) => setTaxCheckbox(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-700 font-bold text-[10px] mb-0.5 leading-none">
              Total Akhir :
            </label>
            <div className="w-full h-6 px-2 bg-[#f5d0e3] border border-pink-300 rounded text-right font-mono font-extrabold text-xs text-slate-900 shadow-2xs flex items-center justify-end">
              {grandTotal.toLocaleString("id-ID", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Bottom Master Actions matching Screenshot 10 (6 Buttons!) */}
      {/* [+ Tambah] [💾 Simpan] [🗑️ Hapus] [🖨️ Cetak] [💳 Bayar] [💳 Potongan Hutang] */}
      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-200 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Retur Baru (+ Tambah)"
          >
            <Plus className="w-3 h-3 stroke-[2.8]" />
            <span>Tambah</span>
          </button>

          <button
            type="button"
            onClick={() => createMutation.mutate(false)}
            disabled={createMutation.isPending || items.length === 0}
            className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Simpan Retur Pembelian"
          >
            <Save className="w-3 h-3" />
            <span>{createMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>

          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-2.5 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Hapus Retur Pembelian"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Cetak Bukti Retur"
          >
            <Printer className="w-3 h-3 text-slate-600" />
            <span>Cetak</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/purchasing/payments")}
            className="h-6 px-2.5 bg-white hover:bg-amber-50 border border-slate-300 text-amber-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Bayar / Kas Keluar"
          >
            <CreditCard className="w-3 h-3 text-amber-600" />
            <span>Bayar</span>
          </button>

          <button
            type="button"
            onClick={() => createMutation.mutate(true)}
            disabled={createMutation.isPending || items.length === 0}
            className="h-6 px-2.5 bg-white hover:bg-amber-50 border border-slate-300 text-amber-800 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Simpan dan Potong Hutang Pembelian"
          >
            <Receipt className="w-3 h-3 text-amber-600" />
            <span>Potongan Hutang</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CariSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(sup) => setSelectedSupplier(sup)}
        selectedId={selectedSupplier?.id}
      />

      <CariItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleSelectItemFromModal}
        supplierCode={selectedSupplier?.code}
      />
    </div>
  );
}
