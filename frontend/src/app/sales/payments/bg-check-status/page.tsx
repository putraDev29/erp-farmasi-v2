"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Printer,
  Search,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function BGCheckStatusPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Ketoko Spec (Image 14)
  const [customerId, setCustomerId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [bgNumber, setBgNumber] = useState("");

  // Editing state for table rows
  const [editStates, setEditStates] = useState<{
    [key: string]: { is_cleared: boolean; cleared_date: string };
  }>({});

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const { data: bgChecks = [], isLoading, refetch } = useQuery({
    queryKey: ["sales-bg-checks", customerId, showAll, bgNumber],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerId && customerId !== "all") params.append("customer_id", customerId);
      if (showAll) params.append("show_all", "true");
      if (bgNumber) params.append("bg_no", bgNumber);

      const res = await api.get(`/sales/bg-checks?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/sales/bg-checks/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-bg-checks"] });
      alert("Status lunas BG/Cek berhasil disimpan!");
    },
  });

  const handleToggleCleared = (id: string, currentVal: boolean) => {
    const today = new Date().toISOString().split("T")[0];
    setEditStates({
      ...editStates,
      [id]: {
        is_cleared: !currentVal,
        cleared_date: !currentVal ? today : "",
      },
    });
  };

  const handleDateChange = (id: string, date: string) => {
    setEditStates({
      ...editStates,
      [id]: {
        is_cleared: editStates[id]?.is_cleared ?? true,
        cleared_date: date,
      },
    });
  };

  const handleSaveAll = () => {
    const promises = Object.keys(editStates).map((id) =>
      updateMutation.mutateAsync({
        id,
        payload: {
          is_cleared: editStates[id].is_cleared,
          cleared_date: editStates[id].cleared_date
            ? new Date(editStates[id].cleared_date)
            : null,
        },
      })
    );
    Promise.all(promises);
  };

  const totalAmount = bgChecks.reduce(
    (sum: number, it: any) => sum + (it.total_amount || 0),
    0
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
            Status Lunas Piutang
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

      {/* 2. FILTER SECTION (Matching Image 14) */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 bg-white p-2 rounded border border-slate-200 shadow-2xs text-[11px]">
        {/* Pelanggan */}
        <div className="flex items-center gap-1.5 min-w-[280px]">
          <label className="text-slate-600 font-semibold whitespace-nowrap">Pelanggan :</label>
          <div className="flex gap-1 flex-1">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-700"
            >
              <option value="all">Semua Pelanggan</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
            >
              <Search className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Tampil Semua */}
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            id="showAllToggle"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="w-3.5 h-3.5 border rounded"
          />
          <label htmlFor="showAllToggle" className="text-slate-700 font-semibold cursor-pointer">
            Tampil Semua
          </label>
        </div>

        {/* Nomor */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-600 font-semibold whitespace-nowrap">Nomor :</label>
          <input
            type="text"
            value={bgNumber}
            onChange={(e) => setBgNumber(e.target.value)}
            className="h-6 px-2 border border-slate-300 rounded text-[11px] w-36 font-mono"
          />
        </div>

        {/* Cari button (Sky blue like screenshot) */}
        <button
          type="button"
          onClick={() => refetch()}
          className="h-6 px-3 bg-[#4ba3e3] hover:bg-[#388ecf] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Cari</span>
        </button>
      </div>

      {/* 3. TABLE SECTION (6 Columns Matching Image 14) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Pelanggan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Jml Bayar</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Cek Bg</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-center w-24">Status Lunas</th>
              <th className="py-0.5 px-2.5 w-32">Tanggal Lunas</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  Memuat data status lunas piutang...
                </td>
              </tr>
            ) : bgChecks.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              bgChecks.map((it: any) => {
                const isCleared = editStates[it.id]?.is_cleared ?? it.is_cleared ?? false;
                const clearedDate =
                  editStates[it.id]?.cleared_date ??
                  (it.cleared_date ? formatDate(it.cleared_date) : "");

                return (
                  <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50 h-6">
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      {it.payment_no}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                      {it.customer?.name || "Pelanggan Umum"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                      {formatCurrency(it.total_amount)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-700">
                      {it.bg_check_no || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-center">
                      <input
                        type="checkbox"
                        checked={isCleared}
                        onChange={() => handleToggleCleared(it.id, isCleared)}
                        className="w-3.5 h-3.5 border rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-0.5 px-2.5">
                      <input
                        type="date"
                        value={clearedDate}
                        onChange={(e) => handleDateChange(it.id, e.target.value)}
                        disabled={!isCleared}
                        className="h-5 px-1.5 border border-slate-300 rounded text-[11px] disabled:bg-slate-50"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. BOTTOM BAR (Total pink box, Simpan, Cetak Buttons Matching Image 14) */}
      <div className="shrink-0 pt-0.5 flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-2xs text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-700 font-bold whitespace-nowrap">Total :</span>
          {/* Pink box matching screenshot */}
          <div className="bg-[#f8b4c9] text-slate-800 font-bold text-sm px-4 py-1 rounded min-w-[160px] text-right shadow-2xs border border-[#f39bb6]">
            {formatCurrency(totalAmount)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={Object.keys(editStates).length === 0 || updateMutation.isPending}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      </div>
    </div>
  );
}
