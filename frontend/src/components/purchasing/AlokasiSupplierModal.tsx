"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Check, AlertCircle, Users, CheckCircle2 } from "lucide-react";

export interface SupplierAllocationRow {
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  qty: number;
  unit_price: number;
  discount_percent: number;
}

interface AlokasiSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    product_id: string;
    code: string;
    name: string;
    unit_id?: string;
    unit_name?: string;
    unit_price?: number;
    discount_percent?: number;
  } | null;
  initialAllocations: SupplierAllocationRow[];
  totalQtyNeeded: number;
  availableSuppliers: Array<{ id: string; name: string; code?: string }>;
  defaultSupplier?: { id: string; name: string; code?: string } | null;
  onSave: (allocations: SupplierAllocationRow[], newTotalQty: number) => void;
}

export const AlokasiSupplierModal: React.FC<AlokasiSupplierModalProps> = ({
  isOpen,
  onClose,
  product,
  initialAllocations,
  totalQtyNeeded,
  availableSuppliers,
  defaultSupplier,
  onSave,
}) => {
  const [totalQtyStr, setTotalQtyStr] = useState<string>("1.00");
  const [rows, setRows] = useState<SupplierAllocationRow[]>([]);

  // Initialize modal state
  useEffect(() => {
    if (isOpen && product) {
      const initTotal = totalQtyNeeded > 0 ? totalQtyNeeded : 1;
      setTotalQtyStr(initTotal.toFixed(2));

      if (initialAllocations && initialAllocations.length > 0) {
        setRows(
          initialAllocations.map((a) => ({
            supplier_id: a.supplier_id,
            supplier_name: a.supplier_name,
            supplier_code: a.supplier_code || "",
            qty: Number(a.qty) || 0,
            unit_price: Number(a.unit_price) || Number(product.unit_price) || 0,
            discount_percent: Number(a.discount_percent) || 0,
          }))
        );
      } else {
        // Start with 1 default supplier row with the full quantity
        const defId = defaultSupplier?.id || (availableSuppliers[0]?.id || "");
        const defName = defaultSupplier?.name || (availableSuppliers[0]?.name || "Supplier Utama");
        const defCode = defaultSupplier?.code || (availableSuppliers[0]?.code || "");
        setRows([
          {
            supplier_id: defId,
            supplier_name: defName,
            supplier_code: defCode,
            qty: initTotal,
            unit_price: Number(product.unit_price) || 0,
            discount_percent: Number(product.discount_percent) || 0,
          },
        ]);
      }
    }
  }, [isOpen, product, initialAllocations, totalQtyNeeded, availableSuppliers, defaultSupplier]);

  const totalQty = useMemo(() => {
    const clean = totalQtyStr.replace(/,/g, "").trim();
    return Math.max(0.01, parseFloat(clean) || 0);
  }, [totalQtyStr]);

  // Total allocated across all supplier rows
  const totalAllocated = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  }, [rows]);

  // Remaining shortage overall
  const remainingShortage = useMemo(() => {
    return Math.max(0, Math.round((totalQty - totalAllocated) * 100) / 100);
  }, [totalQty, totalAllocated]);

  // Compute remaining shortage sequentially row by row
  const rowCalculations = useMemo(() => {
    let accumulated = 0;
    return rows.map((r) => {
      const q = Number(r.qty) || 0;
      accumulated += q;
      const shortageAfter = Math.max(0, Math.round((totalQty - accumulated) * 100) / 100);
      return {
        accumulated,
        shortageAfter,
      };
    });
  }, [rows, totalQty]);

  if (!isOpen || !product) return null;

  // Add a new supplier row with quantity AUTOMATICALLY defaulted to remaining shortage
  const handleAddSupplierRow = () => {
    // Pick the next available supplier not yet selected
    const selectedIds = new Set(rows.map((r) => r.supplier_id));
    const nextSup = availableSuppliers.find((s) => !selectedIds.has(s.id)) || availableSuppliers[0];

    const autoQty = remainingShortage > 0 ? remainingShortage : 1;
    const newRow: SupplierAllocationRow = {
      supplier_id: nextSup?.id || "",
      supplier_name: nextSup?.name || "Pilih Supplier...",
      supplier_code: nextSup?.code || "",
      qty: autoQty,
      unit_price: Number(product.unit_price) || 0,
      discount_percent: 0,
    };

    setRows([...rows, newRow]);
  };

  // Update a field in a specific row
  const handleUpdateRow = (index: number, field: keyof SupplierAllocationRow, value: any) => {
    const updated = [...rows];
    if (field === "supplier_id") {
      const found = availableSuppliers.find((s) => s.id === value);
      updated[index].supplier_id = value;
      updated[index].supplier_name = found ? found.name : "";
      updated[index].supplier_code = found?.code || "";
    } else if (field === "qty") {
      const num = parseFloat(String(value).replace(/,/g, "")) || 0;
      updated[index].qty = num;
    } else if (field === "unit_price") {
      const num = parseFloat(String(value).replace(/,/g, "")) || 0;
      updated[index].unit_price = num;
    } else {
      (updated[index] as any)[field] = value;
    }
    setRows(updated);
  };

  // Remove a row
  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      alert("Minimal harus ada 1 supplier untuk item ini.");
      return;
    }
    const updated = rows.filter((_, idx) => idx !== index);
    setRows(updated);
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (rows.length === 0) {
      alert("Tentukan minimal 1 supplier untuk item ini.");
      return;
    }

    // Validate supplier IDs
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].supplier_id) {
        alert(`Pilih supplier pada baris #${i + 1}`);
        return;
      }
      if (rows[i].qty <= 0) {
        alert(`Jumlah kesanggupan pada baris #${i + 1} (${rows[i].supplier_name}) harus lebih dari 0`);
        return;
      }
    }

    if (remainingShortage > 0) {
      const proceed = confirm(
        `Perhatian: Masih ada kekurangan ${remainingShortage.toFixed(2)} ${product.unit_name || "PCS"}.\n\n` +
          `Total kebutuhan: ${totalQty.toFixed(2)}\n` +
          `Total kesanggupan supplier: ${totalAllocated.toFixed(2)}\n\n` +
          `Apakah Anda ingin menyimpan dengan total pesanan disesuaikan menjadi ${totalAllocated.toFixed(2)}?`
      );
      if (!proceed) return;
    }

    onSave(rows, totalAllocated);
    onClose();
  };

  const unitLabel = product.unit_name || "PCS";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-3 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#00c875] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Alokasi Pemenuhan Multi-Supplier
              </h2>
              <p className="text-[10.5px] text-emerald-100">
                Item: <strong className="text-white font-semibold">{product.name}</strong> ({product.code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col">
          {/* TOP BAR: Total Kebutuhan Obat */}
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                Total Kebutuhan Obat yang Dipesan :
              </label>
              <p className="text-[10px] text-emerald-700">
                Masukkan total jumlah obat yang dibutuhkan apotek. Kekurangan akan dihitung otomatis.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                required
                value={totalQtyStr}
                onChange={(e) => setTotalQtyStr(e.target.value)}
                className="w-28 h-7 px-2.5 border-2 border-emerald-500 rounded text-right font-mono font-bold text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="font-bold text-slate-700 text-xs px-2 py-1 bg-white border border-emerald-200 rounded">
                {unitLabel}
              </span>
            </div>
          </div>

          {/* TABLE: Pembagian Kesanggupan per Supplier */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                <span>Daftar Supplier Pemenuhan ({rows.length} Supplier)</span>
              </label>
              <span className="text-[10.5px] text-slate-500 font-medium">
                Kekurangan dihitung otomatis per kesanggupan supplier sebelumnya
              </span>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold h-7">
                  <tr>
                    <th className="py-1 px-2 text-center w-8 border-r border-slate-200">#</th>
                    <th className="py-1 px-2.5 border-r border-slate-200 min-w-[200px]">Supplier</th>
                    <th className="py-1 px-2.5 text-right w-28 border-r border-slate-200">
                      Jumlah Sanggup
                    </th>
                    <th className="py-1 px-2.5 text-right w-28 border-r border-slate-200 bg-slate-50/70">
                      Sisa Kekurangan
                    </th>
                    <th className="py-1 px-2.5 text-right w-28 border-r border-slate-200">
                      Harga Satuan
                    </th>
                    <th className="py-1 px-2 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const calc = rowCalculations[idx];
                    const isLast = idx === rows.length - 1;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors h-8">
                        <td className="py-1 px-2 text-center font-bold text-slate-500 border-r border-slate-100">
                          #{idx + 1}
                        </td>
                        <td className="py-1 px-2.5 border-r border-slate-100">
                          <select
                            value={row.supplier_id}
                            onChange={(e) => handleUpdateRow(idx, "supplier_id", e.target.value)}
                            className="w-full h-6 px-1.5 border border-slate-300 rounded text-[11px] font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            <option value="">-- Pilih Supplier --</option>
                            {availableSuppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code || "SUP"})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 px-2.5 border-r border-slate-100">
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={row.qty === 0 ? "" : row.qty}
                              onChange={(e) => handleUpdateRow(idx, "qty", e.target.value)}
                              placeholder="0"
                              className="w-20 h-6 px-2 text-right border border-slate-300 rounded font-mono font-bold text-slate-900 bg-white focus:outline-none focus:border-emerald-500 text-[11px]"
                            />
                            <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                              {unitLabel}
                            </span>
                          </div>
                        </td>
                        <td className="py-1 px-2.5 text-right border-r border-slate-100 bg-slate-50/50 font-mono">
                          {calc.shortageAfter > 0 ? (
                            <span className="text-amber-700 font-bold inline-flex items-center gap-1">
                              <span>{calc.shortageAfter.toFixed(2)}</span>
                              <span className="text-[9.5px] font-normal text-amber-600">
                                {unitLabel}
                              </span>
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>0.00 (Pas)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-1 px-2.5 text-right border-r border-slate-100">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.unit_price}
                            onChange={(e) => handleUpdateRow(idx, "unit_price", e.target.value)}
                            className="w-24 h-6 px-1.5 text-right border border-slate-300 rounded font-mono text-[11px] text-slate-800 bg-white focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          {rows.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                              title="Hapus Supplier ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-medium">Utama</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BUTTON: Tambah Supplier Lain */}
            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddSupplierRow}
                className="h-7 px-3 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 rounded font-bold text-[11px] flex items-center gap-1.5 shadow-2xs transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                {remainingShortage > 0 ? (
                  <span>
                    + Tambah Supplier Lain (Penuhi {remainingShortage.toFixed(2)} {unitLabel}{" "}
                    Kekurangan)
                  </span>
                ) : (
                  <span>+ Tambah Supplier Tambahan</span>
                )}
              </button>

              <span className="text-[10px] text-slate-500 italic">
                * Kuantitas supplier baru otomatis terisi sisa kekurangan obat.
              </span>
            </div>
          </div>

          {/* BOTTOM SUMMARY STATUS */}
          <div className="mt-auto p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Total Kebutuhan
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {totalQty.toFixed(2)} {unitLabel}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Total Terpenuhi
                </span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {totalAllocated.toFixed(2)} {unitLabel}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Status Pemenuhan
                </span>
                {remainingShortage === 0 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Terpenuhi Lengkap
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                    <AlertCircle className="w-3 h-3 text-amber-700" />
                    Kurang {remainingShortage.toFixed(2)} {unitLabel}
                  </span>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded font-semibold text-xs transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="submit"
                className="h-8 px-5 bg-[#00c875] hover:bg-[#00b066] text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Simpan &amp; Terapkan Alokasi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
