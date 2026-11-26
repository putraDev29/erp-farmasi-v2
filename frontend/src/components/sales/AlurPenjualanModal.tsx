"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  RotateCcw,
  Check,
  PackageCheck,
  AlertCircle,
  Truck,
  CheckCircle2,
  FileText,
  Paperclip,
  History,
  ShieldCheck,
  Boxes,
  Wallet,
  Printer,
  Calendar,
  Send,
  UserCheck,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";
import { DokumenSPSalesViewer } from "./DokumenSPSalesViewer";

interface AlurPenjualanModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string | null;
  isGudang: boolean;
  isAdmin: boolean;
}

const SALES_STAGES = [
  { step: 1, key: "order", label: "Pemesanan (SP/SO)" },
  { step: 2, key: "shipping", label: "Pengiriman Gudang" },
  { step: 3, key: "receive", label: "Konfirmasi Pelanggan" },
  { step: 4, key: "payment", label: "Pelunasan Piutang" },
];

export const AlurPenjualanModal: React.FC<AlurPenjualanModalProps> = ({
  isOpen,
  onClose,
  saleId,
  isGudang,
  isAdmin,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"action" | "items" | "documents" | "history">("action");
  const [docSubTab, setDocSubTab] = useState<"sp" | "pbf">("sp");
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Fetch Company Profile for custom Stempel & Tanda Tangan uploaded from Pengaturan
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      try {
        const res = await api.get("/companies");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });
  const company = companies[0];

  // Step 2 Gudang Verification States (Hanya Nomor Batch, ED, dan Komentar Gudang)
  const [warehouseNotes, setWarehouseNotes] = useState("");
  const [itemBatchMap, setItemBatchMap] = useState<Record<string, string>>({});
  const [itemExpiredMap, setItemExpiredMap] = useState<Record<string, string>>({});

  // Step 3 Admin Verification States (Ekspedisi Kurir & Serah Terima Pelanggan)
  const [courier, setCourier] = useState("Kurir Internal Apotek");
  const [trackingNo, setTrackingNo] = useState("");
  const [recipient, setRecipient] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [receivedBy, setReceivedBy] = useState("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [receivedProofURL, setReceivedProofURL] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");

  // Fetch full sale detail
  const {
    data: sale,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["sale-detail-alur", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const res = await api.get(`/sales/${saleId}`);
      return res.data?.data || null;
    },
    enabled: isOpen && !!saleId,
  });

  // Sync state when sale loads
  useEffect(() => {
    if (sale) {
      setRecipient(sale.customer?.name || "");
      setTrackingNo(sale.delivery_order_no || "");
      setCourier(sale.delivery_courier || "Kurir Internal Apotek");
      if (sale.delivery_date) {
        setDeliveryDate(new Date(sale.delivery_date).toISOString().split("T")[0]);
      }
      setWarehouseNotes(sale.warehouse_notes || "");
      setReceivedBy(sale.received_by || sale.customer?.name || "Pelanggan");
      if (sale.received_date) {
        setReceivedDate(new Date(sale.received_date).toISOString().split("T")[0]);
      }
      setReceivedProofURL(sale.received_proof_url || "");
      setReceiveNotes(sale.admin_notes || "");

      const bMap: Record<string, string> = {};
      const eMap: Record<string, string> = {};
      (sale.items || []).forEach((it: any) => {
        bMap[it.id] = it.batch_number || "";
        eMap[it.id] = it.expired_date ? new Date(it.expired_date).toISOString().split("T")[0] : "";
      });
      setItemBatchMap(bMap);
      setItemExpiredMap(eMap);
    }
  }, [sale]);

  useEffect(() => {
    setSelectedStep(null);
  }, [saleId, isOpen]);

  // Determine Current Step based on Sales Status
  // Status: DRAFT, POSTED, CANCELLED, MENUNGGU_PENGIRIMAN, APPROVED, DIPROSES, DIKIRIM, SELESAI
  let currentStep = 1;
  const status = (sale?.status || "").toUpperCase();
  const isPaid = sale?.payment_status === "PAID" || (sale?.remaining_amount != null && sale.remaining_amount <= 0 && sale.total_amount > 0);
  const deliveryMethod = ((sale?.delivery_method || sale?.sales_order?.delivery_method || (sale?.type === "POS" ? "DIAMBIL" : "DIKIRIM")) as string).toUpperCase();
  const isSelfPickup = deliveryMethod === "DIAMBIL";
  const isShipped = status === "DIKIRIM" || status === "SELESAI" || !!sale?.warehouse_shipped_at;
  const isReceived = status === "SELESAI" || !!sale?.received_date;

  if (isReceived) {
    currentStep = 4;
  } else if (isShipped) {
    currentStep = 3;
  } else if (status === "MENUNGGU_PENGIRIMAN" || status === "APPROVED" || status === "DIPROSES" || status === "DRAFT") {
    currentStep = 2;
  } else if (status === "POSTED") {
    // POS retail or direct completed sale
    currentStep = isPaid ? 4 : 4;
  } else {
    currentStep = 1;
  }

  const activeStep = selectedStep ?? currentStep;

  // Ship Mutation (HANYA Petugas Gudang - Verifikasi Fisik & Nomor Batch / ED)
  const shipMutation = useMutation({
    mutationFn: async () => {
      if (!sale?.id) throw new Error("ID Faktur tidak valid");
      const itemsPayload = (sale.items || []).map((it: any) => ({
        product_id: it.product_id,
        batch_number: itemBatchMap[it.id] || it.batch_number || "",
        expired_date: itemExpiredMap[it.id] ? new Date(itemExpiredMap[it.id]).toISOString() : undefined,
        qty: it.qty,
      }));

      const payload = {
        notes: warehouseNotes || `Verifikasi fisik obat selesai disiapkan oleh Petugas Gudang untuk Faktur ${sale.invoice_no}`,
        items: itemsPayload,
      };

      return await api.post(`/sales/${sale.id}/ship`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sale-detail-alur", saleId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      refetch();
      alert("✅ Verifikasi fisik obat oleh Gudang berhasil diselesaikan!\nStok fisik telah diperbarui dan diteruskan ke Admin untuk verifikasi ekspedisi.");
    },
    onError: (err: any) => {
      alert("Gagal memverifikasi obat gudang: " + (err.response?.data?.message || err.message));
    },
  });

  // Receive Mutation (HANYA Admin - Input Ekspedisi Kurir & Konfirmasi Serah Terima Pelanggan)
  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!sale?.id) throw new Error("ID Faktur tidak valid");
      const payload = {
        courier: isSelfPickup ? "Diambil Pelanggan Langsung" : courier || "Kurir Internal Apotek",
        tracking_no: trackingNo || sale.delivery_order_no || undefined,
        delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
        received_by: receivedBy || sale.customer?.name || "Pelanggan",
        received_date: receivedDate ? new Date(receivedDate).toISOString() : undefined,
        received_proof_url: receivedProofURL || undefined,
        notes: receiveNotes || `Konfirmasi ekspedisi & serah terima pelanggan untuk Faktur ${sale.invoice_no}`,
      };

      return await api.post(`/sales/${sale.id}/receive`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sale-detail-alur", saleId] });
      refetch();
      alert("✅ Ekspedisi & Konfirmasi penerimaan obat berhasil dicatat!\nSeluruh alur pengiriman dan serah terima pelanggan telah SELESAI.");
    },
    onError: (err: any) => {
      alert("Gagal menyelesaikan alur pengiriman: " + (err.response?.data?.message || err.message));
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Modal Container: w-full max-w-4xl h-[92vh] max-h-[850px] */}
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
                  Alur Transaksi Penjualan: <span className="font-mono text-emerald-400">{sale?.invoice_no || "..."}</span>
                </h3>
                {/* Status Alur Badge */}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs ${
                    status === "SELESAI"
                      ? "bg-emerald-500 text-white"
                      : status === "DIKIRIM"
                      ? "bg-indigo-600 text-white"
                      : status === "MENUNGGU_PENGIRIMAN" || status === "APPROVED"
                      ? "bg-amber-500 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {status === "SELESAI"
                    ? "Selesai Diterima"
                    : status === "DIKIRIM"
                    ? "Dalam Pengiriman"
                    : status === "MENUNGGU_PENGIRIMAN" || status === "APPROVED"
                    ? "Siap Dikirim Gudang"
                    : status || "Draft Penjualan"}
                </span>
                {/* Status Bayar Badge */}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs ${
                    isPaid ? "bg-emerald-600 text-white" : "bg-rose-500 text-white"
                  }`}
                >
                  {isPaid ? "Lunas" : "Belum Lunas"}
                </span>
                {/* Metode Penyerahan Badge */}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs ${
                    isSelfPickup
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                      : "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                  }`}
                >
                  {isSelfPickup ? "Diambil Pelanggan Langsung" : "Melalui Pengiriman"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pelanggan: <strong className="text-slate-200">{sale?.customer?.name || "-"}</strong> &nbsp;|&nbsp; Gudang:{" "}
                <strong className="text-slate-200">{sale?.warehouse?.name || "Utama"}</strong> &nbsp;|&nbsp; Total:{" "}
                <strong className="text-emerald-400 font-mono">{formatCurrency(sale?.total_amount || 0)}</strong>
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

        {/* 2. PROGRESS STEPPER (Teks di bawah ikon seperti Alur Pembelian) */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {SALES_STAGES.map((stage, idx) => {
              const isPassed = stage.step < currentStep || (stage.step === 4 && isPaid);
              const isCurrent = stage.step === currentStep && !(stage.step === 4 && isPaid);
              const isViewing = stage.step === activeStep && activeTab === "action";

              return (
                <React.Fragment key={stage.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStep(stage.step);
                      setActiveTab("action");
                    }}
                    className="flex flex-col items-center gap-1.5 text-center px-2 py-0.5 rounded-lg transition shrink-0 cursor-pointer hover:opacity-90 select-none"
                    title={`Klik untuk membuka Tahap ${stage.step}: ${stage.label}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs transition-all ${
                        isViewing
                          ? isPassed
                            ? "bg-emerald-600 text-white ring-4 ring-sky-300 scale-110"
                            : "bg-blue-600 text-white ring-4 ring-blue-200 scale-110"
                          : isPassed
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-200"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 scale-105"
                          : "bg-slate-200 text-slate-400 border border-slate-300"
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : stage.step}
                    </div>
                    <span
                      className={`text-[11px] font-bold leading-tight whitespace-nowrap ${
                        isViewing
                          ? isPassed
                            ? "text-emerald-900 underline decoration-sky-500 decoration-2 underline-offset-4"
                            : "text-blue-700 underline decoration-blue-500 decoration-2 underline-offset-4"
                          : isPassed
                          ? "text-emerald-800"
                          : isCurrent
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </button>

                  {idx < SALES_STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 -mt-5 transition-colors ${
                        idx < currentStep - 1 || (currentStep === 4 && isPaid)
                          ? "bg-emerald-500"
                          : idx === currentStep - 1 && !(currentStep === 4 && isPaid)
                          ? "bg-blue-300"
                          : "bg-slate-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
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
              <span>Rincian Item Obat ({sale?.items?.length || 0})</span>
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
                📦 Gudang
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-300">
                🛡️ Admin / Kasir
              </span>
            )}
          </div>
        </div>

        {/* 4. TAB BODY (SCROLLABLE AREA) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50 text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              Memuat data transaksi penjualan...
            </div>
          ) : activeTab === "action" ? (
            /* TAB 1: EKSEKUSI TAHAPAN AKTIF (Hanya memunculkan tahapan aktif saat itu saja) */
            <div className="max-w-4xl mx-auto space-y-4">
              {/* TAHAP 1: INFO PEMESANAN (Hanya muncul jika activeStep === 1) */}
              {activeStep === 1 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Tahap 1: Surat Pesanan (SP) &amp; Pembuatan Faktur Penjualan
                        </h4>
                        <p className="text-[10.5px] text-slate-500">
                          Dibuat pada {formatDate(sale?.date)} oleh{" "}
                          <strong className="text-slate-700">{sale?.user?.full_name || sale?.user?.username || "Admin"}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10.5px] pt-1">
                    <div>
                      <span className="text-slate-400 block">Pelanggan Pemesan:</span>
                      <strong className="text-slate-800 text-xs">{sale?.customer?.name || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Gudang Asal:</span>
                      <strong className="text-slate-800">{sale?.warehouse?.name || "Utama"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">No. SP Pemesan:</span>
                      <strong className="text-slate-800 font-mono">{sale?.customer_sp_number || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Faktur PBF Asal:</span>
                      <strong className="text-slate-800 font-mono">{sale?.pbf_origin_invoice_no || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Metode Penyerahan:</span>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSelfPickup
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-sky-100 text-sky-800 border border-sky-300"
                        }`}
                      >
                        {isSelfPickup ? "Diambil Pelanggan Langsung" : "Melalui Pengiriman"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAHAP 2: VERIFIKASI FISIK & OBAT OLEH GUDANG (Muncul jika activeStep === 2) */}
              {activeStep === 2 && (
                <div className="p-4 rounded-xl border border-indigo-300 ring-2 ring-indigo-50 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <PackageCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Tahap 2: Verifikasi Fisik Obat &amp; Penyiapan Barang oleh Gudang
                        </h4>
                        <p className="text-[10.5px] text-slate-500">
                          {isSelfPickup
                            ? "Petugas gudang memeriksa fisik, nomor batch & ED untuk diserahkan saat pelanggan mengambil langsung di apotek."
                            : "Petugas gudang memeriksa kondisi fisik obat, mencocokkan nomor batch dan tanggal kedaluwarsa sebelum dikirim."}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        currentStep > 2
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-indigo-100 text-indigo-800 border border-indigo-300 animate-pulse"
                      }`}
                    >
                      {currentStep > 2 ? "✓ Tahap Gudang Selesai" : "Sedang Berlangsung (Tahap Gudang)"}
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Role Notice */}
                    {!isGudang && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>Perhatian Hak Akses:</strong> Anda login sebagai Admin/Apoteker. Penyiapan fisik obat dan pemeriksaan nomor batch/ED wajib dilakukan oleh akun Petugas Gudang (Logistik). Form dan tombol simpan dinonaktifkan.
                        </span>
                      </div>
                    )}

                    {/* Tabel Rincian Item Obat yang Diperiksa Gudang */}
                    <div className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                        <h5 className="font-bold text-slate-800 text-[11.5px] flex items-center gap-1.5">
                          <PackageCheck className="w-4 h-4 text-emerald-600" />
                          <span>Pemeriksaan Nomor Batch &amp; Expired Date Obat oleh Gudang :</span>
                        </h5>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {sale?.items?.length || 0} obat disiapkan
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 text-[10.5px]">
                            <tr>
                              <th className="py-1.5 px-2 text-center w-8">No</th>
                              <th className="py-1.5 px-2.5 w-24">Kode</th>
                              <th className="py-1.5 px-2.5">Nama Obat / Item</th>
                              <th className="py-1.5 px-2 text-center w-16">Satuan</th>
                              <th className="py-1.5 px-2.5 text-right w-20 bg-emerald-50 text-emerald-900 font-bold">Qty Siap</th>
                              <th className="py-1.5 px-2.5 w-36">No. Batch</th>
                              <th className="py-1.5 px-2.5 w-36">Expired Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(sale?.items || []).map((it: any, idx: number) => {
                              const batchVal = itemBatchMap[it.id] ?? (it.batch_number || "");
                              const expVal = itemExpiredMap[it.id] ?? (it.expired_date ? new Date(it.expired_date).toISOString().split("T")[0] : "");

                              return (
                                <tr key={it.id || idx} className="hover:bg-slate-50 transition">
                                  <td className="py-1.5 px-2 text-center text-slate-500">{idx + 1}</td>
                                  <td className="py-1.5 px-2.5 font-mono font-medium text-slate-800">
                                    {it.product?.code || it.product?.sku || "-"}
                                  </td>
                                  <td className="py-1.5 px-2.5 font-medium text-slate-900">
                                    {it.product?.name || "-"}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-600">
                                    {it.unit?.name || "PCS"}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                                    {Number(it.qty).toFixed(2)}
                                  </td>
                                  <td className="py-1 px-1.5">
                                    <input
                                      type="text"
                                      disabled={!isGudang || currentStep > 2}
                                      value={batchVal}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setItemBatchMap((prev) => ({ ...prev, [it.id]: v }));
                                      }}
                                      placeholder="Nomor Batch..."
                                      className="w-full h-6 px-1.5 font-mono text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-medium focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    />
                                  </td>
                                  <td className="py-1 px-1.5">
                                    <input
                                      type="date"
                                      disabled={!isGudang || currentStep > 2}
                                      value={expVal}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setItemExpiredMap((prev) => ({ ...prev, [it.id]: v }));
                                      }}
                                      className="w-full h-6 px-1.5 font-mono text-[10.5px] border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Komentar / Catatan Verifikasi Gudang di Bawah Rincian Obat */}
                    <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 space-y-1.5">
                      <label className="block text-amber-950 font-bold text-[11px] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        <span>Komentar / Catatan Verifikasi Gudang :</span>
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isGudang || currentStep > 2}
                        value={warehouseNotes}
                        onChange={(e) => setWarehouseNotes(e.target.value)}
                        placeholder="Tuliskan catatan verifikasi fisik obat oleh Gudang (misal: Kemasan tersegel rapi, batch & ED obat sesuai fisik rak gudang, siap diserahkan ke Admin/Ekspedisi)..."
                        className="w-full p-2 border border-slate-300 rounded text-[11px] bg-white text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 placeholder:text-slate-400"
                      />
                      <p className="text-[10px] text-slate-500">
                        * Catatan ini akan otomatis muncul pada lembar verifikasi Admin untuk input ekspedisi dan serah terima.
                      </p>
                    </div>

                    {/* Tombol Eksekusi Verifikasi Gudang */}
                    <div className="flex justify-end pt-1">
                      {currentStep > 2 ? (
                        <div className="px-4 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg flex items-center gap-2 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Pemeriksaan fisik dan penyiapan obat oleh Gudang telah selesai</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!isGudang || shipMutation.isPending}
                          onClick={() => shipMutation.mutate()}
                          className={`px-5 py-2 font-bold rounded-lg flex items-center gap-2 shadow-sm transition active:scale-95 ${
                            isGudang && !shipMutation.isPending
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer ring-2 ring-indigo-300"
                              : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {shipMutation.isPending ? "Menyimpan Verifikasi..." : "Verifikasi Fisik & Siapkan Obat (Selesaikan Tahap Gudang)"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAHAP 3: VERIFIKASI ADMIN SETELAH GUDANG & PENGIRIMAN EKSPEDISI / SERAH TERIMA */}
              {activeStep === 3 && (
                <div className="p-4 rounded-xl border border-teal-300 ring-2 ring-teal-50 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Tahap 3: Verifikasi Admin Setelah Gudang, Informasi Ekspedisi &amp; Konfirmasi Penerimaan
                        </h4>
                        <p className="text-[10.5px] text-slate-500">
                          Obat telah diverifikasi secara fisik oleh Gudang. Admin melengkapi informasi ekspedisi pengantar dan memverifikasi serah terima pelanggan.
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        currentStep > 3
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-teal-100 text-teal-800 border border-teal-300 animate-pulse"
                      }`}
                    >
                      {currentStep > 3 ? "✓ Tahap Admin & Ekspedisi Selesai" : "Sedang Berlangsung (Tahap Admin)"}
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Role Notice */}
                    {isGudang && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>Perhatian Hak Akses:</strong> Anda login sebagai Petugas Gudang. Input informasi ekspedisi dan konfirmasi penerimaan pelanggan dilakukan oleh Admin / Kasir. Form dinonaktifkan.
                        </span>
                      </div>
                    )}

                    {/* Ringkasan Hasil Verifikasi Gudang Sebelumnya */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 text-[11px] space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Hasil Verifikasi Fisik oleh Petugas Gudang :</span>
                        </div>
                        <span className="text-slate-500 text-[10.5px]">
                          {sale?.warehouse_shipped_at ? formatDate(sale.warehouse_shipped_at) : "Sudah Diverifikasi"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="text-slate-500 block">Petugas Gudang Pemeriksa:</span>
                          <strong className="text-slate-900 font-semibold">
                            {sale?.warehouse_shipper?.full_name || sale?.warehouse_shipper?.username || "Petugas Gudang"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">No. Dokumen Gudang / SJ:</span>
                          <strong className="text-slate-900 font-mono">
                            {sale?.delivery_order_no || "-"}
                          </strong>
                        </div>
                      </div>

                      {/* Catatan / Komentar Gudang */}
                      <div className="bg-amber-50 p-2 rounded border border-amber-200 text-[10.5px]">
                        <span className="font-semibold text-amber-900 block">Catatan / Komentar Petugas Gudang:</span>
                        <p className="text-slate-800 italic mt-0.5">
                          "{sale?.warehouse_notes || "Pemeriksaan fisik obat selesai, kondisi kemasan utuh, batch dan ED sesuai fisik."}"
                        </p>
                      </div>
                    </div>

                    {/* Form Informasi Ekspedisi / Kurir Pengantar (Diinput oleh ADMIN saat Verifikasi Setelah Gudang, hanya jika Melalui Pengiriman) */}
                    {isSelfPickup ? (
                      <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 flex items-center gap-2 text-amber-900 text-[11px]">
                        <PackageCheck className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Diambil Pelanggan Langsung:</strong> Transaksi ini diambil langsung oleh pelanggan di apotek (tidak melalui ekspedisi pengiriman). Silakan konfirmasi data penerima di bawah ini.
                        </span>
                      </div>
                    ) : (
                    <div className="bg-indigo-50/40 p-3 rounded-lg border border-indigo-200 space-y-2.5">
                      <h5 className="font-bold text-[11.5px] text-indigo-950 flex items-center gap-1.5 border-b border-indigo-200 pb-1.5">
                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Informasi Ekspedisi / Kurir Pengantar (Input Admin) :</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            Kurir / Ekspedisi :
                          </label>
                          <input
                            type="text"
                            disabled={isGudang || !isAdmin || currentStep > 3}
                            value={courier}
                            onChange={(e) => setCourier(e.target.value)}
                            placeholder="Kurir Internal / JNE / Driver PBF"
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            No. Surat Jalan / Resi Pengiriman :
                          </label>
                          <input
                            type="text"
                            disabled={isGudang || !isAdmin || currentStep > 3}
                            value={trackingNo}
                            onChange={(e) => setTrackingNo(e.target.value)}
                            placeholder="Contoh: SJ-2026/11/0088 / RESI-12345"
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-900 font-mono focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            Tanggal Pengiriman :
                          </label>
                          <input
                            type="date"
                            disabled={isGudang || !isAdmin || currentStep > 3}
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Form Input Serah Terima Pelanggan */}
                    <div className="bg-teal-50/40 p-3 rounded-lg border border-teal-200 space-y-2.5">
                      <h5 className="font-bold text-[11.5px] text-teal-950 flex items-center gap-1.5 border-b border-teal-200 pb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Data Konfirmasi Serah Terima Pelanggan :</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            Nama Penerima di Lokasi :
                          </label>
                          <input
                            type="text"
                            disabled={isGudang || !isAdmin || currentStep > 3}
                            value={receivedBy}
                            onChange={(e) => setReceivedBy(e.target.value)}
                            placeholder="Contoh: Apt. Sarah, S.Farm / Petugas Klinik"
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-900 focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                            Tanggal Diterima :
                          </label>
                          <input
                            type="date"
                            disabled={isGudang || !isAdmin || currentStep > 3}
                            value={receivedDate}
                            onChange={(e) => setReceivedDate(e.target.value)}
                            className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-900 focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold text-[10.5px] mb-1">
                          Catatan Penerimaan / No. Dokumen Tanda Terima :
                        </label>
                        <input
                          type="text"
                          disabled={isGudang || !isAdmin || currentStep > 3}
                          value={receiveNotes}
                          onChange={(e) => setReceiveNotes(e.target.value)}
                          placeholder="Obat diterima lengkap dalam kondisi baik berstempel sarana..."
                          className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-900 focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    {/* Tombol Eksekusi Konfirmasi Terima */}
                    <div className="flex justify-end pt-1">
                      {currentStep > 3 ? (
                        <div className="px-4 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg flex items-center gap-2 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Ekspedisi dan konfirmasi penerimaan pelanggan telah selesai diverifikasi</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isGudang || !isAdmin || receiveMutation.isPending}
                          onClick={() => receiveMutation.mutate()}
                          className={`px-5 py-2 font-bold rounded-lg flex items-center gap-2 shadow-sm transition active:scale-95 ${
                            !isGudang && isAdmin && !receiveMutation.isPending
                              ? "bg-teal-600 hover:bg-teal-700 text-white cursor-pointer ring-2 ring-teal-300"
                              : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {receiveMutation.isPending
                              ? "Menyimpan Konfirmasi..."
                              : isSelfPickup
                              ? "Konfirmasi Diambil Pelanggan (Selesai)"
                              : "Simpan Ekspedisi & Konfirmasi Selesai"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAHAP 4: STATUS PELUNASAN PIUTANG & SELESAI (Muncul jika activeStep === 4) */}
              {activeStep === 4 && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                          isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          Tahap 4: Pembayaran &amp; Pelunasan Piutang Penjualan
                        </h4>
                        <p className="text-[10.5px] text-slate-500">
                          {isPaid
                            ? "Faktur penjualan ini telah LUNAS dibayar oleh pelanggan."
                            : `Piutang usaha aktif dengan sisa tagihan: ${formatCurrency(sale?.remaining_amount || 0)}`}
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
                      <strong className="text-slate-900 text-xs font-mono">{formatCurrency(sale?.total_amount || 0)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Sudah Dibayar Pelanggan:</span>
                      <strong className="text-emerald-700 text-xs font-mono">{formatCurrency(sale?.paid_amount || 0)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Sisa Piutang:</span>
                      <strong className="text-rose-700 text-xs font-mono">{formatCurrency(sale?.remaining_amount || 0)}</strong>
                    </div>
                  </div>

                  {/* Selesai Summary Banner */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Pemesanan obat telah selesai dikirim, diverifikasi, dan tercatat dalam buku penjualan.
                      </span>
                    </div>

                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(`/sales/payments/new?sale_id=${sale?.id}`);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs cursor-pointer flex items-center gap-1 transition"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Input Pembayaran Piutang</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "items" ? (
            /* TAB 2: RINCIAN ITEM OBAT & BATCH */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                <h4 className="font-bold text-xs text-slate-800">
                  Daftar Item Obat &amp; Nomor Batch ({sale?.items?.length || 0} item)
                </h4>
                <span className="text-[10.5px] text-slate-500 font-mono">
                  Total Qty: {(sale?.items || []).reduce((acc: number, it: any) => acc + Number(it.qty || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[10.5px]">
                    <tr>
                      <th className="py-1.5 px-2 text-center w-8">No</th>
                      <th className="py-1.5 px-2.5 w-24">Kode</th>
                      <th className="py-1.5 px-2.5">Nama Obat / Produk</th>
                      <th className="py-1.5 px-2 text-center w-16">Satuan</th>
                      <th className="py-1.5 px-2 text-right w-20">Qty</th>
                      <th className="py-1.5 px-2.5 w-32">Nomor Batch</th>
                      <th className="py-1.5 px-2.5 w-28">Expired Date</th>
                      <th className="py-1.5 px-2.5 text-right w-24">Harga Satuan</th>
                      <th className="py-1.5 px-2.5 text-right w-24">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(sale?.items || []).map((it: any, idx: number) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-700">{it.product?.code || it.product?.sku || "-"}</td>
                        <td className="py-1.5 px-2.5 font-medium text-slate-900">{it.product?.name || "-"}</td>
                        <td className="py-1.5 px-2 text-center text-slate-600">{it.unit?.name || "PCS"}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800">{Number(it.qty).toFixed(2)}</td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-700">{it.batch_number || "-"}</td>
                        <td className="py-1.5 px-2.5 text-slate-600">{it.expired_date ? formatDate(it.expired_date) : "-"}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">{formatCurrency(it.unit_price)}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(it.total_amount || (it.qty * it.unit_price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "documents" ? (
            /* TAB 3: DOKUMEN (REVIEW DOKUMEN SP OTOMATIS & UPLOAD BERKAS) */
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[500px]">
              {/* Sub-tab Navigation */}
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDocSubTab("sp")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      docSubTab === "sp"
                        ? "bg-white text-emerald-800 shadow-xs border border-slate-300"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dokumen SP Otomatis (Surat Pesanan)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocSubTab("pbf")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      docSubTab === "pbf"
                        ? "bg-white text-indigo-800 shadow-xs border border-slate-300"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload &amp; Kelola Lampiran Berkas PBF &amp; SP</span>
                  </button>
                </div>

                <span className="text-[10.5px] text-slate-500 font-mono">
                  No. SP: {sale?.customer_sp_number || "SP/..."}
                </span>
              </div>

              {/* Sub-tab Content */}
              <div className="flex-1 min-h-0 flex flex-col">
                {docSubTab === "sp" && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[500px]">
                    <DokumenSPSalesViewer sale={sale} company={company} />
                  </div>
                )}
                {docSubTab === "pbf" && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col flex-1 min-h-[500px]">
                    <PbfDocumentUpload
                      entityType="sale"
                      entityId={sale?.id || ""}
                      title={`Dokumen Lampiran Penjualan: ${sale?.invoice_no}`}
                      subtitle="Unggah scan surat pesanan pemesan, faktur PBF asal, surat jalan ekspedisi, atau berkas tanda terima pelanggan."
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 4: RIWAYAT & AUDIT TRAIL */
            <div className="max-w-4xl mx-auto bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <History className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-800">
                  Jejak Audit &amp; Riwayat Perubahan Status Penjualan
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Event 1: Sales Created (SP / SO / Faktur Penjualan) */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                    ✓
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Penjualan Dibuat (Surat Pesanan Resmi)</h5>
                    <p className="text-[11px] text-slate-500">
                      Tanggal: <span className="font-semibold text-slate-700">{formatDate(sale?.date)}</span> oleh{" "}
                      <strong className="text-slate-800">{sale?.user?.full_name || sale?.user?.username || "Admin"}</strong>
                    </p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      No. Faktur: <span className="font-mono text-slate-600">{sale?.invoice_no}</span>
                      {sale?.customer_sp_number && (
                        <> &nbsp;|&nbsp; No. SP: <span className="font-mono text-slate-600">{sale.customer_sp_number}</span></>
                      )}
                      &nbsp;|&nbsp; Total: <span className="font-mono text-slate-600">{formatCurrency(sale?.total_amount || 0)}</span>
                    </p>
                  </div>
                </div>

                {/* Event 2: Gudang Physical Check & Preparation */}
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
                          Diverifikasi pada: <span className="font-semibold text-slate-700">{formatDate(sale?.warehouse_shipped_at)}</span> oleh{" "}
                          <strong className="text-slate-800">
                            {sale?.warehouse_shipper?.full_name || sale?.warehouse_shipper?.username || "Petugas Gudang"}
                          </strong>
                        </p>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">
                          No. Dokumen Gudang / SJ: <span className="font-mono text-slate-700">{sale?.delivery_order_no || "-"}</span>
                        </p>
                        {sale?.warehouse_notes && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded mt-1 border border-slate-200 italic">
                            "{sale.warehouse_notes}"
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-amber-700 font-medium">
                        Menunggu penyiapan fisik obat dan pemeriksaan nomor batch / ED oleh Petugas Gudang.
                      </p>
                    )}
                  </div>
                </div>

                {/* Event 3: Admin Expedition & Customer Receive Confirmation */}
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
                          Dikonfirmasi pada: <span className="font-semibold text-slate-700">{formatDate(sale?.received_date)}</span> | Penerima:{" "}
                          <strong className="text-slate-800">{sale?.received_by || "Pelanggan"}</strong>
                        </p>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">
                          Kurir / Ekspedisi: <span className="text-slate-700 font-medium">{sale?.delivery_courier || "Internal"}</span>
                          {sale?.delivery_order_no && (
                            <> &nbsp;|&nbsp; Resi/SJ: <span className="font-mono text-slate-700">{sale.delivery_order_no}</span></>
                          )}
                        </p>
                        {sale?.admin_notes && (
                          <p className="text-[11px] text-slate-600 bg-emerald-50 p-2 rounded mt-1 border border-emerald-200 italic">
                            "{sale.admin_notes}"
                          </p>
                        )}
                      </>
                    ) : currentStep === 3 ? (
                      <p className="text-[11px] text-blue-700 font-medium">
                        Fisik obat telah selesai dicek gudang. Menunggu input informasi ekspedisi &amp; verifikasi penerimaan oleh Admin.
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Belum dapat diproses sebelum fisik obat diperiksa dan disiapkan oleh Gudang.
                      </p>
                    )}
                  </div>
                </div>

                {/* Event 4: Debt & Payment (Pelunasan Piutang) */}
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
                    <h5 className="font-bold text-xs text-slate-900">Pelunasan Tagihan Piutang dari Pelanggan</h5>
                    {isPaid ? (
                      <p className="text-[11px] text-emerald-700 font-bold">
                        Tagihan penjualan telah LUNAS dibayar oleh pelanggan.
                      </p>
                    ) : currentStep >= 4 ? (
                      <p className="text-[11px] text-slate-600">
                        Sisa piutang: <strong className="text-rose-600 font-mono">{formatCurrency(sale?.remaining_amount || 0)}</strong> dari total{" "}
                        <strong className="font-mono">{formatCurrency(sale?.total_amount || 0)}</strong>
                        {sale?.paid_amount > 0 && (
                          <span> (Sudah dibayar: <strong className="text-emerald-700 font-mono">{formatCurrency(sale.paid_amount)}</strong>)</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Piutang usaha akan dicatat resmi setelah verifikasi Admin selesai.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. FOOTER */}
        <div className="shrink-0 px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Alur Penjualan Farmasi Standar BPOM / CDOB • PT Farmasi Medika Nusantara
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
export default AlurPenjualanModal;
