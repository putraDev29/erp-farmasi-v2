"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  { step: 1, key: "DRAFT", label: "Pengajuan" },
  { step: 2, key: "VERIFIKASI_GUDANG", label: "Konfirmasi Gudang" },
  { step: 3, key: "DISETUJUI_ADMIN", label: "Persetujuan Admin" },
  { step: 4, key: "SELESAI", label: "Selesai" },
];

export const AlurVerifikasiReturPenjualanModal: React.FC<AlurVerifikasiReturPenjualanModalProps> = ({
  isOpen,
  onClose,
  returnId,
  isGudang,
  isAdmin,
}) => {
  const router = useRouter();
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
  const [shippingCourier, setShippingCourier] = useState("");
  const [shippingTrackingNo, setShippingTrackingNo] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Step 4 Settlement & Accounting States
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

  // Determine Current Stage (4 Stages: 1 Pengajuan, 2 Konfirmasi Gudang, 3 Persetujuan Admin, 4 Selesai)
  const currentStatus = ret?.status || "DRAFT";
  const isSelesai = currentStatus === "SELESAI" || currentStatus === "POSTED";
  const currentStep = isSelesai
    ? 4
    : currentStatus === "VERIFIKASI_GUDANG" || currentStatus === "BARANG_DITERIMA" || currentStatus === "DISETUJUI_ADMIN"
    ? 3
    : 2;
  const currentStageIndex = currentStep - 1;
  const canEditStep2 = isGudang && currentStep === 2;
  const canEditStep3 = isAdmin && !isGudang && currentStep === 3 && !isSelesai;
  const [viewedStep, setViewedStep] = useState<number>(currentStep);

  useEffect(() => {
    setViewedStep(currentStep);
  }, [ret?.id, currentStep, isOpen]);

  useEffect(() => {
    if (ret) {
      setWarehouseNotes(ret.warehouse_notes || "");
      setAdminNotes(ret.admin_notes || "");
      setShippingCourier(ret.shipping_courier || "");
      setShippingTrackingNo(ret.shipping_tracking_no || "");
      setShippingNotes(ret.shipping_notes || "");
    }
  }, [ret]);

  const deliveryMethod = ((ret?.delivery_method || "DIAMBIL") as string).toUpperCase();
  const isShippedReturn = deliveryMethod === "DIKIRIM";

  // 1. Warehouse Physical Check Confirmation (Gudang hanya mengecek & input komentar)
  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!returnId) throw new Error("ID Retur tidak valid");
      return await api.post(`/sales/returns/${returnId}/verify-warehouse`, {
        notes: warehouseNotes || "Pemeriksaan fisik barang obat retur selesai dan dikonfirmasi di gudang.",
      });
    },
    onSuccess: () => {
      alert("✅ Konfirmasi pemeriksaan fisik oleh Petugas Gudang berhasil disimpan!\nStatus diteruskan ke Admin / Apoteker untuk verifikasi item obat dan persetujuan.");
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 2. Admin Approve Mutation (Admin verifikasi item obat, restock otomatis & langsung SELESAI)
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!returnId) throw new Error("ID Retur tidak valid");
      if (isShippedReturn && !shippingTrackingNo.trim()) {
        throw new Error("Untuk retur melalui pengiriman, No. Resi / Surat Jalan Pengiriman wajib diisi.");
      }
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
          accepted_qty: Number(conf.accepted_qty) || 0,
          rejected_qty: Number(conf.rejected_qty) || 0,
        };
      });

      return await api.post(`/sales/returns/${returnId}/admin-approve`, {
        notes: adminNotes || "Disetujui oleh Admin / Apoteker.",
        shipping_courier: isShippedReturn ? shippingCourier : undefined,
        shipping_tracking_no: isShippedReturn ? shippingTrackingNo : undefined,
        shipping_notes: isShippedReturn ? shippingNotes : undefined,
        items: itemsPayload,
      });
    },
    onSuccess: () => {
      alert("✅ Retur penjualan telah disetujui Admin dan status langsung SELESAI!\nBarang kondisi BAIK otomatis direstock ke gudang dan masuk antrean penyelesaian di menu Bayar Piutang.");
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

  // 4. Finalize Mutation
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
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isShippedReturn
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  }`}
                >
                  {isShippedReturn ? "Melalui Pengiriman" : "Diambil Pelanggan Langsung"}
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

        {/* 4-STAGE VISUAL STEPPER (Teks di bawah ikon, klik 1-4) */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {STAGES.map((s, idx) => {
              const isPast = s.step < currentStep || (s.step === 4 && isSelesai);
              const isCurrent = s.step === currentStep && !(s.step === 4 && isSelesai);
              const isLocked = s.step > currentStep;
              const isViewing = viewedStep === s.step && activeTab === "action";
              const isRejected = currentStatus === "DITOLAK";

              return (
                <React.Fragment key={s.key}>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) return;
                      setViewedStep(s.step);
                      setActiveTab("action");
                    }}
                    className={`flex flex-col items-center gap-1.5 text-center px-2 py-0.5 rounded-lg transition shrink-0 ${
                      !isLocked ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed opacity-70"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-2xs ${
                        isViewing
                          ? isPast
                            ? "bg-emerald-600 text-white ring-4 ring-sky-300 scale-110"
                            : "bg-blue-600 text-white ring-4 ring-blue-200 scale-110"
                          : isPast
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-200"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 scale-105"
                          : isRejected && idx === 2
                          ? "bg-rose-500 text-white"
                          : "bg-slate-200 text-slate-400 border border-slate-300"
                      }`}
                    >
                      {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : s.step}
                    </div>
                    <span
                      className={`text-[11px] font-bold leading-tight whitespace-nowrap ${
                        isViewing
                          ? isPast
                            ? "text-emerald-900 underline decoration-sky-500 decoration-2 underline-offset-4"
                            : "text-blue-700 underline decoration-blue-500 decoration-2 underline-offset-4"
                          : isPast
                          ? "text-emerald-800"
                          : isCurrent
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>

                  {idx < STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 -mt-5 transition-colors ${
                        idx < currentStep - 1 || isSelesai
                          ? "bg-emerald-500"
                          : idx === currentStep - 1 && !isSelesai
                          ? "bg-blue-300"
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
            /* TAB 1: ACTION ACCORDING TO SELECTED STAGE (1-4 KLIK) */
            <div className="space-y-4">
              {/* TAHAP 1: PENGAJUAN RETUR */}
              {viewedStep === 1 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Tahap 1: Pengajuan Retur Penjualan ({ret?.return_mode || "MODE_1"})
                        </h4>
                        <p className="text-[10.5px] text-slate-500">
                          Dibuat pada {formatDate(ret?.date)} oleh{" "}
                          <strong className="text-slate-700">
                            {ret?.user?.full_name || ret?.user?.username || "Admin"}
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block">Pelanggan:</span>
                      <strong className="text-slate-800">{ret?.customer?.name || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Gudang Tujuan:</span>
                      <strong className="text-slate-800">{ret?.warehouse?.name || "Utama"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">No. Faktur Asal:</span>
                      <strong className="text-slate-800 font-mono">{ret?.sale?.invoice_no || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Metode Retur:</span>
                      <strong className="text-slate-800">
                        {isShippedReturn ? "Melalui Pengiriman" : "Diambil Pelanggan Langsung"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2: KONFIRMASI FISIK OLEH PETUGAS GUDANG */}
              {viewedStep === 2 && (
                <div className="bg-white p-4 rounded-xl border border-amber-300 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between border-b border-amber-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <Boxes className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          Tahap 2: Konfirmasi Pemeriksaan Fisik Gudang
                        </h4>
                        <p className="text-[10.5px] text-slate-500">
                          {isShippedReturn
                            ? "Barang retur diterima gudang melalui pengiriman/ekspedisi pelanggan."
                            : "Barang retur diserahkan/diambil pelanggan langsung di apotek."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!isGudang && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>Perhatian Hak Akses:</strong> Anda login sebagai Admin/Apoteker. Konfirmasi pemeriksaan fisik gudang wajib dilakukan oleh akun Petugas Gudang. Form dan tombol konfirmasi dinonaktifkan.
                      </span>
                    </div>
                  )}

                  {/* DAFTAR ITEM OBAT FISIK (READ ONLY - GUDANG HANYA MENGECEK) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Daftar Fisik Obat yang Diterima di Gudang (Hanya Pengecekan) :
                      </label>
                      <span className="text-[10px] text-slate-500 italic">
                        * Input kondisi &amp; verifikasi data dilakukan oleh Admin pada tahap selanjutnya
                      </span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-100 font-semibold text-slate-700">
                          <tr>
                            <th className="p-2 w-8 text-center border-r border-slate-200">No</th>
                            <th className="p-2 border-r border-slate-200">Nama Obat</th>
                            <th className="p-2 border-r border-slate-200">Batch &amp; ED Tertera</th>
                            <th className="p-2 border-r border-slate-200 text-right">Qty Retur</th>
                            <th className="p-2 border-r border-slate-200 text-right">Harga Satuan</th>
                            <th className="p-2 text-right">Sub Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ret?.items?.map((it: any, idx: number) => (
                            <tr key={it.id} className="hover:bg-slate-50">
                              <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-100">
                                {idx + 1}
                              </td>
                              <td className="p-2 font-medium text-slate-800 border-r border-slate-100">
                                {it.product?.name}
                              </td>
                              <td className="p-2 border-r border-slate-100 text-slate-600 font-mono text-[10.5px]">
                                {it.batch_number ? `Batch: ${it.batch_number}` : "-"}
                                {it.expired_date && ` (ED: ${formatDate(it.expired_date)})`}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                                {it.qty} {it.unit?.name || "PCS"}
                              </td>
                              <td className="p-2 text-right font-mono text-slate-600 border-r border-slate-100">
                                {formatCurrency(it.unit_price)}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(it.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* FIELD KOMENTAR GUDANG (HANYA SATU-SATUNYA INPUT) */}
                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200 space-y-1.5">
                    <label className="block text-[11px] font-bold text-amber-900">
                      Komentar / Catatan Pemeriksaan Gudang : <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      disabled={!canEditStep2}
                      value={warehouseNotes}
                      onChange={(e) => setWarehouseNotes(e.target.value)}
                      placeholder="Tuliskan komentar kondisi fisik barang di sini (misal: Barang fisik sudah diterima di gudang, kemasan utuh, segel botol tidak rusak, jumlah sesuai)..."
                      className="w-full p-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
                    />
                    <p className="text-[10px] text-slate-500">
                      Catatan ini akan langsung dibaca oleh Admin / Apoteker saat meneliti permohonan retur penjualan.
                    </p>
                  </div>

                  <div className="flex justify-end pt-1">
                    {currentStep > 2 ? (
                      <div className="px-4 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg flex items-center gap-2 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Konfirmasi pemeriksaan fisik gudang telah selesai</span>
                      </div>
                    ) : (
                    <button
                      type="button"
                      disabled={!canEditStep2 || verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate()}
                      className={`px-4 py-2 font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition active:scale-95 ${
                        canEditStep2 && !verifyMutation.isPending
                          ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>{verifyMutation.isPending ? "Mengonfirmasi..." : "Konfirmasi Gudang"}</span>
                    </button>
                    )}
                  </div>
                </div>
              )}

              {/* STAGE 3: PERSETUJUAN & VERIFIKASI ITEM OLEH ADMIN / APOTEKER */}
              {viewedStep === 3 && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Tahap 3: Persetujuan &amp; Input Verifikasi Item oleh Admin / Apoteker
                      </h4>
                      
                    </div>
                  </div>

                  {isGudang && !isAdmin && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-900 text-[11px] font-medium">
                      <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        <strong>Status Pemeriksaan Fisik Gudang Selesai:</strong> Menunggu keputusan persetujuan/penolakan dan verifikasi kelayakan obat oleh Admin / Apoteker Penanggung Jawab.
                      </span>
                    </div>
                  )}

                  {/* Box Ringkasan Komentar Cek Fisik Gudang */}
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>
                        Petugas Konfirmasi Gudang:{" "}
                        <strong className="text-slate-900">
                          {ret?.warehouse_verifier?.full_name || ret?.warehouse_verifier?.username || "Petugas Gudang"}
                        </strong>
                      </span>
                      <span className="text-slate-400 text-[10px]">{formatDate(ret?.warehouse_verified_at)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">Komentar / Catatan Gudang:</span>
                      <p className="text-slate-700 italic bg-white p-1.5 rounded border border-amber-100 mt-0.5">
                        "{ret?.warehouse_notes || "Barang fisik telah dicek & dikonfirmasi oleh petugas gudang."}"
                      </p>
                    </div>
                  </div>

                  {/* FORM INPUT ITEM OBAT OLEH ADMIN */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-800">
                      {isGudang && !isAdmin ? "Daftar Item Obat Retur yang Diverifikasi Admin :" : "Input Verifikasi Item Obat oleh Admin / Apoteker :"}
                    </label>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-100 font-semibold text-slate-700">
                          <tr>
                            <th className="p-2 border-r border-slate-200 min-w-[200px]">Nama Obat</th>
                            <th className="p-2 border-r border-slate-200 w-[220px] whitespace-nowrap">Batch &amp; Expired</th>
                            <th className="p-2 border-r border-slate-200 w-20 text-right whitespace-nowrap">Qty Retur</th>
                            <th className="p-2 border-r border-slate-200 w-24 text-center whitespace-nowrap">Qty Disetujui</th>
                            <th className="p-2 w-28 text-center whitespace-nowrap">Kondisi Fisik</th>
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
                                <td className="p-2 font-medium text-slate-800 border-r border-slate-100 min-w-[200px]">
                                  {it.product?.name}
                                </td>
                                <td className="p-2 border-r border-slate-100 w-[220px]">
                                  {isGudang && !isAdmin ? (
                                    <span className="font-mono text-[10.5px] text-slate-700">
                                      {conf.batch_number ? `Batch: ${conf.batch_number}` : "-"}
                                      {conf.expired_date && ` (ED: ${formatDate(conf.expired_date)})`}
                                    </span>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
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
                                  )}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100 w-20 whitespace-nowrap">
                                  {it.qty} {it.unit?.name || "PCS"}
                                </td>
                                <td className="p-2 border-r border-slate-100 text-center w-24">
                                  {isGudang && !isAdmin ? (
                                    <span className="font-mono font-bold text-slate-800">
                                      {conf.accepted_qty} {it.unit?.name || "PCS"}
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min={0}
                                      max={it.qty}
                                      step="any"
                                      value={conf.accepted_qty}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setItemConfirmations((prev) => ({
                                          ...prev,
                                          [it.id]: {
                                            ...conf,
                                            accepted_qty: val,
                                            rejected_qty: Math.max(0, it.qty - val),
                                          },
                                        }));
                                      }}
                                      className="w-16 h-6 px-1 border border-slate-300 rounded text-[11px] font-mono text-center font-bold bg-white"
                                    />
                                  )}
                                </td>
                                <td className="p-2 w-28 text-center">
                                  {isGudang && !isAdmin ? (
                                    <span
                                      className={`px-2 py-0.5 rounded font-semibold text-[10.5px] border ${
                                        conf.condition === "BAIK"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : conf.condition === "EXPIRED"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-rose-50 text-rose-700 border-rose-200"
                                      }`}
                                    >
                                      {conf.condition === "BAIK" ? "Baik" : conf.condition === "EXPIRED" ? "Expired" : "Rusak"}
                                    </span>
                                  ) : (
                                    <select
                                      value={conf.condition}
                                      onChange={(e) =>
                                        setItemConfirmations((prev) => ({
                                          ...prev,
                                          [it.id]: { ...conf, condition: e.target.value },
                                        }))
                                      }
                                      className={`w-full h-6 px-1.5 border rounded font-semibold text-[11px] bg-white cursor-pointer ${
                                        conf.condition === "BAIK"
                                          ? "text-emerald-700 border-emerald-300"
                                          : conf.condition === "EXPIRED"
                                          ? "text-amber-700 border-amber-300"
                                          : "text-rose-700 border-rose-300"
                                      }`}
                                    >
                                      <option value="BAIK">Baik</option>
                                      <option value="RUSAK">Rusak</option>
                                      <option value="EXPIRED">Expired</option>
                                    </select>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {isGudang && !isAdmin ? (
                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-600 text-center text-xs font-medium">
                      📋 Pemeriksaan fisik gudang telah selesai dicatat. Keputusan persetujuan dan kelayakan obat dilakukan oleh Admin / Apoteker.
                    </div>
                  ) : (
                    <>
                      {isShippedReturn ? (
                        <div className="bg-sky-50/70 p-3 rounded-lg border border-sky-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-900">
                            <Truck className="w-3.5 h-3.5 text-sky-600" />
                            <span>Informasi Dokumen Pengiriman Retur (Wajib jika Melalui Pengiriman) :</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              disabled={!canEditStep3}
                              value={shippingCourier}
                              onChange={(e) => setShippingCourier(e.target.value)}
                              placeholder="Kurir / Ekspedisi..."
                              className="h-7 px-2 border border-slate-300 rounded text-[11px] bg-white disabled:bg-slate-100"
                            />
                            <input
                              type="text"
                              disabled={!canEditStep3}
                              value={shippingTrackingNo}
                              onChange={(e) => setShippingTrackingNo(e.target.value)}
                              placeholder="No. Resi / Surat Jalan *"
                              className="h-7 px-2 border border-slate-300 rounded text-[11px] font-mono bg-white disabled:bg-slate-100"
                            />
                            <input
                              type="text"
                              disabled={!canEditStep3}
                              value={shippingNotes}
                              onChange={(e) => setShippingNotes(e.target.value)}
                              placeholder="Catatan pengiriman..."
                              className="h-7 px-2 border border-slate-300 rounded text-[11px] bg-white disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center gap-2">
                          <PackageCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <strong>Diambil Pelanggan Langsung:</strong> Serah terima barang retur dilakukan langsung dengan pelanggan di apotek (tanpa dokumen pengiriman).
                          </span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Catatan Keputusan Persetujuan Admin / Apoteker :
                        </label>
                        <textarea
                          rows={2}
                          disabled={!canEditStep3}
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

                      {isSelesai ? (
                        <div className="px-4 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg flex items-center gap-2 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Persetujuan Admin telah selesai &amp; stok telah direstock ke gudang</span>
                        </div>
                      ) : (
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRejectForm(!showRejectForm)}
                          className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Tolak Retur</span>
                        </button>

                        <button
                          type="button"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{approveMutation.isPending ? "Memproses..." : "Setujui & Selesaikan Retur (Admin)"}</span>
                        </button>
                      </div>
                      )}
                    </>
                  )}

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

              {/* STAGE 4: SELESAI & STATUS PENYELESAIAN KEUANGAN DI BAYAR PIUTANG */}
              {viewedStep === 4 && isSelesai && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-extrabold text-sm">
                        Retur Penjualan Selesai — Barang Sudah Direstock
                      </h4>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                        ret?.settlement_status === "SETTLED"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {ret?.settlement_status === "SETTLED"
                        ? "Keuangan Sudah Diselesaikan"
                        : "Menunggu Penyelesaian di Bayar Piutang"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Total Nilai Retur</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.total_amount || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Potongan Piutang Faktur</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.debt_deduction_amount || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Pengembalian Kas / Bank</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.refund_amount || 0)}
                      </p>
                    </div>
                  </div>

                  {ret?.settlement_status !== "SETTLED" ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-900">
                      <span>
                        Retur ini otomatis masuk ke menu <strong>Bayar Piutang</strong> untuk pelanggan{" "}
                        <strong>{ret?.customer?.name || "-"}</strong>. Pilih Potong Piutang atau Pengembalian Dana Kas di sana.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push("/sales/payments/new");
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Buka Menu Bayar Piutang →
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-800">
                      Penyelesaian keuangan ({ret?.settlement_type || "-"}) dan jurnal akuntansi telah tercatat secara seimbang.
                    </p>
                  )}
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
                            it.condition === "RUSAK"
                              ? "bg-rose-100 text-rose-700"
                              : it.condition === "EXPIRED"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {it.condition === "EXPIRED" ? "Expired" : it.condition === "RUSAK" ? "Rusak" : "Baik"}
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
