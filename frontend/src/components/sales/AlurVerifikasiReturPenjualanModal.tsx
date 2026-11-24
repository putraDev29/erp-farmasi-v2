"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  RotateCcw,
  Check,
  CheckCircle2,
  FileCheck2,
  Boxes,
  Truck,
  Building2,
  DollarSign,
  AlertTriangle,
  History,
  FileText,
  Printer,
  Ban,
  Wallet,
  Paperclip,
  PackageCheck,
  PackagePlus,
  ShieldAlert,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";
import SearchableAccountSelect from "@/components/common/SearchableAccountSelect";

interface AlurVerifikasiReturPenjualanModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnId: string | null;
  isGudang: boolean;
  isAdmin: boolean;
}

const STAGES = [
  { step: 1, key: "DRAFT", label: "1. Pengajuan", desc: "Draft Permohonan" },
  { step: 2, key: "VERIFIKASI_GUDANG", label: "2. Cek Fisik Gudang", desc: "Kondisi Baik/Rusak" },
  { step: 3, key: "DISETUJUI_ADMIN", label: "3. Persetujuan Admin", desc: "Approval Apoteker" },
  { step: 4, key: "BARANG_DITERIMA", label: "4. Restock Gudang", desc: "Stok Fisik Masuk" },
  { step: 5, key: "SELESAI", label: "5. Finalisasi Keuangan", desc: "Piutang / Kas & Jurnal" },
];

