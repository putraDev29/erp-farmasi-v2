"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Calendar, Layers, CheckCircle2, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { api, formatDate } from "@/lib/api";

export interface SelectedBatchOption {
  batch_mode: "FEFO" | "MANUAL";
  batch_number: string;
  expired_date: string;
  available_qty?: number;
}

interface PilihBatchEDModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productCode?: string;
  warehouseId?: string;
  currentBatchNumber?: string;
  onSelect: (option: SelectedBatchOption) => void;
}

export const PilihBatchEDModal: React.FC<PilihBatchEDModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  productCode,
  warehouseId,
  currentBatchNumber,
  onSelect,
}) => {
  const [selectedBatchKey, setSelectedBatchKey] = useState<string>(currentBatchNumber || "");

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["sales-product-batches", productId, warehouseId],
    enabled: isOpen && !!productId,
    queryFn: async () => {
      const params = new URLSearchParams({ product_id: productId });
      if (warehouseId && warehouseId !== "all") {
        params.append("warehouse_id", warehouseId);
      }
      const res = await api.get(`/sales/product-batches?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  if (!isOpen) return null;

  const today = new Date();
  const getEdStatus = (edStr?: string) => {
    if (!edStr) return { label: "-", color: "text-slate-500 bg-slate-100" };
    const ed = new Date(edStr);
    const diffDays = Math.ceil((ed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { label: "EXPIRED", color: "text-rose-800 bg-rose-100 border border-rose-300" };
    }
    if (diffDays <= 90) {
      return {
        label: `ED ${diffDays} hr`,
        color: "text-amber-800 bg-amber-100 border border-amber-300",
      };
    }
    return {
      label: `Aman (${Math.floor(diffDays / 30)} bln)`,
      color: "text-emerald-800 bg-emerald-100 border border-emerald-200",
    };
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] text-xs">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                Pilih Metode Pengeluaran Stok (FEFO / Sesuai ED)
              </h3>
              <p className="text-[11px] text-slate-300">
                {productCode ? `[${productCode}] ` : ""}
                <strong className="text-white">{productName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {/* Option 1: Auto FEFO */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-950">
                  Otomatis FEFO (First Expired, First Out)
                </div>
                <div className="text-[11px] text-emerald-800">
                  Sistem otomatis memotong batch dengan tanggal kedaluwarsa (ED) terdekat terlebih
                  dahulu.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelect({
                  batch_mode: "FEFO",
                  batch_number: "",
                  expired_date: "",
                });
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Gunakan Auto FEFO</span>
            </button>
          </div>

          {/* Option 2: Specific ED / Batch Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span>Atau Pilih Manual Sesuai Expired Date (ED) &amp; No. Batch :</span>
              </span>
              <span className="text-[10.5px] text-slate-500">
                Diurutkan dari ED paling dekat
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2 border-r border-slate-200 text-center w-8">No</th>
                    <th className="p-2 border-r border-slate-200">No. Batch</th>
                    <th className="p-2 border-r border-slate-200">Tanggal Expired (ED)</th>
                    <th className="p-2 border-r border-slate-200 text-center">Status ED</th>
                    <th className="p-2 border-r border-slate-200 text-right">Stok Tersedia</th>
                    <th className="p-2 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin inline-block mr-1.5" />
                        Memuat daftar batch &amp; ED...
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <AlertTriangle className="w-4 h-4 text-amber-500 inline-block mr-1.5" />
                        Belum ada rincian batch terdaftar di gudang ini (gunakan Auto FEFO).
                      </td>
                    </tr>
                  ) : (
                    batches.map((b: any, idx: number) => {
                      const edStatus = getEdStatus(b.expired_date);
                      const isCurrent =
                        currentBatchNumber && currentBatchNumber === b.batch_number;
                      const isSelected = selectedBatchKey === b.batch_number;
                      const edIso = b.expired_date
                        ? new Date(b.expired_date).toISOString().split("T")[0]
                        : "";
                      return (
                        <tr
                          key={b.id || idx}
                          onClick={() => setSelectedBatchKey(b.batch_number)}
                          onDoubleClick={() => {
                            onSelect({
                              batch_mode: "MANUAL",
                              batch_number: b.batch_number,
                              expired_date: edIso,
                              available_qty: Number(b.current_qty) || 0,
                            });
                            onClose();
                          }}
                          className={`cursor-pointer transition ${
                            isCurrent || isSelected
                              ? "bg-sky-50 font-semibold"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-2 border-r border-slate-100 text-center text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-r border-slate-100 font-mono font-bold text-slate-800">
                            {b.batch_number || "-"}
                          </td>
                          <td className="p-2 border-r border-slate-100 font-mono text-slate-700">
                            {b.expired_date ? formatDate(b.expired_date) : "-"}
                          </td>
                          <td className="p-2 border-r border-slate-100 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${edStatus.color}`}
                            >
                              {edStatus.label}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-100 text-right font-mono font-bold text-emerald-700">
                            {Number(b.current_qty || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelect({
                                  batch_mode: "MANUAL",
                                  batch_number: b.batch_number,
                                  expired_date: edIso,
                                  available_qty: Number(b.current_qty) || 0,
                                });
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10.5px] cursor-pointer"
                            >
                              Pilih ED
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
