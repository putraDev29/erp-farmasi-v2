"use client";

import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  Check,
  Building2,
  FileCheck2,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  History,
  PackageCheck,
  RotateCcw,
  UserCheck,
  Send,
  Boxes,
  Ban,
  Wallet,
  Paperclip,
  FileText,
  Printer,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";
import SearchableAccountSelect from "@/components/common/SearchableAccountSelect";

interface AlurVerifikasiReturModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnId: string | null;
  onSuccess?: () => void;
}

const STAGES = [
  { key: "DRAFT", label: "Draft", step: 1, desc: "Pengajuan oleh Admin" },
  { key: "VERIFIKASI_GUDANG", label: "Verifikasi Gudang", step: 2, desc: "Pemeriksaan fisik obat & bets" },
  { key: "DISETUJUI_ADMIN", label: "Persetujuan Admin", step: 3, desc: "Approval & validasi manajerial" },
  { key: "DALAM_PENGIRIMAN", label: "Dalam Pengiriman", step: 4, desc: "Obat dikirim ke PBF (Stok berkurang)" },
  { key: "MENUNGGU_KONFIRMASI_PBF", label: "Konfirmasi PBF", step: 5, desc: "Pencatatan nota retur diterima PBF" },
  { key: "SELESAI", label: "Selesai", step: 6, desc: "Finalisasi hutang, kas & jurnal" },
];

