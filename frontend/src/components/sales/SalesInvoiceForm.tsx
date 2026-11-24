"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Building,
  Calendar,
  Check,
  X,
  Bell,
  User,
  Package,
  Calculator,
  Undo2,
  Barcode,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { CariObatSalesModal } from "./CariObatSalesModal";
import { CariPelangganModal } from "./CariPelangganModal";
import { FakturPenjualanDotMatrixModal } from "./FakturPenjualanDotMatrixModal";
import { StrukKasirThermalModal } from "./StrukKasirThermalModal";
import { RiwayatPembayaranSalesModal } from "./RiwayatPembayaranSalesModal";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

export interface SalesInvoiceItemRow {
  product_id: string;
  code: string;
  name: string;
  brand_name: string;
  qty: number;
  delivered_qty: number;
  unit_id: string;
  unit_name: string;
  unit_price: number;
  purchase_price?: number;
  margin_profit?: number;
  markup_percent?: number;
  discount_percent: number;
  line_total: number;
  stock?: number;
  rack?: string;
  drug_classification?: string;
  distribution_channel?: string;
  selling_price?: number;
  wholesale_price?: number;
}

interface SalesInvoiceFormProps {
  isEdit?: boolean;
  invoiceId?: string;
  mode?: "INVOICE" | "CASHIER";
}

