"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  Info,
  DollarSign,
  AlertTriangle,
  Save,
  Printer,
  CreditCard,
  X,
  Check,
  Calculator,
  Undo2,
  Building2,
  Package,
  Layers,
  Barcode,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  FileText,
  Upload,
  User,
  Calendar,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariObatSalesModal } from "./CariObatSalesModal";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";

export interface SalesInvoiceItemRow {
  product_id: string;
  code: string;
  name: string;
  drug_classification?: string;
  distribution_channel?: string;
  is_sold_in_pharmacy?: boolean;
  unit_id: string;
  unit_name: string;
  qty: number;
  stock: number;
  unit_price: number;
  discount_percent: number;
  line_total: number;
  batch_number?: string;
  expired_date?: string;
}

interface SalesInvoiceFormProps {
  isEdit?: boolean;
  invoiceId?: string;
}

export const SalesInvoiceForm: React.FC<SalesInvoiceFormProps> = ({
  isEdit = false,
  invoiceId,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isPbfDocModalOpen, setIsPbfDocModalOpen] = useState(false);
  const [pbfDocCount, setPbfDocCount] = useState(0);
  const [initialDocType, setInitialDocType] = useState<string>("FAKTUR_PBF_ASAL");
  const [isSelectPurchaseModalOpen, setIsSelectPurchaseModalOpen] = useState(false);
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState("");

  // Persistent / Draft Sale ID for linking documents before creation
  const [draftSaleId] = useState<string>(() => {
    if (invoiceId) return invoiceId;
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "sale-" + Date.now();
  });

  // Sale Type: "APOTEK" (Retail Apotek) vs "PBF" (Distributor / Grosir B2B)
  const [saleType, setSaleType] = useState<"APOTEK" | "PBF">("APOTEK");

  // Header State
  const [invoiceNo, setInvoiceNo] = useState("Auto");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedSalesRepId, setSelectedSalesRepId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [ppnType, setPpnType] = useState<"Non" | "Include" | "Exclude">("Non");
  const [taxPercent, setTaxPercent] = useState<number>(0);

  // PBF Specific Fields (CDOB BPOM Compliance)
  const [customerSPNumber, setCustomerSPNumber] = useState("");
  const [customerSPDate, setCustomerSPDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [customerSPType, setCustomerSPType] = useState("REGULER");
  const [pbfOriginInvoiceNo, setPbfOriginInvoiceNo] = useState("");
  const [originPurchaseId, setOriginPurchaseId] = useState<string | null>(null);
  const [taxInvoiceNo, setTaxInvoiceNo] = useState("");
  const [deliveryOrderNo, setDeliveryOrderNo] = useState("");

  // Table items state
  const [items, setItems] = useState<SalesInvoiceItemRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // Bottom form / Accounting settlement state
  const [notes, setNotes] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [nominalDiscount, setNominalDiscount] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"TUNAI" | "TRANSFER" | "KREDIT">("TUNAI");
  const [cashAccountId, setCashAccountId] = useState("");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isAutoLunas, setIsAutoLunas] = useState(true);

  // Status & Error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-sales-select"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps-select"],
    queryFn: async () => {
      const res = await api.get("/sales-reps");
      return res.data?.data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses-sales-select"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: accountsList = [] } = useQuery({
    queryKey: ["cash-bank-accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return (
        res.data?.data?.filter(
          (a: any) =>
            !a.is_header &&
            (a.subtype === "CASH_BANK" || (a.code && a.code.startsWith("1-11")))
        ) || []
      );
    },
  });

  // Query linked documents for this sale (including Faktur PBF Asal & Surat Pesanan)
  const { data: saleDocs = [], refetch: refetchSaleDocs } = useQuery({
    queryKey: ["sale-documents", draftSaleId],
    queryFn: async () => {
      const res = await api.get(`/documents?entity_type=sale&entity_id=${draftSaleId}`);
      return res.data?.data || [];
    },
    enabled: !!draftSaleId,
  });

  // Sync doc count
  useEffect(() => {
    if (saleDocs) {
      setPbfDocCount(saleDocs.length);
    }
  }, [saleDocs]);

  // Derived document badges
  const pbfOriginDoc = useMemo(() => {
    return saleDocs.find((d: any) => d.document_type === "FAKTUR_PBF_ASAL");
  }, [saleDocs]);

  const customerSpDoc = useMemo(() => {
    return saleDocs.find((d: any) => d.document_type === "SURAT_PESANAN");
  }, [saleDocs]);

  // Query existing sale in edit mode
  const { data: existingSale } = useQuery({
    queryKey: ["sale-detail", invoiceId],
    queryFn: async () => {
      const res = await api.get(`/sales/${invoiceId}`);
      return res.data?.data;
    },
    enabled: isEdit && !!invoiceId,
  });

  useEffect(() => {
    if (existingSale) {
      if (existingSale.invoice_no) setInvoiceNo(existingSale.invoice_no);
      if (existingSale.created_at) setInvoiceDate(existingSale.created_at.split("T")[0]);
      if (existingSale.due_date) setDueDate(existingSale.due_date.split("T")[0]);
      if (existingSale.customer_id) setSelectedCustomerId(existingSale.customer_id);
      if (existingSale.sales_rep_id) setSelectedSalesRepId(existingSale.sales_rep_id);
      if (existingSale.warehouse_id) setWarehouseId(existingSale.warehouse_id);
      if (existingSale.notes) setNotes(existingSale.notes);
      if (existingSale.tax_percent) {
        setTaxPercent(existingSale.tax_percent);
        setPpnType(existingSale.tax_percent > 0 ? "Exclude" : "Non");
      }
      if (existingSale.customer_sp_number) setCustomerSPNumber(existingSale.customer_sp_number);
      if (existingSale.customer_sp_date) setCustomerSPDate(existingSale.customer_sp_date.split("T")[0]);
      if (existingSale.customer_sp_type) setCustomerSPType(existingSale.customer_sp_type);
      if (existingSale.pbf_origin_invoice_no) setPbfOriginInvoiceNo(existingSale.pbf_origin_invoice_no);
      if (existingSale.origin_purchase_id) setOriginPurchaseId(existingSale.origin_purchase_id);
      if (existingSale.tax_invoice_no) setTaxInvoiceNo(existingSale.tax_invoice_no);
      if (existingSale.delivery_order_no) setDeliveryOrderNo(existingSale.delivery_order_no);
      if (existingSale.type === "BACKOFFICE" || existingSale.customer_sp_number || existingSale.pbf_origin_invoice_no) {
        setSaleType("PBF");
      }
      if (existingSale.items && existingSale.items.length > 0) {
        setItems(
          existingSale.items.map((it: any) => ({
            product_id: it.product_id,
            code: it.product?.sku || "",
            name: it.product?.name || "",
            drug_classification: it.product?.drug_classification,
            distribution_channel: it.product?.distribution_channel,
            is_sold_in_pharmacy: it.product?.is_sold_in_pharmacy,
            unit_id: it.unit_id,
            unit_name: it.unit?.name || "PCS",
            qty: it.qty,
            stock: it.product?.total_stock || 0,
            unit_price: it.unit_price,
            discount_percent: it.unit_price > 0 && it.qty > 0 ? (it.discount / (it.unit_price * it.qty)) * 100 : 0,
            line_total: it.subtotal,
          }))
        );
      }
    }
  }, [existingSale]);

  // Query purchase list for selecting original PBF purchase invoice
  const { data: purchasesList = [] } = useQuery({
    queryKey: ["purchases-select-list"],
    queryFn: async () => {
      const res = await api.get("/purchases?sort_by=Tanggal&sort_dir=desc");
      return res.data?.data || [];
    },
    enabled: isSelectPurchaseModalOpen,
  });

  const filteredPurchases = useMemo(() => {
    if (!purchaseSearchQuery) return purchasesList;
    const q = purchaseSearchQuery.toLowerCase();
    return purchasesList.filter(
      (p: any) =>
        (p.invoice_no && p.invoice_no.toLowerCase().includes(q)) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)) ||
        (p.po_number && p.po_number.toLowerCase().includes(q))
    );
  }, [purchasesList, purchaseSearchQuery]);

  // Default initializations
  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (accountsList.length > 0 && !cashAccountId) {
      // Default to 1-1110 (Kas Kasir) for Apotek, or 1-1121 (Kas Besar) for PBF
      const defaultCash =
        saleType === "PBF"
          ? accountsList.find((a: any) => a.code === "1-1121") || accountsList[0]
          : accountsList.find((a: any) => a.code === "1-1110") || accountsList[0];
      if (defaultCash) setCashAccountId(defaultCash.id);
    }
  }, [accountsList, cashAccountId, saleType]);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // If customer is a pharmacy facility (Apotek / Klinik / RS / PBF), encourage or toggle PBF mode
  useEffect(() => {
    if (selectedCustomer?.is_pharmacy_facility) {
      setSaleType("PBF");
    }
  }, [selectedCustomer]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, row) => acc + row.line_total, 0);
  }, [items]);

  const calculatedDiscount = useMemo(() => {
    if (discountPercent > 0) {
      return (subtotal * discountPercent) / 100;
    }
    return nominalDiscount;
  }, [subtotal, discountPercent, nominalDiscount]);

  const calculatedTax = useMemo(() => {
    if (ppnType === "Non" || taxPercent === 0) return 0;
    const base = Math.max(0, subtotal - calculatedDiscount);
    if (ppnType === "Include") {
      return (base * (taxPercent / 100)) / (1 + taxPercent / 100);
    }
    return base * (taxPercent / 100);
  }, [subtotal, calculatedDiscount, ppnType, taxPercent]);

  const grandTotal = useMemo(() => {
    const afterDisc = Math.max(0, subtotal - calculatedDiscount);
    if (ppnType === "Include") {
      return afterDisc + shippingFee;
    }
    return afterDisc + calculatedTax + shippingFee;
  }, [subtotal, calculatedDiscount, calculatedTax, ppnType, shippingFee]);

  // Auto-fill paidAmount if Tunai / Lunas
  useEffect(() => {
    if (paymentMethod === "TUNAI" && isAutoLunas) {
      setPaidAmount(grandTotal);
    } else if (paymentMethod === "KREDIT") {
      setPaidAmount(0);
    }
  }, [grandTotal, paymentMethod, isAutoLunas]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  const changeAmount = useMemo(() => {
    return Math.max(0, paidAmount - grandTotal);
  }, [grandTotal, paidAmount]);

  // Handle adding an item from CariObatSalesModal
  const handleSelectItem = (prod: any) => {
    const existingIndex = items.findIndex((it) => it.product_id === prod.id);
    const defaultSellingPrice = prod.selling_price || 0;
    const defaultUnitName = prod.base_unit?.name || prod.unit_name || "PCS";
    const defaultUnitId = prod.base_unit_id || prod.unit_id || "00000000-0000-0000-0000-000000000000";
    const availableStock = prod.total_stock || 0;

    if (existingIndex >= 0) {
      // Increase qty by 1
      const updated = [...items];
      const cur = updated[existingIndex];
      const newQty = cur.qty + 1;
      const lineDisc = (cur.unit_price * (cur.discount_percent / 100)) * newQty;
      cur.qty = newQty;
      cur.line_total = cur.unit_price * newQty - lineDisc;
      setItems(updated);
    } else {
      // New row
      const newRow: SalesInvoiceItemRow = {
        product_id: prod.id,
        code: prod.code,
        name: prod.name,
        drug_classification: prod.drug_classification,
        distribution_channel: prod.distribution_channel,
        is_sold_in_pharmacy: prod.is_sold_in_pharmacy,
        unit_id: defaultUnitId,
        unit_name: defaultUnitName,
        qty: 1,
        stock: availableStock,
        unit_price: defaultSellingPrice,
        discount_percent: 0,
        line_total: defaultSellingPrice,
        batch_number: prod.batch_number || "",
        expired_date: prod.expired_date ? prod.expired_date.split("T")[0] : "",
      };
      setItems([...items, newRow]);
    }
  };

  // Update item field
  const handleUpdateItem = (
    index: number,
    field: "qty" | "unit_price" | "discount_percent",
    value: number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        const disc = (updated.unit_price * (updated.discount_percent / 100)) * updated.qty;
        updated.line_total = Math.max(0, updated.unit_price * updated.qty - disc);
        return updated;
      })
    );
  };

  // Remove item row
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedRowIndex === index) setSelectedRowIndex(null);
  };

  // Submit Sales Invoice
  const handleSaveInvoice = async (printAfterSave: boolean = false) => {
    if (!selectedCustomerId) {
      setErrorMsg("Pilih pelanggan / sarana pemesan terlebih dahulu!");
      return;
    }
    if (!warehouseId) {
      setErrorMsg("Pilih gudang pengeluaran barang!");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Daftar obat / barang penjualan tidak boleh kosong!");
      return;
    }

    // CDOB compliance check for PBF
    if (saleType === "PBF" && !customerSPNumber) {
      setErrorMsg(
        "Kepatuhan CDOB BPOM: Nomor Surat Pesanan (SP) Pelanggan wajib diisi untuk transaksi PBF / Grosir Farmasi!"
      );
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Build Payments array
    const paymentsPayload: any[] = [];
    if (paidAmount > 0) {
      paymentsPayload.push({
        method: paymentMethod === "TUNAI" ? "CASH" : "TRANSFER",
        amount: paidAmount,
        reference_no: customerSPNumber || "",
      });
    }

    const payload = {
      warehouse_id: warehouseId,
      customer_id: selectedCustomerId,
      sales_rep_id: selectedSalesRepId || undefined,
      type: saleType === "PBF" ? "BACKOFFICE" : "POS",
      tax_percent: ppnType === "Non" ? 0 : taxPercent,
      discount: calculatedDiscount,
      shipping_fee: shippingFee,
      notes: notes,
      due_date: paymentMethod === "KREDIT" ? new Date(dueDate) : undefined,
      invoice_date: new Date(invoiceDate),
      cash_account_id: cashAccountId || undefined,
      customer_sp_number: customerSPNumber,
      customer_sp_date: customerSPDate ? new Date(customerSPDate) : undefined,
      customer_sp_type: customerSPType,
      pbf_origin_invoice_no: pbfOriginInvoiceNo,
      origin_purchase_id: originPurchaseId || undefined,
      tax_invoice_no: taxInvoiceNo,
      delivery_order_no: deliveryOrderNo,
      items: items.map((it) => ({
        product_id: it.product_id,
        unit_id: it.unit_id,
        qty: it.qty,
        unit_price: it.unit_price,
        discount: (it.unit_price * (it.discount_percent / 100)) * it.qty,
      })),
      payments: paymentsPayload,
    };

    try {
      let res;
      if (isEdit && invoiceId) {
        res = await api.put(`/sales/${invoiceId}`, payload);
        setSuccessMsg("Faktur Penjualan berhasil diperbarui!");
      } else {
        res = await api.post("/sales", {
          ...payload,
          id: draftSaleId,
        });
        setSuccessMsg("Faktur Penjualan berhasil disimpan dan diposting ke Akuntansi!");
      }
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });

      if (printAfterSave && (res.data?.data?.id || invoiceId)) {
        window.open(`/api/v1/reports/invoices/${res.data?.data?.id || invoiceId}/pdf`, "_blank");
      }

      setTimeout(() => {
        router.push("/sales/invoices");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal menyimpan faktur penjualan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f8fafc] text-slate-800 text-xs select-none">
      {/* 1. TOP HEADER TITLE BAR */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/sales/invoices")}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
            title="Kembali ke Daftar Penjualan"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <span>Faktur Penjualan (Sales Invoice)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                saleType === "PBF"
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
              }`}
            >
              Mode: {saleType === "PBF" ? "PBF / B2B Grosir" : "Apotek Retail"}
            </span>
          </h1>
        </div>

        {/* Mode Switcher & Quick Upload Shortcut */}
        <div className="flex items-center gap-2 text-[11px]">
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => setSaleType("APOTEK")}
              className={`px-3 py-1 rounded-md font-bold transition ${
                saleType === "APOTEK"
                  ? "bg-[#00c875] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Penjualan Apotek
            </button>
            <button
              type="button"
              onClick={() => setSaleType("PBF")}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                saleType === "PBF"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Penjualan PBF / Grosir</span>
            </button>
          </div>

          {/* Tombol Lampiran Dokumen */}
          <button
            type="button"
            onClick={() => setIsPbfDocModalOpen(true)}
            className="h-7 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>📎 Lampiran Dokumen PBF</span>
            {pbfDocCount > 0 && (
              <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                {pbfDocCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="mx-4 mt-2 p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mx-4 mt-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded flex items-center gap-2 text-xs">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. MAIN FORM BODY */}
      <div className="flex-1 min-h-0 p-3 flex flex-col space-y-2.5 overflow-auto">
        {/* TOP PANEL: METADATA, CUSTOMER, GUDANG, PBF COMPLIANCE */}
        <div className="bg-white rounded-lg border border-slate-300 p-3 shadow-2xs space-y-2.5">
          {/* Row 1: No Faktur, Tanggal, Pelanggan, Gudang, PPN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 text-[11px]">
            {/* No Faktur */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">No. Faktur :</label>
              <input
                type="text"
                value={invoiceNo}
                readOnly
                className="w-full h-7 px-2 bg-slate-100 border border-slate-300 rounded font-bold text-slate-700"
              />
            </div>

            {/* Tanggal Faktur */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Tanggal Faktur :</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full h-7 px-2 border border-slate-300 rounded text-slate-800 bg-white focus:outline-none focus:border-[#00c875]"
              />
            </div>

            {/* Pelanggan / Customer */}
            <div className="md:col-span-4">
              <label className="block text-slate-700 font-semibold mb-0.5">
                Pelanggan / Sarana Pemesan :
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-7 px-2 border border-slate-300 rounded font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#00c875]"
              >
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.is_pharmacy_facility ? `[${c.pharmacy_type || "Sarana Farmasi"}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Gudang Pengeluaran */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Gudang :</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-7 px-2 border border-slate-300 rounded text-slate-800 bg-white focus:outline-none focus:border-[#00c875]"
              >
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipe PPN */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Tipe PPN :</label>
              <div className="flex items-center gap-1">
                <select
                  value={ppnType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setPpnType(val);
                    if (val !== "Non" && taxPercent === 0) setTaxPercent(11);
                  }}
                  className="w-full h-7 px-2 border border-slate-300 rounded text-slate-800 bg-white font-semibold"
                >
                  <option value="Non">Non PPN</option>
                  <option value="Include">Include (11%)</option>
                  <option value="Exclude">Exclude (11%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Khusus Kepatuhan PBF (SP Pelanggan, No Faktur PBF Asal, DO, Pajak) */}
          {saleType === "PBF" && (
            <div className="p-2.5 bg-blue-50/60 border border-blue-200/70 rounded-lg space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Kepatuhan Distribusi Farmasi CDOB (Surat Pesanan &amp; Faktur Asal PBF)</span>
                </span>
                <span className="text-[10px] text-blue-700">Wajib untuk audit BPOM</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5">
                {/* No SP Pelanggan */}
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-slate-700 font-semibold">
                      No. Surat Pesanan (SP) : <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={customerSPNumber}
                    onChange={(e) => setCustomerSPNumber(e.target.value)}
                    placeholder="Contoh: SP/APT-01/XI/2026"
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  {/* Status Lampiran Dokumen SP */}
                  {customerSpDoc ? (
                    <div className="mt-1 flex items-center justify-between px-2 py-0.5 bg-emerald-100/80 border border-emerald-300 rounded text-[10px] text-emerald-800">
                      <div className="flex items-center gap-1 truncate">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate font-semibold">{customerSpDoc.file_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInitialDocType("SURAT_PESANAN");
                          setIsPbfDocModalOpen(true);
                        }}
                        className="text-emerald-800 hover:text-emerald-950 font-bold underline shrink-0 ml-1.5"
                      >
                        Lihat / Ubah
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setInitialDocType("SURAT_PESANAN");
                        setIsPbfDocModalOpen(true);
                      }}
                      className="mt-1 w-full h-6 px-1.5 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-400 rounded text-[10px] text-blue-800 font-medium flex items-center justify-center gap-1 transition"
                    >
                      <Upload className="w-3 h-3 text-blue-600" />
                      <span>+ Upload Scan SP Pemesan</span>
                    </button>
                  )}
                </div>

                {/* Tanggal SP */}
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-0.5">Tanggal SP :</label>
                  <input
                    type="date"
                    value={customerSPDate}
                    onChange={(e) => setCustomerSPDate(e.target.value)}
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded text-slate-800"
                  />
                </div>

                {/* Jenis SP */}
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-0.5">Jenis SP :</label>
                  <select
                    value={customerSPType}
                    onChange={(e) => setCustomerSPType(e.target.value)}
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded text-slate-800 font-semibold"
                  >
                    <option value="REGULER">SP Obat Reguler</option>
                    <option value="OOT">SP Obat Tertentu (OOT)</option>
                    <option value="PREKURSOR">SP Prekursor Farmasi</option>
                    <option value="PSIKOTROPIKA">SP Psikotropika</option>
                    <option value="NARKOTIKA">SP Narkotika</option>
                  </select>
                </div>

                {/* No Faktur PBF / Prinsipal Asal */}
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-slate-700 font-semibold">
                      No. Faktur PBF Asal :
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsSelectPurchaseModalOpen(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 bg-blue-100/70 hover:bg-blue-100 px-1.5 py-0.2 rounded transition"
                      title="Pilih dari riwayat pembelian PBF yang tercatat"
                    >
                      <Search className="w-2.5 h-2.5" />
                      <span>Pilih Beli</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={pbfOriginInvoiceNo}
                    onChange={(e) => {
                      setPbfOriginInvoiceNo(e.target.value);
                      if (!e.target.value) setOriginPurchaseId(null);
                    }}
                    placeholder="Contoh: PI/2026/... atau no faktur supplier"
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded text-slate-800"
                  />
                  {/* Status Lampiran Dokumen Faktur PBF Asal */}
                  {pbfOriginDoc ? (
                    <div className="mt-1 flex items-center justify-between px-2 py-0.5 bg-emerald-100/80 border border-emerald-300 rounded text-[10px] text-emerald-800">
                      <div className="flex items-center gap-1 truncate">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate font-semibold">{pbfOriginDoc.file_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInitialDocType("FAKTUR_PBF_ASAL");
                          setIsPbfDocModalOpen(true);
                        }}
                        className="text-emerald-800 hover:text-emerald-950 font-bold underline shrink-0 ml-1.5"
                      >
                        Lihat / Ubah
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setInitialDocType("FAKTUR_PBF_ASAL");
                        setIsPbfDocModalOpen(true);
                      }}
                      className="mt-1 w-full h-6 px-1.5 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-400 rounded text-[10px] text-amber-800 font-medium flex items-center justify-center gap-1 transition"
                    >
                      <Upload className="w-3 h-3 text-amber-600" />
                      <span>+ Upload Dokumen Faktur PBF Asal</span>
                    </button>
                  )}
                </div>

                {/* No Surat Jalan / DO */}
                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-0.5">No. Surat Jalan (DO) :</label>
                  <input
                    type="text"
                    value={deliveryOrderNo}
                    onChange={(e) => setDeliveryOrderNo(e.target.value)}
                    placeholder="DO/2026/..."
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. ITEMS TABLE CONTAINER (Mirip Pembelian Form) */}
        <div className="flex-1 min-h-[240px] bg-white rounded-lg border border-slate-300 flex flex-col shadow-2xs overflow-hidden">
          {/* Table Action Bar */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {/* Tombol Tambah Obat (Membuka CariObatSalesModal) */}
              <button
                type="button"
                onClick={() => setIsItemModalOpen(true)}
                className="h-7 px-3 bg-[#00c875] hover:bg-[#00b066] active:scale-95 text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Tambah Obat (F2)</span>
              </button>

              <span className="text-[11px] text-slate-500">
                Pilih obat dari daftar persediaan. Obat khusus PBF/RS disaring otomatis sesuai mode transaksi.
              </span>
            </div>

            <div className="text-[11px] text-slate-600 font-semibold">
              Total Item: <strong>{items.length}</strong> jenis obat
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200">No</th>
                  <th className="py-2 px-3 border-r border-slate-200">Kode Obat</th>
                  <th className="py-2 px-3 border-r border-slate-200">Nama Obat &amp; Deskripsi</th>
                  <th className="py-2 px-3 border-r border-slate-200">Golongan</th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-200">Satuan</th>
                  <th className="py-2 px-2.5 text-right border-r border-slate-200">Stok</th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-200 w-20">Jumlah</th>
                  <th className="py-2 px-3 text-right border-r border-slate-200 w-28">Harga Jual</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-16">Disc (%)</th>
                  <th className="py-2 px-3 text-right border-r border-slate-200 w-32">Total Harga</th>
                  <th className="py-2 px-2 text-center w-12">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Belum ada obat yang dimasukkan ke faktur penjualan ini. Klik tombol{" "}
                      <strong>+ Tambah Obat</strong> di atas untuk memilih obat.
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => (
                    <tr
                      key={row.product_id}
                      onClick={() => setSelectedRowIndex(idx)}
                      className={`hover:bg-slate-50 transition ${
                        selectedRowIndex === idx ? "bg-emerald-50/70" : ""
                      }`}
                    >
                      <td className="py-2 px-2.5 text-center text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100">
                        {row.name}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 whitespace-nowrap">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                          {row.drug_classification || "Obat"}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center text-slate-700 font-medium border-r border-slate-100">
                        {row.unit_name}
                      </td>
                      <td className="py-2 px-2.5 text-right font-bold text-slate-600 border-r border-slate-100">
                        {row.stock}
                      </td>

                      {/* QTY INPUT */}
                      <td className="py-1 px-1 border-r border-slate-100 text-center">
                        <input
                          type="number"
                          min={1}
                          value={row.qty}
                          onChange={(e) =>
                            handleUpdateItem(idx, "qty", Math.max(1, parseFloat(e.target.value) || 1))
                          }
                          className="w-16 h-6 px-1.5 border border-slate-300 rounded text-center text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00c875]"
                        />
                      </td>

                      {/* UNIT PRICE INPUT */}
                      <td className="py-1 px-1 border-r border-slate-100 text-right">
                        <input
                          type="number"
                          value={row.unit_price}
                          onChange={(e) =>
                            handleUpdateItem(idx, "unit_price", Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-24 h-6 px-1.5 border border-slate-300 rounded text-right text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00c875]"
                        />
                      </td>

                      {/* DISCOUNT PERCENT */}
                      <td className="py-1 px-1 border-r border-slate-100 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={row.discount_percent}
                          onChange={(e) =>
                            handleUpdateItem(idx, "discount_percent", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                          }
                          className="w-12 h-6 px-1 border border-slate-300 rounded text-center text-xs text-slate-700"
                        />
                      </td>

                      {/* LINE TOTAL */}
                      <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                        {formatCurrency(row.line_total)}
                      </td>

                      {/* DELETE ACTION */}
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                          title="Hapus baris obat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. BOTTOM SETTLEMENT & ACCOUNTING INTEGRATION PANEL */}
        <div className="bg-white rounded-lg border border-slate-300 p-3 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: Notes & Payment Terms */}
          <div className="md:col-span-7 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Catatan Transaksi / Keterangan :
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan faktur penjualan, instruksi pengiriman, dll."
                className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#00c875]"
              />
            </div>

            {/* Payment Method & Accounting Account */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-[11px]">
              <span className="font-bold text-slate-800 block">
                Syarat Pembayaran &amp; Posting Akuntansi :
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="pay_method"
                    checked={paymentMethod === "TUNAI"}
                    onChange={() => setPaymentMethod("TUNAI")}
                    className="text-[#00c875] focus:ring-[#00c875]"
                  />
                  <span>Tunai / Lunas (Kas)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="pay_method"
                    checked={paymentMethod === "TRANSFER"}
                    onChange={() => setPaymentMethod("TRANSFER")}
                    className="text-[#00c875] focus:ring-[#00c875]"
                  />
                  <span>Transfer Bank</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="pay_method"
                    checked={paymentMethod === "KREDIT"}
                    onChange={() => setPaymentMethod("KREDIT")}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Kredit / Tempo (Piutang)</span>
                </label>
              </div>

              {/* Account Dropdown */}
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {paymentMethod !== "KREDIT" && (
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">
                      Akun Kas / Bank Penerimaan:
                    </label>
                    <select
                      value={cashAccountId}
                      onChange={(e) => setCashAccountId(e.target.value)}
                      className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white font-medium"
                    >
                      {accountsList.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {paymentMethod === "KREDIT" && (
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-0.5">
                      Tanggal Jatuh Tempo :
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-white font-semibold text-amber-900"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Financial Summary & Final Calculations */}
          <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Subtotal Obat:</span>
              <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Diskon Nota (% / Rp):</span>
              <div className="flex items-center gap-1 w-36">
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="%"
                  value={discountPercent || ""}
                  onChange={(e) => {
                    setDiscountPercent(parseFloat(e.target.value) || 0);
                    setNominalDiscount(0);
                  }}
                  className="w-12 h-6 px-1 border border-slate-300 rounded text-center text-[10.5px]"
                />
                <input
                  type="number"
                  placeholder="Rp"
                  value={nominalDiscount || ""}
                  onChange={(e) => {
                    setNominalDiscount(parseFloat(e.target.value) || 0);
                    setDiscountPercent(0);
                  }}
                  className="w-24 h-6 px-1.5 border border-slate-300 rounded text-right text-[10.5px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Biaya Ongkir / Kirim:</span>
              <input
                type="number"
                value={shippingFee || ""}
                onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                placeholder="Rp 0"
                className="w-32 h-6 px-1.5 border border-slate-300 rounded text-right text-[11px]"
              />
            </div>

            {ppnType !== "Non" && (
              <div className="flex items-center justify-between text-slate-700">
                <span>PPN ({taxPercent}% {ppnType}):</span>
                <span className="font-semibold">{formatCurrency(calculatedTax)}</span>
              </div>
            )}

            {/* GRAND TOTAL */}
            <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-sm">
              <span className="font-extrabold text-slate-900">Total Akhir Faktur:</span>
              <span className="font-black text-emerald-700 text-base">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            {/* JUMLAH DIBAYAR */}
            <div className="pt-1 flex items-center justify-between">
              <span className="font-bold text-slate-700">Jumlah Dibayar:</span>
              <input
                type="number"
                value={paidAmount || ""}
                onChange={(e) => {
                  setPaidAmount(parseFloat(e.target.value) || 0);
                  setIsAutoLunas(false);
                }}
                className="w-36 h-7 px-2 border-2 border-emerald-500 rounded text-right text-xs font-bold text-emerald-800 bg-white"
              />
            </div>

            {/* SISA PIUTANG / KEMBALIAN */}
            {paymentMethod === "KREDIT" || remainingAmount > 0 ? (
              <div className="flex items-center justify-between text-rose-700 font-bold">
                <span>Sisa Piutang Usaha (AR):</span>
                <span>{formatCurrency(remainingAmount)}</span>
              </div>
            ) : changeAmount > 0 ? (
              <div className="flex items-center justify-between text-blue-700 font-bold">
                <span>Kembalian:</span>
                <span>{formatCurrency(changeAmount)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. BOTTOM ACTION TOOLBAR */}
      <div className="h-12 px-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
        <button
          type="button"
          onClick={() => router.push("/sales/invoices")}
          className="h-8 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded flex items-center gap-1.5 transition"
        >
          <Undo2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Simpan & Cetak Faktur */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveInvoice(true)}
            className="h-8 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Simpan &amp; Cetak Faktur</span>
          </button>

          {/* Simpan Penjualan */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveInvoice(false)}
            className="h-8 px-5 bg-[#00c875] hover:bg-[#00b066] active:scale-98 text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Penjualan"}</span>
          </button>
        </div>
      </div>

      {/* 6. MODAL CARI OBAT (CariObatSalesModal) */}
      <CariObatSalesModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleSelectItem}
        saleType={saleType}
        warehouseId={warehouseId}
      />

      {/* 7. MODAL LAMPIRAN DOKUMEN PBF & SP (PbfDocumentUpload) */}
      {isPbfDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Dokumen Kepatuhan Penjualan PBF (CDOB BPOM)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsPbfDocModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-4">
              <PbfDocumentUpload
                entityType="sale"
                entityId={draftSaleId}
                initialDocType={initialDocType}
                title="Arsip Dokumen Penjualan PBF (SP Asli & Faktur PBF Asal)"
                subtitle="Unggah dokumen pesanan sarana pelanggan berstempel & SIPA APJ, serta scan Faktur Pembelian PBF Asal lengkap dengan alur persetujuan perusahaan."
                onUploadedCountChange={(cnt) => {
                  setPbfDocCount(cnt);
                  refetchSaleDocs();
                }}
              />
            </div>

            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsPbfDocModalOpen(false)}
                className="h-7 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-xs transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL PILIH FAKTUR PEMBELIAN PBF ASAL */}
      {isSelectPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Pilih Faktur Pembelian PBF Asal (Database Pembelian)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSelectPurchaseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={purchaseSearchQuery}
                  onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                  placeholder="Cari No. Faktur / Nama Supplier PBF / No. SP..."
                  className="w-full h-8 pl-8 pr-3 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-left font-bold">
                    <th className="py-2 px-3">No. Faktur Pembelian</th>
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Supplier / PBF</th>
                    <th className="py-2 px-3 text-right">Total Transaksi</th>
                    <th className="py-2 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada riwayat pembelian PBF yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p: any) => (
                      <tr key={p.id} className="hover:bg-blue-50/50">
                        <td className="py-2 px-3 font-semibold text-blue-700">
                          {p.invoice_no || p.invoice_number || "-"}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {formatDate(p.invoice_date || p.created_at)}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {p.supplier?.name || "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-700">
                          {formatCurrency(p.grand_total || p.total_amount || 0)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setPbfOriginInvoiceNo(p.invoice_no || p.invoice_number || "");
                              setOriginPurchaseId(p.id);
                              setIsSelectPurchaseModalOpen(false);
                            }}
                            className="h-6 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] transition"
                          >
                            Pilih Faktur
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsSelectPurchaseModalOpen(false)}
                className="h-7 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