export const AlurVerifikasiReturModal: React.FC<AlurVerifikasiReturModalProps> = ({
  isOpen,
  onClose,
  returnId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"action" | "items" | "documents" | "history">("action");

  // Local Form States for specific stages
  const [warehouseNotes, setWarehouseNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Shipping inputs
  const [shippingCourier, setShippingCourier] = useState("Kurir Distributor PBF");
  const [shippingTrackingNo, setShippingTrackingNo] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");

  // PBF Confirm inputs
  const [pbfReturnDocNo, setPbfReturnDocNo] = useState("");
  const [pbfNotes, setPbfNotes] = useState("");
  const [itemConfirmations, setItemConfirmations] = useState<{
    [itemId: string]: { accepted_qty: number; rejected_qty: number; condition: string };
  }>({});

  // Finalize settlement inputs
  const [settlementType, setSettlementType] = useState<"POTONG_HUTANG" | "KREDIT_SUPPLIER" | "KAS_PENGEMBALIAN">("POTONG_HUTANG");
  const [cashAccountId, setCashAccountId] = useState("");

  // Fetch Full Purchase Return Data
  const { data: ret, isLoading, refetch } = useQuery({
    queryKey: ["purchase-return-detail", returnId],
    queryFn: async () => {
      if (!returnId) return null;
      const res = await api.get(`/purchases/returns/${returnId}`);
      return res.data?.data;
    },
    enabled: isOpen && !!returnId,
  });

  // Fetch Cash/Bank Accounts for Settlement
  const { data: cashAccounts = [] } = useQuery({
    queryKey: ["accounting-cash-accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      const list = res.data?.data || [];
      return list.filter(
        (a: any) => !a.is_header && (a.subtype === "CASH_BANK" || (a.code && a.code.startsWith("1-11")))
      );
    },
    enabled: isOpen,
  });

  // Initialize confirmations when ret loads
  React.useEffect(() => {
    if (ret?.items) {
      const initial: any = {};
      ret.items.forEach((it: any) => {
        initial[it.id] = {
          accepted_qty: it.accepted_qty !== undefined && it.accepted_qty !== null ? it.accepted_qty : it.qty,
          rejected_qty: it.rejected_qty !== undefined && it.rejected_qty !== null ? it.rejected_qty : 0,
          condition: it.item_condition || "BAIK",
        };
      });
      setItemConfirmations(initial);
      if (ret.shipping_courier) setShippingCourier(ret.shipping_courier);
      if (ret.shipping_tracking_no) setShippingTrackingNo(ret.shipping_tracking_no);
      if (ret.pbf_return_doc_no) setPbfReturnDocNo(ret.pbf_return_doc_no);
      if (ret.settlement_type) setSettlementType(ret.settlement_type);
      if (ret.cash_account_id) setCashAccountId(ret.cash_account_id);
    }
  }, [ret]);

  // Stage Index Calculator
  const currentStatus = ret?.status || "DRAFT";
  const getStageIndex = (status: string) => {
    if (status === "POSTED" || status === "SELESAI") return 5;
    if (status === "MENUNGGU_KONFIRMASI_PBF") return 4;
    if (status === "DALAM_PENGIRIMAN") return 3;
    if (status === "DISETUJUI_ADMIN") return 2;
    if (status === "VERIFIKASI_GUDANG") return 1;
    if (status === "DITOLAK") return -1;
    return 0; // DRAFT
  };
  const currentStageIndex = getStageIndex(currentStatus);

  // Helper Mutation Handlers
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-return-detail", returnId] });
    queryClient.invalidateQueries({ queryKey: ["purchases"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    refetch();
    if (onSuccess) onSuccess();
  };

  // 1. Warehouse Verify Mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const itemsPayload = (ret?.items || []).map((it: any) => {
        const conf: any = itemConfirmations[it.id] || {};
        return {
          id: it.id,
          batch_number: it.batch_number || "",
          expired_date: it.expired_date || null,
          item_condition: conf.condition || it.item_condition || "BAIK",
          notes: warehouseNotes || "Pemeriksaan fisik sesuai standar CDOB",
        };
      });
      return await api.post(`/purchases/returns/${returnId}/warehouse-verify`, {
        notes: warehouseNotes || "Pemeriksaan fisik gudang selesai",
        items: itemsPayload,
      });
    },
    onSuccess: () => {
      alert("Pemeriksaan fisik gudang berhasil dicatat! Status berubah ke VERIFIKASI_GUDANG.");
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 2. Admin Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/purchases/returns/${returnId}/admin-approve`, {
        notes: adminNotes || "Retur disetujui untuk dikirim ke supplier PBF",
      });
    },
    onSuccess: () => {
      alert("Retur berhasil disetujui Admin! Silakan siapkan pengiriman barang ke PBF.");
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectReason.trim()) throw new Error("Alasan penolakan wajib diisi.");
      return await api.post(`/purchases/returns/${returnId}/reject`, {
        reason: rejectReason,
      });
    },
    onSuccess: () => {
      alert("Retur telah ditolak.");
      setShowRejectForm(false);
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 3. Ship to PBF Mutation (Stok berkurang)
  const shipMutation = useMutation({
    mutationFn: async () => {
      if (!shippingCourier.trim()) throw new Error("Nama kurir/ekspedisi wajib diisi.");
      return await api.post(`/purchases/returns/${returnId}/ship`, {
        courier: shippingCourier,
        tracking_no: shippingTrackingNo,
        notes: shippingNotes || "Barang fisik diserahkan ke kurir/ekspedisi untuk dikembalikan ke PBF",
      });
    },
    onSuccess: () => {
      alert("Barang retur telah dikirim ke PBF! Stok obat otomatis dikurangkan dari gudang.");
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 4. PBF Confirm Mutation
  const pbfConfirmMutation = useMutation({
    mutationFn: async () => {
      const itemsPayload = (ret?.items || []).map((it: any) => {
        const conf = itemConfirmations[it.id] || { accepted_qty: it.qty, rejected_qty: 0 };
        return {
          id: it.id,
          accepted_qty: Number(conf.accepted_qty) || 0,
          rejected_qty: Number(conf.rejected_qty) || 0,
        };
      });
      return await api.post(`/purchases/returns/${returnId}/pbf-confirm`, {
        pbf_return_doc_no: pbfReturnDocNo,
        notes: pbfNotes,
        items: itemsPayload,
      });
    },
    onSuccess: () => {
      alert("Konfirmasi penerimaan PBF berhasil dicatat! Status: MENUNGGU_KONFIRMASI_PBF.");
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  // 5. Finalize Mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (settlementType === "KAS_PENGEMBALIAN" && !cashAccountId) {
        throw new Error("Pilih Akun Kas/Bank penampung pengembalian dana dari PBF.");
      }
      return await api.post(`/purchases/returns/${returnId}/finalize`, {
        settlement_type: settlementType,
        cash_account_id: settlementType === "KAS_PENGEMBALIAN" ? cashAccountId : undefined,
      });
    },
    onSuccess: (res: any) => {
      const d = res.data?.data;
      alert(
        `Retur Berhasil Difinalisasi (SELESAI)!\n` +
        `• Potong Hutang: ${formatCurrency(d?.debt_deduction_amount || 0)}\n` +
        `• Kredit Supplier: ${formatCurrency(d?.credit_balance_amount || 0)}\n` +
        `• Kas Refund: ${formatCurrency(d?.refund_amount || 0)}\n` +
        `Jurnal akuntansi otomatis telah terbentuk.`
      );
      invalidateAll();
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden border border-slate-300">
        {/* MODAL HEADER */}
        <div className="shrink-0 bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold shadow-xs">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100">
                  Alur Verifikasi Retur Pembelian: {ret?.return_no || "..."}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    currentStatus === "SELESAI" || currentStatus === "POSTED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : currentStatus === "DITOLAK"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : currentStatus === "DALAM_PENGIRIMAN"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : currentStatus === "MENUNGGU_KONFIRMASI_PBF"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
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
                Supplier: <strong className="text-slate-200">{ret?.supplier?.name || "-"}</strong> • Gudang:{" "}
                <strong className="text-slate-200">{ret?.warehouse?.name || "Utama"}</strong> • Total:{" "}
                <strong className="text-rose-300 font-mono">{formatCurrency(ret?.total_amount || 0)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6-STAGE VISUAL STEPPER */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center justify-between">
            {STAGES.map((s, idx) => {
              const isPast = currentStageIndex > idx && currentStatus !== "DITOLAK";
              const isCurrent = currentStageIndex === idx && currentStatus !== "DITOLAK";
              const isRejected = currentStatus === "DITOLAK";

              return (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center relative group">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isPast
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isCurrent
                          ? "bg-rose-600 text-white ring-4 ring-rose-100 shadow-xs animate-pulse"
                          : isRejected && idx === 2
                          ? "bg-rose-500 text-white"
                          : "bg-white border-2 border-slate-300 text-slate-400"
                      }`}
                    >
                      {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                    </div>
                    <span
                      className={`text-[10px] font-semibold mt-1 tracking-tight text-center ${
                        isCurrent
                          ? "text-rose-700 font-bold"
                          : isPast
                          ? "text-emerald-700 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded ${
                        isPast ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {currentStatus === "DITOLAK" && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Retur Ditolak oleh Admin:</strong> {ret?.reject_reason || "Tidak memenuhi syarat retur."}
              </span>
            </div>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div className="shrink-0 flex items-center border-b border-slate-200 bg-white px-4 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("action")}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "action"
                ? "border-rose-600 text-rose-700"
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
                ? "border-rose-600 text-rose-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Rincian Item Retur ({ret?.items?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "documents"
                ? "border-rose-600 text-rose-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Dokumen Lampiran PBF &amp; Retur</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "history"
                ? "border-rose-600 text-rose-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Status &amp; Audit Log ({ret?.status_logs?.length || 0})</span>
          </button>
        </div>

        {/* TAB BODY (SCROLLABLE) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50/50 space-y-4 text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              Memuat data verifikasi retur...
            </div>
          ) : activeTab === "action" ? (
            /* TAB 1: ACTION ACCORDING TO STAGE */
            <div className="space-y-4">
              {/* STAGE 1 / 2: WAREHOUSE VERIFICATION */}
              {currentStatus === "DRAFT" && (
                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-3">
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
                          Periksa fisik obat, nomor batch, tanggal kadaluarsa, dan kemasan sebelum diserahkan ke Admin.
                        </p>
                      </div>
                    </div>
                    {ret?.warehouse_verified_at && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        Telah Diverifikasi ({formatDate(ret.warehouse_verified_at)})
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Pemeriksaan Fisik Tiap Item :
                    </label>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-100 font-semibold text-slate-700">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Nama Produk</th>
                            <th className="p-2 border-r border-slate-200">Batch & Expired</th>
                            <th className="p-2 border-r border-slate-200 text-right">Qty Retur</th>
                            <th className="p-2">Kondisi Fisik Obat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ret?.items?.map((it: any) => {
                            const conf = itemConfirmations[it.id] || { condition: "BAIK" };
                            return (
                              <tr key={it.id}>
                                <td className="p-2 font-medium text-slate-800 border-r border-slate-100">
                                  {it.product?.name} ({it.product?.code})
                                </td>
                                <td className="p-2 font-mono text-slate-600 border-r border-slate-100">
                                  {it.batch_number || "NO-BATCH"} • {formatDate(it.expired_date)}
                                </td>
                                <td className="p-2 text-right font-bold text-rose-700 border-r border-slate-100">
                                  {it.qty} {it.unit?.name || "PCS"}
                                </td>
                                <td className="p-2">
                                  <select
                                    value={conf.condition}
                                    onChange={(e) =>
                                      setItemConfirmations((prev) => ({
                                        ...prev,
                                        [it.id]: { ...conf, condition: e.target.value },
                                      }))
                                    }
                                    className="h-6 px-2 border border-slate-300 rounded text-[11px] bg-white font-medium"
                                  >
                                    <option value="BAIK">Kondisi Baik / Utuh</option>
                                    <option value="RUSAK">Kemasan / Fisik Rusak</option>
                                    <option value="KEDALUWARSA">Kadaluarsa (ED Dekat/Lewat)</option>
                                    <option value="TIDAK_SESUAI_SP">Tidak Sesuai Pesanan/SP</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Catatan Pemeriksaan Fisik Gudang :
                      </label>
                      <textarea
                        rows={2}
                        value={warehouseNotes}
                        onChange={(e) => setWarehouseNotes(e.target.value)}
                        placeholder="Contoh: Seluruh fisik obat telah dicek, kemasan utuh, batch dan ED sesuai fisik."
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate()}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-2xs"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{verifyMutation.isPending ? "Menyimpan..." : "Simpan Hasil Verifikasi Gudang"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 3: ADMIN APPROVAL */}
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
                        Admin memeriksa hasil verifikasi fisik gudang dan menyetujui barang untuk dikirim ke PBF.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Catatan Persetujuan Admin :
                    </label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Contoh: Disetujui untuk dikirim kembali ke supplier PBF."
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Upload Lampiran Dokumen Persetujuan Admin */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <strong className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upload Dokumen Pendukung Persetujuan Admin / Apoteker :</span>
                      </strong>
                      <span className="text-[10px] text-slate-500">Scan form retur, disposisi apoteker, dll</span>
                    </div>
                    <PbfDocumentUpload
                      entityType="purchase_return"
                      entityId={ret?.id || ""}
                      title={`Dokumen Persetujuan Retur (${ret?.return_no || "Retur"})`}
                      subtitle="Upload scan dokumen persetujuan admin atau form permohonan retur ke PBF"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(!showRejectForm)}
                      className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-300 rounded-lg font-bold flex items-center gap-1"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Tolak Retur</span>
                    </button>

                    <button
                      type="button"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-2xs"
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
                        placeholder="Contoh: Masa retur distributor telah habis atau segel obat telah dibuka."
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

              {/* STAGE 4: SHIPPING TO PBF (STOCK DEDUCTION TRIGGER) */}
              {currentStatus === "DISETUJUI_ADMIN" && (
                <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Tahap 4: Pengiriman Barang Kembali ke PBF / Distributor
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Input data ekspedisi / kurir. Saat tombol diklik, stok fisik otomatis dikeluarkan dari apotek.
                      </p>
                    </div>
                  </div>

                  {/* Stock Notice Alert */}
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-2 text-indigo-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Perhatian Integrasi Stok Apotek:</strong>
                      <span>
                        Mengonfirmasi pengiriman akan <strong>memotong stok tersedia</strong> untuk batch obat ini di sistem.
                        Stok yang diretur tidak akan dapat dijual kembali kepada pelanggan apotek.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Kurir / Ekspedisi / Armada Pengiriman :
                      </label>
                      <input
                        type="text"
                        value={shippingCourier}
                        onChange={(e) => setShippingCourier(e.target.value)}
                        placeholder="Contoh: Driver PBF / JNE / Kurir Internal"
                        className="w-full h-7 px-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        No. Surat Jalan Pengiriman / Resi :
                      </label>
                      <input
                        type="text"
                        value={shippingTrackingNo}
                        onChange={(e) => setShippingTrackingNo(e.target.value)}
                        placeholder="Contoh: SJ-RET-2026/001"
                        className="w-full h-7 px-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Catatan Pengiriman :
                    </label>
                    <textarea
                      rows={2}
                      value={shippingNotes}
                      onChange={(e) => setShippingNotes(e.target.value)}
                      placeholder="Catatan penyerahan paket obat..."
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={shipMutation.isPending}
                      onClick={() => shipMutation.mutate()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-2xs"
                    >
                      <Send className="w-4 h-4" />
                      <span>{shipMutation.isPending ? "Memproses Pemotongan Stok..." : "Kirim Barang ke PBF (Potong Stok)"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 5: PBF CONFIRMATION */}
              {currentStatus === "DALAM_PENGIRIMAN" && (
                <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Tahap 5: Konfirmasi Penerimaan & Nota Retur dari PBF
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Catat jumlah barang yang disetujui (diterima) oleh distributor dan jumlah yang ditolak (jika ada).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        No. Dokumen Nota Retur / Nota Kredit PBF :
                      </label>
                      <input
                        type="text"
                        value={pbfReturnDocNo}
                        onChange={(e) => setPbfReturnDocNo(e.target.value)}
                        placeholder="Contoh: NR-PBF-98213 / CN-2026-0045"
                        className="w-full h-7 px-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Catatan Distributor PBF :
                      </label>
                      <input
                        type="text"
                        value={pbfNotes}
                        onChange={(e) => setPbfNotes(e.target.value)}
                        placeholder="Contoh: Retur diterima lengkap sesuai nota kredit"
                        className="w-full h-7 px-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Upload Berkas Nota Retur / Tanda Terima PBF */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <strong className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-sky-600" />
                        <span>Upload Berkas Nota Retur / Tanda Terima PBF :</span>
                      </strong>
                      <span className="text-[10px] text-slate-500">Scan Nota Retur resmi, surat penerimaan kurir, atau Nota Kredit</span>
                    </div>
                    <PbfDocumentUpload
                      entityType="purchase_return"
                      entityId={ret?.id || ""}
                      title={`Berkas Konfirmasi Distributor PBF (${ret?.return_no || "Retur"})`}
                      subtitle="Upload scan Nota Retur resmi distributor, bukti tanda terima kurir PBF, atau Nota Kredit (Credit Note)"
                    />
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2 border-r border-slate-200">Produk</th>
                          <th className="p-2 border-r border-slate-200 text-right">Qty Dikirim</th>
                          <th className="p-2 border-r border-slate-200 text-right">Qty Diterima PBF</th>
                          <th className="p-2 text-right">Qty Ditolak PBF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ret?.items?.map((it: any) => {
                          const conf = itemConfirmations[it.id] || { accepted_qty: it.qty, rejected_qty: 0 };
                          return (
                            <tr key={it.id}>
                              <td className="p-2 font-medium text-slate-800 border-r border-slate-100">
                                {it.product?.name}
                              </td>
                              <td className="p-2 text-right font-mono text-slate-600 border-r border-slate-100">
                                {it.qty} {it.unit?.name || "PCS"}
                              </td>
                              <td className="p-2 text-right border-r border-slate-100">
                                <input
                                  type="number"
                                  min={0}
                                  max={it.qty}
                                  value={conf.accepted_qty}
                                  onChange={(e) => {
                                    const acc = Math.min(it.qty, Math.max(0, Number(e.target.value) || 0));
                                    const rej = Math.max(0, it.qty - acc);
                                    setItemConfirmations((prev) => ({
                                      ...prev,
                                      [it.id]: { ...conf, accepted_qty: acc, rejected_qty: rej },
                                    }));
                                  }}
                                  className="w-20 h-6 px-1.5 border border-slate-300 rounded text-right font-bold text-emerald-700 bg-white"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={it.qty}
                                  value={conf.rejected_qty}
                                  onChange={(e) => {
                                    const rej = Math.min(it.qty, Math.max(0, Number(e.target.value) || 0));
                                    const acc = Math.max(0, it.qty - rej);
                                    setItemConfirmations((prev) => ({
                                      ...prev,
                                      [it.id]: { ...conf, accepted_qty: acc, rejected_qty: rej },
                                    }));
                                  }}
                                  className="w-20 h-6 px-1.5 border border-slate-300 rounded text-right font-bold text-rose-700 bg-white"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={pbfConfirmMutation.isPending}
                      onClick={() => pbfConfirmMutation.mutate()}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-2xs"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>{pbfConfirmMutation.isPending ? "Menyimpan..." : "Simpan Konfirmasi PBF"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 6: FINALIZATION & FINANCIAL INTEGRATION */}
              {currentStatus === "MENUNGGU_KONFIRMASI_PBF" && (
                <div className="bg-white p-4 rounded-xl border border-emerald-300 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Tahap 6: Finalisasi Retur, Penyesuaian Hutang & Jurnal Otomatis
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Selesaikan transaksi berdasarkan nilai retur yang disetujui distributor.
                      </p>
                    </div>
                  </div>

                  {/* Summary of Accepted / Rejected Values */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Nilai Disetujui PBF :</span>
                      <p className="text-base font-extrabold text-emerald-700 font-mono">
                        {formatCurrency(ret?.accepted_total_amount || ret?.total_amount || 0)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        (Akan memotong hutang atau dikembalikan ke kas/kredit)
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium">Nilai Ditolak PBF :</span>
                      <p className="text-base font-extrabold text-rose-700 font-mono">
                        {formatCurrency(ret?.rejected_total_amount || 0)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        (Barang yang ditolak otomatis dipulihkan kembali ke stok apotek)
                      </span>
                    </div>
                  </div>

                  {/* Settlement Type Selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Pilih Mekanisme Penyelesaian Keuangan :
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label
                        className={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1 transition ${
                          settlementType === "POTONG_HUTANG"
                            ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="radio"
                            name="settlement"
                            value="POTONG_HUTANG"
                            checked={settlementType === "POTONG_HUTANG"}
                            onChange={() => setSettlementType("POTONG_HUTANG")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <Wallet className="w-4 h-4 text-emerald-600" />
                        </div>
                        <strong className="text-xs text-slate-800">Potong Hutang Faktur</strong>
                        <span className="text-[10px] text-slate-500">
                          Mengurangi sisa hutang pada faktur pembelian asal (bila tempo).
                        </span>
                      </label>

                      <label
                        className={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1 transition ${
                          settlementType === "KREDIT_SUPPLIER"
                            ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/30"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="radio"
                            name="settlement"
                            value="KREDIT_SUPPLIER"
                            checked={settlementType === "KREDIT_SUPPLIER"}
                            onChange={() => setSettlementType("KREDIT_SUPPLIER")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <strong className="text-xs text-slate-800">Kredit Supplier (Deposit)</strong>
                        <span className="text-[10px] text-slate-500">
                          Disimpan sebagai saldo kredit apotek pada supplier untuk order berikutnya.
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
                            name="settlement"
                            value="KAS_PENGEMBALIAN"
                            checked={settlementType === "KAS_PENGEMBALIAN"}
                            onChange={() => setSettlementType("KAS_PENGEMBALIAN")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <DollarSign className="w-4 h-4 text-amber-600" />
                        </div>
                        <strong className="text-xs text-slate-800">Refund Kas / Bank</strong>
                        <span className="text-[10px] text-slate-500">
                          Supplier mengembalikan uang tunai / transfer ke rekening apotek.
                        </span>
                      </label>
                    </div>

                    {/* Cash Account Selector if KAS_PENGEMBALIAN */}
                    {settlementType === "KAS_PENGEMBALIAN" && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                        <label className="block text-[11px] font-bold text-amber-900">
                          Pilih Akun Kas / Bank Tujuan Penampung Refund :
                        </label>
                        <SearchableAccountSelect
                          accounts={cashAccounts}
                          value={cashAccountId}
                          onChange={(val) => setCashAccountId(val)}
                          placeholder="-- Pilih Akun Kas / Bank --"
                        />
                      </div>
                    )}
                  </div>

                  {/* Accounting Journal Preview */}
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600 text-[10.5px] space-y-1">
                    <strong className="block text-slate-800 font-bold">
                      Pratinjau Jurnal Otomatis yang Terbentuk:
                    </strong>
                    <div className="font-mono text-[10px] space-y-0.5">
                      {settlementType === "POTONG_HUTANG" && (
                        <>
                          <div className="text-slate-800">
                            [Debit] 2-1100 Hutang Usaha : {formatCurrency(ret?.accepted_total_amount || ret?.total_amount || 0)}
                          </div>
                          <div className="text-slate-600 pl-4">
                            [Kredit] 1-1300 Persediaan Obat & Barang Dagang
                          </div>
                          {ret?.tax_amount > 0 && (
                            <div className="text-slate-600 pl-4">[Kredit] 1-1410 PPN Masukan</div>
                          )}
                        </>
                      )}
                      {settlementType === "KREDIT_SUPPLIER" && (
                        <>
                          <div className="text-slate-800">
                            [Debit] 1-1200 Piutang / Saldo Kredit Supplier : {formatCurrency(ret?.accepted_total_amount || ret?.total_amount || 0)}
                          </div>
                          <div className="text-slate-600 pl-4">
                            [Kredit] 1-1300 Persediaan Obat & Barang Dagang
                          </div>
                          {ret?.tax_amount > 0 && (
                            <div className="text-slate-600 pl-4">[Kredit] 1-1410 PPN Masukan</div>
                          )}
                        </>
                      )}
                      {settlementType === "KAS_PENGEMBALIAN" && (
                        <>
                          <div className="text-slate-800">
                            [Debit] Kas / Bank Masuk : {formatCurrency(ret?.accepted_total_amount || ret?.total_amount || 0)}
                          </div>
                          <div className="text-slate-600 pl-4">
                            [Kredit] 1-1300 Persediaan Obat & Barang Dagang
                          </div>
                          {ret?.tax_amount > 0 && (
                            <div className="text-slate-600 pl-4">[Kredit] 1-1410 PPN Masukan</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={finalizeMutation.isPending}
                      onClick={() => finalizeMutation.mutate()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-md transition active:scale-95"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{finalizeMutation.isPending ? "Memproses Finalisasi..." : "Finalisasi Retur Pembelian (SELESAI)"}</span>
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
                      Retur Pembelian Ini Telah Selesai Difinalisasi
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Potongan Hutang Faktur</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.debt_deduction_amount || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Saldo Kredit Supplier</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.credit_balance_amount || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 text-[10px]">Pengembalian Kas/Bank</span>
                      <p className="font-bold text-slate-800 font-mono">
                        {formatCurrency(ret?.refund_amount || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "documents" ? (
            /* TAB: DOKUMEN LAMPIRAN */
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <PbfDocumentUpload
                  entityType="purchase_return"
                  entityId={ret?.id || ""}
                  title={`Lampiran Berkas & Dokumen Retur: ${ret?.return_no || "Retur"}`}
                  subtitle="Kelola dan lihat seluruh scan berkas fisik retur: Nota Retur PBF, Surat Jalan Pengiriman, Bukti Tanda Terima & Nota Kredit"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>Informasi Dokumen Retur Pembelian: {ret?.return_no}</span>
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
                    <strong className="text-slate-800 font-mono">{ret?.purchase?.invoice_no || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Supplier PBF:</span>
                    <strong className="text-slate-800">{ret?.supplier?.name || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Status Terakhir:</span>
                    <span className="font-bold text-rose-700">{ret?.status || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "items" ? (
            /* TAB 2: ITEMS LIST */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2 w-8 text-center border-r border-slate-200">No</th>
                    <th className="p-2 border-r border-slate-200">Kode & Nama Item</th>
                    <th className="p-2 border-r border-slate-200">No. Batch & ED</th>
                    <th className="p-2 border-r border-slate-200 text-center">Kondisi</th>
                    <th className="p-2 border-r border-slate-200 text-right">Qty Retur</th>
                    <th className="p-2 border-r border-slate-200 text-right">Harga Pokok</th>
                    <th className="p-2 border-r border-slate-200 text-right">Subtotal</th>
                    <th className="p-2 border-r border-slate-200 text-right">Disetujui PBF</th>
                    <th className="p-2 text-right">Ditolak PBF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ret?.items?.map((it: any, i: number) => (
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                      <td className="p-2 border-r border-slate-100">
                        <strong className="block text-slate-800">{it.product?.name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">{it.product?.code}</span>
                      </td>
                      <td className="p-2 border-r border-slate-100 font-mono text-[11px]">
                        <div>Batch: <strong className="text-slate-700">{it.batch_number || "-"}</strong></div>
                        <div className="text-slate-500">ED: {formatDate(it.expired_date)}</div>
                      </td>
                      <td className="p-2 text-center border-r border-slate-100">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {it.item_condition || "BAIK"}
                        </span>
                      </td>
                      <td className="p-2 text-right font-bold text-rose-700 border-r border-slate-100">
                        {it.qty} {it.unit?.name || "PCS"}
                      </td>
                      <td className="p-2 text-right font-mono text-slate-600 border-r border-slate-100">
                        {formatCurrency(it.unit_price)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                        {formatCurrency(it.total_amount)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700 border-r border-slate-100">
                        {it.accepted_qty !== null ? `${it.accepted_qty} ${it.unit?.name || ""}` : "-"}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-rose-700">
                        {it.rejected_qty !== null ? `${it.rejected_qty} ${it.unit?.name || ""}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* TAB 3: AUDIT TRAIL / LOGS */
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <History className="w-4 h-4 text-rose-600" />
                <span>Riwayat Perubahan Status & Catatan Petugas (CDOB Audit Trail)</span>
              </h4>

              {(!ret?.status_logs || ret.status_logs.length === 0) ? (
                <div className="text-center py-6 text-slate-400">Belum ada catatan log aktivitas.</div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {ret.status_logs.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-rose-600 ring-4 ring-white" />
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[9.5px]">
                              {log.from_status || "START"}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[9.5px]">
                              {log.to_status}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 italic">"{log.notes || "-"}"</p>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Petugas: <strong className="text-slate-700">{log.user?.full_name || log.user?.username || "Admin"}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="shrink-0 bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500 font-medium">
            Dokumen Retur Standar BPOM / CDOB • PT Farmasi Medika Nusantara
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
