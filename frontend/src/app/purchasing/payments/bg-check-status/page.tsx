"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Search,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariSupplierModal } from "@/components/purchasing/CariSupplierModal";

export default function BGCheckStatusPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Screenshot 8
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [checkNo, setCheckNo] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Editable rows state for batch saving
  const [editingRows, setEditingRows] = useState<{
    [paymentId: string]: {
      check_status: string;
      is_check_cleared: boolean;
      check_cleared_date: string;
    };
  }>({});

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Query BG/Checks
  const { data: checks = [], isLoading, refetch } = useQuery({
    queryKey: ["bg-checks", selectedSupplier?.id, checkNo, showAll],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSupplier?.id) params.append("supplier_id", selectedSupplier.id);
      if (checkNo) params.append("check_no", checkNo);
      if (showAll) params.append("all", "true");

      const res = await api.get(`/purchases/bg-checks?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Mutation to update check status
  const updateCheckMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/purchases/bg-checks/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bg-checks"] });
      setSuccessMsg("Status pencairan BG/Cek berhasil disimpan!");
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal menyimpan status BG/Cek");
    },
  });

  const handleStatusChange = (paymentId: string, currentCheck: any, newStatus: string) => {
    const isCleared = newStatus === "LUNAS";
    const today = new Date().toISOString().split("T")[0];
    const clearedDate = isCleared
      ? editingRows[paymentId]?.check_cleared_date || today
      : "";

    setEditingRows((prev) => ({
      ...prev,
      [paymentId]: {
        check_status: newStatus,
        is_check_cleared: isCleared,
        check_cleared_date: clearedDate,
      },
    }));
  };

  const handleDateChange = (paymentId: string, currentCheck: any, newDate: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [paymentId]: {
        check_status: prev[paymentId]?.check_status || currentCheck.check_status || "BELUM_LUNAS",
        is_check_cleared: prev[paymentId]?.is_check_cleared ?? currentCheck.is_check_cleared,
        check_cleared_date: newDate,
      },
    }));
  };

  const handleBatchSave = async () => {
    const entries = Object.entries(editingRows);
    if (entries.length === 0) {
      alert("Tidak ada perubahan status yang perlu disimpan.");
      return;
    }

    try {
      for (const [id, row] of entries) {
        await updateCheckMutation.mutateAsync({
          id,
          payload: {
            check_status: row.check_status,
            is_check_cleared: row.is_check_cleared,
            check_cleared_date: row.check_cleared_date
              ? new Date(row.check_cleared_date)
              : undefined,
          },
        });
      }
      setEditingRows({});
    } catch (e: any) {
      // Handled in onError
    }
  };

  const totalAmount = checks.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. HEADER: [< Status Lunas Hutang] */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/purchasing/payments")}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
            title="Kembali ke Pembayaran"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">
            Status Lunas Hutang
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

      {/* Messages */}
      {successMsg && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-[11px] flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px] flex items-center gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. FILTER SECTION (Matching Screenshot 8) */}
      <div className="bg-slate-50/50 p-1.5 rounded border border-slate-300 space-y-1 text-[11px] shrink-0">
        {/* Row 1: Supplier | Tampil Semua */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-end">
          <div className="md:col-span-8">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Supplier :
            </label>
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
              {selectedSupplier && (
                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
                  title="Hapus Filter Supplier"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
                title="Cari Supplier"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="md:col-span-4 flex items-center gap-2 h-6">
            <input
              type="checkbox"
              id="show-all"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-sky-600 border-slate-300 cursor-pointer"
            />
            <label htmlFor="show-all" className="text-[11px] font-semibold text-slate-700 cursor-pointer">
              Tampil Semua
            </label>
          </div>
        </div>

        {/* Row 2: Nomor */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-end">
          <div className="md:col-span-8">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Nomor :
            </label>
            <input
              type="text"
              placeholder="No BG / Cek..."
              value={checkNo}
              onChange={(e) => setCheckNo(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="md:col-span-4">
            <button
              type="button"
              onClick={() => refetch()}
              className="h-6 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <Search className="w-3 h-3" />
              <span>Cari</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. TABLE VIEW (Matching Screenshot 8) */}
      {/* Columns: No Transaksi | Supplier | Jml Bayar | No Cek Bg | Status Lunas | Tanggal Lunas */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs whitespace-nowrap">
              <tr>
                <th className="py-1 px-2 border-r border-slate-200">No Transaksi</th>
                <th className="py-1 px-2 border-r border-slate-200">Supplier</th>
                <th className="py-1 px-2 text-right border-r border-slate-200">Jml Bayar</th>
                <th className="py-1 px-2 border-r border-slate-200">No Cek Bg</th>
                <th className="py-1 px-2 w-48 border-r border-slate-200">Status Lunas</th>
                <th className="py-1 px-2 w-36">Tanggal Lunas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    Memuat data status BG/Cek...
                  </td>
                </tr>
              ) : checks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    Tidak ada data BG / Cek yang pending atau sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                checks.map((c: any) => {
                  const currentStatus =
                    editingRows[c.id]?.check_status ?? c.check_status ?? "BELUM_LUNAS";
                  const currentDate =
                    editingRows[c.id]?.check_cleared_date ??
                    (c.check_cleared_date ? c.check_cleared_date.split("T")[0] : "");

                  return (
                    <tr key={c.id} className="hover:bg-sky-50/60 transition">
                      <td className="py-1 px-2 font-mono whitespace-nowrap border-r border-slate-200">
                        {c.payment_no}
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap border-r border-slate-200 font-medium">
                        {c.supplier?.name || "-"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap border-r border-slate-200">
                        {formatCurrency(c.total_amount)}
                      </td>
                      <td className="py-1 px-2 font-mono font-bold text-sky-700 border-r border-slate-200">
                        {c.check_no || "-"}
                      </td>
                      <td className="py-0.5 px-1 border-r border-slate-200">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(c.id, c, e.target.value)}
                          className={`w-full h-5 px-1 py-0 rounded text-[11px] font-semibold border ${
                            currentStatus === "LUNAS"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : currentStatus === "BATAL"
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          <option value="BELUM_LUNAS">Belum Lunas (Pending)</option>
                          <option value="LUNAS">Lunas (Sudah Cair)</option>
                          <option value="BATAL">Batal / Ditolak Bank</option>
                        </select>
                      </td>
                      <td className="py-0.5 px-1">
                        <input
                          type="date"
                          value={currentDate}
                          disabled={currentStatus !== "LUNAS"}
                          onChange={(e) => handleDateChange(c.id, c, e.target.value)}
                          className="w-full h-5 px-1 py-0 border border-slate-300 rounded text-[11px] disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      {/* 4. FOOTER SUMMARY & ACTION BUTTONS matching Screenshot 8 */}
      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleBatchSave}
            disabled={updateCheckMutation.isPending || Object.keys(editingRows).length === 0}
            className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Simpan Perubahan Status BG/Cek"
          >
            <Save className="w-3 h-3" />
            <span>{updateCheckMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Cetak Laporan BG/Cek"
          >
            <Printer className="w-3 h-3 text-slate-600" />
            <span>Cetak</span>
          </button>
        </div>

        {/* Total (Pink Box on Right matching Screenshot 8) */}
        <div className="flex items-center gap-1">
          <label className="text-slate-700 font-bold text-[10px] whitespace-nowrap">
            Total :
          </label>
          <div className="w-36 h-6 px-2 bg-[#f5d0e3] border border-pink-300 rounded text-right font-mono font-extrabold text-xs text-slate-900 shadow-2xs flex items-center justify-end">
            {totalAmount.toLocaleString("id-ID", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CariSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(sup) => setSelectedSupplier(sup)}
        selectedId={selectedSupplier?.id}
      />
    </div>
  );
}