export const AlurVerifikasiReturPenjualanModal: React.FC<AlurVerifikasiReturPenjualanModalProps> = ({
  isOpen,
  onClose,
  returnId,
  isGudang,
  isAdmin,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"action" | "items" | "documents" | "history">("action");

  // Step 2 Gudang Verification States
  const [warehouseNotes, setWarehouseNotes] = useState("");
  const [itemConfirmations, setItemConfirmations] = useState<
    Record<
      string,
      {
        condition: string;
        batch_number: string;
        expired_date: string;
        accepted_qty: number;
        rejected_qty: number;
      }
    >
  >({});

  // Step 3 Admin Approval States
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Step 5 Settlement & Accounting States
  const [settlementType, setSettlementType] = useState<"POTONG_PIUTANG" | "KREDIT_PELANGGAN" | "KAS_PENGEMBALIAN">("POTONG_PIUTANG");
  const [cashAccountId, setCashAccountId] = useState("");
  const [finalizeNotes, setFinalizeNotes] = useState("");

  // Query Cash Accounts for Refund
  const { data: cashAccounts = [] } = useQuery({
    queryKey: ["cash-accounts-return"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      const list = res.data?.data || [];
      return list.filter((a: any) => a.type === "ASSET" && (a.category === "CASH" || a.category === "BANK" || a.code?.startsWith("1-1")));
    },
    enabled: isOpen,
  });

  // Query Sales Return Detail
  const {
    data: ret,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["sales-return-detail", returnId],
    queryFn: async () => {
      if (!returnId) return null;
      const res = await api.get(`/sales/returns/${returnId}`);
      return res.data?.data || null;
    },
    enabled: isOpen && !!returnId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
    queryClient.invalidateQueries({ queryKey: ["sales-return-detail", returnId] });
    queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    refetch();
  };

  // Determine Current Stage
  const currentStatus = ret?.status || "DRAFT";
  const getStageIndex = () => {
    switch (currentStatus) {
      case "DRAFT":
        return 0;
      case "VERIFIKASI_GUDANG":
        return 1;
      case "DISETUJUI_ADMIN":
        return 2;
      case "BARANG_DITERIMA":
        return 3;
      case "SELESAI":
      case "POSTED":
        return 4;
      case "DITOLAK":
        return 2;
      default:
        return 0;
    }
  };
  const currentStageIndex = getStageIndex();

  // 1. Warehouse Physical Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!returnId) throw new Error("ID Retur tidak valid");
      const itemsPayload = (ret?.items || []).map((it: any) => {
        const conf = itemConfirmations[it.id] || {
          condition: it.condition || "BAIK",
          batch_number: it.batch_number || "",
          expired_date: it.expired_date ? new Date(it.expired_date).toISOString().split("T")[0] : "",
          accepted_qty: it.qty,
          rejected_qty: 0,
        };
        return {
          id: it.id,
          condition: conf.condition,
          batch_number: conf.batch_number,
          expired_date: conf.expired_date ? new Date(conf.expired_date).toISOString() : null,
          accepted_qty: conf.accepted_qty,
          rejected_qty: conf.rejected_qty,
        };
      });

      return await api.post(`/sales/returns/${returnId}/verify-warehouse`, {
        notes: warehouseNotes || "Pemeriksaan fisik barang obat retur selesai.",
        items: itemsPayload,
      });
    },
    onSuccess: () => {
      alert("✅ Verifikasi fisik obat retur penjualan berhasil disimpan oleh Petugas Gudang!\nStatus diteruskan ke Admin untuk persetujuan.");
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 2. Admin Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!returnId) throw new Error("ID Retur tidak valid");
      return await api.post(`/sales/returns/${returnId}/admin-approve`, {
        notes: adminNotes || "Disetujui oleh Admin / Apoteker untuk diterima di gudang.",
      });
    },
    onSuccess: () => {
      alert("✅ Retur penjualan telah disetujui oleh Admin / Apoteker!\nPetugas Gudang dapat melanjutkan penerimaan fisik dan restock barang.");
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 3. Admin Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!returnId) throw new Error("ID Retur tidak valid");
      if (!rejectReason.trim()) throw new Error("Alasan penolakan wajib diisi");
      return await api.post(`/sales/returns/${returnId}/admin-reject`, {
        reason: rejectReason.trim(),
      });
    },
    onSuccess: () => {
      alert("⚠️ Pengajuan retur penjualan telah ditolak oleh Admin.");
      setShowRejectForm(false);
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 4. Warehouse Physical Restock Mutation
  const restockMutation = useMutation({
    mutationFn: async () => {
      if (!returnId) throw new Error("ID Retur tidak valid");
      return await api.post(`/sales/returns/${returnId}/restock`, {});
    },
    onSuccess: () => {
      alert("✅ Barang retur fisik telah diterima di gudang!\nStok obat layak jual otomatis ditambahkan kembali ke kartu stok.");
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 5. Finalize Mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!returnId) throw new Error("ID Retur tidak valid");
      return await api.post(`/sales/returns/${returnId}/finalize`, {
        settlement_type: settlementType,
        cash_account_id: cashAccountId || undefined,
        notes: finalizeNotes,
      });
    },
    onSuccess: (res: any) => {
      const d = res.data?.data;
      alert(
        `✅ Retur Penjualan Berhasil Difinalisasi (SELESAI)!\n\n` +
          `• Metode: ${d?.settlement_type}\n` +
          `• Potong Piutang: ${formatCurrency(d?.debt_deduction_amount || 0)}\n` +
          `• Kredit / Deposit Pelanggan: ${formatCurrency(d?.credit_balance_amount || 0)}\n` +
          `• Kas Refund: ${formatCurrency(d?.refund_amount || 0)}\n\n` +
          `Jurnal akuntansi otomatis telah terbentuk.`
      );
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
      {/* Container: Sized w-full max-w-4xl h-[92vh] max-h-[850px] */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden border border-slate-300 text-xs">
        {/* MODAL HEADER */}
        <div className="shrink-0 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-xs">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100">
                  Alur Verifikasi Retur Penjualan: <span className="font-mono text-teal-400">{ret?.return_no || "..."}</span>
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    currentStatus === "SELESAI" || currentStatus === "POSTED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : currentStatus === "DITOLAK"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : currentStatus === "BARANG_DITERIMA"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : currentStatus === "DISETUJUI_ADMIN"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : currentStatus === "VERIFIKASI_GUDANG"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-slate-700 text-slate-300 border border-slate-600"
                  }`}
                >
                  {currentStatus}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pelanggan: <strong className="text-slate-200">{ret?.customer?.name || "-"}</strong> • Gudang:{" "}
                <strong className="text-slate-200">{ret?.warehouse?.name || "Utama"}</strong> • Total:{" "}
                <strong className="text-teal-400 font-mono">{formatCurrency(ret?.total_amount || 0)}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="h-7 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Perbarui Data"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5-STAGE VISUAL STEPPER */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {STAGES.map((s, idx) => {
              const isPast = currentStageIndex > idx && currentStatus !== "DITOLAK";
              const isCurrent = currentStageIndex === idx && currentStatus !== "DITOLAK";
              const isRejected = currentStatus === "DITOLAK";

              return (
                <React.Fragment key={s.key}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isPast
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isCurrent
                          ? "bg-teal-600 text-white ring-4 ring-teal-100 shadow-xs scale-105"
                          : isRejected && idx === 2
                          ? "bg-rose-500 text-white"
                          : "bg-white border-2 border-slate-300 text-slate-400"
                      }`}
                    >
                      {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : s.step}
                    </div>
                    <div>
                      <span
                        className={`text-xs block font-bold leading-tight ${
                          isCurrent ? "text-teal-700" : isPast ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        {s.desc}
                      </span>
                    </div>
                  </div>

                  {idx < STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 transition-colors ${
                        idx < currentStageIndex
                          ? "bg-emerald-500"
                          : idx === currentStageIndex
                          ? "bg-teal-300"
                          : "bg-slate-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {currentStatus === "DITOLAK" && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 max-w-3xl mx-auto">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Retur Penjualan Ditolak:</strong> {ret?.reject_reason || "Tidak memenuhi syarat retur apotek."}
              </span>
            </div>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 text-xs font-semibold">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("action")}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === "action"
                  ? "border-teal-600 text-teal-700 font-bold bg-teal-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Eksekusi Tahapan Aktif</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === "items"
                  ? "border-teal-600 text-teal-700 font-bold bg-teal-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Rincian Item Obat ({ret?.items?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === "documents"
                  ? "border-teal-600 text-teal-700 font-bold bg-teal-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>Dokumen Lampiran Pelanggan &amp; Retur</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === "history"
                  ? "border-teal-600 text-teal-700 font-bold bg-teal-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat Status &amp; Audit Log ({ret?.status_logs?.length || 0})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            {isGudang ? (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                📦 Gudang
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-300">
                🛡️ Admin / Apoteker
              </span>
            )}
          </div>
        </div>

        {/* TAB BODY (SCROLLABLE AREA) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50/50 space-y-4 text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              Memuat data verifikasi retur penjualan...
            </div>
          ) : activeTab === "action" ? (
            /* TAB 1: ACTION ACCORDING TO ACTIVE STAGE (HANYA TAHAPAN SAAT ITU YANG MUNCUL) */
            <div className="space-y-4">
              {/* STAGE 2: VERIFIKASI FISIK OLEH PETUGAS GUDANG (Muncul HANYA jika DRAFT) */}
              {currentStatus === "DRAFT" && (
                <div className="bg-white p-4 rounded-xl border border-amber-300 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between border-b border-amber-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <Boxes className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          Tahap 2: Verifikasi Fisik oleh Petugas Gudang
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Petugas gudang memeriksa kondisi kemasan fisik obat, keutuhan segel, nomor batch, dan expired date obat.
                        </p>
                      </div>
                    </div>
                  </div>

                  {!isGudang && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>Perhatian Hak Akses:</strong> Anda login sebagai Admin/Apoteker. Pemeriksaan fisik barang retur wajib dilakukan oleh akun Petugas Gudang. Form dan tombol simpan dinonaktifkan.
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Pemeriksaan Fisik Tiap Item Obat yang Dikembalikan :
                    </label>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-100 font-semibold text-slate-700">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Nama Obat</th>
                            <th className="p-2 border-r border-slate-200">Batch &amp; Expired</th>
                            <th className="p-2 border-r border-slate-200 text-right">Qty Retur</th>
                            <th className="p-2">Kondisi Fisik Obat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ret?.items?.map((it: any) => {
                            const conf = itemConfirmations[it.id] || {
                              condition: it.condition || "BAIK",
                              batch_number: it.batch_number || "",
                              expired_date: it.expired_date ? new Date(it.expired_date).toISOString().split("T")[0] : "",
                              accepted_qty: it.qty,
                              rejected_qty: 0,
                            };
                            return (
                              <tr key={it.id} className="hover:bg-slate-50">
                                <td className="p-2 font-medium text-slate-800 border-r border-slate-100">
                                  {it.product?.name}
                                </td>
                                <td className="p-2 border-r border-slate-100">
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      disabled={!isGudang}
                                      value={conf.batch_number}
                                      placeholder="Batch..."
                                      onChange={(e) =>
                                        setItemConfirmations((prev) => ({
                                          ...prev,
                                          [it.id]: { ...conf, batch_number: e.target.value },
                                        }))
                                      }
                                      className="w-24 h-6 px-1 border border-slate-300 rounded text-[10px] font-mono bg-white"
                                    />
                                    <input
                                      type="date"
                                      disabled={!isGudang}
                                      value={conf.expired_date}
                                      onChange={(e) =>
                                        setItemConfirmations((prev) => ({
                                          ...prev,
                                          [it.id]: { ...conf, expired_date: e.target.value },
                                        }))
                                      }
                                      className="w-28 h-6 px-1 border border-slate-300 rounded text-[10px] bg-white"
                                    />
                                  </div>
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                                  {it.qty} {it.unit?.name || "PCS"}
                                </td>
                                <td className="p-2">
                                  <select
                                    disabled={!isGudang}
                                    value={conf.condition}
                                    onChange={(e) =>
                                      setItemConfirmations((prev) => ({
                                        ...prev,
                                        [it.id]: { ...conf, condition: e.target.value },
                                      }))
                                    }
                                    className={`h-6 px-1.5 border rounded font-semibold text-[11px] bg-white ${
                                      conf.condition === "BAIK"
                                        ? "text-emerald-700 border-emerald-300"
                                        : "text-rose-700 border-rose-300"
                                    }`}
                                  >
                                    <option value="BAIK">✅ BAIK (Segel Utuh / Layak Jual)</option>
                                    <option value="RUSAK">⚠️ RUSAK / CACAT / KEDALUWARSA (Karantina)</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Catatan Fisik Gudang :
                    </label>
                    <input
                      type="text"
                      disabled={!isGudang}
                      value={warehouseNotes}
                      onChange={(e) => setWarehouseNotes(e.target.value)}
                      placeholder="Kemasan botol utuh, segel tutup aman, blister tidak robek..."
                      className="w-full h-8 px-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={!isGudang || verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate()}
                      className={`px-4 py-2 font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition active:scale-95 ${
                        isGudang && !verifyMutation.isPending
                          ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>{verifyMutation.isPending ? "Menyimpan..." : "Simpan Hasil Verifikasi Fisik Gudang"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 3: PERSETUJUAN ADMIN / APOTEKER (Muncul HANYA jika VERIFIKASI_GUDANG) */}
              {currentStatus === "VERIFIKASI_GUDANG" && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Tahap 3: Persetujuan / Penolakan oleh Admin / Apoteker
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Admin / Apoteker meneliti dokumen permohonan retur, riwayat pembelian pelanggan, dan hasil cek fisik gudang.
                      </p>
                    </div>
                  </div>

                  {isGudang && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>Perhatian Hak Akses:</strong> Anda login sebagai Petugas Gudang. Keputusan persetujuan / penolakan retur penjualan dilakukan oleh Admin / Apoteker Penanggung Jawab.
                      </span>
                    </div>
                  )}

                  {/* Summary Hasil Cek Fisik Gudang Sebelumnya */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>
                        Petugas Pemeriksa Fisik:{" "}
                        <strong className="text-slate-900">
                          {ret?.warehouse_verifier?.full_name || ret?.warehouse_verifier?.username || "Petugas Gudang"}
                        </strong>
                      </span>
                      <span className="text-slate-400 text-[10px]">{formatDate(ret?.warehouse_verified_at)}</span>
                    </div>
                    {ret?.warehouse_notes && <p className="text-slate-600 italic">"{ret.warehouse_notes}"</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Catatan Keputusan Persetujuan Admin / Apoteker :
                    </label>
                    <textarea
                      rows={2}
                      disabled={isGudang || !isAdmin}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Disetujui retur obat karena keluhan pelanggan valid dan masa retur masih berlaku..."
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>

                  {/* Upload Dokumen Pendukung Persetujuan Admin */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <strong className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upload Berkas Permohonan Retur Pelanggan / Form Disposisi :</span>
                      </strong>
                      <span className="text-[10px] text-slate-500">Scan nota retur pelanggan, disposisi apoteker</span>
                    </div>
                    <PbfDocumentUpload
                      entityType="sales_return"
                      entityId={ret?.id || ""}
                      title={`Dokumen Persetujuan Retur (${ret?.return_no || "Retur"})`}
                      subtitle="Upload scan permohonan retur resmi pelanggan, surat keluhan, atau berita acara serah terima"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={isGudang || !isAdmin}
                      onClick={() => setShowRejectForm(!showRejectForm)}
                      className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Tolak Retur</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGudang || !isAdmin || approveMutation.isPending}
                      onClick={() => approveMutation.mutate()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{approveMutation.isPending ? "Memproses..." : "Setujui Retur (Admin)"}</span>
                    </button>
                  </div>

                  {showRejectForm && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2 mt-2">
                      <label className="block text-[11px] font-bold text-rose-800">
                        Alasan Penolakan Retur (Wajib Diisi):
                      </label>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Contoh: Kemasan obat telah dibuka/rusak oleh pelanggan atau batas tempo retur telah kedaluwarsa..."
                        className="w-full h-8 px-2 border border-rose-300 rounded text-xs bg-white focus:outline-none focus:border-rose-600"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRejectForm(false)}
                          className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded text-xs font-semibold"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate()}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold"
                        >
                          {rejectMutation.isPending ? "Menolak..." : "Konfirmasi Tolak Retur"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 4: RESTOCK PERSADAAN GUDANG (Muncul HANYA jika DISETUJUI_ADMIN) */}
              {currentStatus === "DISETUJUI_ADMIN" && (
                <div className="bg-white p-4 rounded-xl border border-teal-300 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-teal-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                      <PackagePlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Tahap 4: Penerimaan Fisik Barang &amp; Restock Persediaan Gudang
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Petugas Gudang menerima fisik obat yang disetujui. Barang yang berkondisi BAIK otomatis dimasukkan kembali ke stok apotek.
                      </p>
                    </div>
                  </div>

                  {!isGudang && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>Perhatian Hak Akses:</strong> Anda login sebagai Admin/Apoteker. Penerimaan barang fisik dan penambahan stok gudang wajib dilakukan oleh Petugas Gudang (Logistik).
                      </span>
                    </div>
                  )}

                  <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 text-xs space-y-1">
                    <strong className="block font-bold">Aturan Mutasi Stok Retur Penjualan:</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-teal-800">
                      <li>Obat dengan kondisi <strong>BAIK</strong> akan otomatis menambah saldo stok tersedia pada batch dan expired date terkait.</li>
                      <li>Obat dengan kondisi <strong>RUSAK / CACAT</strong> tidak akan masuk ke stok layak jual (dicatat dalam log karantina).</li>
                    </ul>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={!isGudang || restockMutation.isPending}
                      onClick={() => restockMutation.mutate()}
                      className={`px-5 py-2.5 font-bold rounded-lg flex items-center gap-2 shadow-sm transition active:scale-95 ${
                        isGudang && !restockMutation.isPending
                          ? "bg-teal-600 hover:bg-teal-700 text-white cursor-pointer ring-2 ring-teal-300"
                          : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>{restockMutation.isPending ? "Memproses Restock..." : "Terima Barang Fisik & Restock ke Gudang"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 5: FINALISASI & PENYELESAIAN KEUANGAN (Muncul HANYA jika BARANG_DITERIMA) */}
              {currentStatus === "BARANG_DITERIMA" && (
                <div className="bg-white p-4 rounded-xl border border-emerald-300 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Tahap 5: Finalisasi Retur Penjualan &amp; Penyesuaian Piutang / Kas (Akuntansi)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Selesaikan transaksi retur dan pilih metode penyelesaian keuangan pelanggan serta pencatatan jurnal otomatis.
                      </p>
                    </div>
                  </div>

                  {/* Summary Nilai Retur */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-600 block">Total Nilai Retur Penjualan:</span>
                      <strong className="text-base font-extrabold text-emerald-700 font-mono">
                        {formatCurrency(ret?.total_amount || 0)}
                      </strong>
                    </div>
                    <div className="text-right text-[10.5px] text-slate-500">
                      <div>Pelanggan: <strong className="text-slate-800">{ret?.customer?.name || "-"}</strong></div>
                      <div>Faktur Asal: <strong className="text-slate-800 font-mono">{ret?.sale?.invoice_no || "-"}</strong></div>
                    </div>
                  </div>

                  {/* Settlement Selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Pilih Mekanisme Penyelesaian Keuangan Pelanggan :
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label
                        className={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1 transition ${
                          settlementType === "POTONG_PIUTANG"
                            ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="radio"
                            name="sales_settlement"
                            value="POTONG_PIUTANG"
                            checked={settlementType === "POTONG_PIUTANG"}
                            onChange={() => setSettlementType("POTONG_PIUTANG")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <Wallet className="w-4 h-4 text-emerald-600" />
                        </div>
                        <strong className="text-xs text-slate-800">Potong Sisa Piutang</strong>
                        <span className="text-[10px] text-slate-500">
                          Mengurangi sisa tagihan piutang pada faktur penjualan asal (bila tempo).
                        </span>
                      </label>

                      <label
                        className={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1 transition ${
                          settlementType === "KREDIT_PELANGGAN"
                            ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="radio"
                            name="sales_settlement"
                            value="KREDIT_PELANGGAN"
                            checked={settlementType === "KREDIT_PELANGGAN"}
                            onChange={() => setSettlementType("KREDIT_PELANGGAN")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <strong className="text-xs text-slate-800">Saldo Deposit Pelanggan</strong>
                        <span className="text-[10px] text-slate-500">
                          Disimpan sebagai saldo kredit / deposit pelanggan untuk pembelian mendatang.
                        </span>
                      </label>

                      <label
                        className={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1 transition ${
                          settlementType === "KAS_PENGEMBALIAN"
                            ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="radio"
                            name="sales_settlement"
                            value="KAS_PENGEMBALIAN"
                            checked={settlementType === "KAS_PENGEMBALIAN"}
                            onChange={() => setSettlementType("KAS_PENGEMBALIAN")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <DollarSign className="w-4 h-4 text-amber-600" />
                        </div>
                        <strong className="text-xs text-slate-800">Refund Kas / Bank</strong>
                        <span className="text-[10px] text-slate-500">
                          Uang dikembalikan tunai ke pelanggan atau transfer bank.
                        </span>
                      </label>
                    </div>

                    {settlementType === "KAS_PENGEMBALIAN" && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                        <label className="block text-[11px] font-bold text-amber-900">
                          Pilih Akun Kas / Bank Sumber Dana Pengembalian :
                        </label>
                        <SearchableAccountSelect
                          accounts={cashAccounts}
                          value={cashAccountId}
                          onChange={(val) => setCashAccountId(val)}
                          placeholder="-- Kas Kasir Default (1-1110) --"
                        />
                      </div>
                    )}
                  </div>

                  {/* Preview Jurnal Akuntansi */}
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600 text-[10.5px] space-y-1">
                    <strong className="block text-slate-800 font-bold">
                      Pratinjau Jurnal Otomatis yang Terbentuk:
                    </strong>
                    <div className="font-mono text-[10px] space-y-0.5">
                      <div className="text-slate-800">[Debit] 4-1000 Retur Penjualan : {formatCurrency(ret?.total_amount || 0)}</div>
                      {settlementType === "POTONG_PIUTANG" && (
                        <div className="text-slate-600 pl-4">[Kredit] 1-1200 Piutang Usaha</div>
                      )}
                      {settlementType === "KREDIT_PELANGGAN" && (
                        <div className="text-slate-600 pl-4">[Kredit] 2-1200 Saldo Deposit / Kredit Pelanggan</div>
                      )}
                      {settlementType === "KAS_PENGEMBALIAN" && (
                        <div className="text-slate-600 pl-4">[Kredit] Kas / Bank Masuk Keluar</div>
                      )}
                      <div className="text-slate-800 pt-1">[Debit] 1-1300 Persediaan Obat (Restock Barang Baik)</div>
                      <div className="text-slate-600 pl-4">[Kredit] 5-1000 Harga Pokok Penjualan (HPP)</div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={finalizeMutation.isPending}
                      onClick={() => finalizeMutation.mutate()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{finalizeMutation.isPending ? "Memproses Finalisasi..." : "Finalisasi Retur Penjualan (SELESAI)"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* FINISHED STATE BANNER */}
              {(currentStatus === "SELESAI" || currentStatus === "POSTED") && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-extrabold text-sm">
                      Retur Penjualan Ini Telah Selesai Difinalisasi
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Potongan Piutang Faktur</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.debt_deduction_amount || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Saldo Kredit Deposit Pelanggan</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.credit_balance_amount || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Pengembalian Kas / Bank Refund</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.refund_amount || 0)}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Barang fisik telah direstock ke gudang dan jurnal akuntansi telah dibukukan secara seimbang.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === "documents" ? (
            /* TAB: DOKUMEN LAMPIRAN */
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <PbfDocumentUpload
                  entityType="sales_return"
                  entityId={ret?.id || ""}
                  title={`Lampiran Dokumen Retur Penjualan: ${ret?.return_no || "Retur"}`}
                  subtitle=""
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Informasi Dokumen Retur Penjualan: {ret?.return_no}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Dokumen Retur</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">No. Retur:</span>
                    <strong className="text-slate-800 font-mono">{ret?.return_no}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">No. Faktur Asal:</span>
                    <strong className="text-slate-800 font-mono">{ret?.sale?.invoice_no || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Pelanggan:</span>
                    <strong className="text-slate-800">{ret?.customer?.name || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Status Terakhir:</span>
                    <span className="font-bold text-teal-700">{ret?.status || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "items" ? (
            /* TAB 2: ITEMS LIST */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-center w-10">No</th>
                    <th className="p-2.5">Produk Obat</th>
                    <th className="p-2.5">Batch &amp; Expired</th>
                    <th className="p-2.5 text-center">Kondisi</th>
                    <th className="p-2.5 text-right">Qty Retur</th>
                    <th className="p-2.5 text-right">Harga</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(ret?.items || []).map((it: any, idx: number) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-slate-800">{it.product?.name}</td>
                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                        {it.batch_number ? `Batch: ${it.batch_number}` : "-"}
                        {it.expired_date && ` (ED: ${formatDate(it.expired_date)})`}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            it.condition === "RUSAK" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {it.condition || "BAIK"}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {it.qty} {it.unit?.name || "PCS"}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700">{formatCurrency(it.unit_price)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(it.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* TAB 4: AUDIT LOGS */
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
              <h4 className="font-bold text-xs text-slate-900 border-b pb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-600" />
                <span>Riwayat Status &amp; Jejak Audit Retur Penjualan</span>
              </h4>
              <div className="space-y-2">
                {(ret?.status_logs || []).map((log: any, idx: number) => (
                  <div key={log.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between">
                    <div>
                      <strong className="text-slate-800 block">{log.action || log.status}</strong>
                      <span className="text-slate-600">{log.notes || "-"}</span>
                      <span className="text-slate-400 block text-[10px] mt-0.5">Oleh: {log.user?.full_name || log.user?.username || "Sistem"}</span>
                    </div>
                    <span className="text-slate-400 text-[10px] font-mono">{formatDate(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="shrink-0 px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Alur Retur Penjualan Farmasi Standar BPOM / CDOB • PT Farmasi Medika Nusantara
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs cursor-pointer shadow-2xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
export default AlurVerifikasiReturPenjualanModal;
