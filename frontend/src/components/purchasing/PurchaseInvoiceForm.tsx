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
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariSupplierModal } from "./CariSupplierModal";
import { CariItemModal } from "./CariItemModal";
import { DetailItemModal } from "./DetailItemModal";
import { IncludeBiayaModal } from "./IncludeBiayaModal";
import { CariPesananModal } from "./CariPesananModal";

export interface InvoiceItemRow {
  product_id: string;
  code: string;
  name: string;
  brand_name?: string;
  po_qty: number; // Jml Pes... (Jumlah Pesanan dari PO)
  qty: number; // Jumlah yang diterima/faktur ini
  received_qty?: number;
  unit_id: string;
  unit_name: string;
  unit_price: number;
  discount_percent: number;
  line_total: number;
  stock?: number;
  rack?: string;
  selling_price?: number;
}

interface PurchaseInvoiceFormProps {
  isEdit?: boolean;
  invoiceId?: string;
}

export const PurchaseInvoiceForm: React.FC<PurchaseInvoiceFormProps> = ({
  isEdit = false,
  invoiceId,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modals state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEditRowModalOpen, setIsEditRowModalOpen] = useState(false);
  const [isHargaJualModalOpen, setIsHargaJualModalOpen] = useState(false);
  const [isInfoRowModalOpen, setIsInfoRowModalOpen] = useState(false);
  const [isBayarModalOpen, setIsBayarModalOpen] = useState(false);
  const [isIncludeBiayaModalOpen, setIsIncludeBiayaModalOpen] = useState(false);
  const [isPesananModalOpen, setIsPesananModalOpen] = useState(false);
  const [isDataSerialModalOpen, setIsDataSerialModalOpen] = useState(false);

  const [includeBiayaData, setIncludeBiayaData] = useState({
    name: "Ongkos Kirim",
    nominal: 0,
    allocation: "HPP",
    notes: "",
  });

  // Header State matching Screenshot 1
  const [invoiceNo, setInvoiceNo] = useState("Auto");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [ppnType, setPpnType] = useState<"Non" | "Include" | "Exclude">("Non");
  const [selectedPO, setSelectedPO] = useState<any>(null);

  // Table items state
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<InvoiceItemRow | null>(null);

  // Bottom form state
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [taxCheckbox, setTaxCheckbox] = useState(false);
  const [nominalDiscount, setNominalDiscount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notaDiscountPercent, setNotaDiscountPercent] = useState<number>(0);
  const [extraFee, setExtraFee] = useState<number>(0);
  const [extraFeeCheckbox, setExtraFeeCheckbox] = useState(false);

  // Payment / Bayar state matching Ketoko Image 2
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [payAccount, setPayAccount] = useState("KAS");
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [bayarTunai, setBayarTunai] = useState<number>(0);
  const [bayarDeposit, setBayarDeposit] = useState<number>(0);
  const [bayarKredit, setBayarKredit] = useState<number>(0);
  const [cashAccountId, setCashAccountId] = useState("");
  const [isPrintAfterSave, setIsPrintAfterSave] = useState(false);

  // Queries
  const { data: accountsList = [] } = useQuery({
    queryKey: ["cash-accounts-list"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data?.filter((a: any) => !a.is_header && (a.subtype === "CASH_BANK" || (a.code && a.code.startsWith("1-11")))) || [];
    },
  });

  useEffect(() => {
    if (accountsList.length > 0 && !cashAccountId) {
      const defaultCash = accountsList.find((a: any) => a.code === "1-1121") || accountsList[0];
      setCashAccountId(defaultCash.id);
    }
  }, [accountsList, cashAccountId]);

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
  });

  // Default warehouse
  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  // Load existing Purchase Invoice if isEdit
  const { data: existingInvoice, isLoading: isExistingLoading } = useQuery({
    queryKey: ["purchase-invoice-detail", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const res = await api.get(`/purchases/${invoiceId}`);
      return res.data?.data;
    },
    enabled: isEdit && Boolean(invoiceId),
  });

  useEffect(() => {
    if (existingInvoice) {
      setInvoiceNo(existingInvoice.invoice_no || "Auto");
      if (existingInvoice.date) {
        const d = new Date(existingInvoice.date);
        const pad = (n: number) => String(n).padStart(2, "0");
        setInvoiceDate(
          `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        );
      }
      if (existingInvoice.due_date) {
        setDueDate(new Date(existingInvoice.due_date).toISOString().split("T")[0]);
      }
      if (existingInvoice.supplier) {
        setSelectedSupplier(existingInvoice.supplier);
      }
      if (existingInvoice.warehouse_id) {
        setWarehouseId(existingInvoice.warehouse_id);
      }
      if (existingInvoice.purchase_order) {
        setSelectedPO(existingInvoice.purchase_order);
      }
      setNotes(existingInvoice.notes || "");
      setTaxPercent(existingInvoice.tax_percent || 0);
      setPpnType(existingInvoice.tax_percent > 0 ? "Exclude" : "Non");
      setNominalDiscount(existingInvoice.discount || 0);
      setExtraFee(existingInvoice.shipping_fee || 0);
      setExtraFeeCheckbox((existingInvoice.shipping_fee || 0) > 0);
      const paid = Number(existingInvoice.paid_amount) || 0;
      const total = Number(existingInvoice.total_amount) || 0;
      setPaidAmount(paid);
      setBayarTunai(paid);
      setBayarKredit(Math.max(0, total - paid));

      if (existingInvoice.items && existingInvoice.items.length > 0) {
        const mappedItems: InvoiceItemRow[] = existingInvoice.items.map((it: any) => {
          const prod = it.product || {};
          const qty = Number(it.qty) || 1;
          const unitPrice = Number(it.unit_price) || 0;
          const discountAmt = Number(it.discount) || 0;
          const discPct =
            qty * unitPrice > 0 ? (discountAmt / (qty * unitPrice)) * 100 : 0;
          const lineTot = Number(it.total_amount) || qty * unitPrice - discountAmt;

          return {
            product_id: it.product_id,
            code: prod.code || it.code || "-",
            name: prod.name || it.name || "-",
            brand_name: prod.brand?.name || it.brand_name || "-",
            po_qty: it.po_qty || qty,
            qty: qty,
            received_qty: qty,
            unit_id: it.unit_id || prod.base_unit_id,
            unit_name: it.unit?.name || prod.base_unit?.name || "PCS",
            unit_price: unitPrice,
            discount_percent: Math.round(discPct * 100) / 100,
            line_total: lineTot,
            stock: prod.stock || 0,
            rack: prod.rack || "-",
            selling_price: prod.selling_price || 0,
          };
        });
        setItems(mappedItems);
        if (mappedItems.length > 0) setSelectedRowIndex(0);
      }
    }
  }, [existingInvoice]);

  // Adjust tax percentage based on PPN dropdown
  useEffect(() => {
    if (ppnType === "Non") {
      setTaxPercent(0);
      setTaxCheckbox(false);
    } else if (ppnType === "Include" || ppnType === "Exclude") {
      if (taxPercent === 0) setTaxPercent(11);
      setTaxCheckbox(true);
    }
  }, [ppnType]);

  // Calculations
  const itemCount = items.length;
  const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const subtotal = items.reduce((sum, it) => sum + it.line_total, 0);

  // Discount calculation
  const pot1Amount = useMemo(() => {
    return (subtotal * (Number(discountPercent) || 0)) / 100;
  }, [subtotal, discountPercent]);

  const potNotaAmount = useMemo(() => {
    return ((subtotal - pot1Amount) * (Number(notaDiscountPercent) || 0)) / 100;
  }, [subtotal, pot1Amount, notaDiscountPercent]);

  const calculatedNominalDiscount = useMemo(() => {
    if (discountPercent > 0 || notaDiscountPercent > 0) {
      return Math.round(pot1Amount + potNotaAmount);
    }
    return nominalDiscount;
  }, [discountPercent, notaDiscountPercent, pot1Amount, potNotaAmount, nominalDiscount]);

  const afterDiscount = useMemo(() => {
    return Math.max(0, subtotal - calculatedNominalDiscount);
  }, [subtotal, calculatedNominalDiscount]);

  // Tax computation based on tax dropdown
  const taxAmount = useMemo(() => {
    if (taxPercent <= 0) return 0;
    if (ppnType === "Include") {
      return Math.round(afterDiscount - afterDiscount / (1 + taxPercent / 100));
    }
    return Math.round((afterDiscount * taxPercent) / 100);
  }, [afterDiscount, taxPercent, ppnType]);

  // Grand Total: Sub Total - Diskon + Pajak + Biaya
  const grandTotal = useMemo(() => {
    let tot = afterDiscount;
    if (ppnType !== "Include") {
      tot += taxAmount;
    }
    if (extraFee > 0) {
      tot += Number(extraFee) || 0;
    }
    return Math.max(0, tot);
  }, [afterDiscount, taxAmount, ppnType, extraFee]);

  // Selected item object for the right sidebar
  const selectedItemRow = selectedRowIndex !== null ? items[selectedRowIndex] : null;

  // Add Item from CariItemModal
  const handleItemChosen = (product: any) => {
    const existingIndex = items.findIndex((it) => it.product_id === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].qty += 1;
      const baseTotal = updated[existingIndex].qty * updated[existingIndex].unit_price;
      const discAmt = (baseTotal * updated[existingIndex].discount_percent) / 100;
      updated[existingIndex].line_total = baseTotal - discAmt;
      setItems(updated);
      setSelectedRowIndex(existingIndex);
    } else {
      const price = Number(product.purchase_price || 0);
      const defaultUnit =
        units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
      const resolvedUnitId = product.base_unit_id || defaultUnit?.id || "";
      const resolvedUnitName = product.base_unit?.name || defaultUnit?.name || "PCS";
      const newItem: InvoiceItemRow = {
        product_id: product.id,
        code: product.code,
        name: product.name,
        brand_name: product.brand?.name || "-",
        po_qty: 0,
        qty: 1,
        received_qty: 1,
        unit_id: resolvedUnitId,
        unit_name: resolvedUnitName,
        unit_price: price,
        discount_percent: 0,
        line_total: price,
        stock: product.stock || 0,
        rack: product.rack || "-",
        selling_price: product.selling_price || 0,
      };
      setItems([...items, newItem]);
      setSelectedRowIndex(items.length);
    }
  };

  // Import items from PO
  const handleSelectPO = (po: any) => {
    setSelectedPO(po);
    if (po.supplier) {
      setSelectedSupplier(po.supplier);
    }
    if (po.warehouse_id) {
      setWarehouseId(po.warehouse_id);
    }
    if (po.tax_percent > 0) {
      setTaxPercent(po.tax_percent);
      setPpnType("Exclude");
    }

    if (po.items && po.items.length > 0) {
      const defaultUnit =
        units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
      const imported: InvoiceItemRow[] = po.items.map((it: any) => {
        const prod = it.product || {};
        const q = Number(it.qty) || 1;
        const p = Number(it.unit_price) || 0;
        const d = Number(it.discount) || 0;
        const discPct = q * p > 0 ? (d / (q * p)) * 100 : 0;
        const resolvedUnitId = it.unit_id || prod.base_unit_id || defaultUnit?.id || "";
        const resolvedUnitName = it.unit?.name || prod.base_unit?.name || defaultUnit?.name || "PCS";

        return {
          product_id: it.product_id,
          code: prod.code || it.code || "-",
          name: prod.name || it.name || "-",
          brand_name: prod.brand?.name || "-",
          po_qty: q,
          qty: q,
          received_qty: q,
          unit_id: resolvedUnitId,
          unit_name: resolvedUnitName,
          unit_price: p,
          discount_percent: Math.round(discPct * 100) / 100,
          line_total: q * p - d,
          stock: prod.stock || 0,
          rack: prod.rack || "-",
          selling_price: prod.selling_price || 0,
        };
      });
      setItems(imported);
      setSelectedRowIndex(0);
    }
  };

  // Row selection handler
  const handleSelectRow = (index: number) => {
    setSelectedRowIndex(index);
  };

  // Delete selected item row
  const handleDeleteRow = () => {
    if (selectedRowIndex === null) {
      alert("Pilih item dalam tabel yang ingin dihapus.");
      return;
    }
    const updated = items.filter((_, idx) => idx !== selectedRowIndex);
    setItems(updated);
    setSelectedRowIndex(updated.length > 0 ? 0 : null);
  };

  // Open Edit row modal
  const handleOpenEditRow = () => {
    if (selectedRowIndex === null || !items[selectedRowIndex]) {
      alert("Pilih item yang ingin diubah.");
      return;
    }
    setEditingRow({ ...items[selectedRowIndex] });
    setIsEditRowModalOpen(true);
  };

  // Save row edit (Detail Item matching Screenshot 2)
  const handleSaveDetailItem = (updatedRow: any) => {
    if (selectedRowIndex === null) return;
    const updated = [...items];
    updated[selectedRowIndex] = {
      ...updated[selectedRowIndex],
      qty: updatedRow.qty,
      unit_id: updatedRow.unit_id,
      unit_name: updatedRow.unit_name,
      unit_price: updatedRow.unit_price,
      discount_percent: updatedRow.discount_percent,
      line_total: updatedRow.line_total,
    };
    setItems(updated);
    setIsEditRowModalOpen(false);
  };

  // Cek Stok Minimum
  const handleCekStokMinimum = async () => {
    try {
      const res = await api.get("/products?low_stock=true&page_size=50");
      const lowStockProducts = res.data?.data?.items || [];
      if (lowStockProducts.length === 0) {
        alert("Semua stok produk saat ini aman (tidak ada yang berada di bawah stok minimum).");
        return;
      }

      if (
        confirm(
          `Ditemukan ${lowStockProducts.length} item yang berada di bawah stok minimum. Tambahkan semua item ini ke Faktur Pembelian?`
        )
      ) {
        const newRows: InvoiceItemRow[] = [...items];
        const defaultUnit =
          units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
        lowStockProducts.forEach((p: any) => {
          if (!newRows.some((it) => it.product_id === p.id)) {
            const needQty = Math.max(1, (p.min_stock || 10) - (p.stock || 0));
            const price = Number(p.purchase_price || 0);
            const resolvedUnitId = p.base_unit_id || defaultUnit?.id || "";
            const resolvedUnitName = p.base_unit?.name || defaultUnit?.name || "PCS";
            newRows.push({
              product_id: p.id,
              code: p.code,
              name: p.name,
              brand_name: p.brand?.name || "-",
              po_qty: needQty,
              qty: needQty,
              received_qty: needQty,
              unit_id: resolvedUnitId,
              unit_name: resolvedUnitName,
              unit_price: price,
              discount_percent: 0,
              line_total: needQty * price,
              stock: p.stock || 0,
              rack: p.rack || "-",
              selling_price: p.selling_price || 0,
            });
          }
        });
        setItems(newRows);
        if (newRows.length > 0 && selectedRowIndex === null) {
          setSelectedRowIndex(0);
        }
      }
    } catch (e: any) {
      alert("Gagal memuat barang stok minimum: " + (e.response?.data?.message || e.message));
    }
  };

  // Reset form (+ Tambah)
  const handleResetForm = () => {
    if (items.length > 0 && !confirm("Kosongkan form untuk membuat Pembelian baru?")) {
      return;
    }
    setInvoiceNo("Auto");
    setSelectedSupplier(null);
    setSelectedPO(null);
    setItems([]);
    setSelectedRowIndex(null);
    setNotes("");
    setTaxPercent(0);
    setPpnType("Non");
    setNominalDiscount(0);
    setDiscountPercent(0);
    setNotaDiscountPercent(0);
    setExtraFee(0);
    setExtraFeeCheckbox(false);
    setPaidAmount(0);
    setIncludeBiayaData({
      name: "Ongkos Kirim",
      nominal: 0,
      allocation: "HPP",
      notes: "",
    });
  };

  // Save Invoice Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplier?.id) {
        throw new Error("Pilih Supplier terlebih dahulu.");
      }
      if (items.length === 0) {
        throw new Error("Tabel item pembelian masih kosong. Silakan klik [+ Item].");
      }

      const defaultUnit =
        units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];

      const payload = {
        warehouse_id: warehouseId || undefined,
        supplier_id: selectedSupplier.id,
        purchase_order_id: selectedPO?.id || undefined,
        due_date: dueDate ? new Date(dueDate) : undefined,
        notes: notes,
        tax_percent: taxPercent,
        discount: calculatedNominalDiscount,
        shipping_fee: Number(extraFee) || 0,
        paid_amount: (Number(bayarTunai) || 0) + (Number(dpAmount) || 0) + (Number(bayarDeposit) || 0),
        cash_account_id: cashAccountId || undefined,
        items: items.map((it) => {
          let resolvedUnitId = it.unit_id;
          if (!resolvedUnitId || resolvedUnitId.length < 20) {
            const foundU = units.find(
              (u: any) =>
                u.id === it.unit_id ||
                u.name?.toLowerCase() === it.unit_name?.toLowerCase() ||
                u.code?.toLowerCase() === it.unit_name?.toLowerCase()
            );
            resolvedUnitId = foundU ? foundU.id : defaultUnit?.id;
          }
          return {
            product_id: it.product_id,
            unit_id: resolvedUnitId,
            qty: it.qty,
            unit_price: it.unit_price,
            discount: (it.qty * it.unit_price * it.discount_percent) / 100,
          };
        }),
      };

      if (isEdit && invoiceId) {
        return await api.put(`/purchases/${invoiceId}`, payload);
      }
      return await api.post("/purchases", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      alert(
        isEdit
          ? "Faktur Pembelian berhasil diperbarui!"
          : "Faktur Pembelian baru berhasil disimpan & stok bertambah!"
      );
      if (isPrintAfterSave) {
        setTimeout(() => window.print(), 300);
      }
      router.push("/purchasing/invoices");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan Pembelian: " + (err.response?.data?.message || err.message));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) return;
      return await api.delete(`/purchases/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      alert("Faktur Pembelian berhasil dihapus.");
      router.push("/purchasing/invoices");
    },
    onError: (err: any) => {
      alert("Gagal menghapus Faktur: " + (err.response?.data?.message || err.message));
    },
  });

  const handleDeleteInvoice = () => {
    if (!isEdit || !invoiceId) {
      handleResetForm();
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus Faktur Pembelian ${invoiceNo}?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 flex flex-col h-full min-h-0 text-xs select-none gap-1 overflow-y-auto md:overflow-hidden">
      {/* 1. Header: [< Pembelian Baru] + User Profile */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/purchasing/invoices")}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
            title="Kembali ke Daftar Pembelian"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">
            {isEdit ? "Ubah Pembelian" : "Pembelian Baru"}
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

      {/* 2. Top Header Form matching Screenshot 1 (2 Rows) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 shrink-0 bg-slate-50/40 p-1 rounded border border-slate-200/80 text-[11px]">
        {/* ROW 1: No Transaksi (col-3) | Tanggal (col-3) | Supplier (col-6) */}
        <div className="md:col-span-3">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">
            No Transaksi :
          </label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {invoiceNo}
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">Tanggal :</label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {invoiceDate}
          </div>
        </div>

        <div className="md:col-span-6">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">Supplier :</label>
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
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(true)}
              className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              title="Cari Supplier"
            >
              <Search className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ROW 2: Masuk Ke (col-3) | PPN (col-3) | Pesanan (col-6) */}
        <div className="md:col-span-3">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">
            Masuk Ke :
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full h-6 px-1.5 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer truncate"
          >
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">PPN :</label>
          <select
            value={ppnType}
            onChange={(e) => setPpnType(e.target.value as any)}
            className="w-full h-6 px-1.5 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="Non">Non</option>
            <option value="Include">Include</option>
            <option value="Exclude">Exclude</option>
          </select>
        </div>

        <div className="md:col-span-6">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">
            Pesanan :
          </label>
          <div className="flex gap-1">
            <div
              onClick={() => setIsPesananModalOpen(true)}
              className="flex-1 h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 text-[11px] cursor-pointer hover:border-sky-500 truncate"
            >
              {selectedPO ? (
                <span className="font-semibold text-emerald-700">
                  {selectedPO.order_no} (PO)
                </span>
              ) : (
                <span className="text-slate-400">Select...</span>
              )}
            </div>
            {selectedPO && (
              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="h-6 px-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-rose-600 text-[10px] shrink-0"
                title="Batalkan link PO"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsPesananModalOpen(true)}
              className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              title="Cari Pesanan Pembelian"
            >
              <Search className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Middle Area: Table + Right Detail Item Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 flex-1 min-h-[190px] overflow-hidden">
        {/* Main Item Table (col-9.5) */}
        <div className="md:col-span-9 lg:col-span-10 border border-slate-300 rounded overflow-hidden flex flex-col bg-white">
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left border-collapse text-[10.5px] whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold sticky top-0 h-6">
                <tr>
                  <th className="py-0.5 px-1.5 w-7 text-center border-r border-slate-200">No</th>
                  <th className="py-0.5 px-2 border-r border-slate-200">Kode</th>
                  <th className="py-0.5 px-2 border-r border-slate-200">Nama</th>
                  <th className="py-0.5 px-2 border-r border-slate-200">Merek</th>
                  <th className="py-0.5 px-2 border-r border-slate-200 text-right">Jml Pes...</th>
                  <th className="py-0.5 px-2 border-r border-slate-200 text-right">Jumlah</th>
                  <th className="py-0.5 px-1.5 border-r border-slate-200 text-center">Satuan</th>
                  <th className="py-0.5 px-2 border-r border-slate-200 text-right">Harga</th>
                  <th className="py-0.5 px-1.5 border-r border-slate-200 text-right">Pot %</th>
                  <th className="py-0.5 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400 font-normal">
                      No data
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    return (
                      <tr
                        key={idx}
                        onClick={() => handleSelectRow(idx)}
                        onDoubleClick={handleOpenEditRow}
                        className={`cursor-pointer transition border-b border-slate-100 h-6 ${
                          isSelected
                            ? "bg-sky-100/70 text-slate-900 font-medium"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <td className="py-0.5 px-1.5 text-center text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-0.5 px-2 font-mono border-r border-slate-200">
                          {it.code}
                        </td>
                        <td className="py-0.5 px-2 truncate max-w-[220px] border-r border-slate-200">
                          {it.name}
                        </td>
                        <td className="py-0.5 px-2 text-slate-600 border-r border-slate-200">
                          {it.brand_name || "-"}
                        </td>
                        <td className="py-0.5 px-2 text-right font-mono text-slate-500 border-r border-slate-200">
                          {Number(it.po_qty || 0).toFixed(2)}
                        </td>
                        <td className="py-0.5 px-2 text-right font-mono font-semibold border-r border-slate-200 text-slate-900">
                          {Number(it.qty || 0).toFixed(2)}
                        </td>
                        <td className="py-0.5 px-1.5 text-center border-r border-slate-200">
                          {it.unit_name}
                        </td>
                        <td className="py-0.5 px-2 text-right font-mono border-r border-slate-200">
                          {Number(it.unit_price).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono border-r border-slate-200">
                          {Number(it.discount_percent || 0).toFixed(2)}
                        </td>
                        <td className="py-0.5 px-2 text-right font-mono font-semibold text-slate-900">
                          {Number(it.line_total).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail Card matching Screenshot 1 */}
        <div className="md:col-span-3 lg:col-span-2 border border-slate-300 rounded bg-white p-2 flex flex-col justify-between text-[11px] overflow-y-auto">
          <div>
            <h3 className="font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1.5 text-[11.5px]">
              Detail Item Terpilih
            </h3>

            {selectedItemRow ? (
              <div className="space-y-1 text-slate-600 text-[10.5px]">
                <div>
                  <span className="text-slate-400 block text-[9.5px]">Kode & Nama:</span>
                  <strong className="text-slate-800 text-[11px] block leading-tight">
                    {selectedItemRow.name}
                  </strong>
                  <span className="text-[10px] text-slate-500">{selectedItemRow.code}</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-slate-100">
                  <span className="text-slate-500">Merek:</span>
                  <span className="font-medium text-slate-700">
                    {selectedItemRow.brand_name || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stok Fisik:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {Number(selectedItemRow.stock || 0).toFixed(2)} {selectedItemRow.unit_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lokasi Rak:</span>
                  <span className="font-medium text-slate-700">
                    {selectedItemRow.rack || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Harga Pokok:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {formatCurrency(selectedItemRow.unit_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Harga Jual:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCurrency(selectedItemRow.selling_price || 0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 italic text-[10.5px]">
                Pilih atau klik baris item dalam tabel untuk melihat detail informasi.
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 text-center">
            Apotek Berkat Purnama
          </div>
        </div>
      </div>

      {/* 4. Table Action Buttons under table matching Gambar 2 */}
      {/* [+ Item] [✏️] [🗑️] [ℹ️] [Harga Jual] [Data Serial] */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0 py-0.5">
        <button
          type="button"
          onClick={() => setIsItemModalOpen(true)}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <Plus className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
          <span>+ Item</span>
        </button>

        <button
          type="button"
          onClick={handleOpenEditRow}
          disabled={selectedRowIndex === null}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Ubah Item Baris (Detail Item)"
        >
          <Pencil className="w-3 h-3 text-sky-600" />
        </button>

        <button
          type="button"
          onClick={handleDeleteRow}
          disabled={selectedRowIndex === null}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Hapus Item Terpilih"
        >
          <Trash2 className="w-3 h-3 text-rose-500" />
        </button>

        <button
          type="button"
          onClick={() => setIsInfoRowModalOpen(true)}
          disabled={selectedRowIndex === null}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Informasi Tambahan Item"
        >
          <Info className="w-3 h-3 text-amber-600" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (selectedItemRow) setIsHargaJualModalOpen(true);
          }}
          disabled={selectedRowIndex === null}
          className="h-6 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded font-medium text-[10.5px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Lihat Daftar Harga Jual Item"
        >
          <span>Harga Jual</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDataSerialModalOpen(true)}
          disabled={selectedRowIndex === null}
          className="h-6 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-400 rounded font-medium text-[10.5px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Data Serial"
        >
          <span>Data Serial</span>
        </button>
      </div>

      {/* 5. Bottom Calculation & Notes matching Gambar 2 */}
      <div className="bg-slate-50/70 border border-slate-300 rounded p-1 sm:p-1.5 space-y-1 text-xs shadow-2xs shrink-0">
        {/* ROW 1: Keterangan (col-4) | Item (col-2) | Sub Total (col-2) | Pjk % (col-2) | Nom Pajak (col-2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* Keterangan */}
          <div className="md:col-span-4">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Keterangan :
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan faktur pembelian..."
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Item count */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Item :
            </label>
            <input
              type="text"
              readOnly
              value={itemCount.toFixed(2)}
              className="w-full h-6 px-2 py-0 border border-dashed border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono font-medium"
            />
          </div>

          {/* Sub Total */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Sub Total :
            </label>
            <input
              type="text"
              readOnly
              value={subtotal.toLocaleString("id-ID", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              className="w-full h-6 px-2 py-0 border border-dashed border-slate-300 rounded text-[11px] text-slate-900 bg-white text-right font-mono font-bold"
            />
          </div>

          {/* Pjk % */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pjk % :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="any"
                value={taxPercent || ""}
                placeholder="0"
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setTaxPercent(val);
                  setTaxCheckbox(val > 0);
                  if (val > 0 && ppnType === "Non") {
                    setPpnType("Exclude");
                  } else if (val === 0) {
                    setPpnType("Non");
                  }
                }}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
              />
              <input
                type="checkbox"
                checked={taxCheckbox}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setTaxCheckbox(checked);
                  if (checked && taxPercent === 0) {
                    setTaxPercent(11);
                    setPpnType("Exclude");
                  } else if (!checked) {
                    setTaxPercent(0);
                    setPpnType("Non");
                  }
                }}
                className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Nom Pajak */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Nom Pajak :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                readOnly
                value={taxAmount.toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono"
              />
              <input
                type="checkbox"
                checked={taxCheckbox}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setTaxCheckbox(checked);
                  if (checked && taxPercent === 0) {
                    setTaxPercent(11);
                    setPpnType("Exclude");
                  } else if (!checked) {
                    setTaxPercent(0);
                    setPpnType("Non");
                  }
                }}
                className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ROW 2: Pot % (col-2) | Pot Nota % (col-2) | Nom Potongan (col-2) | Biaya (col-2) | Total Akhir (col-4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* Pot % */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pot % :
            </label>
            <input
              type="number"
              step="0.01"
              value={discountPercent || ""}
              placeholder="0"
              onChange={(e) => {
                setDiscountPercent(Number(e.target.value) || 0);
              }}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Pot Nota % */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pot Nota % :
            </label>
            <input
              type="number"
              step="0.01"
              value={notaDiscountPercent || ""}
              placeholder="0"
              onChange={(e) => {
                setNotaDiscountPercent(Number(e.target.value) || 0);
              }}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Nom Potongan */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Nom Potongan :
            </label>
            <input
              type="text"
              value={
                calculatedNominalDiscount > 0
                  ? calculatedNominalDiscount.toLocaleString("id-ID")
                  : "0"
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                const val = Number(raw) || 0;
                setNominalDiscount(val);
                setDiscountPercent(0);
                setNotaDiscountPercent(0);
              }}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Biaya */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Biaya :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="0"
                value={extraFee > 0 ? extraFee.toLocaleString("id-ID") : "0"}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  const val = Number(raw) || 0;
                  setExtraFee(val);
                  setIncludeBiayaData((prev) => ({ ...prev, nominal: val }));
                  if (val > 0) {
                    setExtraFeeCheckbox(true);
                  }
                }}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setIsIncludeBiayaModalOpen(true)}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
                title="Include Biaya Tambahan"
              >
                <DollarSign className="w-3 h-3 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Total Akhir (Highlight Pink/Magenta Box) */}
          <div className="md:col-span-4">
            <label className="block text-slate-700 font-bold text-[10px] mb-0.5 leading-none">
              Total Akhir :
            </label>
            <div className="w-full h-6 px-2 bg-[#f9cbe2] border border-pink-300 rounded text-right font-mono font-extrabold text-xs text-slate-900 shadow-2xs flex items-center justify-end">
              {grandTotal.toLocaleString("id-ID", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Bottom Master Actions matching Gambar 2 */}
      {/* [+ Tambah] [💾 Simpan] [🗑️ Hapus] [🖨️ Cetak] [💳 Bayar] */}
      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-200 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* [+ Tambah] */}
          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Faktur Baru (+ Tambah)"
          >
            <Plus className="w-3 h-3 stroke-[2.8]" />
            <span>Tambah</span>
          </button>

          {/* [💾 Simpan] */}
          <button
            type="button"
            onClick={() => {
              if (!selectedSupplier?.id) {
                alert("Pilih Supplier terlebih dahulu.");
                return;
              }
              if (items.length === 0) {
                alert("Tabel item pembelian masih kosong. Silakan klik [+ Item].");
                return;
              }
              if (bayarTunai === 0 && bayarKredit === 0 && grandTotal > 0) {
                setBayarTunai(grandTotal);
                setBayarKredit(0);
              }
              setIsBayarModalOpen(true);
            }}
            disabled={saveMutation.isPending}
            className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Simpan Faktur Pembelian"
          >
            <Save className="w-3 h-3" />
            <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>

          {/* [🗑️ Hapus] */}
          <button
            type="button"
            onClick={handleDeleteInvoice}
            disabled={!isEdit}
            className="h-6 px-2.5 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
            title="Hapus Faktur Pembelian"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus</span>
          </button>

          {/* [🖨️ Cetak] */}
          <button
            type="button"
            onClick={() => window.print()}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Cetak Faktur Pembelian"
          >
            <Printer className="w-3 h-3" />
            <span>Cetak</span>
          </button>

          {/* [💳 Bayar] */}
          <button
            type="button"
            onClick={() => setIsBayarModalOpen(true)}
            className="h-6 px-2.5 bg-white hover:bg-amber-50 border border-amber-400 text-amber-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Bayar Faktur Pembelian"
          >
            <CreditCard className="w-3 h-3 text-amber-600" />
            <span>Bayar</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-400">
          Status Pembelian: <strong className={paidAmount >= grandTotal && grandTotal > 0 ? "text-emerald-600 font-bold" : paidAmount > 0 ? "text-amber-600 font-bold" : "text-slate-600 font-bold"}>{paidAmount >= grandTotal && grandTotal > 0 ? "LUNAS" : paidAmount > 0 ? "SEBAGIAN" : "BELUM LUNAS"}</strong>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* MODAL 1: CARI SUPPLIER */}
      <CariSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(supp) => setSelectedSupplier(supp)}
        selectedId={selectedSupplier?.id}
      />

      {/* MODAL 2: CARI ITEM (Screenshot 2) */}
      <CariItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleItemChosen}
        supplierCode={selectedSupplier?.code || ""}
      />

      {/* MODAL 3: DETAIL ITEM EDIT (Screenshot 2) */}
      <DetailItemModal
        isOpen={isEditRowModalOpen}
        onClose={() => setIsEditRowModalOpen(false)}
        item={editingRow}
        onSave={handleSaveDetailItem}
      />

      {/* MODAL 4: CARI PESANAN (PO) */}
      <CariPesananModal
        isOpen={isPesananModalOpen}
        onClose={() => setIsPesananModalOpen(false)}
        onSelect={handleSelectPO}
        supplierId={selectedSupplier?.id}
      />

      {/* MODAL 5: INCLUDE BIAYA */}
      <IncludeBiayaModal
        isOpen={isIncludeBiayaModalOpen}
        onClose={() => setIsIncludeBiayaModalOpen(false)}
        initialNominal={extraFee}
        initialData={includeBiayaData}
        onSave={(data) => {
          setIncludeBiayaData(data);
          setExtraFee(data.nominal);
          setExtraFeeCheckbox(data.nominal > 0);
          setIsIncludeBiayaModalOpen(false);
        }}
        onCancel={() => {
          if (extraFee === 0) {
            setExtraFeeCheckbox(false);
          }
        }}
      />

      {/* MODAL 6: HARGA JUAL */}
      {isHargaJualModalOpen && selectedItemRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden text-xs">
            <div className="px-3.5 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-slate-800">Daftar Harga Jual Produk</span>
              <button
                type="button"
                onClick={() => setIsHargaJualModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3.5 space-y-2">
              <div className="font-semibold text-slate-800">{selectedItemRow.name}</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Harga Pokok (Beli):</div>
                <div className="font-mono text-right font-medium">
                  {formatCurrency(selectedItemRow.unit_price)}
                </div>
                <div>Harga Jual Utama:</div>
                <div className="font-mono text-right font-bold text-emerald-700">
                  {formatCurrency(selectedItemRow.selling_price || 0)}
                </div>
              </div>
            </div>
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHargaJualModalOpen(false)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 text-xs hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: INFO ROW */}
      {isInfoRowModalOpen && selectedItemRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden text-xs">
            <div className="px-3.5 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-slate-800">Informasi Tambahan Item</span>
              <button
                type="button"
                onClick={() => setIsInfoRowModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3.5 space-y-1.5 text-slate-600">
              <p>
                <strong>Kode:</strong> {selectedItemRow.code}
              </p>
              <p>
                <strong>Nama:</strong> {selectedItemRow.name}
              </p>
              <p>
                <strong>Merek:</strong> {selectedItemRow.brand_name || "-"}
              </p>
              <p>
                <strong>Rak:</strong> {selectedItemRow.rack || "-"}
              </p>
              <p>
                <strong>Stok Saat Ini:</strong> {selectedItemRow.stock} {selectedItemRow.unit_name}
              </p>
            </div>
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInfoRowModalOpen(false)}
                className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 text-xs hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: DATA SERIAL */}
      {isDataSerialModalOpen && selectedItemRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden text-xs">
            <div className="px-3.5 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-slate-800">Data Serial / No Batch</span>
              <button
                type="button"
                onClick={() => setIsDataSerialModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3.5 space-y-2">
              <p className="text-slate-600 text-[11px]">
                Item: <strong>{selectedItemRow.name}</strong>
              </p>
              <label className="block text-slate-600 text-[10.5px]">
                Nomor Batch / No Seri:
              </label>
              <input
                type="text"
                placeholder="Contoh: BATCH-2026-11-A"
                className="w-full h-7 px-2 border border-slate-300 rounded text-xs"
              />
              <p className="text-[10px] text-slate-400 italic">
                Pelacakan serial/batch dicatat untuk pengawasan obat dan expired date.
              </p>
            </div>
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsDataSerialModalOpen(false)}
                className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
              >
                Simpan Serial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: PEMBAYARAN FAKTUR (Matching Ketoko Image 2 - Elegan & Menarik) */}
      {isBayarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden text-xs flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Pembayaran
              </span>
              <button
                type="button"
                onClick={() => setIsBayarModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-2.5">
              {/* 1. TOTAL TAGIHAN (Pink Box matching Image 2) */}
              <div className="bg-[#fce7f3] border-2 border-dashed border-pink-300 rounded-lg px-4 py-3 flex items-center justify-between shadow-2xs">
                <span className="text-base font-bold text-slate-800 tracking-wide">Total :</span>
                <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                  {Number(grandTotal).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* 2. FORM FIELDS */}
              <div className="space-y-1.5 pt-1">
                {/* DP PO / Pesanan */}
                <div className="flex items-center gap-2">
                  <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                    DP PO/Pesanan :
                  </label>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={dpAmount > 0 ? dpAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        const val = Number(raw) || 0;
                        setDpAmount(val);
                        setBayarKredit(Math.max(0, grandTotal - (val + bayarTunai + bayarDeposit)));
                      }}
                      className="w-full h-7 px-2.5 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        const poDp = Number(selectedPO?.total_amount || 0) * 0.3;
                        setDpAmount(poDp);
                        setBayarKredit(Math.max(0, grandTotal - (poDp + bayarTunai + bayarDeposit)));
                      }}
                      className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50"
                      title="Hitung DP PO"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Akun Kas / Bank Sumber Pembayaran */}
                <div className="flex items-center gap-2">
                  <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                    Kas / Bank :
                  </label>
                  <select
                    value={cashAccountId}
                    onChange={(e) => setCashAccountId(e.target.value)}
                    className="flex-1 h-7 px-2 border border-slate-300 rounded text-xs font-semibold focus:border-sky-500 focus:outline-none bg-white font-mono"
                  >
                    {accountsList.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bayar Tunai */}
                <div>
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                      Bayar Tunai :
                    </label>
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="text"
                        autoFocus
                        value={bayarTunai > 0 ? bayarTunai.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          const val = Number(raw) || 0;
                          setBayarTunai(val);
                          setBayarKredit(Math.max(0, grandTotal - (dpAmount + val + bayarDeposit)));
                        }}
                        className="w-full h-7 px-2.5 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          const fullCash = Math.max(0, grandTotal - dpAmount - bayarDeposit);
                          setBayarTunai(fullCash);
                          setBayarKredit(0);
                        }}
                        className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50"
                        title="Isi Tunai Penuh"
                      >
                        <Calculator className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-0.5 pr-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const fullCash = Math.max(0, grandTotal - dpAmount - bayarDeposit);
                        setBayarTunai(fullCash);
                        setBayarKredit(0);
                      }}
                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded text-[10px] font-semibold transition"
                    >
                      Uang Pas (Lunas)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.round(grandTotal * 0.5);
                        setBayarTunai(half);
                        setBayarKredit(Math.max(0, grandTotal - dpAmount - bayarDeposit - half));
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-[10px] font-medium transition"
                    >
                      50% Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBayarTunai(0);
                        setBayarKredit(Math.max(0, grandTotal - dpAmount - bayarDeposit));
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-[10px] font-medium transition"
                    >
                      Kredit / Tempo (Rp 0)
                    </button>
                  </div>
                </div>

                {/* Bayar Deposit */}
                <div className="flex items-center gap-2">
                  <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                    Bayar Deposit :
                  </label>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={bayarDeposit > 0 ? bayarDeposit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        const val = Number(raw) || 0;
                        setBayarDeposit(val);
                        setBayarKredit(Math.max(0, grandTotal - (dpAmount + bayarTunai + val)));
                      }}
                      className="w-full h-7 px-2.5 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        setBayarDeposit(0);
                        setBayarKredit(Math.max(0, grandTotal - (dpAmount + bayarTunai)));
                      }}
                      className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50"
                      title="Reset Deposit"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Bayar Kredit */}
                <div className="flex items-center gap-2">
                  <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                    Bayar Kredit :
                  </label>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={bayarKredit > 0 ? bayarKredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        const val = Number(raw) || 0;
                        setBayarKredit(val);
                      }}
                      className="w-full h-7 px-2.5 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        const fullKredit = Math.max(0, grandTotal - dpAmount - bayarDeposit);
                        setBayarTunai(0);
                        setBayarKredit(fullKredit);
                      }}
                      className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50"
                      title="Jadikan Hutang Penuh"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. TOTAL BAYAR (Green Box matching Image 2) */}
              <div className="bg-[#22c55e] text-white rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold tracking-wide">Total :</span>
                <span className="text-2xl font-black font-mono tracking-tight">
                  {((Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0) + (Number(bayarKredit) || 0)).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* 4. SISA (Orange Box matching Image 2) */}
              <div className="bg-[#f97316] text-white rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold tracking-wide">Sisa :</span>
                <span className="text-2xl font-black font-mono tracking-tight">
                  {Math.max(
                    0,
                    grandTotal - ((Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0) + (Number(bayarKredit) || 0))
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* 5. ACTION BUTTONS matching Image 2 */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2">
              {/* [💾 Simpan] */}
              <button
                type="button"
                onClick={() => {
                  setIsPrintAfterSave(false);
                  saveMutation.mutate();
                }}
                disabled={saveMutation.isPending}
                className="h-7 px-3.5 bg-white hover:bg-emerald-50 border border-slate-300 text-slate-700 font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-sky-600" />
                <span>Simpan</span>
              </button>

              {/* [🖨️ Simpan + Cetak] */}
              <button
                type="button"
                onClick={() => {
                  setIsPrintAfterSave(true);
                  saveMutation.mutate();
                }}
                disabled={saveMutation.isPending}
                className="h-7 px-3.5 bg-white hover:bg-sky-50 border border-slate-300 text-slate-700 font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Simpan + Cetak</span>
              </button>

              {/* [↩ Kembali] */}
              <button
                type="button"
                onClick={() => setIsBayarModalOpen(false)}
                className="h-7 px-3.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseInvoiceForm;
