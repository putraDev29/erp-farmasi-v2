"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Calendar,
  PackageCheck,
  Eye,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Paperclip,
  Save,
} from "lucide-react";
import { api, formatCurrency, formatDate, resolveAssetUrl } from "@/lib/api";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";

interface AdminApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any;
  onSuccess?: () => void;
}

export const AdminApprovalModal: React.FC<AdminApprovalModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form states (moved from Gambar 1 into Admin Verification)
  const [pbfInvoiceNo, setPbfInvoiceNo] = useState("");
  const [pbfDeliveryOrderNo, setPbfDeliveryOrderNo] = useState("");
  const [taxInvoiceNo, setTaxInvoiceNo] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [itemBatchMap, setItemBatchMap] = useState<Record<string, string>>({});
  const [itemExpiredMap, setItemExpiredMap] = useState<Record<string, string>>({});

  // Fetch warehouses for dropdown
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Sync state with purchase prop
  useEffect(() => {
    if (purchase) {
      setPbfInvoiceNo(purchase.pbf_invoice_no || "");
      setPbfDeliveryOrderNo(purchase.pbf_delivery_order_no || "");
      setTaxInvoiceNo(purchase.tax_invoice_no || "");
      setWarehouseId(purchase.warehouse_id || (warehouses[0]?.id || ""));
      setDueDate(
        purchase.due_date
          ? new Date(purchase.due_date).toISOString().split("T")[0]
          : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
      );
      setAdminNotes(purchase.admin_notes || "");
      setIsRejectMode(false);
      setRejectReason("");

      const bMap: Record<string, string> = {};
      const eMap: Record<string, string> = {};
      (purchase.items || []).forEach((it: any) => {
        bMap[it.id] = it.batch_number || "";
        eMap[it.id] = it.expired_date
          ? new Date(it.expired_date).toISOString().split("T")[0]
          : "";
      });
      setItemBatchMap(bMap);
      setItemExpiredMap(eMap);
    }
  }, [purchase, warehouses]);

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!purchase?.id) throw new Error("ID Faktur tidak valid");

      // Validasi No Batch dan Expired Date wajib diisi Admin
      for (const it of purchase.items || []) {
        const batch = (itemBatchMap[it.id] || "").trim();
        const exp = (itemExpiredMap[it.id] || "").trim();
        if (!batch) {
          throw new Error(`Nomor Batch untuk obat "${it.product?.name || it.product?.code}" wajib diisi.`);
        }
        if (!exp) {
          throw new Error(`Expired Date untuk obat "${it.product?.name || it.product?.code}" wajib diisi.`);
        }
      }

      return await api.put(`/purchases/${purchase.id}/admin-approve`, {
        pbf_invoice_no: pbfInvoiceNo || undefined,
        pbf_delivery_order_no: pbfDeliveryOrderNo || undefined,
        tax_invoice_no: taxInvoiceNo || undefined,
        warehouse_id: warehouseId || undefined,
        due_date: dueDate || undefined,
        notes: adminNotes || undefined,
        items: (purchase.items || []).map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          batch_number: itemBatchMap[it.id]?.trim(),
          expired_date: itemExpiredMap[it.id],
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      alert(
        "✅ Pembelian berhasil diverifikasi & disetujui Admin!\n\n" +
          "• Informasi Faktur PBF & Surat Jalan resmi dicatat.\n" +
          "• Stok obat resmi bertambah ke kartu stok gudang dengan nomor batch & expired date.\n" +
          "• Hutang usaha telah dibukukan sesuai sisa tagihan faktur."
      );
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      alert("Gagal menyetujui pembelian: " + (err.response?.data?.message || err.message));
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!purchase?.id) throw new Error("ID Faktur tidak valid");
      if (!rejectReason.trim()) throw new Error("Alasan penolakan harus diisi dengan jelas.");
      return await api.put(`/purchases/${purchase.id}/admin-reject`, {
        reason: rejectReason.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      alert("⚠️ Verifikasi pembelian telah ditolak dan dikembalikan ke Gudang untuk revisi.");
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      alert("Gagal menolak pembelian: " + (err.response?.data?.message || err.message));
    },
  });

  if (!isOpen || !purchase) return null;

  const totalItems = purchase.items?.length || 0;
  const totalQty = (purchase.items || []).reduce(
    (acc: number, it: any) => acc + (Number(it.qty) || 0),
    0
  );
  const remainingDebt =
    Number(purchase.remaining_amount) > 0
      ? Number(purchase.remaining_amount)
      : Math.max(0, Number(purchase.total_amount) - Number(purchase.paid_amount));

  const isAlreadyApproved = purchase.verification_status === "APPROVED" || purchase.is_verified;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-2 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-xs">
        {/* Header Matching Gambar 3 */}
        <div className="px-4 py-3 bg-[#00c875] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                Dokumen &amp; Verifikasi Pembelian (Faktur: {purchase.invoice_no})
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  {purchase.verification_status || "VERIFIKASI_GUDANG"}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-50">
                Supplier: <strong className="text-white">{purchase.supplier?.name || "-"}</strong> | 
                Tanggal: <strong className="text-white">{formatDate(purchase.date)}</strong> | 
                Total Tagihan: <strong className="text-white">{formatCurrency(purchase.total_amount)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/70">
          {/* SECTION 1: Informasi Pengiriman & Faktur Supplier (Form dari Gambar 1 yang dipindah ke Verifikasi Admin) */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <h4 className="font-bold text-slate-800 text-[11.5px] border-b pb-1.5 flex items-center gap-1.5 text-emerald-700">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Informasi Pengiriman &amp; Faktur Supplier (Isi / Update oleh Admin) :</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                  No. Faktur PBF / Supplier :
                </label>
                <input
                  type="text"
                  disabled={isAlreadyApproved}
                  value={pbfInvoiceNo}
                  onChange={(e) => setPbfInvoiceNo(e.target.value)}
                  placeholder="Contoh: INV-PBF-8821"
                  className="w-full h-7 px-2 border border-slate-300 rounded text-[11.5px] text-slate-900 bg-white font-mono focus:outline-none focus:border-emerald-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                  No. Surat Jalan / DO :
                </label>
                <input
                  type="text"
                  disabled={isAlreadyApproved}
                  value={pbfDeliveryOrderNo}
                  onChange={(e) => setPbfDeliveryOrderNo(e.target.value)}
                  placeholder="Contoh: SJ-2026-0012"
                  className="w-full h-7 px-2 border border-slate-300 rounded text-[11.5px] text-slate-900 bg-white font-mono focus:outline-none focus:border-emerald-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                  Gudang Penerima :
                </label>
                <select
                  disabled={isAlreadyApproved}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full h-7 px-1.5 border border-slate-300 rounded text-[11.5px] text-slate-900 bg-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer disabled:bg-slate-100"
                >
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                  Tanggal Jatuh Tempo :
                </label>
                <input
                  type="date"
                  disabled={isAlreadyApproved}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-7 px-2 border border-slate-300 rounded text-[11.5px] text-slate-900 bg-white focus:outline-none focus:border-emerald-500 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Dokumen & Lampiran Pembelian (Tampilan Gambar 3) */}
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
            <h4 className="font-bold text-slate-800 text-[11.5px] mb-2 border-b pb-1 flex items-center gap-1.5 text-sky-800">
              <Paperclip className="w-4 h-4 text-sky-600" />
              <span>Dokumen &amp; Lampiran Pembelian (Upload Bukti Faktur Asli, Surat Jalan, Pajak &amp; CoA) :</span>
            </h4>
            <PbfDocumentUpload
              entityType="purchase"
              entityId={purchase.id}
              title={`Dokumen Faktur Pembelian: ${purchase.invoice_no}`}
              subtitle={`Supplier: ${purchase.supplier?.name || "-"} | Tanggal: ${formatDate(purchase.date)} | Total: Rp ${Number(purchase.total_amount).toLocaleString("id-ID")}`}
            />
          </div>

          {/* SECTION 3: Hasil Verifikasi Fisik oleh Petugas Gudang */}
          <div className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <h4 className="font-bold text-slate-800 text-[11.5px]">
                  Hasil Verifikasi Fisik oleh Petugas Gudang :
                </h4>
                <span className="text-[10.5px] text-slate-600 font-medium">
                  (Petugas: <strong>{purchase.warehouse_verifier?.full_name || purchase.user?.full_name || "Gudang"}</strong> | 
                  Waktu: <strong>{purchase.warehouse_verified_at ? formatDate(purchase.warehouse_verified_at) : "Menunggu"}</strong>)
                </span>
              </div>
              <span className="text-[10.5px] text-slate-600 font-medium">
                Total: <strong>{totalItems}</strong> item ({totalQty.toFixed(2)} unit)
              </span>
            </div>

            <div className="overflow-x-auto max-h-52">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 text-[10.5px]">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-8">No</th>
                    <th className="py-1.5 px-2.5 w-28">Kode Obat</th>
                    <th className="py-1.5 px-2.5">Nama Obat / Barang</th>
                    <th className="py-1.5 px-2 text-center w-16">Satuan</th>
                    <th className="py-1.5 px-2 text-right w-20 bg-emerald-50 text-emerald-900 font-bold">Qty Fisik</th>
                    <th className="py-1.5 px-2.5 w-32 bg-amber-50 text-amber-900 font-bold">No. Batch *</th>
                    <th className="py-1.5 px-2.5 w-36 bg-amber-50 text-amber-900 font-bold">Expired Date *</th>
                    <th className="py-1.5 px-2.5 text-right w-24">Harga Beli</th>
                    <th className="py-1.5 px-2.5 text-right w-24">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(purchase.items || []).map((it: any, idx: number) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50 transition">
                      <td className="py-1.5 px-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-2.5 font-mono font-medium text-slate-800">
                        {it.product?.code || "-"}
                      </td>
                      <td className="py-1.5 px-2.5 font-medium text-slate-900">
                        {it.product?.name || "-"}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-600">
                        {it.unit?.name || "PCS"}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                        {Number(it.qty).toFixed(2)}
                      </td>
                      <td className="py-1 px-1.5 bg-amber-50/30">
                        <input
                          type="text"
                          disabled={isAlreadyApproved}
                          value={itemBatchMap[it.id] ?? (it.batch_number || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItemBatchMap((prev) => ({ ...prev, [it.id]: val }));
                          }}
                          placeholder="No. Batch..."
                          className="w-full h-6 px-1.5 font-mono text-[11px] border border-amber-300 rounded bg-white text-slate-800 font-semibold focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="py-1 px-1.5 bg-amber-50/30">
                        <input
                          type="date"
                          disabled={isAlreadyApproved}
                          value={itemExpiredMap[it.id] ?? (it.expired_date ? new Date(it.expired_date).toISOString().split("T")[0] : "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItemExpiredMap((prev) => ({ ...prev, [it.id]: val }));
                          }}
                          className="w-full h-6 px-1.5 font-mono text-[10.5px] border border-amber-300 rounded bg-white text-slate-800 focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(it.unit_price)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(it.total_amount || (it.qty * it.unit_price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {purchase.warehouse_notes && (
              <div className="p-2 bg-amber-50/80 border-t border-amber-200 text-[11px] text-amber-900">
                <strong>Catatan Petugas Gudang:</strong> {purchase.warehouse_notes}
              </div>
            )}
          </div>

          {/* SECTION 4: Rincian Keuangan & Catatan Admin */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
            <h4 className="font-bold text-slate-800 text-[11px] border-b pb-1">
              Rincian Keuangan &amp; Akuntansi Pembelian :
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="block text-slate-500 text-[10px]">Total Nilai Faktur:</span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {formatCurrency(purchase.total_amount)}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="block text-slate-500 text-[10px]">Pembayaran Tunai / DP (Kas/Bank):</span>
                <span className="text-sm font-bold font-mono text-sky-800">
                  {formatCurrency(purchase.paid_amount || 0)}
                </span>
              </div>
              <div className="bg-amber-50 p-2 rounded border border-amber-200">
                <span className="block text-amber-700 text-[10px] font-bold">Hutang Usaha yang Akan Terbentuk:</span>
                <span className="text-sm font-bold font-mono text-amber-900">
                  {formatCurrency(remainingDebt)}
                </span>
                <p className="text-[9.5px] text-amber-700 mt-0.5">
                  {remainingDebt > 0
                    ? "Hutang resmi masuk ke menu Bayar Hutang setelah verifikasi disetujui."
                    : "Lunas tunai, tidak membentuk hutang usaha."}
                </p>
              </div>
            </div>

            {/* Admin Notes / Reject Reason input */}
            {!isAlreadyApproved && (
              <>
                {!isRejectMode ? (
                  <div className="pt-1">
                    <label className="block text-slate-700 font-bold text-[10.5px] mb-1">
                      Catatan Verifikasi Admin (Opsional):
                    </label>
                    <input
                      type="text"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Contoh: Faktur & Surat Jalan telah dicocokkan, barang lengkap dan sesuai pesanan."
                      className="w-full h-7 px-2.5 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="pt-1 bg-red-50 p-2.5 rounded border border-red-200">
                    <label className="block text-red-800 font-bold text-[11px] mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      Alasan Penolakan Verifikasi (Wajib Diisi):
                    </label>
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Tuliskan alasan penolakan secara jelas agar gudang/supplier dapat memperbaiki..."
                      className="w-full p-2 border border-red-300 rounded text-xs text-red-900 bg-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isAlreadyApproved && !isRejectMode && (
              <button
                type="button"
                onClick={() => setIsRejectMode(true)}
                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Tolak Verifikasi</span>
              </button>
            )}
            {isRejectMode && (
              <button
                type="button"
                onClick={() => setIsRejectMode(false)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold text-xs transition cursor-pointer"
              >
                Kembali ke Mode Setuju
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded font-semibold text-xs transition cursor-pointer"
            >
              {isAlreadyApproved ? "Tutup" : "Batal"}
            </button>

            {!isAlreadyApproved && !isRejectMode && (
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {approveMutation.isPending ? "Memproses..." : "Setujui Verifikasi & Selesaikan Pembelian"}
                </span>
              </button>
            )}

            {!isAlreadyApproved && isRejectMode && (
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>{rejectMutation.isPending ? "Memproses..." : "Konfirmasi Tolak Verifikasi"}</span>
              </button>
            )}

            {isAlreadyApproved && (
              <span className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pembelian Sudah Disetujui Admin</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovalModal;
