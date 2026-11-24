"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  FileText,
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
  Calendar,
  Layers,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Truck,
  Check,
  Receipt,
  Printer,
  Maximize2,
  AlertCircle,
  Save,
  XCircle,
  CheckCheck,
} from "lucide-react";
import { api, formatCurrency, formatDate, resolveAssetUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";
import { DokumenSPViewer } from "@/components/purchasing/DokumenSPModal";

interface AlurPembelianModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string | null;
  onOpenTerimaBarang?: (invoice: any) => void;
  onOpenVerifikasiAdmin?: (invoice: any) => void;
  onOpenDokumenPBF?: (invoice: any) => void;
  onOpenDokumenSP?: (invoice: any) => void;
  isGudang?: boolean;
  isAdmin?: boolean;
}

const PURCHASE_STAGES = [
  { key: "DRAFT_PO", label: "1. Pemesanan (SP/PO)", step: 1, desc: "" },
  { key: "PENERIMAAN_GUDANG", label: "2. Penerimaan Gudang", step: 2, desc: "" },
  { key: "VERIFIKASI_ADMIN", label: "3. Verifikasi Admin", step: 3, desc: "" },
  { key: "PEMBAYARAN_HUTANG", label: "4. Pelunasan Hutang", step: 4, desc: "" },
];