export const SalesInvoiceForm: React.FC<SalesInvoiceFormProps> = ({
  isEdit = false,
  invoiceId,
  mode = "INVOICE",
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isGudang = Boolean(
    user?.roles?.some((r: any) => {
      const roleName = (typeof r === "string" ? r : r?.name || "").toUpperCase();
      return roleName.includes("GUDANG");
    }) || user?.username?.toLowerCase() === "gudang"
  );

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEditRowModalOpen, setIsEditRowModalOpen] = useState(false);
  const [isHargaJualModalOpen, setIsHargaJualModalOpen] = useState(false);
  const [isInfoRowModalOpen, setIsInfoRowModalOpen] = useState(false);
  const [isBayarModalOpen, setIsBayarModalOpen] = useState(false);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [isPbfDocModalOpen, setIsPbfDocModalOpen] = useState(false);
  const [pbfDocCount, setPbfDocCount] = useState(0);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrintedLocally, setIsPrintedLocally] = useState(false);
  const [targetPrintSaleId, setTargetPrintSaleId] = useState<string | null>(invoiceId || null);
  const [isThermalPrintOpen, setIsThermalPrintOpen] = useState(false);
  const [isThermalPrintAfterSave, setIsThermalPrintAfterSave] = useState(false);
  const [isRiwayatPembayaranOpen, setIsRiwayatPembayaranOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Persistent / Draft Sale ID for linking documents before creation
  const [draftSaleId] = useState<string>(() => {
    if (invoiceId) return invoiceId;
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "sale-" + Date.now();
  });

  // Form Fields matching Reference Screenshot
  const [invoiceNo, setInvoiceNo] = useState("Auto");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [salesStatus, setSalesStatus] = useState("Select...");
  const [warehouseId, setWarehouseId] = useState("");
  const [salesRepId, setSalesRepId] = useState("");
  const [ppnType, setPpnType] = useState<"Non" | "Include" | "Exclude">("Non");

  // PBF Surat Pesanan (SP) & BPOM Compliance Fields
  const [spType, setSpType] = useState("REGULER");
  const [spNumber, setSpNumber] = useState("");
  const [apjName, setApjName] = useState("apt. Rahmat Hidayat, S.Farm.");
  const [apjSipaNo, setApjSipaNo] = useState("19920101/SIPA_61.71/2022/2048");
  const [pbfOriginInvoiceNo, setPbfOriginInvoiceNo] = useState("");

  // Items table
  const [items, setItems] = useState<SalesInvoiceItemRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // Bottom form fields matching Screenshot
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [taxCheckbox, setTaxCheckbox] = useState(false);
  const [nominalDiscount, setNominalDiscount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notaDiscountPercent, setNotaDiscountPercent] = useState<number>(0);
  const [extraFee, setExtraFee] = useState<number>(0);
  const [extraFeeCheckbox, setExtraFeeCheckbox] = useState(false);

  // Payment states matching Ketoko format
  const [paymentMethod, setPaymentMethod] = useState<"TUNAI" | "TRANSFER" | "KREDIT">("TUNAI");
  const [cashAccountId, setCashAccountId] = useState("");
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [bayarTunai, setBayarTunai] = useState<number>(0);
  const [bayarDeposit, setBayarDeposit] = useState<number>(0);
  const [bayarKredit, setBayarKredit] = useState<number>(0);
  const [isPrintAfterSave, setIsPrintAfterSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-sales-select"],
    queryFn: async () => {
      const res = await api.get("/customers");
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

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps-invoice-select"],
    queryFn: async () => {
      const res = await api.get("/sales-reps");
      return res.data?.data || [];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units-sales-select"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
  });

  const { data: accountsList = [] } = useQuery({
    queryKey: ["cash-bank-accounts-select"],
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

  // Query general settings for profit margin & pricing policy
  const { data: generalSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings-general"],
    queryFn: async () => {
      const res = await api.get("/settings/groups/GENERAL");
      return res.data?.data || {};
    },
  });

  // Query linked documents for this sale
  const { data: saleDocs = [], refetch: refetchSaleDocs } = useQuery({
    queryKey: ["sale-documents-count", draftSaleId],
    queryFn: async () => {
      const res = await api.get(`/documents?entity_type=sale&entity_id=${draftSaleId}`);
      return res.data?.data || [];
    },
    enabled: !!draftSaleId,
  });

  useEffect(() => {
    if (saleDocs) {
      setPbfDocCount(saleDocs.length);
    }
  }, [saleDocs]);

  // Default warehouse
  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  // Default cash/bank account
  useEffect(() => {
    if (accountsList.length > 0 && !cashAccountId) {
      if (mode === "CASHIER") {
        const kasKecilAcc = accountsList.find(
          (a: any) =>
            a.code === "1-1110" || a.name?.toUpperCase().includes("KAS KECIL")
        );
        setCashAccountId(kasKecilAcc ? kasKecilAcc.id : accountsList[0].id);
      } else {
        const defaultAcc = accountsList.find(
          (a: any) =>
            a.code === "1-1110" ||
            a.code === "1-1121" ||
            a.name?.toUpperCase().includes("KAS")
        );
        setCashAccountId(defaultAcc ? defaultAcc.id : accountsList[0].id);
      }
    }
  }, [accountsList, cashAccountId, mode]);

  // Default customer if none selected on initial load
  const hasInitializedCustomer = useRef(false);
  useEffect(() => {
    if (customers.length > 0 && !hasInitializedCustomer.current) {
      hasInitializedCustomer.current = true;
      if (mode === "CASHIER") {
        const cashCust = customers.find(
          (c: any) =>
            c.code === "01" ||
            c.code?.toLowerCase() === "cash" ||
            c.name?.toLowerCase().includes("cash") ||
            c.name?.toLowerCase().includes("umum")
        );
        setSelectedCustomer(cashCust || null);
      } else {
        setSelectedCustomer(customers[0]);
      }
    }
  }, [customers, mode]);

  // Load existing Sale if isEdit
  const { data: existingSale } = useQuery({
    queryKey: ["sale-detail", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const res = await api.get(`/sales/${invoiceId}`);
      return res.data?.data;
    },
    enabled: isEdit && Boolean(invoiceId),
  });

  // Status apakah pembayaran sudah disubmit
  // Sesuai aturan: jika pembayaran sudah disubmit, tombol bayar didisable karena pelunasan piutang dilakukan melalui menu Bayar Piutang
  const isPaymentSubmitted = Boolean(
    (existingSale && (
      existingSale.payment_status === "PAID" ||
      existingSale.payment_status === "PARTIAL" ||
      existingSale.payment_status === "TEMPO" ||
      (Number(existingSale.paid_amount) || 0) > 0 ||
      (Number(existingSale.remaining_amount) || 0) > 0
    )) ||
    salesStatus === "LUNAS" ||
    (isEdit && Boolean(invoiceId))
  );

  useEffect(() => {
    if (existingSale) {
      setInvoiceNo(existingSale.invoice_no || "Auto");
      if (existingSale.created_at) {
        const d = new Date(existingSale.created_at);
        const pad = (n: number) => String(n).padStart(2, "0");
        setInvoiceDate(
          `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        );
      }
      if (existingSale.customer) {
        setSelectedCustomer(existingSale.customer);
      }
      if (existingSale.warehouse_id) {
        setWarehouseId(existingSale.warehouse_id);
      }
      if (existingSale.sales_rep_id) {
        setSalesRepId(existingSale.sales_rep_id);
      }
      if (existingSale.payment_status) {
        setSalesStatus(existingSale.payment_status === "PAID" ? "LUNAS" : "BELUM LUNAS");
      }
      if (existingSale.notes) {
        setNotes(existingSale.notes);
      }
      if (existingSale.customer_sp_type) setSpType(existingSale.customer_sp_type);
      if (existingSale.customer_sp_number) setSpNumber(existingSale.customer_sp_number);
      if (existingSale.pbf_origin_invoice_no) setPbfOriginInvoiceNo(existingSale.pbf_origin_invoice_no);
      if (existingSale.tax_percent !== undefined) {
        setTaxPercent(existingSale.tax_percent);
        if (existingSale.tax_percent > 0) {
          setPpnType("Exclude");
          setTaxCheckbox(true);
        }
      }
      if (existingSale.discount !== undefined) {
        setNominalDiscount(existingSale.discount);
      }
      if (existingSale.shipping_fee !== undefined && existingSale.shipping_fee > 0) {
        setExtraFee(existingSale.shipping_fee);
        setExtraFeeCheckbox(true);
      }
      if (existingSale.paid_amount !== undefined) {
        const paid = Number(existingSale.paid_amount) || 0;
        const total = Number(existingSale.total_amount) || 0;
        setBayarTunai(paid);
        setBayarKredit(Math.max(0, total - paid));
      }

      if (Array.isArray(existingSale.items)) {
        const mappedItems: SalesInvoiceItemRow[] = existingSale.items.map((it: any) => {
          const prod = it.product || {};
          const qty = Number(it.qty || 1);
          const unitPrice = Number(it.unit_price || 0);
          const disc = Number(it.discount || 0);
          const lineTot = Number(it.subtotal || qty * unitPrice - disc);
          const discPct = qty * unitPrice > 0 ? (disc / (qty * unitPrice)) * 100 : 0;

          return {
            product_id: it.product_id,
            code: prod.sku || prod.code || it.code || "-",
            name: prod.name || it.name || "-",
            brand_name: prod.brand?.name || prod.brand_name || "-",
            qty: qty,
            delivered_qty: qty,
            unit_id: it.unit_id || prod.base_unit_id,
            unit_name: it.unit?.name || prod.base_unit?.name || "PCS",
            unit_price: unitPrice,
            discount_percent: Math.round(discPct * 100) / 100,
            line_total: lineTot,
            stock: prod.total_stock || prod.stock || 0,
            rack: prod.rack || "-",
            drug_classification: prod.drug_classification || "Obat Bebas",
            distribution_channel: prod.distribution_channel || "ALL",
            selling_price: prod.selling_price || unitPrice,
            wholesale_price: prod.wholesale_price || unitPrice,
          };
        });
        setItems(mappedItems);
        if (mappedItems.length > 0) setSelectedRowIndex(0);
      }
    }
  }, [existingSale]);

  // Adjust tax percentage based on PPN dropdown
  useEffect(() => {
    if (ppnType === "Non") {
      setTaxPercent(0);
      setTaxCheckbox(false);
    } else if (ppnType === "Include" || ppnType === "Exclude") {
      setTaxPercent(11);
      setTaxCheckbox(true);
    }
  }, [ppnType]);

  // Calculations
  const itemCount = items.length;
  const totalDeliveredQty = items.reduce((sum, it) => sum + (it.qty || 0), 0);
  const subTotal = items.reduce((sum, it) => sum + (it.line_total || 0), 0);

  const calculatedNominalDiscount = useMemo(() => {
    let d = 0;
    if (discountPercent > 0) {
      d += (subTotal * discountPercent) / 100;
    }
    if (notaDiscountPercent > 0) {
      d += ((subTotal - d) * notaDiscountPercent) / 100;
    }
    if (nominalDiscount > 0) {
      d += nominalDiscount;
    }
    return Math.min(d, subTotal);
  }, [subTotal, discountPercent, notaDiscountPercent, nominalDiscount]);

  const afterDiscount = Math.max(0, subTotal - calculatedNominalDiscount);

  const calculatedTaxAmount = useMemo(() => {
    if (!taxCheckbox || taxPercent <= 0) return 0;
    if (ppnType === "Include") {
      return (afterDiscount * taxPercent) / (100 + taxPercent);
    }
    return (afterDiscount * taxPercent) / 100;
  }, [afterDiscount, taxPercent, taxCheckbox, ppnType]);

  const totalAkhir = useMemo(() => {
    let base = afterDiscount;
    if (ppnType === "Exclude" && taxCheckbox) {
      base += calculatedTaxAmount;
    }
    if (extraFeeCheckbox && extraFee > 0) {
      base += Number(extraFee);
    }
    return Math.round(base);
  }, [afterDiscount, calculatedTaxAmount, ppnType, taxCheckbox, extraFee, extraFeeCheckbox]);

  // Handle select product from CariObatSalesModal
  const handleSelectItem = (prod: any) => {
    const existingIndex = items.findIndex((it) => it.product_id === prod.id);
    const price = Number(prod.selling_price || prod.unit_price || 0);
    const purchasePrice = Number(prod.purchase_price || prod.avg_cost || 0);
    const unitName = prod.base_unit?.name || prod.unit_name || "PCS";
    const unitId = prod.base_unit_id || prod.unit_id || (units[0]?.id || "");
    const brand = prod.brand?.name || prod.brand_name || prod.manufacturer || "-";

    const configuredMargin = Number(
      prod.markup_percent || generalSettings?.min_profit_percent || 0
    );
    const margin = configuredMargin > 0 ? configuredMargin : (purchasePrice > 0 ? ((price - purchasePrice) / purchasePrice) * 100 : 0);
    const confirmBelowHpp = generalSettings?.confirm_price_below_hpp === "true";
    const minProfit = parseFloat(generalSettings?.min_profit_percent || "0");

    if (purchasePrice > 0 && confirmBelowHpp && price < purchasePrice) {
      alert(`⚠️ Peringatan: Harga jual item "${prod.name}" (Rp ${price.toLocaleString()}) lebih kecil dari Harga Pokok / HPP (Rp ${purchasePrice.toLocaleString()})!`);
    } else if (purchasePrice > 0 && minProfit > 0 && margin < minProfit) {
      alert(`⚠️ Peringatan: Margin keuntungan item "${prod.name}" (${margin.toFixed(1)}%) di bawah batas Minimum Profit (${minProfit}%)!`);
    }

    if (existingIndex >= 0) {
      const updated = [...items];
      const cur = updated[existingIndex];
      const newQty = cur.qty + 1;
      const lineDisc = (cur.unit_price * (cur.discount_percent / 100)) * newQty;
      cur.qty = newQty;
      cur.delivered_qty = newQty;
      cur.line_total = cur.unit_price * newQty - lineDisc;
      cur.purchase_price = purchasePrice;
      cur.margin_profit = margin;
      cur.markup_percent = configuredMargin;
      setItems(updated);
      setSelectedRowIndex(existingIndex);
    } else {
      const newRow: SalesInvoiceItemRow = {
        product_id: prod.id,
        code: prod.code || prod.sku || "-",
        name: prod.name || "-",
        brand_name: brand,
        qty: 1,
        delivered_qty: 1,
        unit_id: unitId,
        unit_name: unitName,
        unit_price: price,
        purchase_price: purchasePrice,
        margin_profit: margin,
        markup_percent: configuredMargin,
        discount_percent: 0,
        line_total: price,
        stock: Number(prod.total_stock || prod.stock || 0),
        rack: prod.rack || "-",
        drug_classification: prod.drug_classification || "Obat Bebas",
        distribution_channel: prod.distribution_channel || "ALL",
        selling_price: price,
        wholesale_price: Number(prod.wholesale_price || price),
      };
      const newItems = [...items, newRow];
      setItems(newItems);
      setSelectedRowIndex(newItems.length - 1);
    }
  };

  // Handle fast barcode scanner
  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;
      try {
        const res = await api.get(
          `/products?search=${encodeURIComponent(code)}&page_size=10${
            mode === "CASHIER" ? "&retail_only=true" : ""
          }`
        );
        const itemsList = res.data?.data?.items || [];
        const match =
          itemsList.find((p: any) => p.barcode === code || p.code === code) ||
          itemsList[0];
        if (match) {
          if (mode === "CASHIER") {
            const cls = String(match.drug_classification || "").toUpperCase();
            if (
              cls === "OBAT_KERAS" ||
              cls === "NARKOTIKA" ||
              cls === "PSIKOTROPIKA" ||
              cls === "PREKURSOR" ||
              cls === "OOT" ||
              cls === "OBAT_KHUSUS_RS" ||
              match.distribution_channel === "PBF_ONLY" ||
              match.is_sold_in_pharmacy === false
            ) {
              setBarcodeError(
                `⛔ "${match.name}" adalah Obat Keras / Resep. Tidak boleh dijual di kasir retail!`
              );
              setTimeout(() => setBarcodeError(null), 4000);
              setBarcodeInput("");
              return;
            }
          }
          handleSelectItem(match);
          setBarcodeInput("");
          setBarcodeError(null);
        } else {
          setBarcodeError(
            `Item dengan barcode "${code}" tidak ditemukan atau bukan obat retail bebas.`
          );
          setTimeout(() => setBarcodeError(null), 3000);
        }
      } catch (err: any) {
        setBarcodeError("Gagal mencari barcode item: " + err.message);
        setTimeout(() => setBarcodeError(null), 3000);
      }
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
        if (field === "qty") updated.delivered_qty = value;
        const disc = (updated.unit_price * (updated.discount_percent / 100)) * updated.qty;
        updated.line_total = Math.max(0, updated.unit_price * updated.qty - disc);

        if (field === "unit_price" && updated.purchase_price && updated.purchase_price > 0) {
          const margin = ((value - updated.purchase_price) / updated.purchase_price) * 100;
          updated.margin_profit = margin;
          updated.markup_percent = margin;
          const confirmBelowHpp = generalSettings?.confirm_price_below_hpp === "true";
          const minProfit = parseFloat(generalSettings?.min_profit_percent || "0");
          if (confirmBelowHpp && value < updated.purchase_price) {
            alert(`⚠️ Peringatan: Harga jual item "${item.name}" (Rp ${value.toLocaleString()}) lebih kecil dari Harga Pokok / HPP (Rp ${updated.purchase_price.toLocaleString()})!`);
          } else if (minProfit > 0 && margin < minProfit) {
            alert(`⚠️ Peringatan: Margin keuntungan item "${item.name}" (${margin.toFixed(1)}%) di bawah batas Minimum Profit (${minProfit}%)!`);
          }
        }
        return updated;
      })
    );
  };

  // Remove item row
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedRowIndex === index) {
      setSelectedRowIndex(items.length > 1 ? Math.max(0, index - 1) : null);
    }
  };

  // Reset form (+ Tambah)
  const handleResetForm = () => {
    if (items.length > 0 && !confirm("Kosongkan form untuk membuat Penjualan baru?")) {
      return;
    }
    setInvoiceNo("Auto");
    setSalesStatus("Select...");
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
    setBayarTunai(0);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Check minimum stock
  const handleCheckMinimumStock = () => {
    const lowStockItems = items.filter((it) => (it.stock || 0) < it.qty);
    if (lowStockItems.length === 0) {
      alert("Semua stok item dalam tabel mencukupi untuk penjualan.");
    } else {
      alert(
        `Perhatian: Terdapat ${lowStockItems.length} item dengan jumlah penjualan melebihi sisa stok:\n` +
          lowStockItems.map((it) => `- ${it.name} (Stok: ${it.stock}, Jumlah: ${it.qty})`).join("\n")
      );
    }
  };

  const validateMarginAndHpp = (): boolean => {
    const confirmBelowHpp = generalSettings?.confirm_price_below_hpp === "true";
    const minProfit = parseFloat(generalSettings?.min_profit_percent || "0");

    if (confirmBelowHpp) {
      const belowHpp = items.filter(
        (it) => it.purchase_price && it.purchase_price > 0 && it.unit_price < it.purchase_price
      );
      if (belowHpp.length > 0) {
        const itemNames = belowHpp
          .map((it) => `- ${it.name} (Jual: Rp ${it.unit_price.toLocaleString()}, HPP: Rp ${it.purchase_price?.toLocaleString()})`)
          .join("\n");
        if (
          !confirm(
            `⚠️ Peringatan:\nTerdapat item dengan harga jual di bawah Harga Pokok (HPP):\n${itemNames}\n\nApakah Anda yakin ingin melanjutkan penyimpanan transaksi Penjualan?`
          )
        ) {
          return false;
        }
      }
    }

    if (minProfit > 0) {
      const belowMargin = items.filter((it) => {
        if (!it.purchase_price || it.purchase_price <= 0) return false;
        const m = ((it.unit_price - it.purchase_price) / it.purchase_price) * 100;
        return m < minProfit;
      });
      if (belowMargin.length > 0) {
        const itemNames = belowMargin
          .map((it) => {
            const m = (((it.unit_price - (it.purchase_price || 0)) / (it.purchase_price || 1)) * 100).toFixed(1);
            return `- ${it.name} (Margin: ${m}%, Batas Min: ${minProfit}%)`;
          })
          .join("\n");
        if (
          !confirm(
            `⚠️ Peringatan:\nTerdapat item dengan margin keuntungan di bawah batas Minimum Profit (${minProfit}%):\n${itemNames}\n\nApakah Anda yakin ingin melanjutkan penyimpanan transaksi Penjualan?`
          )
        ) {
          return false;
        }
      }
    }
    return true;
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer?.id && mode !== "CASHIER") {
        throw new Error("Pilih Pelanggan terlebih dahulu.");
      }
      if (items.length === 0) {
        throw new Error("Tabel item penjualan masih kosong. Silakan klik [+ Item].");
      }

      const defaultUnit =
        units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];

      // Parse date
      let parsedDate = new Date();
      if (invoiceDate && invoiceDate.includes("/")) {
        const parts = invoiceDate.split(" ");
        const dateParts = parts[0].split("/");
        if (dateParts.length === 3) {
          parsedDate = new Date(
            `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1] || "12:00:00"}`
          );
        }
      }

      const totalPaidNow = (Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0);
      const paymentsPayload: any[] = [];
      if (totalPaidNow > 0) {
        paymentsPayload.push({
          method: paymentMethod === "TRANSFER" ? "TRANSFER" : "CASH",
          amount: totalPaidNow,
          reference_no: spNumber || "",
        });
      }

      const payload = {
        warehouse_id: warehouseId,
        customer_id: selectedCustomer.id,
        sales_rep_id: salesRepId || undefined,
        type: mode === "CASHIER" ? "POS" : (spNumber || selectedCustomer.is_pharmacy_facility ? "BACKOFFICE" : "POS"),
        tax_percent: ppnType === "Non" ? 0 : taxPercent,
        discount: calculatedNominalDiscount,
        shipping_fee: extraFeeCheckbox ? Number(extraFee) : 0,
        notes: notes,
        invoice_date: parsedDate,
        cash_account_id: cashAccountId || undefined,
        customer_sp_number: spNumber,
        customer_sp_type: spType,
        pbf_origin_invoice_no: pbfOriginInvoiceNo,
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
            discount: (it.unit_price * (it.discount_percent / 100)) * it.qty,
          };
        }),
        payments: paymentsPayload,
      };

      if (isEdit && invoiceId) {
        return await api.put(`/sales/${invoiceId}`, payload);
      }
      return await api.post("/sales", {
        ...payload,
        id: draftSaleId,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      setIsBayarModalOpen(false);
      setIsSaveConfirmModalOpen(false);
      alert(
        isEdit
          ? (mode === "CASHIER" ? "Transaksi Kasir berhasil diperbarui!" : "Faktur Penjualan berhasil diperbarui!")
          : (mode === "CASHIER" ? "Transaksi Kasir berhasil disimpan! Kas kecil & stok otomatis terupdate." : "Faktur Penjualan baru berhasil disimpan dan stok berkurang!")
      );
      if (mode === "CASHIER" && isThermalPrintAfterSave) {
        const idToPrint = res.data?.data?.id || invoiceId || draftSaleId;
        if (idToPrint) {
          setTargetPrintSaleId(idToPrint);
          setIsThermalPrintOpen(true);
          return;
        }
      }
      if (isPrintAfterSave) {
        const idToPrint = res.data?.data?.id || invoiceId || draftSaleId;
        if (idToPrint) {
          setTargetPrintSaleId(idToPrint);
          setIsPrintModalOpen(true);
          return;
        }
      }
      router.push(mode === "CASHIER" ? "/sales/cashier" : "/sales/invoices");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal menyimpan penjualan");
      alert("Gagal menyimpan Penjualan: " + (err.response?.data?.message || err.message));
    },
  });

  const selectedItem = selectedRowIndex !== null ? items[selectedRowIndex] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 flex flex-col h-full min-h-0 text-xs select-none gap-1 overflow-y-auto md:overflow-hidden">
      {/* 1. Header: [< Penjualan Baru] + User Profile matching Screenshot */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(mode === "CASHIER" ? "/sales/cashier" : "/sales/invoices")}
            className="p-1 hover:bg-slate-100 rounded text-slate-700 transition"
            title={mode === "CASHIER" ? "Kembali ke Daftar Kasir" : "Kembali ke Daftar Penjualan"}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            {mode === "CASHIER"
              ? isEdit
                ? `Ubah Transaksi Kasir : ${invoiceNo}`
                : "Penjualan Kasir (Retail OTC)"
              : isEdit
              ? `Ubah Penjualan : ${invoiceNo}`
              : "Penjualan Baru"}
          </h1>
          {mode === "CASHIER" && (
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
              KASIR RETAIL OTC
            </span>
          )}
        </div>

        {/* User Info Bar matching screenshot */}
        <div className="flex items-center gap-2 text-slate-700 text-[11px] font-semibold">
          <span className="hidden sm:inline-block tracking-wide text-slate-600 text-[10.5px]">
            APOTEK BERKAT PURNAMA [UTAMA]
          </span>
          <div className="relative cursor-pointer">
            <Bell className="w-3.5 h-3.5 text-slate-600" />
            <span className="absolute -top-1 -right-1.5 bg-rose-600 text-white text-[8px] font-bold px-1 rounded-full">
              33
            </span>
          </div>
          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200">
            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
              A
            </div>
            <span className="text-[10px] text-slate-600">ADMIN2</span>
          </div>
        </div>
      </div>

      {/* 2. Top Form Section (3 Rows matching Screenshot) */}
      <div className="bg-slate-50/70 border border-slate-300 rounded p-1 sm:p-1.5 space-y-1 shadow-2xs shrink-0">
        {/* ROW 1: No Transaksi | Tanggal | Pelanggan | Status Penjualan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* No Transaksi */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              No Transaksi :
            </label>
            <input
              type="text"
              readOnly
              value={invoiceNo}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-700 bg-slate-100 focus:outline-none"
            />
          </div>

          {/* Tanggal */}
          <div className="md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Tanggal :
            </label>
            <input
              type="text"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Pelanggan with 🔍 button */}
          <div className="md:col-span-4">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pelanggan :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                readOnly
                value={selectedCustomer ? `${selectedCustomer.code || "CUST"} - ${selectedCustomer.name}` : ""}
                placeholder={mode === "CASHIER" ? "-- Tanpa Pelanggan (Kosong / Umum) --" : "Select..."}
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-sky-500 truncate"
              />
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(null);
                  }}
                  className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition shrink-0"
                  title="Kosongkan Pelanggan (Pelanggan Umum)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
                title="Cari Pelanggan (🔍)"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Status Penjualan */}
          <div className="md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Status Penjualan :
            </label>
            <select
              value={salesStatus}
              onChange={(e) => setSalesStatus(e.target.value)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="Select...">Select...</option>
              <option value="LUNAS">LUNAS</option>
              <option value="BELUM LUNAS">BELUM LUNAS</option>
              <option value="DRAFT">DRAFT</option>
              <option value="BATAL">BATAL</option>
            </select>
          </div>
        </div>

        {/* ROW 2: Keluar Dari | Salesman | PPN | Jenis SP Farmasi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* Keluar Dari (Gudang) */}
          <div className={mode === "CASHIER" ? "md:col-span-5" : "md:col-span-4"}>
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Keluar Dari :
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name.toUpperCase()} [{w.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Salesman (Kode Sales) */}
          <div className={mode === "CASHIER" ? "md:col-span-4" : "md:col-span-3"}>
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Salesman (Kode Sales) :
            </label>
            <select
              value={salesRepId}
              onChange={(e) => setSalesRepId(e.target.value)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
            >
              <option value="">-- Tanpa Sales --</option>
              {salesReps.map((sr: any) => (
                <option key={sr.id} value={sr.id}>
                  {sr.code ? `[${sr.code}] ` : ""}{sr.name}
                </option>
              ))}
            </select>
          </div>

          {/* PPN */}
          <div className={mode === "CASHIER" ? "md:col-span-3" : "md:col-span-2"}>
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              PPN :
            </label>
            <select
              value={ppnType}
              onChange={(e) => setPpnType(e.target.value as any)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="Non">Non</option>
              <option value="Include">Include</option>
              <option value="Exclude">Exclude</option>
            </select>
          </div>

          {/* Jenis SP Farmasi (BPOM) */}
          {mode !== "CASHIER" && (
            <div className="md:col-span-3">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
                Jenis SP Farmasi (BPOM) :
              </label>
              <select
                value={spType}
                onChange={(e) => setSpType(e.target.value)}
                className="w-full h-6 px-1.5 py-0 border border-emerald-300 rounded text-[11px] font-semibold text-emerald-800 bg-emerald-50/40 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="REGULER">SP REGULER (Obat Bebas & Keras)</option>
                <option value="NARKOTIKA">SP NARKOTIKA (Formulir Khusus)</option>
                <option value="PSIKOTROPIKA">SP PSIKOTROPIKA</option>
                <option value="PREKURSOR">SP PREKURSOR FARMASI</option>
                <option value="OOT">SP OBAT-OBAT TERTENTU (OOT)</option>
              </select>
            </div>
          )}
        </div>

        {/* ROW 3: No. SP Farmasi Resmi | APJ | SIPA APJ | Upload Scan */}
        {mode === "CASHIER" ? (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-emerald-950 gap-2">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                Mode Kasir Retail OTC Aktif: Pasien &amp; Pelanggan Umum. Obat Keras &amp; Wajib Resep otomatis disaring.
              </span>
            </span>
            <span className="text-[10.5px] text-emerald-800 font-bold bg-white px-2.5 py-0.5 rounded border border-emerald-300 shadow-2xs font-mono">
              Kas Masuk: 1-1110 (KAS KECIL)
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
            {/* No. SP Farmasi Resmi */}
            <div className="md:col-span-3">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
                No. SP Farmasi Resmi :
              </label>
              <input
                type="text"
                placeholder="Contoh: SP/AB/2026/XI/001"
                value={spNumber}
                onChange={(e) => setSpNumber(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Apoteker Penanggung Jawab (APJ) */}
            <div className="md:col-span-3">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
                Apoteker Penanggung Jawab (APJ) :
              </label>
              <input
                type="text"
                value={apjName}
                onChange={(e) => setApjName(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* No. SIPA APJ */}
            <div className="md:col-span-3">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
                No. SIPA APJ :
              </label>
              <input
                type="text"
                value={apjSipaNo}
                onChange={(e) => setApjSipaNo(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 font-mono text-[10px]"
              />
            </div>

            {/* Upload Scan SP APJ Button matching screenshot */}
            <div className="md:col-span-3">
              <button
                type="button"
                onClick={() => setIsPbfDocModalOpen(true)}
                className="w-full h-6 px-2 border border-emerald-500 rounded bg-white hover:bg-emerald-50 text-emerald-700 font-semibold text-[11px] flex items-center justify-between transition shadow-2xs"
              >
                <span className="flex items-center gap-1 truncate">
                  <span>📎</span>
                  <span className="truncate">Upload Scan SP APJ</span>
                </span>
                <span className="bg-emerald-600 text-white rounded-full px-1.5 py-0.2 text-[9px] font-bold">
                  {pbfDocCount}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Middle Area: Table (Left) + Detail Item Terpilih (Right) */}
      <div className="flex-1 min-h-[220px] flex flex-col md:flex-row gap-1 border border-slate-300 rounded overflow-hidden shadow-2xs">
        {/* Table Container (Left) */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
              <tr>
                <th className="py-0.5 px-2 border-r border-slate-200 text-center w-8">No</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200 w-24">Kode</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200">Nama</th>
                <th className="py-0.5 px-2 border-r border-slate-200 w-24">Merek</th>
                <th className="py-0.5 px-2 border-r border-slate-200 text-right w-16">Jumlah</th>
                <th className="py-0.5 px-2 border-r border-slate-200 text-right w-16">Jml Teri...</th>
                <th className="py-0.5 px-2 border-r border-slate-200 text-center w-16">Satuan</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200 text-right w-24">Harga</th>
                <th className="py-0.5 px-2 border-r border-slate-200 text-center w-12">Pot %</th>
                <th className="py-0.5 px-2 border-r border-slate-200 text-center w-16" title="Margin keuntungan dihitung dari harga pokok (HPP)">Margin %</th>
                <th className="py-0.5 px-2.5 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 font-medium">
                    No data
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const isSelected = selectedRowIndex === idx;
                  const purchasePrice = row.purchase_price || 0;
                  const minProfit = parseFloat(generalSettings?.min_profit_percent || "0");
                  const configuredMargin = (row.markup_percent !== undefined && row.markup_percent > 0)
                    ? row.markup_percent
                    : minProfit;
                  const isCustomPrice = row.selling_price !== undefined && Math.abs(row.unit_price - row.selling_price) >= 1;
                  const marginPct = isCustomPrice && purchasePrice > 0
                    ? ((row.unit_price - purchasePrice) / purchasePrice) * 100
                    : (configuredMargin > 0 ? configuredMargin : (purchasePrice > 0 ? ((row.unit_price - purchasePrice) / purchasePrice) * 100 : 0));
                  const isBelowCost = purchasePrice > 0 && row.unit_price < purchasePrice;
                  const isBelowMinProfit = purchasePrice > 0 && minProfit > 0 && marginPct < minProfit;

                  return (
                    <tr
                      key={row.product_id}
                      onClick={() => setSelectedRowIndex(idx)}
                      className={`h-6 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-sky-50 text-sky-950 font-medium"
                          : "hover:bg-slate-50/80 text-slate-800"
                      }`}
                    >
                      <td className="py-0.5 px-2 text-center text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-0.5 px-2.5 font-mono border-r border-slate-100">
                        {row.code}
                      </td>
                      <td className="py-0.5 px-2.5 font-medium border-r border-slate-100">
                        {row.name}
                      </td>
                      <td className="py-0.5 px-2 text-slate-600 border-r border-slate-100 truncate max-w-[100px]">
                        {row.brand_name || "-"}
                      </td>
                      {/* Editable Jumlah */}
                      <td className="py-0 px-1 border-r border-slate-100 text-right">
                        <input
                          type="number"
                          min={1}
                          value={row.qty}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            handleUpdateItem(idx, "qty", Math.max(1, parseFloat(e.target.value) || 1))
                          }
                          className="w-14 h-5 px-1 border border-slate-300 rounded text-right text-[11px] bg-white focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      {/* Jml Terkirim */}
                      <td className="py-0.5 px-2 border-r border-slate-100 text-right text-slate-500">
                        {row.delivered_qty || row.qty}
                      </td>
                      {/* Satuan */}
                      <td className="py-0.5 px-2 border-r border-slate-100 text-center font-medium">
                        {row.unit_name}
                      </td>
                      {/* Editable Harga */}
                      <td className="py-0 px-1 border-r border-slate-100 text-right">
                        <input
                          type="number"
                          value={row.unit_price}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            handleUpdateItem(idx, "unit_price", Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className={`w-20 h-5 px-1 border rounded text-right text-[11px] bg-white focus:outline-none ${
                            isBelowCost
                              ? "border-rose-500 text-rose-700 bg-rose-50/50"
                              : isBelowMinProfit
                              ? "border-amber-500 text-amber-700 bg-amber-50/50"
                              : "border-slate-300 focus:border-sky-500"
                          }`}
                        />
                      </td>
                      {/* Editable Pot % */}
                      <td className="py-0 px-1 border-r border-slate-100 text-center">
                        <input
                          type="number"
                          value={row.discount_percent}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            handleUpdateItem(
                              idx,
                              "discount_percent",
                              Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                            )
                          }
                          className="w-10 h-5 px-0.5 border border-slate-300 rounded text-center text-[11px] bg-white focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      {/* Margin % Column */}
                      <td className="py-0.5 px-2 border-r border-slate-100 text-center text-[10px]">
                        {purchasePrice > 0 || marginPct > 0 ? (
                          <span
                            className={`px-1 py-0.2 rounded font-bold ${
                              isBelowCost
                                ? "bg-rose-100 text-rose-800"
                                : isBelowMinProfit
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                            title={`HPP: Rp ${purchasePrice.toLocaleString()}`}
                          >
                            {marginPct % 1 === 0 ? marginPct.toFixed(0) : marginPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      {/* Total */}
                      <td className="py-0.5 px-2.5 text-right font-bold text-slate-800">
                        {formatCurrency(row.line_total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Right Side Panel: Detail Item Terpilih matching Screenshot */}
        <div className="w-full md:w-60 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-2 flex flex-col justify-between shrink-0 text-[11px]">
          <div>
            <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-2">
              Detail Item Terpilih
            </div>
            {selectedItem ? (
              <div className="space-y-1.5 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">Kode &amp; Nama:</span>
                  <div className="font-bold text-slate-900 leading-tight">
                    {selectedItem.code}
                  </div>
                  <div className="text-[10.5px] leading-tight text-slate-800 font-medium">
                    {selectedItem.name}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Merek / Principal:</span>
                  <div className="font-semibold text-slate-800">{selectedItem.brand_name || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-1 py-1 border-y border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stok Gudang:</span>
                    <span className="font-bold text-emerald-600">{selectedItem.stock || 0}</span> {selectedItem.unit_name}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Lokasi Rak:</span>
                    <span className="font-semibold text-slate-800">{selectedItem.rack || "-"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Golongan Obat:</span>
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                    {selectedItem.drug_classification || "Obat Bebas"}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block">Harga Jual:</span>
                  <div className="font-bold text-emerald-700 text-xs">
                    {formatCurrency(selectedItem.unit_price)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic text-[10.5px] leading-relaxed pt-2">
                Pilih atau klik baris item dalam tabel untuk melihat detail informasi.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-right">
            Apotek Berkat Purnama
          </div>
        </div>
      </div>

      {/* 4. Action Bar under Table matching Screenshot (+ + Item, Pencil, Trash, Info, Harga Jual, Cek Stok Minimum) */}
      <div className="flex items-center gap-1.5 shrink-0 py-0.5 flex-wrap">
        <button
          type="button"
          onClick={() => setIsItemModalOpen(true)}
          className="h-6 px-3 bg-[#e2f8ec] hover:bg-[#c9f1dc] text-[#00a862] border border-[#a2e8c2] font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Item</span>
        </button>

        {mode === "CASHIER" && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded px-2 h-6 shadow-2xs">
            <Barcode className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <input
              type="text"
              placeholder="Scan Barcode [Enter]..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              className="w-44 h-full text-[11px] bg-transparent focus:outline-none font-mono text-slate-800 placeholder:text-slate-400"
            />
          </div>
        )}
        {barcodeError && (
          <span className="text-[10.5px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 animate-in fade-in">
            {barcodeError}
          </span>
        )}

        <button
          type="button"
          disabled={selectedRowIndex === null}
          onClick={() => {
            if (selectedRowIndex !== null) setIsEditRowModalOpen(true);
          }}
          className="h-6 w-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 transition"
          title="Ubah Item"
        >
          <Pencil className="w-3 h-3" />
        </button>

        <button
          type="button"
          disabled={selectedRowIndex === null}
          onClick={() => {
            if (selectedRowIndex !== null) handleRemoveItem(selectedRowIndex);
          }}
          className="h-6 w-6 border border-slate-300 rounded hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 flex items-center justify-center text-slate-600 disabled:opacity-40 transition"
          title="Hapus Item"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        <button
          type="button"
          disabled={selectedRowIndex === null}
          onClick={() => {
            if (selectedRowIndex !== null) setIsInfoRowModalOpen(true);
          }}
          className="h-6 w-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 transition"
          title="Informasi Detail Item"
        >
          <Info className="w-3 h-3" />
        </button>

        <button
          type="button"
          disabled={selectedRowIndex === null}
          onClick={() => {
            if (selectedRowIndex !== null) setIsHargaJualModalOpen(true);
          }}
          className="h-6 px-2.5 border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-semibold text-[11px] disabled:opacity-40 transition"
        >
          Harga Jual
        </button>

        <button
          type="button"
          onClick={handleCheckMinimumStock}
          className="h-6 px-2.5 border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-semibold text-[11px] transition"
        >
          Cek Stok Minimum
        </button>
      </div>

      {/* 5. Bottom Form Section matching Screenshot (2 Rows) */}
      <div className="bg-slate-50/70 border border-slate-300 rounded p-1 sm:p-1.5 space-y-1 shadow-2xs shrink-0 text-[11px]">
        {/* ROW 1: Tanggal Kirim | Item | Terima/Terkirim | Sub Total | Pjk % | Nom Pajak */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-12 gap-1.5 items-end">
          {/* Tanggal Kirim */}
          <div className="col-span-2 md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Tanggal Kirim :
            </label>
            <div className="relative">
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Item count */}
          <div className="col-span-1 md:col-span-1">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Item :
            </label>
            <input
              type="text"
              readOnly
              value={itemCount.toFixed(2)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-right font-mono text-slate-700 bg-slate-100 focus:outline-none"
            />
          </div>

          {/* Terkirim / Terima */}
          <div className="col-span-1 md:col-span-1">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none truncate">
              Terkirim :
            </label>
            <input
              type="text"
              readOnly
              value={totalDeliveredQty.toFixed(2)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-right font-mono text-slate-700 bg-slate-100 focus:outline-none"
            />
          </div>

          {/* Sub Total */}
          <div className="col-span-2 md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Sub Total :
            </label>
            <input
              type="text"
              readOnly
              value={formatCurrency(subTotal).replace("Rp", "").trim()}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-right font-bold text-slate-800 bg-slate-100 focus:outline-none"
            />
          </div>

          {/* Pjk % */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pjk % :
            </label>
            <div className="flex items-center gap-1">
              <select
                value={ppnType === "Non" ? "0" : String(taxPercent)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setTaxPercent(val);
                  setPpnType(val > 0 ? "Exclude" : "Non");
                  setTaxCheckbox(val > 0);
                }}
                className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="0">0% - Non Pajak</option>
                <option value="11">11% - PPN Standar</option>
                <option value="12">12% - PPN 2025</option>
              </select>
              <input
                type="checkbox"
                checked={taxCheckbox}
                onChange={(e) => setTaxCheckbox(e.target.checked)}
                className="w-3.5 h-3.5 text-sky-600 rounded"
              />
            </div>
          </div>

          {/* Nom Pajak */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Nom Pajak :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                readOnly
                value={formatCurrency(calculatedTaxAmount).replace("Rp", "").trim()}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-right text-slate-700 bg-slate-100 focus:outline-none"
              />
              <input
                type="checkbox"
                checked={taxCheckbox}
                onChange={(e) => setTaxCheckbox(e.target.checked)}
                className="w-3.5 h-3.5 text-sky-600 rounded"
              />
            </div>
          </div>
        </div>

        {/* ROW 2: Keterangan | Pot % | Pot Nota % | Nom Potongan | Biaya | Total Akhir */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-12 gap-1.5 items-end">
          {/* Keterangan */}
          <div className="col-span-2 md:col-span-4">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Keterangan :
            </label>
            <input
              type="text"
              placeholder="Catatan faktur penjualan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Pot % */}
          <div className="col-span-1 md:col-span-1">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pot % :
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
              className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-center text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Pot Nota % */}
          <div className="col-span-1 md:col-span-1">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pot Nota % :
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={notaDiscountPercent}
              onChange={(e) => setNotaDiscountPercent(parseFloat(e.target.value) || 0)}
              className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-center text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Nom Potongan */}
          <div className="col-span-1 md:col-span-1">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none truncate">
              Nom Potongan :
            </label>
            <input
              type="number"
              min={0}
              value={nominalDiscount}
              onChange={(e) => setNominalDiscount(parseFloat(e.target.value) || 0)}
              className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-right text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Biaya with $ */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Biaya :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={extraFee}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setExtraFee(val);
                  setExtraFeeCheckbox(val > 0);
                }}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-right text-slate-800 bg-white focus:outline-none focus:border-sky-500"
              />
              <span className="w-5 h-6 flex items-center justify-center border border-slate-300 rounded bg-slate-100 text-slate-600 text-xs font-bold shrink-0">
                $
              </span>
              <input
                type="checkbox"
                checked={extraFeeCheckbox}
                onChange={(e) => setExtraFeeCheckbox(e.target.checked)}
                className="w-3.5 h-3.5 text-sky-600 rounded"
              />
            </div>
          </div>

          {/* Total Akhir (Pink Highlight matching Screenshot) */}
          <div className="col-span-2 md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Total Akhir :
            </label>
            <div className="w-full h-6 px-2 flex items-center justify-end rounded border border-rose-200 bg-[#fce7f3] text-rose-950 font-bold text-xs">
              {formatCurrency(totalAkhir).replace("Rp", "").trim()}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Bottom Button Toolbar matching Screenshot (+ Tambah, Simpan, Hapus, Cetak, Bayar) */}
      <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5 shrink-0">
        <div className="flex items-center gap-1.5">
          {/* + Tambah */}
          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>Tambah</span>
          </button>

          {/* 💾 Simpan (Membuka Modal Persetujuan Simpan) */}
          <button
            type="button"
            disabled={saveMutation.isPending || isGudang}
            onClick={() => {
              if (isGudang) {
                alert("Akses ditolak: Petugas Gudang tidak berwenang mencatat transaksi penjualan.");
                return;
              }
              if (!selectedCustomer?.id && mode !== "CASHIER") {
                alert("Pilih Pelanggan terlebih dahulu.");
                return;
              }
              if (items.length === 0) {
                alert("Tabel item penjualan masih kosong. Silakan klik [+ Item].");
                return;
              }
              if (!validateMarginAndHpp()) return;
              setIsSaveConfirmModalOpen(true);
            }}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title={isGudang ? "Petugas Gudang tidak berwenang mencatat transaksi penjualan" : "Simpan Faktur Penjualan"}
          >
            <Save className="w-3 h-3" />
            <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>

          {/* 🗑 Hapus */}
          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-3 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus</span>
          </button>

          {/* 🖨 Cetak (Hanya 1x Sesuai Aturan CDOB) */}
          {(() => {
            const isPrinted = Boolean(existingSale?.is_printed || isPrintedLocally);
            return (
              <button
                type="button"
                disabled={isPrinted}
                onClick={() => {
                  if (isPrinted) return;
                  if (invoiceId) {
                    setTargetPrintSaleId(invoiceId);
                    setIsPrintModalOpen(true);
                  } else {
                    if (items.length === 0) {
                      alert("Tabel item masih kosong. Tambahkan item terlebih dahulu sebelum mencetak faktur.");
                      return;
                    }
                    setIsPrintAfterSave(true);
                    setIsSaveConfirmModalOpen(true);
                  }
                }}
                className={`h-6 px-3 border rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition ${
                  isPrinted
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-semibold cursor-pointer"
                }`}
                title={
                  isPrinted
                    ? "Faktur telah dicetak (Peraturan CDOB: Faktur Asli hanya boleh dicetak 1 kali)"
                    : "Cetak Faktur Penjualan Dot Matrix (Hanya 1 kali)"
                }
              >
                <Printer className="w-3 h-3" />
                <span>{isPrinted ? "Sudah Cetak Faktur" : "Cetak"}</span>
              </button>
            );
          })()}

          {/* 💳 Bayar (Membuka Modal Pembayaran) */}
          <button
            type="button"
            disabled={isPaymentSubmitted}
            onClick={() => {
              if (isPaymentSubmitted) {
                alert("Pembayaran penjualan telah disubmit. Pelunasan piutang diproses melalui menu Bayar Piutang.");
                return;
              }
              if (!selectedCustomer?.id && mode !== "CASHIER") {
                alert("Pilih Pelanggan terlebih dahulu sebelum melakukan pembayaran.");
                return;
              }
              if (items.length === 0) {
                alert("Tabel item penjualan masih kosong. Silakan klik [+ Item].");
                return;
              }
              if (bayarTunai === 0 && bayarKredit === 0 && totalAkhir > 0) {
                setBayarTunai(totalAkhir);
                setBayarKredit(0);
              }
              setIsBayarModalOpen(true);
            }}
            className={`h-6 px-3 font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition ${
              isPaymentSubmitted
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                : "bg-white hover:bg-amber-50 border border-amber-400 text-amber-700 cursor-pointer"
            }`}
            title={
              isPaymentSubmitted
                ? salesStatus === "LUNAS"
                  ? "Penjualan sudah Lunas."
                  : "Pembayaran telah disubmit. Pelunasan piutang diproses melalui menu Bayar Piutang."
                : "Bayar / Pelunasan Faktur Penjualan"
            }
          >
            <CreditCard className={`w-3 h-3 ${isPaymentSubmitted ? "text-slate-400" : "text-amber-600"}`} />
            <span>Bayar</span>
          </button>

          {/* 💵 Faktur / Riwayat Pembayaran Penjualan */}
          {isEdit && invoiceId && (
            <button
              type="button"
              onClick={() => setIsRiwayatPembayaranOpen(true)}
              className="h-6 px-3 bg-white hover:bg-emerald-50 border border-emerald-500 text-emerald-700 font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
              title="Lihat Faktur Pembayaran & Riwayat Piutang"
            >
              <Printer className="w-3 h-3 text-emerald-600" />
              <span>Faktur Pembayaran</span>
            </button>
          )}
        </div>

        {/* Status Penjualan Indicator */}
        <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-semibold">
          <span>Status Penjualan:</span>
          <span
            className={`font-bold ${
              salesStatus === "LUNAS" ? "text-emerald-700" : "text-slate-800 uppercase"
            }`}
          >
            {salesStatus === "LUNAS" ? "LUNAS" : "BELUM LUNAS"}
          </span>
        </div>
      </div>

      {/* 7. Footer Status Bar matching Screenshot */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px] text-slate-400 shrink-0">
        <div>© 2026 LAPAK POS • Sistem Depo, POS, Inventori &amp; Akuntansi Terpadu</div>
        <div className="flex items-center gap-1 text-emerald-600 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>POSTGRESQL CONNECTED</span>
        </div>
      </div>

      {/* MODAL 1: CARI PELANGGAN */}
      <CariPelangganModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={(cust) => {
          setSelectedCustomer(cust);
          setIsCustomerModalOpen(false);
        }}
        selectedId={selectedCustomer?.id}
      />

      {/* MODAL 2: CARI OBAT / ITEM (CariObatSalesModal matching Image 2) */}
      <CariObatSalesModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleSelectItem}
        saleType={
          mode === "CASHIER"
            ? "RETAIL_KASIR"
            : spNumber || selectedCustomer?.is_pharmacy_facility
            ? "PBF"
            : "APOTEK"
        }
        retailOnly={mode === "CASHIER"}
        warehouseId={warehouseId}
      />

      {/* MODAL 3: LAMPIRAN DOKUMEN PBF & SP (PbfDocumentUpload) */}
      {isPbfDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <span>📎 Dokumen Kepatuhan Penjualan PBF (CDOB BPOM)</span>
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
                title="Arsip Dokumen Penjualan PBF (SP Asli & Faktur PBF Asal)"
                subtitle="Unggah dokumen pesanan sarana pelanggan berstempel & SIPA APJ, serta scan Faktur Pembelian PBF Asal."
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

      {/* MODAL 4: PEMBAYARAN FAKTUR PENJUALAN (Matching Ketoko Format - Identik dengan Pembelian) */}
      {isBayarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden text-xs flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                {mode === "CASHIER" ? "Pembayaran Kasir (Retail OTC - Tunai)" : "Pembayaran Penjualan"}
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
              {/* 1. TOTAL TAGIHAN (Pink Box) */}
              <div className="bg-[#fce7f3] border-2 border-dashed border-pink-300 rounded-lg px-4 py-3 flex items-center justify-between shadow-2xs">
                <span className="text-base font-bold text-slate-800 tracking-wide">Total :</span>
                <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                  {Number(totalAkhir).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* 2. FORM FIELDS */}
              <div className="space-y-1.5 pt-1">
                {/* DP SO / Pesanan (Hanya di mode Faktur Penjualan Biasa) */}
                {mode !== "CASHIER" && (
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                      DP SO/Pesanan :
                    </label>
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={dpAmount === 0 ? "" : dpAmount}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setDpAmount(val);
                          setBayarKredit(Math.max(0, totalAkhir - (val + bayarTunai + bayarDeposit)));
                        }}
                        className="w-full h-7 px-2.5 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          const soDp = Number(totalAkhir) * 0.3;
                          setDpAmount(soDp);
                          setBayarKredit(Math.max(0, totalAkhir - (soDp + bayarTunai + bayarDeposit)));
                        }}
                        className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50"
                        title="Hitung DP 30%"
                      >
                        <Calculator className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Akun Kas / Bank Sumber Pembayaran */}
                <div className="flex items-center gap-2">
                  <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                    Kas / Bank :
                  </label>
                  <div className="flex-1">
                    <SearchableAccountSelect
                      accounts={accountsList}
                      value={cashAccountId}
                      onChange={(val) => setCashAccountId(val)}
                      placeholder="Pilih Akun Kas / Bank..."
                      buttonClassName="h-7 text-xs font-semibold font-mono"
                    />
                  </div>
                </div>

                {/* Bayar Tunai */}
                <div>
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                      Bayar Tunai :
                    </label>
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        autoFocus
                        value={bayarTunai === 0 ? "" : bayarTunai}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setBayarTunai(val);
                          setBayarKredit(Math.max(0, totalAkhir - (dpAmount + val + bayarDeposit)));
                        }}
                        className="w-full h-7 px-2.5 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          const fullCash = Math.max(0, totalAkhir - dpAmount - bayarDeposit);
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
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 pr-0.5">
                    {mode === "CASHIER" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const fullCash = Math.max(0, totalAkhir - dpAmount - bayarDeposit);
                            setBayarTunai(fullCash);
                            setBayarKredit(0);
                          }}
                          className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 text-emerald-900 rounded text-[10px] font-bold transition cursor-pointer"
                        >
                          Uang Pas
                        </button>
                        {[10000, 20000, 50000, 100000, 200000, 500000].map((nominal) => (
                          <button
                            key={nominal}
                            type="button"
                            onClick={() => {
                              setBayarTunai(nominal);
                              setBayarKredit(Math.max(0, totalAkhir - (dpAmount + nominal + bayarDeposit)));
                            }}
                            className="px-1.5 py-0.5 bg-slate-100 hover:bg-sky-100 border border-slate-300 hover:border-sky-400 text-slate-700 hover:text-sky-900 rounded text-[10px] font-mono font-medium transition cursor-pointer"
                          >
                            {nominal >= 1000 ? `${nominal / 1000}k` : nominal}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const fullCash = Math.max(0, totalAkhir - dpAmount - bayarDeposit);
                            setBayarTunai(fullCash);
                            setBayarKredit(0);
                          }}
                          className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded text-[10px] font-semibold transition cursor-pointer"
                        >
                          Uang Pas (Lunas)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const net = Math.max(0, totalAkhir - dpAmount - bayarDeposit);
                            const half = Math.round(net * 0.5 * 100) / 100;
                            setBayarTunai(half);
                            setBayarKredit(Math.max(0, net - half));
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-[10px] font-medium transition cursor-pointer"
                        >
                          50% Tunai
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBayarTunai(0);
                            setBayarKredit(Math.max(0, totalAkhir - dpAmount - bayarDeposit));
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-[10px] font-medium transition cursor-pointer"
                        >
                          Kredit / Tempo (Rp 0)
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Bayar Deposit & Kredit (Hanya untuk Faktur Penjualan Biasa) */}
                {mode !== "CASHIER" && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                        Bayar Deposit :
                      </label>
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={bayarDeposit === 0 ? "" : bayarDeposit}
                          placeholder="0.00"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setBayarDeposit(val);
                            setBayarKredit(Math.max(0, totalAkhir - (dpAmount + bayarTunai + val)));
                          }}
                          className="w-full h-7 px-2.5 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setBayarDeposit(0);
                            setBayarKredit(Math.max(0, totalAkhir - (dpAmount + bayarTunai)));
                          }}
                          className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50"
                          title="Reset Deposit"
                        >
                          <Calculator className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                        Bayar Kredit :
                      </label>
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={bayarKredit === 0 ? "" : bayarKredit}
                          placeholder="0.00"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setBayarKredit(val);
                            setBayarTunai(Math.max(0, totalAkhir - (dpAmount + bayarDeposit + val)));
                          }}
                          className="w-full h-7 px-2.5 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            const fullKredit = Math.max(0, totalAkhir - dpAmount - bayarDeposit);
                            setBayarTunai(0);
                            setBayarKredit(fullKredit);
                          }}
                          className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50"
                          title="Jadikan Piutang Penuh"
                        >
                          <Calculator className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 3. TOTAL BAYAR (Green Box) */}
              <div className="bg-[#22c55e] text-white rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold tracking-wide">Total Bayar:</span>
                <span className="text-2xl font-black font-mono tracking-tight">
                  {((Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0)).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* 4. SISA / KEMBALIAN */}
              {bayarTunai > totalAkhir ? (
                <div className="bg-sky-50 border-2 border-sky-300 text-sky-950 rounded-lg px-4 py-2.5 flex items-center justify-between shadow-2xs">
                  <span className="text-sm font-bold tracking-wide">Uang Kembali (Kembalian) :</span>
                  <span className="text-2xl font-black font-mono text-sky-700 tracking-tight">
                    {(bayarTunai - totalAkhir).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ) : (
                <div className="bg-[#f97316] text-white rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
                  <span className="text-sm font-bold tracking-wide">Sisa :</span>
                  <span className="text-2xl font-black font-mono tracking-tight">
                    {Math.max(
                      0,
                      totalAkhir - ((Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0))
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* 5. ACTION BUTTONS */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2">
              {mode === "CASHIER" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsThermalPrintAfterSave(false);
                      saveMutation.mutate();
                    }}
                    disabled={saveMutation.isPending}
                    className="h-7 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-600" />
                    <span>Simpan Saja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsThermalPrintAfterSave(true);
                      saveMutation.mutate();
                    }}
                    disabled={saveMutation.isPending}
                    className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-white" />
                    <span>Bayar & Cetak Struk</span>
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}

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

      {/* MODAL PERSETUJUAN SIMPAN (Bukan Modal Pembayaran) */}
      {isSaveConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            {/* Header Ketoko Green */}
            <div className="px-4 py-2.5 bg-[#00c875] text-white flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <Save className="w-4 h-4 text-white" />
                <span>Konfirmasi Simpan Faktur Penjualan</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSaveConfirmModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Simpan Faktur Penjualan?</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Faktur penjualan akan disimpan ke sistem dan stok obat otomatis dipotong sesuai aturan FEFO.
                  </p>
                </div>
              </div>

              {/* Ringkasan Dokumen */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Faktur :</span>
                  <span className="font-mono font-bold text-slate-800">{invoiceNo || "Auto"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal :</span>
                  <span className="text-slate-700">{invoiceDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan :</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jumlah Item :</span>
                  <span className="font-medium text-slate-800">{items.length} item obat</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-xs font-bold">
                  <span className="text-slate-700">Total Penjualan :</span>
                  <span className="text-emerald-700">{formatCurrency(totalAkhir)}</span>
                </div>
              </div>

              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  Pembayaran tunai, transfer, deposit, atau kredit tempo dapat dilakukan melalui tombol <strong>Bayar</strong>.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsSaveConfirmModalOpen(false)}
                className="h-7 px-3.5 border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending || isGudang}
                onClick={() => {
                  if (isGudang) {
                    alert("Akses ditolak: Petugas Gudang tidak berwenang mencatat transaksi penjualan.");
                    return;
                  }
                  saveMutation.mutate();
                }}
                className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded shadow-2xs transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveMutation.isPending ? "Menyimpan..." : "Ya, Simpan Data"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: HARGA JUAL POPUP */}
      {isHargaJualModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden text-xs">
            <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 font-bold text-slate-800 flex justify-between items-center">
              <span>Tingkatan Harga Jual: {selectedItem.name}</span>
              <button onClick={() => setIsHargaJualModalOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedRowIndex !== null) {
                    handleUpdateItem(selectedRowIndex, "unit_price", selectedItem.selling_price || selectedItem.unit_price);
                    setIsHargaJualModalOpen(false);
                  }
                }}
                className="w-full p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded text-left flex justify-between items-center transition"
              >
                <div>
                  <div className="font-semibold text-slate-800">Harga Retail (Apotek)</div>
                  <div className="text-[10px] text-slate-500">Harga umum konsumen</div>
                </div>
                <div className="font-bold text-emerald-700">
                  {formatCurrency(selectedItem.selling_price || selectedItem.unit_price)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedRowIndex !== null && selectedItem.wholesale_price) {
                    handleUpdateItem(selectedRowIndex, "unit_price", selectedItem.wholesale_price);
                    setIsHargaJualModalOpen(false);
                  }
                }}
                className="w-full p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded text-left flex justify-between items-center transition"
              >
                <div>
                  <div className="font-semibold text-slate-800">Harga Grosir / PBF</div>
                  <div className="text-[10px] text-slate-500">Klinik / RS / Apotek lain</div>
                </div>
                <div className="font-bold text-blue-700">
                  {formatCurrency(selectedItem.wholesale_price || selectedItem.unit_price)}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: INFO DETAIL ITEM */}
      {isInfoRowModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs">
            <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 font-bold text-slate-800 flex justify-between items-center">
              <span>Informasi Obat: {selectedItem.name}</span>
              <button onClick={() => setIsInfoRowModalOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Kode Item:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedItem.code}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Merek:</span>
                  <span className="font-semibold text-slate-800">{selectedItem.brand_name || "-"}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Stok Tersedia:</span>
                  <span className="font-bold text-emerald-700">{selectedItem.stock || 0}</span> {selectedItem.unit_name}
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Lokasi Rak:</span>
                  <span className="font-semibold text-slate-800">{selectedItem.rack || "-"}</span>
                </div>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInfoRowModalOpen(false)}
                className="h-6 px-3 bg-slate-800 text-white rounded text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🖨 Modal Cetak Faktur Dot Matrix (Continuous Form) */}
      <FakturPenjualanDotMatrixModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          if (isPrintAfterSave) {
            router.push("/sales/invoices");
          }
        }}
        saleId={targetPrintSaleId || invoiceId || draftSaleId}
        onPrintSuccess={() => {
          setIsPrintedLocally(true);
        }}
      />

      {/* 🖨 Modal Cetak Struk Kasir Thermal (58mm/80mm) */}
      <StrukKasirThermalModal
        isOpen={isThermalPrintOpen}
        onClose={() => {
          setIsThermalPrintOpen(false);
          if (isThermalPrintAfterSave) {
            router.push(mode === "CASHIER" ? "/sales/cashier" : "/sales/invoices");
          }
        }}
        saleId={targetPrintSaleId || invoiceId || draftSaleId}
      />

      {/* 💵 Modal Faktur Pembayaran & Riwayat Piutang */}
      <RiwayatPembayaranSalesModal
        isOpen={isRiwayatPembayaranOpen}
        onClose={() => setIsRiwayatPembayaranOpen(false)}
        saleId={targetPrintSaleId || invoiceId || draftSaleId}
      />
    </div>
  );
};
