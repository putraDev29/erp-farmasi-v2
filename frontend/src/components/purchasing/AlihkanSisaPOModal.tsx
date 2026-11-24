"use client";

import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Share2,
  Building2,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  ArrowRight,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

interface AlihkanSisaPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: any;
  onSuccess?: () => void;
}

export const AlihkanSisaPOModal: React.FC<AlihkanSisaPOModalProps> = ({
  isOpen,
  onClose,
  po,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [newSupplierId, setNewSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [reallocateQtyMap, setReallocateQtyMap] = useState<Record<string, number>>({});
  const [unitPriceMap, setUnitPriceMap] = useState<Record<string, number>>({});

  // Query suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Calculate remaining unfulfilled items
  const unfulfilledItems = useMemo(() => {
    if (!po?.items) return [];
    return po.items
      .map((it: any) => {
        const ordered = Number(it.qty) || 0;
        const received = Number(it.received_qty) || 0;
        const cancelled = Number(it.cancelled_qty) || 0;
        const sisa = Math.max(0, ordered - received - cancelled);
        return {
          ...it,
          ordered,
          received,
          cancelled,
          sisa,
        };
      })
      .filter((it: any) => it.sisa > 0);
  }, [po]);

  // Initialize reallocate qty map
  React.useEffect(() => {
    if (unfulfilledItems.length > 0) {
      const qMap: Record<string, number> = {};
      const pMap: Record<string, number> = {};
      unfulfilledItems.forEach((it: any) => {
        qMap[it.product_id] = it.sisa;
        pMap[it.product_id] = Number(it.unit_price) || 0;
      });
      setReallocateQtyMap(qMap);
      setUnitPriceMap(pMap);
    }
  }, [unfulfilledItems]);

  // Reallocate Mutation
  const reallocateMutation = useMutation({
    mutationFn: async () => {
      if (!po?.id) throw new Error("ID PO tidak valid");
      if (!newSupplierId) throw new Error("Pilih supplier tujuan baru");

      const itemsToReallocate = unfulfilledItems
        .map((it: any) => ({
          product_id: it.product_id,
          unit_id: it.unit_id,
          qty: reallocateQtyMap[it.product_id] || 0,
          unit_price: unitPriceMap[it.product_id] ?? Number(it.unit_price || 0),
          discount: Number(it.discount || 0),
        }))
        .filter((it: any) => it.qty > 0);

      if (itemsToReallocate.length === 0) {
        throw new Error("Tidak ada item sisa dengan jumlah > 0 yang dialihkan.");
      }

      return await api.post(`/purchases/orders/${po.id}/reallocate`, {
        new_supplier_id: newSupplierId,
        notes: notes || "Pengalihan sisa kebutuhan obat karena stok supplier asal tidak mencukupi",
        items: itemsToReallocate,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      alert(
        `✅ Berhasil mengalihkan sisa kebutuhan!\n\n` +
          `PO Baru (${res.data?.data?.order_no || "Auto"}) telah berhasil dibuat untuk supplier baru.\n` +
          `Sisa kebutuhan pada PO awal telah ditandai dialihkan.`
      );
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      alert("Gagal mengalihkan sisa PO: " + (err.response?.data?.message || err.message));
    },
  });

  if (!isOpen || !po) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-2.5 bg-sky-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-sky-200" />
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                Alihkan Sisa Kebutuhan Obat ke Supplier Lain
              </h3>
              <p className="text-[10px] text-sky-100">
                PO Asal: <span className="font-mono font-bold text-white">{po.order_no}</span> | 
                Supplier Asal: <span className="text-white font-semibold">{po.supplier?.name || "-"}</span>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/60">
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 text-[11px] text-sky-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Ketentuan Pengalihan Supplier :</p>
              <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-sky-800">
                <li>Jika supplier asal tidak mencukupi stok, sisa jumlah yang belum terpenuhi dapat dialihkan ke supplier baru dengan penawaran terbaik.</li>
                <li>Sistem akan otomatis membuat <strong>PO baru</strong> hanya untuk sisa obat yang belum terpenuhi.</li>
                <li>Barang yang sudah diterima/terpenuhi dari supplier awal <strong>tidak akan terhapus</strong> atau terganggu.</li>
              </ul>
            </div>
          </div>

          {/* Supplier Selector */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <label className="block text-slate-800 font-bold text-[11px] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-600" />
              Pilih Supplier Baru (Penawaran Terbaik) :
            </label>
            <select
              value={newSupplierId}
              onChange={(e) => setNewSupplierId(e.target.value)}
              className="w-full h-7 px-2 border border-slate-300 rounded text-xs text-slate-900 bg-white font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="">-- Pilih Supplier Baru Tujuan Pengalihan --</option>
              {suppliers
                .filter((s: any) => s.id !== po.supplier_id)
                .map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ""} - Telp: {s.phone || "-"}
                  </option>
                ))}
            </select>

            <div>
              <label className="block text-slate-600 font-medium text-[10.5px] mb-0.5">
                Catatan Pengalihan:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Stok PBF asal kosong, dialihkan ke Kimia Farma sesuai penawaran terendah."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Unfulfilled Items Table */}
          <div className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 text-[11px]">
                Daftar Obat Sisa yang Akan Dialihkan ke PO Baru :
              </h4>
              <span className="text-[10px] text-slate-500">
                {unfulfilledItems.length} item belum terpenuhi
              </span>
            </div>

            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[10.5px]">
                <tr>
                  <th className="py-1 px-2 text-center w-8">No</th>
                  <th className="py-1 px-2.5">Nama Obat</th>
                  <th className="py-1 px-2 text-right w-16">Pesan</th>
                  <th className="py-1 px-2 text-right w-16">Diterima</th>
                  <th className="py-1 px-2 text-right w-20 text-amber-700 font-bold">Sisa Kebutuhan</th>
                  <th className="py-1 px-2 text-center w-24 bg-sky-50 text-sky-900 font-bold">Qty Alihkan</th>
                  <th className="py-1 px-2.5 text-right w-24">Harga Beli Baru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unfulfilledItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400">
                      Seluruh item pada PO ini sudah terpenuhi lengkap.
                    </td>
                  </tr>
                ) : (
                  unfulfilledItems.map((it: any, idx: number) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50 transition">
                      <td className="py-1 px-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-1 px-2.5 font-medium text-slate-900">
                        {it.product?.name || "-"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-slate-600">
                        {it.ordered.toFixed(2)}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-slate-600">
                        {it.received.toFixed(2)}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-amber-700">
                        {it.sisa.toFixed(2)}
                      </td>
                      <td className="py-1 px-2 text-center bg-sky-50/50">
                        <input
                          type="number"
                          min={0.01}
                          max={it.sisa}
                          step="any"
                          value={reallocateQtyMap[it.product_id] ?? it.sisa}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setReallocateQtyMap((prev) => ({
                              ...prev,
                              [it.product_id]: val,
                            }));
                          }}
                          className="w-20 h-5 px-1.5 text-right font-mono font-bold text-sky-800 border border-sky-400 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-[11px]"
                        />
                      </td>
                      <td className="py-1 px-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          value={unitPriceMap[it.product_id] ?? Number(it.unit_price || 0)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setUnitPriceMap((prev) => ({
                              ...prev,
                              [it.product_id]: val,
                            }));
                          }}
                          className="w-24 h-5 px-1.5 text-right font-mono font-medium text-slate-800 border border-slate-300 rounded bg-white focus:outline-none focus:border-sky-500 text-[11px]"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700 text-xs transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => reallocateMutation.mutate()}
            disabled={reallocateMutation.isPending || !newSupplierId || unfulfilledItems.length === 0}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{reallocateMutation.isPending ? "Membuat PO Baru..." : "Buat PO Baru untuk Sisa Kebutuhan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