export const AlurPembelianModal: React.FC<AlurPembelianModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  isGudang = false,
  isAdmin = true,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"action" | "items" | "documents" | "history">("action");
  const [docSubTab, setDocSubTab] = useState<"sp" | "pbf">("sp");

  // Gudang Receive Form States (Integrated inside Tahap 2)
  const [gudangWarehouseId, setGudangWarehouseId] = useState("");
  const [receivedQtyMap, setReceivedQtyMap] = useState<Record<string, number>>({});

  // Admin Verification Form States (Integrated inside Tahap 3)
  const [pbfInvoiceNo, setPbfInvoiceNo] = useState("");
  const [pbfDeliveryOrderNo, setPbfDeliveryOrderNo] = useState("");
  const [taxInvoiceNo, setTaxInvoiceNo] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [itemBatchMap, setItemBatchMap] = useState<Record<string, string>>({});
  const [itemExpiredMap, setItemExpiredMap] = useState<Record<string, string>>({});

  // Fetch Full Purchase Detail
  const { data: inv, isLoading, refetch } = useQuery({
    queryKey: ["purchase-detail-modal", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const res = await api.get(`/purchases/${invoiceId}`);
      return res.data?.data;
    },
    enabled: isOpen && !!invoiceId,
  });

  // Fetch Warehouses for dropdown in Step 2 & Step 3
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Sync Form States when Purchase loads
  useEffect(() => {
    if (inv) {
      // 1. Gudang Form States
      setGudangWarehouseId(inv.warehouse_id || (warehouses[0]?.id || ""));

      const rMap: Record<string, number> = {};
      (inv.items || []).forEach((it: any) => {
        rMap[it.id] = it.received_qty != null && it.received_qty > 0 ? Number(it.received_qty) : Number(it.qty || 0);
      });
      setReceivedQtyMap(rMap);

      // 2. Admin Form States
      setPbfInvoiceNo(inv.pbf_invoice_no || "");
      setPbfDeliveryOrderNo(inv.pbf_delivery_order_no || "");
      setTaxInvoiceNo(inv.tax_invoice_no || "");
      setWarehouseId(inv.warehouse_id || (warehouses[0]?.id || ""));
      setDueDate(
        inv.due_date
          ? new Date(inv.due_date).toISOString().split("T")[0]
          : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
      );
      setAdminNotes(inv.admin_notes || "");
      setShowRejectForm(false);
      setRejectReason("");

      const bMap: Record<string, string> = {};
      const eMap: Record<string, string> = {};
      (inv.items || []).forEach((it: any) => {
        bMap[it.id] = it.batch_number || it.batch?.batch_number || "";
        eMap[it.id] = it.expired_date || it.batch?.expired_date
          ? new Date(it.expired_date || it.batch?.expired_date).toISOString().split("T")[0]
          : "";
      });
      setItemBatchMap(bMap);
      setItemExpiredMap(eMap);
    }
  }, [inv, warehouses]);

  // Determine current active step (2, 3, or 4)
  const isApproved = inv?.verification_status === "APPROVED" || inv?.is_verified;
  const isWarehouseVerified = inv?.verification_status === "VERIFIKASI_GUDANG";
  const isWaitingReceive = inv?.verification_status === "MENUNGGU_PENERIMAAN";
  const isRejected = inv?.verification_status === "REJECTED";
  const isPaid = inv?.payment_status === "PAID";

  const getCurrentStep = (): number => {
    if (isApproved) return 4;
    if (isWarehouseVerified) return 3;
    return 2; // MENUNGGU_PENERIMAAN or REJECTED
  };

  const currentStep = getCurrentStep();

  // Helper: auto fill 100% ordered qty for Gudang
  const handleAutoFillOrderedQty = () => {
    if (!inv?.items) return;
    const rMap: Record<string, number> = {};
    inv.items.forEach((it: any) => {
      rMap[it.id] = Number(it.qty || 0);
    });
    setReceivedQtyMap(rMap);
  };

  // Gudang Receive Mutation (Direct from Step 2)
  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!inv?.id) throw new Error("ID Faktur tidak valid");
      if (!gudangWarehouseId) throw new Error("Pilih gudang penerima terlebih dahulu");

      const itemsToReceive: any[] = [];
      (inv.items || []).forEach((it: any) => {
        const q = Number(receivedQtyMap[it.id]) || 0;
        if (q > 0) {
          itemsToReceive.push({
            product_id: it.product_id,
            unit_id: it.unit_id,
            qty: q,
            unit_price: Number(it.unit_price || 0),
            discount: Number(it.discount || 0),
            batch_number: it.batch_number || "",
            expired_date: it.expired_date || undefined,
          });
        }
      });

      if (itemsToReceive.length === 0) {
        throw new Error("Tidak ada item dengan jumlah terima fisik > 0");
      }

      const payload = {
        warehouse_id: inv.warehouse_id || gudangWarehouseId,
        notes: `Pemeriksaan fisik barang oleh gudang untuk Faktur ${inv.invoice_no}`,
        items: itemsToReceive,
      };

      return await api.post(`/purchases/${inv.id}/receive`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-detail-modal", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      refetch();
      alert(
        "✅ Pemeriksaan fisik barang berhasil disimpan oleh Petugas Gudang!\n\n" +
          "• Jumlah fisik obat diterima telah dicatat.\n" +
          "• Status berubah menjadi 'Verifikasi Gudang' dan langsung diteruskan ke Tahap 3 (Verifikasi Dokumen & Input Batch oleh Admin)."
      );
    },
    onError: (err: any) => {
      alert("Gagal menyimpan penerimaan fisik gudang: " + (err.response?.data?.message || err.message));
    },
  });

  // Admin Approval Mutation (Direct from Step 3)
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!inv?.id) throw new Error("ID Faktur tidak valid");

      // Validasi No Batch dan Expired Date wajib diisi Admin
      for (const it of inv.items || []) {
        const batch = (itemBatchMap[it.id] || "").trim();
        const exp = (itemExpiredMap[it.id] || "").trim();
        if (!batch) {
          throw new Error(`Nomor Batch untuk obat "${it.product?.name || it.product?.code || "Obat"}" wajib diisi.`);
        }
        if (!exp) {
          throw new Error(`Expired Date untuk obat "${it.product?.name || it.product?.code || "Obat"}" wajib diisi.`);
        }
      }

      return await api.put(`/purchases/${inv.id}/admin-approve`, {
        pbf_invoice_no: pbfInvoiceNo || undefined,
        pbf_delivery_order_no: pbfDeliveryOrderNo || undefined,
        tax_invoice_no: taxInvoiceNo || undefined,
        warehouse_id: warehouseId || undefined,
        due_date: dueDate || undefined,
        notes: adminNotes || undefined,
        items: (inv.items || []).map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          batch_number: itemBatchMap[it.id]?.trim(),
          expired_date: itemExpiredMap[it.id],
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-detail-modal", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      refetch();
      alert(
        "✅ Pembelian berhasil diverifikasi & disetujui Admin!\n\n" +
          "• Informasi Faktur PBF, Surat Jalan & Dokumen Resmi tersimpan.\n" +
          "• Nomor batch & expired date obat tercatat di kartu stok gudang.\n" +
          "• Hutang usaha telah dibukukan dan siap untuk pelunasan."
      );
    },
    onError: (err: any) => {
      alert("Gagal menyetujui pembelian: " + (err.response?.data?.message || err.message));
    },
  });

  // Admin Reject Mutation (Direct from Step 3)
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!inv?.id) throw new Error("ID Faktur tidak valid");
      if (!rejectReason.trim()) throw new Error("Alasan penolakan harus diisi dengan jelas.");
      return await api.put(`/purchases/${inv.id}/admin-reject`, {
        reason: rejectReason.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-detail-modal", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      refetch();
      setShowRejectForm(false);
      alert("⚠️ Verifikasi pembelian telah ditolak dan dikembalikan ke Gudang untuk revisi.");
    },
    onError: (err: any) => {
      alert("Gagal menolak pembelian: " + (err.response?.data?.message || err.message));
    },
  });

  if (!isOpen) return null;

  // Prepare PO data for DokumenSPViewer
  const poData = inv
    ? {
        id: inv.purchase_order_id || inv.id,
        order_no: inv.purchase_order?.order_no || inv.invoice_no,
        sp_number:
          inv.purchase_order?.sp_number ||
          inv.sp_number ||
          inv.pbf_invoice_no ||
          inv.invoice_no,
        date: inv.purchase_order?.date || inv.date,
        supplier: inv.supplier,
        supplier_id: inv.supplier_id,
        items: (inv.items || []).map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          product: it.product,
          name: it.product?.name,
          unit_id: it.unit_id,
          unit: it.unit,
          qty: it.qty,
          unit_price: it.unit_price,
          total_amount: it.total_amount,
          supplier_id: it.supplier_id || inv.supplier_id,
          supplier: it.supplier || inv.supplier,
        })),
        notes: inv.notes,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Container: Ukuran sama persis dengan modal Alur Retur Pembelian (max-w-4xl h-[92vh] max-h-[850px]) */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden text-xs">
        {/* 1. TOP HEADER BAR */}
        <div className="shrink-0 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100">
                  Alur Transaksi Pembelian: <span className="font-mono text-emerald-400">{inv?.invoice_no || "..."}</span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Supplier: <strong className="text-slate-200">{inv?.supplier?.name || "-"}</strong> &nbsp;|&nbsp; Gudang:{" "}
                <strong className="text-slate-200">{inv?.warehouse?.name || "Gudang Utama Farmasi"}</strong> &nbsp;|&nbsp; Total:{" "}
                <strong className="text-emerald-400 font-mono">{formatCurrency(inv?.total_amount || 0)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="h-7 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Perbarui Data Transaksi"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              title="Tutup Alur (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. PROGRESS STEPPER (Tahapan 1, 2, 3 sampai selesai TETAP MUNCUL DI ATAS) */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {PURCHASE_STAGES.map((stage, idx) => {
              const isPassed = stage.step < currentStep || (stage.step === 4 && isPaid);
              const isCurrent = stage.step === currentStep && !(stage.step === 4 && isPaid);
              const isLocked = stage.step > currentStep;

              return (
                <React.Fragment key={stage.key}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs transition-all ${
                        isPassed
                          ? "bg-emerald-600 text-white ring-2 ring-emerald-200"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 scale-105"
                          : "bg-slate-200 text-slate-400 border border-slate-300"
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : stage.step}
                    </div>
                    <div>
                      <span
                        className={`text-xs block font-bold leading-tight ${
                          isCurrent
                            ? "text-blue-700"
                            : isPassed
                            ? "text-slate-800"
                            : "text-slate-400"
                        }`}
                      >
                        {stage.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        {stage.desc}
                      </span>
                    </div>
                  </div>

                  {idx < PURCHASE_STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 transition-colors ${
                        idx < currentStep - 1
                          ? "bg-emerald-500"
                          : idx === currentStep - 1
                          ? "bg-blue-300"
                          : "bg-slate-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {isRejected && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 max-w-3xl mx-auto">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Pembelian Ditolak Admin:</strong> {inv?.reject_reason || "Perlu revisi barang / data fisik."}
              </span>
            </div>
          )}
        </div>

        {/* 3. TAB NAVIGATION */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 text-xs font-semibold">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("action")}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "action"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Tahapan Aktif</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "items"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Rincian Item Obat ({inv?.items?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "documents"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>Dokumen Lampiran PBF &amp; SP</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "history"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat &amp; Audit Trail</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            {isGudang ? (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                📦Gudang
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-300">
                🛡️ Admin
              </span>
            )}
          </div>
        </div>

        {/* 4. TAB BODY (FULL SCROLLABLE AREA) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50 text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              Memuat data transaksi pembelian...
            </div>
          ) : activeTab === "action" ? (
            /* TAB 1: EKSEKUSI TAHAPAN AKTIF (Hanya memunculkan tahapan aktif saat itu saja) */
            <div className="max-w-4xl mx-auto space-y-4">
              {/* TAHAP 1: INFO PEMBUATAN / PESANAN (SP/PO) - Muncul jika currentStep === 1 */}
              {currentStep === 1 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Tahap 1: Surat Pesanan (SP) &amp; Pengajuan Pembelian
                        </h4>
                        <p className="text-[10.5px] text-slate-500">
                          Dibuat pada {formatDate(inv?.date)} oleh{" "}
                          <strong className="text-slate-700">{inv?.user?.full_name || inv?.user?.username || "Admin"}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("documents");
                        setDocSubTab("sp");
                      }}
                      className="h-6 px-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 rounded font-semibold text-[10.5px] flex items-center gap-1 cursor-pointer transition"
                    >
                      <FileText className="w-3 h-3 text-sky-600" />
                      <span>Lihat Dokumen SP</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10.5px] pt-1">
                    <div>
                      <span className="text-slate-400 block">Supplier Distributor:</span>
                      <strong className="text-slate-800 text-xs">{inv?.supplier?.name || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Gudang Tujuan:</span>
                      <strong className="text-slate-800">{inv?.warehouse?.name || "Gudang Utama Farmasi"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">No. Faktur PBF:</span>
                      <strong className="text-slate-800 font-mono">{inv?.pbf_invoice_no || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">No. Surat Jalan PBF:</span>
                      <strong className="text-slate-800 font-mono">{inv?.pbf_delivery_order_no || "-"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAHAP 2: PEMERIKSAAN FISIK BARANG OLEH GUDANG (Muncul HANYA jika currentStep === 2) */}
              {currentStep === 2 && (
                <div className="p-4 rounded-xl border border-amber-400 ring-2 ring-amber-100 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                        currentStep > 2
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : <PackageCheck className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">
                        Tahap 2: Pemeriksaan Fisik Barang oleh Gudang
                      </h4>
                      <p className="text-[10.5px] text-slate-500">
                        {currentStep > 2
                          ? `Fisik barang telah diperiksa & diterima oleh Petugas Gudang (${formatDate(inv?.warehouse_verified_at)}).`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {currentStep === 2 ? (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                      Sedang Berlangsung (Tahap Gudang)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Selesai Diperiksa</span>
                    </span>
                  )}
                </div>

                {/* FORM PENERIMAAN FISIK GUDANG INLINE (currentStep === 2) */}
                {currentStep === 2 && (
                  <div className="space-y-3 pt-1">
                    {/* Role Notice */}
                    {!isGudang && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>Perhatian:</strong> Anda login sebagai Admin/Apoteker. Pemeriksaan fisik barang wajib dilakukan oleh akun Petugas Gudang (Logistik). Form dan tombol simpan dinonaktifkan.
                        </span>
                      </div>
                    )}

                    {/* Tabel Pemeriksaan Fisik Qty Tiap Item Obat (Hanya Rincian Obat) */}
                    <div className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <PackageCheck className="w-4 h-4 text-emerald-600" />
                          <h5 className="font-bold text-slate-800 text-[11.5px]">
                            Rincian Item Obat &amp; Jumlah Kemasan Diterima :
                          </h5>
                        </div>
                        {isGudang && (
                          <button
                            type="button"
                            onClick={handleAutoFillOrderedQty}
                            className="text-[10.5px] px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center gap-1 cursor-pointer transition"
                          >
                            <CheckCheck className="w-3 h-3 text-emerald-600" />
                            <span>Terima Sesuai Pesanan (100%)</span>
                          </button>
                        )}
                      </div>

                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 text-[10.5px]">
                            <tr>
                              <th className="py-1.5 px-2 text-center w-8">No</th>
                              <th className="py-1.5 px-2.5 w-24">Kode Obat</th>
                              <th className="py-1.5 px-2.5">Nama Obat / Item</th>
                              <th className="py-1.5 px-2 text-center w-16">Satuan</th>
                              <th className="py-1.5 px-2.5 text-right w-24 bg-slate-100 text-slate-700 font-semibold">Qty Pesan</th>
                              <th className="py-1.5 px-2.5 text-right w-32 bg-emerald-50 text-emerald-900 font-bold">Qty Fisik Tiba *</th>
                              <th className="py-1.5 px-2 text-center w-28">Status Fisik</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(inv?.items || []).map((it: any, idx: number) => {
                              const currentVal = receivedQtyMap[it.id] != null ? receivedQtyMap[it.id] : it.qty;
                              const isFull = Number(currentVal) >= Number(it.qty);
                              const isPartial = Number(currentVal) > 0 && Number(currentVal) < Number(it.qty);

                              return (
                                <tr key={it.id || idx} className="hover:bg-slate-50 transition">
                                  <td className="py-1.5 px-2 text-center text-slate-500">{idx + 1}</td>
                                  <td className="py-1.5 px-2.5 font-mono font-medium text-slate-800">
                                    {it.product?.code || "-"}
                                  </td>
                                  <td className="py-1.5 px-2.5 font-medium text-slate-900">
                                    {it.product?.name || "-"}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-600">
                                    {it.unit?.name || it.unit_name || "PCS"}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 bg-slate-50">
                                    {Number(it.qty).toFixed(2)}
                                  </td>
                                  <td className="py-1 px-2 bg-emerald-50/40 text-right">
                                    <input
                                      type="number"
                                      step="any"
                                      min={0}
                                      disabled={!isGudang}
                                      value={receivedQtyMap[it.id] ?? it.qty}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setReceivedQtyMap((prev) => ({ ...prev, [it.id]: val }));
                                      }}
                                      className="w-24 h-6 px-1.5 text-right font-mono font-bold text-[11.5px] border border-emerald-400 rounded bg-white text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 ml-auto block"
                                    />
                                  </td>
                                  <td className="py-1.5 px-2 text-center">
                                    {isFull ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        Lengkap
                                      </span>
                                    ) : isPartial ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        Sebagian
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                        Belum Ada
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tombol Eksekusi Konfirmasi Gudang */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={!isGudang || receiveMutation.isPending}
                        onClick={() => receiveMutation.mutate()}
                        className={`px-5 py-2 font-bold rounded-lg flex items-center gap-2 shadow-sm transition active:scale-95 ${
                          isGudang && !receiveMutation.isPending
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer ring-2 ring-emerald-300"
                            : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                        }`}
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>
                          {receiveMutation.isPending ? "Menyimpan Pemeriksaan..." : "Konfirmasi & Selesaikan Penerimaan Gudang"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Summary jika sudah diperiksa */}
                {currentStep > 2 && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        Petugas Penerima:{" "}
                        <strong className="text-slate-800">
                          {inv?.warehouse_verifier?.full_name || inv?.warehouse_verifier?.username || "Petugas Gudang"}
                        </strong>
                      </span>
                      <span className="text-slate-400 text-[10px]">{formatDate(inv?.warehouse_verified_at)}</span>
                    </div>
                    {inv?.warehouse_notes && (
                      <p className="text-slate-600 italic">"{inv.warehouse_notes}"</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[10.5px] text-slate-700 border-t border-slate-200">
                      <div>No. Surat Jalan PBF: <strong className="text-slate-900 font-mono">{inv?.pbf_delivery_order_no || "-"}</strong></div>
                      <div>Gudang Penerima: <strong className="text-slate-900">{inv?.warehouse?.name || "Utama"}</strong></div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* TAHAP 3: VERIFIKASI DOKUMEN, INPUT BETS & APPROVAL ADMIN (Muncul HANYA jika currentStep === 3) */}
              {currentStep === 3 && (
                <div className="p-4 rounded-xl border border-blue-400 ring-2 ring-blue-100 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold bg-blue-100 text-blue-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Tahap 3: Verifikasi Dokumen, Input Batch &amp; Persetujuan Admin
                        </h4>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                      Sedang Berlangsung (Tahap Admin)
                    </span>
                  </div>

                {/* FORM INPUT DOKUMEN, BETS & VERIFIKASI LANGSUNG DI STEP VERIFIKASI ADMIN (currentStep === 3) */}
                {currentStep === 3 && (
                  <div className="space-y-3 pt-1">
                    {/* Role Notice */}
                    {isGudang && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>Perhatian:</strong> Anda login sebagai Petugas Gudang. Verifikasi berkas dokumen PBF dan persetujuan faktur hanya dapat dilakukan oleh Admin / Apoteker.
                        </span>
                      </div>
                    )}

                    {/* SECTION 1: Input Informasi Dokumen & Faktur PBF */}
                    <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <h5 className="font-bold text-[11.5px] text-blue-900 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>1. Informasi Dokumen Faktur &amp; Pengiriman PBF :</span>
                        </h5>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Diinput dan diverifikasi oleh Admin
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            No. Faktur PBF / Supplier :
                          </label>
                          <input
                            type="text"
                            disabled={isGudang || !isAdmin}
                            value={pbfInvoiceNo}
                            onChange={(e) => setPbfInvoiceNo(e.target.value)}
                            placeholder="Contoh: INV-PBF-8821"
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11.5px] text-slate-900 bg-white font-mono focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            No. Surat Jalan / DO Kurir :
                          </label>
                          <input
                            type="text"
                            disabled={isGudang || !isAdmin}
                            value={pbfDeliveryOrderNo}
                            onChange={(e) => setPbfDeliveryOrderNo(e.target.value)}
                            placeholder="Contoh: SJ-2026-0012"
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11.5px] text-slate-900 bg-white font-mono focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            No. Faktur Pajak :
                          </label>
                          <input
                            type="text"
                            disabled={isGudang || !isAdmin}
                            value={taxInvoiceNo}
                            onChange={(e) => setTaxInvoiceNo(e.target.value)}
                            placeholder="Contoh: 010.000-26.12345678"
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11.5px] text-slate-900 bg-white font-mono focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            Tanggal Jatuh Tempo :
                          </label>
                          <input
                            type="date"
                            disabled={isGudang || !isAdmin}
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11.5px] text-slate-900 bg-white focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Upload Lampiran Dokumen PBF (Langsung di Step 3) */}
                    <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                        <h5 className="font-bold text-[11.5px] text-blue-900 flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-emerald-600" />
                          <span>2. Upload &amp; Kelola Lampiran Berkas Dokumen PBF :</span>
                        </h5>
                        <span className="text-[10px] text-slate-500">
                          Scan Faktur Asli, DO, e-Faktur Pajak, Sertifikat Mutu / CoA
                        </span>
                      </div>
                      <PbfDocumentUpload
                        entityType="purchase"
                        entityId={inv?.id || ""}
                        title={`Lampiran Dokumen Pembelian: ${inv?.invoice_no}`}
                        subtitle=""
                      />
                    </div>

                    {/* SECTION 3: Input Nomor Bets & Expired Date untuk Setiap Item Obat */}
                    <div className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <h5 className="font-bold text-slate-800 text-[11.5px]">
                            3. Input Nomor Batch &amp; Expired Date Obat (Sesuai Fisik Kemasan &amp; Faktur PBF) :
                          </h5>
                        </div>
                        <span className="text-[10.5px] text-amber-800 font-bold">
                          * Wajib diisi lengkap sebelum approval
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 text-[10.5px]">
                            <tr>
                              <th className="py-1.5 px-2 text-center w-8">No</th>
                              <th className="py-1.5 px-2.5 w-24">Kode Obat</th>
                              <th className="py-1.5 px-2.5">Nama Obat / Item</th>
                              <th className="py-1.5 px-2 text-center w-16">Satuan</th>
                              <th className="py-1.5 px-2 text-right w-20 bg-emerald-50 text-emerald-900 font-bold">Qty Fisik</th>
                              <th className="py-1.5 px-2.5 w-36 bg-amber-50 text-amber-900 font-bold">No. Batch *</th>
                              <th className="py-1.5 px-2.5 w-36 bg-amber-50 text-amber-900 font-bold">Expired Date *</th>
                              <th className="py-1.5 px-2.5 text-right w-24">Harga Beli</th>
                              <th className="py-1.5 px-2.5 text-right w-24">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(inv?.items || []).map((it: any, idx: number) => {
                              const batchVal = itemBatchMap[it.id] ?? (it.batch_number || "");
                              const expVal = itemExpiredMap[it.id] ?? (it.expired_date ? new Date(it.expired_date).toISOString().split("T")[0] : "");

                              return (
                                <tr key={it.id || idx} className="hover:bg-slate-50 transition">
                                  <td className="py-1.5 px-2 text-center text-slate-500">{idx + 1}</td>
                                  <td className="py-1.5 px-2.5 font-mono font-medium text-slate-800">
                                    {it.product?.code || "-"}
                                  </td>
                                  <td className="py-1.5 px-2.5 font-medium text-slate-900">
                                    {it.product?.name || "-"}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-600">
                                    {it.unit?.name || it.unit_name || "PCS"}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                                    {Number(it.received_qty != null ? it.received_qty : it.qty).toFixed(2)}
                                  </td>
                                  <td className="py-1 px-1.5 bg-amber-50/30">
                                    <input
                                      type="text"
                                      disabled={isGudang || !isAdmin}
                                      value={batchVal}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setItemBatchMap((prev) => ({ ...prev, [it.id]: val }));
                                      }}
                                      placeholder="Nomor Batch..."
                                      className={`w-full h-6 px-1.5 font-mono text-[11px] border rounded bg-white text-slate-800 font-semibold focus:outline-none disabled:bg-slate-100 ${
                                        !batchVal.trim() ? "border-amber-400 ring-1 ring-amber-200" : "border-slate-300 focus:border-blue-500"
                                      }`}
                                    />
                                  </td>
                                  <td className="py-1 px-1.5 bg-amber-50/30">
                                    <input
                                      type="date"
                                      disabled={isGudang || !isAdmin}
                                      value={expVal}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setItemExpiredMap((prev) => ({ ...prev, [it.id]: val }));
                                      }}
                                      className={`w-full h-6 px-1.5 font-mono text-[10.5px] border rounded bg-white text-slate-800 focus:outline-none disabled:bg-slate-100 ${
                                        !expVal.trim() ? "border-amber-400 ring-1 ring-amber-200" : "border-slate-300 focus:border-blue-500"
                                      }`}
                                    />
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                                    {formatCurrency(it.unit_price)}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                                    {formatCurrency(it.total_amount || (it.qty * it.unit_price))}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION 4: Catatan Admin & Action Execution */}
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 space-y-2">
                      <div>
                        <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                          Catatan Verifikasi Admin (Opsional) :
                        </label>
                        <input
                          type="text"
                          disabled={isGudang || !isAdmin}
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Catatan keabsahan dokumen PBF, izin edar, kondisi segel, dll..."
                          className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-800 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                        />
                      </div>

                      {/* Reject Box Form */}
                      {showRejectForm ? (
                        <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg space-y-2 animate-in fade-in">
                          <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[11.5px]">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>Form Penolakan Faktur Pembelian (Kembalikan ke Gudang) :</span>
                          </div>
                          <textarea
                            rows={2}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Tuliskan alasan penolakan secara jelas (misal: ED obat terlalu pendek, kemasan rusak, faktur distributor tidak sesuai)..."
                            className="w-full p-2 border border-rose-300 rounded text-[11px] bg-white text-slate-900 focus:outline-none focus:border-rose-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowRejectForm(false)}
                              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-semibold cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={rejectMutation.isPending || !rejectReason.trim()}
                              onClick={() => rejectMutation.mutate()}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {rejectMutation.isPending ? "Menolak..." : "Kirim Penolakan ke Gudang"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            disabled={isGudang || !isAdmin}
                            onClick={() => setShowRejectForm(true)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition disabled:opacity-40 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>Tolak Pembelian (Revisi Gudang)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isGudang || !isAdmin || approveMutation.isPending}
                            onClick={() => approveMutation.mutate()}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-40"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>
                              {approveMutation.isPending ? "Menyimpan Verifikasi..." : "Setujui & Verifikasi Pembelian (Stok Masuk)"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary jika sudah disetujui Admin */}
                {currentStep > 3 && (
                  <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-950 font-semibold">
                        Apoteker / Admin Verifikator:{" "}
                        <strong className="text-slate-900">
                          {inv?.admin_approver?.full_name || inv?.admin_approver?.username || "Apoteker Utama"}
                        </strong>
                      </span>
                      <span className="text-slate-500 text-[10px]">{formatDate(inv?.admin_approved_at)}</span>
                    </div>
                    {inv?.admin_notes && (
                      <p className="text-slate-600 italic">"{inv.admin_notes}"</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[10.5px] text-slate-700 border-t border-emerald-200/60">
                      <div>No. Faktur PBF: <strong className="text-slate-900 font-mono">{inv?.pbf_invoice_no || "-"}</strong></div>
                      <div>No. Faktur Pajak: <strong className="text-slate-900 font-mono">{inv?.tax_invoice_no || "-"}</strong></div>
                      <div>Jatuh Tempo: <strong className="text-slate-900">{formatDate(inv?.due_date)}</strong></div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* TAHAP 4: STATUS PEMBAYARAN HUTANG KE DISTRIBUTOR PBF (Muncul HANYA jika currentStep === 4) */}
              {currentStep === 4 && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Tahap 4: Pembayaran Tagihan Hutang ke Distributor PBF
                        </h4>
                        <p className="text-[10.5px] text-slate-500">
                          {isPaid
                            ? "Tagihan faktur pembelian ini telah lunas dibayar."
                            : `Hutang usaha aktif dengan sisa tagihan: ${formatCurrency(inv?.remaining_amount || 0)}`}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {isPaid ? "Lunas" : "Belum Lunas"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Total Tagihan Faktur:</span>
                      <strong className="text-slate-900 text-xs font-mono">{formatCurrency(inv?.total_amount || 0)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Sudah Dibayar:</span>
                      <strong className="text-emerald-700 text-xs font-mono">{formatCurrency(inv?.paid_amount || 0)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Sisa Hutang:</span>
                      <strong className="text-rose-700 text-xs font-mono">{formatCurrency(inv?.remaining_amount || 0)}</strong>
                    </div>
                  </div>

                  {!isPaid && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(`/purchasing/payments/new?supplier_id=${inv?.supplier_id || ""}&invoice_id=${inv?.id || ""}`);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Bayar Hutang Faktur Ini</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === "items" ? (
            /* TAB 2: RINCIAN ITEM OBAT & BETS */
            <div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-3 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs text-slate-800">
                    Daftar Item Obat, Nomor Batch &amp; Expired Date
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Total Item: <strong>{inv?.items?.length || 0} obat</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-8 text-center border-r border-slate-200">No</th>
                      <th className="p-2 border-r border-slate-200">Kode &amp; Nama Obat</th>
                      <th className="p-2 border-r border-slate-200">Nomor Batch &amp; Expired</th>
                      <th className="p-2 border-r border-slate-200 text-right">Qty Beli</th>
                      <th className="p-2 border-r border-slate-200 text-right">Qty Diterima</th>
                      <th className="p-2 border-r border-slate-200">Satuan</th>
                      <th className="p-2 border-r border-slate-200 text-right">Harga Pokok</th>
                      <th className="p-2 border-r border-slate-200 text-right">Diskon</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!inv?.items || inv.items.length === 0) ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400">
                          Tidak ada rincian item dalam faktur ini.
                        </td>
                      </tr>
                    ) : (
                      inv.items.map((it: any, idx: number) => {
                        const batchNo = it.batch_number || it.batch?.batch_number || "-";
                        const ed = it.expired_date || it.batch?.expired_date ? formatDate(it.expired_date || it.batch?.expired_date) : "-";

                        return (
                          <tr key={it.id || idx} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-500 border-r border-slate-100">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-100">
                              <span className="font-semibold text-slate-900 block">{it.product?.name || it.item_name || "-"}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{it.product?.code || "-"}</span>
                            </td>
                            <td className="p-2 border-r border-slate-100">
                              <span className="font-mono font-bold text-slate-800 text-[11px] block">{batchNo}</span>
                              <span className="text-[10px] text-slate-500">ED: {ed}</span>
                            </td>
                            <td className="p-2 text-right font-mono border-r border-slate-100">{it.qty}</td>
                            <td className="p-2 text-right font-mono font-semibold text-emerald-700 border-r border-slate-100">
                              {it.received_qty != null ? it.received_qty : it.qty}
                            </td>
                            <td className="p-2 border-r border-slate-100 text-slate-600">{it.unit?.name || it.unit_name || "Pcs"}</td>
                            <td className="p-2 text-right font-mono border-r border-slate-100">{formatCurrency(it.unit_price || 0)}</td>
                            <td className="p-2 text-right font-mono border-r border-slate-100 text-slate-500">
                              {it.discount_percent > 0 ? `${it.discount_percent}%` : it.discount_amount > 0 ? formatCurrency(it.discount_amount) : "-"}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(it.total_amount || (it.qty * it.unit_price) || 0)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Footer */}
              <div className="flex justify-end pt-2 border-t border-slate-200">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(inv?.subtotal || inv?.total_amount || 0)}</span>
                  </div>
                  {inv?.discount_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Total Diskon:</span>
                      <span className="font-mono text-rose-600">-{formatCurrency(inv.discount_amount)}</span>
                    </div>
                  )}
                  {inv?.tax_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>PPN ({inv.tax_percent || 11}%):</span>
                      <span className="font-mono">+{formatCurrency(inv.tax_amount)}</span>
                    </div>
                  )}
                  {inv?.shipping_cost > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Ongkos Kirim:</span>
                      <span className="font-mono">+{formatCurrency(inv.shipping_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200 text-sm">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-700">{formatCurrency(inv?.total_amount || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "documents" ? (
            /* TAB 3: DOKUMEN LAMPIRAN PBF & SP */
            <div className="max-w-4xl mx-auto flex flex-col h-full space-y-3">
              {/* SUB-TAB TOGGLE */}
              <div className="flex items-center gap-2 bg-slate-200 p-1 rounded-lg w-fit shrink-0">
                <button
                  type="button"
                  onClick={() => setDocSubTab("sp")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    docSubTab === "sp"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  <span>Review Dokumen SP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocSubTab("pbf")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    docSubTab === "pbf"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Upload &amp; Kelola Lampiran Berkas PBF</span>
                </button>
              </div>

              {/* SUB-TAB 1: DOKUMEN SP VIEWER */}
              {docSubTab === "sp" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[500px]">
                  <DokumenSPViewer orderId={inv?.purchase_order_id || inv?.id} poData={poData} />
                </div>
              )}

              {/* SUB-TAB 2: UPLOAD DOKUMEN PBF */}
              {docSubTab === "pbf" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col flex-1 min-h-[500px]">
                  <PbfDocumentUpload
                    entityType="purchase"
                    entityId={inv?.id || ""}
                    title={`Lampiran Berkas Pembelian PBF (${inv?.invoice_no || "Faktur"})`}
                    subtitle=""
                  />
                </div>
              )}
            </div>
          ) : (
            /* TAB 4: RIWAYAT & AUDIT TRAIL */
            <div className="max-w-4xl mx-auto bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <History className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-800">
                  Jejak Audit &amp; Riwayat Perubahan Status Pembelian
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Event 1: PO Created */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                    ✓
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Pembelian Dibuat (Surat Pesanan Resmi)</h5>
                    <p className="text-[11px] text-slate-500">
                      Tanggal: <span className="font-semibold text-slate-700">{formatDate(inv?.date)}</span> oleh{" "}
                      <strong className="text-slate-800">{inv?.user?.full_name || inv?.user?.username || "Admin"}</strong>
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      No. Faktur: <span className="font-mono text-slate-600">{inv?.invoice_no}</span> &nbsp;|&nbsp;
                      Total: <span className="font-mono text-slate-600">{formatCurrency(inv?.total_amount || 0)}</span>
                    </p>
                  </div>
                </div>

                {/* Event 2: Warehouse Physical Check */}
                <div className="relative">
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${
                      currentStep > 2
                        ? "bg-emerald-600 text-white"
                        : currentStep === 2
                        ? "bg-amber-500 text-white animate-pulse"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {currentStep > 2 ? "✓" : "2"}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Pemeriksaan Fisik Barang oleh Gudang</h5>
                    {currentStep > 2 ? (
                      <>
                        <p className="text-[11px] text-slate-500">
                          Diverifikasi pada: <span className="font-semibold text-slate-700">{formatDate(inv?.warehouse_verified_at)}</span> oleh{" "}
                          <strong className="text-slate-800">
                            {inv?.warehouse_verifier?.full_name || inv?.warehouse_verifier?.username || "Petugas Gudang"}
                          </strong>
                        </p>
                        {inv?.warehouse_notes && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded mt-1 border border-slate-200 italic">
                            "{inv.warehouse_notes}"
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-amber-700 font-medium">
                        Menunggu obat fisik tiba dari kurir PBF dan diperiksa oleh Petugas Gudang.
                      </p>
                    )}
                  </div>
                </div>

                {/* Event 3: Admin Approval */}
                <div className="relative">
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${
                      currentStep > 3
                        ? "bg-emerald-600 text-white"
                        : currentStep === 3
                        ? "bg-blue-600 text-white animate-pulse"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {currentStep > 3 ? "✓" : "3"}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Verifikasi Berkas &amp; Persetujuan Admin (Apoteker)</h5>
                    {currentStep > 3 ? (
                      <>
                        <p className="text-[11px] text-slate-500">
                          Disetujui pada: <span className="font-semibold text-slate-700">{formatDate(inv?.admin_approved_at)}</span> oleh{" "}
                          <strong className="text-slate-800">
                            {inv?.admin_approver?.full_name || inv?.admin_approver?.username || "Apoteker Utama"}
                          </strong>
                        </p>
                        {inv?.admin_notes && (
                          <p className="text-[11px] text-slate-600 bg-emerald-50 p-2 rounded mt-1 border border-emerald-200 italic">
                            "{inv.admin_notes}"
                          </p>
                        )}
                      </>
                    ) : currentStep === 3 ? (
                      <p className="text-[11px] text-blue-700 font-medium">
                        Fisik obat telah selesai dicek gudang. Menunggu verifikasi dokumen &amp; persetujuan Admin.
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Belum dapat diproses sebelum fisik barang diterima oleh Gudang.
                      </p>
                    )}
                  </div>
                </div>

                {/* Event 4: Debt & Payment */}
                <div className="relative">
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${
                      isPaid
                        ? "bg-emerald-600 text-white"
                        : currentStep >= 4
                        ? "bg-rose-500 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isPaid ? "✓" : "4"}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Pelunasan Tagihan Hutang ke Distributor</h5>
                    {isPaid ? (
                      <p className="text-[11px] text-emerald-700 font-bold">
                        Tagihan telah lunas dibayar ke supplier distributor PBF.
                      </p>
                    ) : currentStep >= 4 ? (
                      <p className="text-[11px] text-slate-600">
                        Sisa tagihan: <strong className="text-rose-600 font-mono">{formatCurrency(inv?.remaining_amount || 0)}</strong> dari total{" "}
                        <strong className="font-mono">{formatCurrency(inv?.total_amount || 0)}</strong>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Hutang usaha akan dicatat resmi setelah verifikasi Admin selesai.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. MODAL FOOTER */}
        <div className="shrink-0 px-4 py-2 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Standar CDOB / BPOM RI</span>
            <span>•</span>
            <span>Apotek &amp; PBF Medika Nusantara</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs shadow-2xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlurPembelianModal;
