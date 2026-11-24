"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Check,
  PackageCheck,
  AlertCircle,
  Building,
  Calendar,
  FileText,
  CheckCircle2,
  Upload,
  Eye,
  Loader2,
  FileCheck,
} from "lucide-react";
import { api, formatCurrency, formatDate, resolveAssetUrl } from "@/lib/api";

interface TerimaBarangPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  poId?: string | null;
  invoice?: any | null;
  onSuccess?: () => void;
}

export const TerimaBarangPOModal: React.FC<TerimaBarangPOModalProps> = ({
  isOpen,
  onClose,
  poId,
  invoice,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isPO = Boolean(poId);

  // Load PO Detail
  const { data: po, isLoading: isPOLoading } = useQuery({
    queryKey: ["po-detail-for-receive", poId],
    queryFn: async () => {
      if (!poId) return null;
      const res = await api.get(`/purchases/orders/${poId}`);
      return res.data?.data;
    },
    enabled: isOpen && Boolean(poId),
  });

  // Load Invoice Detail if direct purchase
  const { data: invoiceDetail, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ["invoice-detail-for-receive", invoice?.id],
    queryFn: async () => {
      if (!invoice?.id) return null;
      const res = await api.get(`/purchases/${invoice.id}`);
      return res.data?.data;
    },
    enabled: isOpen && Boolean(invoice?.id) && !poId,
  });

  const activeDoc = isPO ? po : (invoiceDetail || invoice);

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [pbfInvoiceNo, setPbfInvoiceNo] = useState<string>("");
  const [pbfDeliveryOrderNo, setPbfDeliveryOrderNo] = useState<string>("");
  const [taxInvoiceNo, setTaxInvoiceNo] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [pbfDocumentUrl, setPbfDocumentUrl] = useState<string>("");
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Items to receive: map of product_id -> qty to receive
  const [receivedQtyMap, setReceivedQtyMap] = useState<Record<string, number>>({});
  const [batchMap, setBatchMap] = useState<Record<string, string>>({});
  const [expiredDateMap, setExpiredDateMap] = useState<Record<string, string>>({});

  // Get distinct suppliers in this doc
  const availableSuppliers = useMemo(() => {
    if (!activeDoc) return [];
    if (!isPO) {
      if (activeDoc.supplier?.id) {
        return [
          {
            id: activeDoc.supplier.id,
            name: activeDoc.supplier.name,
            code: activeDoc.supplier.code,
          },
        ];
      }
      return [];
    }
    const supMap = new Map<string, { id: string; name: string; code?: string }>();
    if (activeDoc.supplier?.id) {
      supMap.set(activeDoc.supplier.id, {
        id: activeDoc.supplier.id,
        name: activeDoc.supplier.name,
        code: activeDoc.supplier.code,
      });
    }
    if (Array.isArray(activeDoc.items)) {
      activeDoc.items.forEach((it: any) => {
        if (it.supplier?.id) {
          supMap.set(it.supplier.id, {
            id: it.supplier.id,
            name: it.supplier.name,
            code: it.supplier.code,
          });
        }
      });
    }
    return Array.from(supMap.values());
  }, [activeDoc, isPO]);

  // Set default supplier and warehouse
  useEffect(() => {
    if (activeDoc) {
      if (activeDoc.warehouse_id) {
        setWarehouseId(activeDoc.warehouse_id);
      } else if (warehouses.length > 0) {
        setWarehouseId(warehouses[0].id);
      }
      if (availableSuppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(availableSuppliers[0].id);
      }
      if (activeDoc.pbf_document_url && !pbfDocumentUrl) {
        setPbfDocumentUrl(activeDoc.pbf_document_url);
      }
      if (activeDoc.pbf_delivery_order_no && !pbfDeliveryOrderNo) {
        setPbfDeliveryOrderNo(activeDoc.pbf_delivery_order_no);
      }
      if (activeDoc.pbf_invoice_no && !pbfInvoiceNo) {
        setPbfInvoiceNo(activeDoc.pbf_invoice_no);
      }
      if (activeDoc.tax_invoice_no && !taxInvoiceNo) {
        setTaxInvoiceNo(activeDoc.tax_invoice_no);
      }
      if (activeDoc.due_date) {
        try {
          setDueDate(new Date(activeDoc.due_date).toISOString().split("T")[0]);
        } catch (_) {}
      }
      if (activeDoc.warehouse_notes && !notes) {
        setNotes(activeDoc.warehouse_notes);
      }
    }
  }, [activeDoc, warehouses, availableSuppliers, selectedSupplierId, pbfDocumentUrl]);

  const handleUploadPbfDoc = async (file: File) => {
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", isPO ? "purchase_order" : "purchase_invoice");
      if (isPO && poId) formData.append("entity_id", poId);
      if (!isPO && activeDoc?.id) formData.append("entity_id", activeDoc.id);
      formData.append("title", `Faktur/DO PBF - ${pbfInvoiceNo || activeDoc?.order_no || activeDoc?.invoice_no || "Pembelian"}`);
      const res = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.data?.file_url;
      if (url) {
        setPbfDocumentUrl(url);
      }
    } catch (err: any) {
      alert("Gagal mengunggah dokumen: " + (err.response?.data?.message || err.message));
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Filter items for the selected supplier
  const supplierItems = useMemo(() => {
    if (!activeDoc || !Array.isArray(activeDoc.items)) return [];
    if (!isPO) {
      return activeDoc.items;
    }
    return activeDoc.items.filter((it: any) => {
      const itSupId = it.supplier_id || activeDoc.supplier_id;
      return itSupId === selectedSupplierId;
    });
  }, [activeDoc, isPO, selectedSupplierId]);

  // Initialize receivedQtyMap, batchMap, expiredDateMap when supplier items change
  useEffect(() => {
    if (supplierItems.length > 0) {
      const initialMap: Record<string, number> = {};
      const initialBatch: Record<string, string> = {};
      const initialExp: Record<string, string> = {};

      supplierItems.forEach((it: any) => {
        if (isPO) {
          const remaining = Math.max(0, Number(it.qty || 0) - Number(it.received_qty || 0));
          initialMap[it.product_id] = remaining;
        } else {
          initialMap[it.product_id] = Number(it.qty || 0);
        }
        if (it.batch_number) {
          initialBatch[it.product_id] = it.batch_number;
        }
        if (it.expired_date) {
          try {
            initialExp[it.product_id] = new Date(it.expired_date).toISOString().split("T")[0];
          } catch (_) {}
        }
      });

      setReceivedQtyMap((prev) => ({ ...initialMap, ...prev }));
      setBatchMap((prev) => ({ ...initialBatch, ...prev }));
      setExpiredDateMap((prev) => ({ ...initialExp, ...prev }));
    }
  }, [supplierItems, isPO]);

  // Calculate totals for items being received strictly for this supplier
  const receiveSummary = useMemo(() => {
    let totalItems = 0;
    let totalQty = 0;
    let subtotal = 0;
    supplierItems.forEach((it: any) => {
      const q = receivedQtyMap[it.product_id] || 0;
      if (q > 0) {
        totalItems += 1;
        totalQty += q;
        subtotal += q * Number(it.unit_price || 0) - Number(it.discount || 0);
      }
    });
    const taxPercent = Number(activeDoc?.tax_percent || 0);
    const taxAmount = (subtotal * taxPercent) / 100;
    const totalNominal = subtotal + taxAmount;
    return { totalItems, totalQty, subtotal, taxPercent, taxAmount, totalNominal };
  }, [supplierItems, receivedQtyMap, activeDoc]);

  // Submit Mutation
  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (isPO && !poId) throw new Error("ID PO tidak valid");
      if (!isPO && !activeDoc?.id) throw new Error("ID Faktur tidak valid");
      if (isPO && !selectedSupplierId) throw new Error("Pilih supplier terlebih dahulu");
      if (!warehouseId) throw new Error("Pilih gudang penerima terlebih dahulu");

      const itemsToReceive: any[] = [];
      supplierItems.forEach((it: any) => {
        const q = receivedQtyMap[it.product_id] || 0;
        if (q > 0) {
          itemsToReceive.push({
            po_item_id: isPO ? it.id : undefined,
            product_id: it.product_id,
            unit_id: it.unit_id,
            qty: q,
            unit_price: Number(it.unit_price || 0),
            discount: Number(it.discount || 0),
            batch_number: batchMap[it.product_id] || "",
            expired_date: expiredDateMap[it.product_id] ? new Date(expiredDateMap[it.product_id]) : undefined,
          });
        }
      });

      if (itemsToReceive.length === 0) {
        throw new Error("Tidak ada item dengan jumlah terima > 0");
      }

      if (isPO) {
        const payload = {
          supplier_id: selectedSupplierId,
          warehouse_id: warehouseId,
          pbf_invoice_no: pbfInvoiceNo,
          pbf_delivery_order_no: pbfDeliveryOrderNo,
          tax_invoice_no: taxInvoiceNo,
          due_date: dueDate,
          paid_amount: Number(paidAmount) || 0,
          tax_percent: receiveSummary.taxPercent,
          notes: notes || `Penerimaan fisik barang gudang dari PO ${po?.order_no}`,
          pbf_document_url: pbfDocumentUrl,
          items: itemsToReceive,
        };
        return await api.post(`/purchases/orders/${poId}/receive`, payload);
      } else {
        const payload = {
          warehouse_id: warehouseId,
          pbf_invoice_no: pbfInvoiceNo,
          pbf_delivery_order_no: pbfDeliveryOrderNo,
          tax_invoice_no: taxInvoiceNo,
          due_date: dueDate,
          notes: notes || `Penerimaan fisik barang gudang Faktur ${activeDoc?.invoice_no}`,
          pbf_document_url: pbfDocumentUrl,
          items: itemsToReceive,
        };
        return await api.post(`/purchases/${activeDoc.id}/receive`, payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      alert(
        "✅ Penerimaan fisik barang berhasil diverifikasi oleh Petugas Gudang!\n\n" +
          "• Data fisik barang, nomor batch, expired date, surat jalan & faktur PBF telah dicatat.\n" +
          "• Status berubah menjadi 'Verifikasi Gudang' dan telah diteruskan ke Admin untuk persetujuan akhir sebelum stok bertambah dan hutang terbentuk."
      );
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      alert("Gagal menerima barang: " + (err.response?.data?.message || err.message));
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-3 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header - Consistent Ketoko Emerald Green */}
        <div className="px-4 py-2.5 bg-[#00c875] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                {isPO ? "Penerimaan & Verifikasi Barang PO" : "Penerimaan & Verifikasi Fisik Barang Gudang"}
              </h3>
              <p className="text-[10px] text-emerald-100">
                {isPO ? (
                  <>
                    No PO: <span className="font-mono font-bold text-white">{po?.order_no || "..."}</span> | Tanggal: {po?.date ? formatDate(po.date) : "-"}
                  </>
                ) : (
                  <>
                    No Faktur: <span className="font-mono font-bold text-white">{activeDoc?.invoice_no || "..."}</span> | Tanggal: {activeDoc?.date ? formatDate(activeDoc.date) : "-"}
                  </>
                )}
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
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
          {/* Supplier Selector Tabs (Multi-Supplier PO Support) */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold text-[11px] flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-sky-600" />
                Pilih Supplier yang Mengirim Barang :
              </label>
              <span className="text-[10px] text-slate-500">
                {availableSuppliers.length > 1
                  ? `⚡ PO ini memiliki ${availableSuppliers.length} supplier pemenuhan (Multi-Supplier)`
                  : "Supplier Tunggal"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableSuppliers.map((sup) => {
                const isSelected = selectedSupplierId === sup.id;
                return (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => setSelectedSupplierId(sup.id)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold border transition flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-sky-600 border-sky-600 text-white shadow-2xs"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{sup.name}</span>
                    {sup.code && <span className="text-[10px] opacity-75">({sup.code})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items Receiving Table */}
          <div className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 text-[11px]">
                Daftar Obat/Item Pemenuhan dari Supplier Terpilih :
              </h4>
              <span className="text-[10.5px] text-slate-500">
                {supplierItems.length} item ditemukan
              </span>
            </div>
            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 text-[10.5px]">
                  <tr>
                    <th className="py-1 px-2 text-center w-8">No</th>
                    <th className="py-1 px-2.5 w-24">Kode Obat</th>
                    <th className="py-1 px-2.5">Nama Obat / Barang</th>
                    <th className="py-1 px-2 text-right w-16">Pesan</th>
                    <th className="py-1 px-2 text-right w-16">Diterima</th>
                    <th className="py-1 px-2 text-right w-16">Sisa</th>
                    <th className="py-1 px-2 text-center w-24 bg-emerald-50 text-emerald-900 font-bold">
                      Terima Skrg
                    </th>
                    <th className="py-1 px-2 text-center w-14">Satuan</th>
                    <th className="py-1 px-2.5 text-right w-20">Harga</th>
                    <th className="py-1 px-2.5 text-right w-24">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-6 text-slate-400">
                        Tidak ada item untuk supplier ini dalam pesanan pembelian.
                      </td>
                    </tr>
                  ) : (
                    supplierItems.map((it: any, idx: number) => {
                      const ordered = Number(it.qty || 0);
                      const received = Number(it.received_qty || 0);
                      const sisa = Math.max(0, ordered - received);
                      const currentRec = receivedQtyMap[it.product_id] ?? sisa;
                      const lineTotal = currentRec * Number(it.unit_price || 0) - Number(it.discount || 0);

                      return (
                        <tr key={it.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-1 px-2 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-1 px-2.5 font-mono font-medium text-slate-800">
                            {it.product?.code || "-"}
                          </td>
                          <td className="py-1 px-2.5 font-medium text-slate-900">
                            {it.product?.name || "-"}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-slate-600">
                            {ordered.toFixed(2)}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-slate-500">
                            {received.toFixed(2)}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-amber-700">
                            {sisa.toFixed(2)}
                          </td>
                          <td className="py-1 px-2 text-center bg-emerald-50/50">
                            <input
                              type="number"
                              min={0}
                              max={sisa}
                              step="any"
                              value={currentRec}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setReceivedQtyMap((prev) => ({
                                  ...prev,
                                  [it.product_id]: val,
                                }));
                              }}
                              className="w-16 h-5 px-1 text-right font-mono font-bold text-emerald-800 border border-emerald-400 rounded bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[11px]"
                            />
                          </td>
                          <td className="py-1 px-2 text-center text-slate-600 font-semibold text-[10px]">
                            {it.unit?.name || it.product?.base_unit?.name || "PCS"}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-slate-700">
                            {formatCurrency(it.unit_price)}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(Math.max(0, lineTotal))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Accounting & Stock Principle Notification */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 flex items-start gap-2 text-sky-950 text-[11px] leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sky-900">Alur Verifikasi Gudang &amp; Persetujuan Akhir Admin :</p>
              <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-sky-800 mt-0.5">
                <li>
                  Petugas Gudang memverifikasi kesesuaian fisik barang, nomor batch, expired date, surat jalan, dan faktur PBF.
                </li>
                <li>
                  Ketika tombol <strong>[ Kirim Hasil Verifikasi ke Admin ]</strong> ditekan, status berubah menjadi <em>VERIFIKASI_GUDANG</em> dan dikirim ke Admin.
                </li>
                <li>
                  <strong>Stok obat belum bertambah dan hutang belum terbentuk</strong> sampai Admin melakukan pengecekan akhir dan memberikan persetujuan (approval).
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="text-slate-700 font-semibold text-[11px] flex items-center gap-2 flex-wrap">
            <span>Diterima: <strong className="text-emerald-700 font-mono text-xs">{receiveSummary.totalQty.toFixed(2)}</strong> qty</span>
            <span>| Subtotal: <strong className="text-slate-800 font-mono text-xs">{formatCurrency(receiveSummary.subtotal)}</strong></span>
            {receiveSummary.taxAmount > 0 && (
              <span>| Pajak ({receiveSummary.taxPercent}%): <strong className="text-slate-800 font-mono text-xs">{formatCurrency(receiveSummary.taxAmount)}</strong></span>
            )}
            <span>| Total Tagihan: <strong className="text-emerald-700 font-mono text-xs">{formatCurrency(receiveSummary.totalNominal)}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700 text-xs transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => receiveMutation.mutate()}
              disabled={receiveMutation.isPending || receiveSummary.totalQty <= 0}
              className="px-4 py-1.5 bg-[#009b62] hover:bg-[#008754] text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{receiveMutation.isPending ? "Mengirim Verifikasi..." : "Kirim Hasil Verifikasi ke Admin"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
