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
  Building,
  Calendar,
  Check,
  X,
  Bell,
  User,
  Package,
  Calculator,
  Undo2,
  FileText,
  Truck,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { CariObatSalesModal } from "./CariObatSalesModal";
import { CariPelangganModal } from "./CariPelangganModal";
import { DetailItemSalesModal } from "./DetailItemSalesModal";
import { PilihBatchEDModal } from "./PilihBatchEDModal";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

export interface SalesOrderItemRow {
  product_id: string;
  code: string;
  name: string;
  brand_name: string;
  qty: number;
  delivered_qty: number;
  unit_id: string;
  unit_name: string;
  unit_price: number;
  discount_percent: number;
  line_total: number;
  purchase_price?: number;
  margin_profit?: number;
  stock?: number;
  rack?: string;
  drug_classification?: string;
  distribution_channel?: string;
  selling_price?: number;
  wholesale_price?: number;
  batch_mode?: "FEFO" | "MANUAL";
  batch_number?: string;
  expired_date?: string;
}

interface SalesOrderFormProps {
  isEdit?: boolean;
  orderId?: string;
}

export const SalesOrderForm: React.FC<SalesOrderFormProps> = ({
  isEdit = false,
  orderId,
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
  const [batchModalRowIndex, setBatchModalRowIndex] = useState<number | null>(null);
  const [isEditRowModalOpen, setIsEditRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SalesOrderItemRow | null>(null);
  const [isHargaJualModalOpen, setIsHargaJualModalOpen] = useState(false);
  const [isInfoRowModalOpen, setIsInfoRowModalOpen] = useState(false);
  const [isPbfDocModalOpen, setIsPbfDocModalOpen] = useState(false);
  const [isBayarModalOpen, setIsBayarModalOpen] = useState(false);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [pbfDocCount, setPbfDocCount] = useState(0);

  // Payment states matching Ketoko Payment Modal (Image 1)
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [cashAccountId, setCashAccountId] = useState("");
  const [bayarTunai, setBayarTunai] = useState<number>(0);
  const [bayarDeposit, setBayarDeposit] = useState<number>(0);
  const [bayarKredit, setBayarKredit] = useState<number>(0);

  const formatRupiahNumber = (num: number): string => {
    if (!num && num !== 0) return "0";
    if (Math.round(num) === num) {
      return num.toLocaleString("id-ID");
    }
    return num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const parseRupiahNumber = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace(/[^0-9,-]/g, "").replace(",", ".");
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  const handleDpChange = (val: number) => {
    setDpAmount(val);
    let newBayarTunai = bayarTunai;
    if (bayarTunai === totalAkhir || (val > 0 && bayarTunai + val > totalAkhir)) {
      newBayarTunai = 0;
      setBayarTunai(0);
    }
    const totalPaid = val + newBayarTunai + bayarDeposit;
    const sisa = Math.max(0, totalAkhir - totalPaid);
    setBayarKredit(sisa);
  };

  const handleBayarTunaiChange = (val: number) => {
    setBayarTunai(val);
    const totalPaid = dpAmount + val + bayarDeposit;
    const sisa = Math.max(0, totalAkhir - totalPaid);
    setBayarKredit(sisa);
  };

  const handleBayarDepositChange = (val: number) => {
    setBayarDeposit(val);
    const totalPaid = dpAmount + bayarTunai + val;
    const sisa = Math.max(0, totalAkhir - totalPaid);
    setBayarKredit(sisa);
  };

  const handleBayarKreditChange = (val: number) => {
    setBayarKredit(val);
    const net = Math.max(0, totalAkhir - dpAmount - bayarDeposit - val);
    setBayarTunai(net);
  };

  // Persistent / Draft Order ID for linking documents
  const [draftOrderId] = useState<string>(() => {
    if (orderId) return orderId;
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "so-" + Date.now();
  });

  // Form Fields matching Reference Screenshot
  const [orderNo, setOrderNo] = useState("Auto");
  const [orderDate, setOrderDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [orderStatus, setOrderStatus] = useState("Select...");
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
  const [items, setItems] = useState<SalesOrderItemRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // Bottom form fields matching Screenshot
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"DIKIRIM" | "DIAMBIL">("DIKIRIM");
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [taxCheckbox, setTaxCheckbox] = useState(false);
  const [nominalDiscount, setNominalDiscount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notaDiscountPercent, setNotaDiscountPercent] = useState<number>(0);
  const [extraFee, setExtraFee] = useState<number>(0);
  const [extraFeeCheckbox, setExtraFeeCheckbox] = useState(false);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-so-select"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses-so-select"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps-so-select"],
    queryFn: async () => {
      const res = await api.get("/sales-reps");
      return res.data?.data || [];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units-so-select"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
  });

  const { data: accountsList = [] } = useQuery({
    queryKey: ["cash-bank-accounts-so-select"],
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

  // Query General Settings for Margin Profit & HPP Confirmations
  const { data: generalSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings-general"],
    queryFn: async () => {
      const res = await api.get("/settings/groups/GENERAL");
      return res.data?.data || {};
    },
  });

  // Default cash account
  useEffect(() => {
    if (accountsList.length > 0 && !cashAccountId) {
      const defaultAcc = accountsList.find(
        (a: any) =>
          a.code === "1-1110" ||
          a.code === "1-1121" ||
          a.name?.toUpperCase().includes("KAS")
      );
      setCashAccountId(defaultAcc ? defaultAcc.id : accountsList[0].id);
    }
  }, [accountsList, cashAccountId]);

  // Query linked documents for this sales order
  const { data: orderDocs = [], refetch: refetchOrderDocs } = useQuery({
    queryKey: ["order-documents-count", draftOrderId],
    queryFn: async () => {
      const res = await api.get(`/documents?entity_type=sales_order&entity_id=${draftOrderId}`);
      return res.data?.data || [];
    },
    enabled: !!draftOrderId,
  });

  useEffect(() => {
    if (orderDocs) {
      setPbfDocCount(orderDocs.length);
    }
  }, [orderDocs]);

  // Default warehouse
  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  // Default customer if none selected
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer]);

  // Load existing SO if isEdit
  const { data: existingSO } = useQuery({
    queryKey: ["sales-order-detail", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await api.get(`/sales/orders/${orderId}`);
      return res.data?.data;
    },
    enabled: isEdit && Boolean(orderId),
  });

  // Status apakah pembayaran / DP sudah disubmit
  // Sesuai aturan: jika pembayaran sudah disubmit, tombol bayar didisable karena pelunasan piutang dilakukan melalui menu Bayar Piutang
  // Status apakah Pesanan Penjualan sudah selesai -> Transaksi Terkunci
  const isCompleted = Boolean(
    existingSO && (
      existingSO.status === "SELESAI" ||
      existingSO.status === "COMPLETED" ||
      existingSO.process_status === "Selesai" ||
      orderStatus === "SELESAI" ||
      orderStatus === "COMPLETED"
    )
  );

  const isPaymentSubmitted = Boolean(
    (existingSO && (
      existingSO.payment_status === "PAID" ||
      existingSO.payment_status === "PARTIAL" ||
      existingSO.payment_status === "DP" ||
      existingSO.payment_status === "TEMPO" ||
      (Number(existingSO.paid_amount) || 0) > 0 ||
      (Number(existingSO.dp_amount) || 0) > 0 ||
      (Number(existingSO.remaining_amount) || 0) > 0
    )) ||
    (orderStatus === "SELESAI" || (isEdit && Boolean(orderId)))
  );

  useEffect(() => {
    if (existingSO) {
      setOrderNo(existingSO.order_no || "Auto");
      if (existingSO.customer) {
        setSelectedCustomer(existingSO.customer);
      }
      if (existingSO.status) {
        setOrderStatus(existingSO.status);
      }
      if (existingSO.notes) {
        setNotes(existingSO.notes);
      }
      if (existingSO.delivery_method === "DIAMBIL" || existingSO.delivery_method === "DIKIRIM") {
        setDeliveryMethod(existingSO.delivery_method);
      }
      if (existingSO.delivery_date) {
        setDeliveryDate(existingSO.delivery_date.split("T")[0]);
      } else if (existingSO.customer_sp_date) {
        setDeliveryDate(existingSO.customer_sp_date.split("T")[0]);
      }
      if (existingSO.customer_sp_type) setSpType(existingSO.customer_sp_type);
      if (existingSO.customer_sp_number) setSpNumber(existingSO.customer_sp_number);
      if (existingSO.pbf_origin_invoice_no) setPbfOriginInvoiceNo(existingSO.pbf_origin_invoice_no);
      if (existingSO.tax_percent !== undefined) {
        const tp = Number(existingSO.tax_percent) || 0;
        setTaxPercent(tp);
        setPpnType(tp > 0 ? "Exclude" : "Non");
        setTaxCheckbox(tp > 0);
      }
      if (existingSO.warehouse_id) {
        setWarehouseId(existingSO.warehouse_id);
      }
      if (existingSO.sales_rep_id) {
        setSalesRepId(existingSO.sales_rep_id);
      }
      if (existingSO.paid_amount !== undefined) {
        setDpAmount(existingSO.paid_amount);
        setBayarTunai(existingSO.paid_amount);
      }
      if (existingSO.shipping_fee !== undefined && existingSO.shipping_fee > 0) {
        setExtraFee(existingSO.shipping_fee);
        setExtraFeeCheckbox(true);
      }
      if (existingSO.discount !== undefined) {
        setNominalDiscount(existingSO.discount);
      }

      if (Array.isArray(existingSO.items)) {
        const mappedItems: SalesOrderItemRow[] = existingSO.items.map((it: any) => {
          const prod = it.product || {};
          const qty = Number(it.qty || 1);
          const unitPrice = Number(it.unit_price || 0);
          const disc = Number(it.discount || 0);
          const lineTot = Number(qty * unitPrice - disc);
          const discPct = qty * unitPrice > 0 ? (disc / (qty * unitPrice)) * 100 : 0;

          return {
            product_id: it.product_id,
            code: prod.sku || prod.code || it.code || "-",
            name: prod.name || it.name || "-",
            brand_name: prod.brand?.name || prod.brand_name || "-",
            qty: qty,
            delivered_qty: 0,
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
            batch_mode: it.batch_number ? "MANUAL" : "FEFO",
            batch_number: it.batch_number || "",
            expired_date: it.expired_date ? new Date(it.expired_date).toISOString().split("T")[0] : "",
          };
        });
        setItems(mappedItems);
        if (mappedItems.length > 0) setSelectedRowIndex(0);
      }
    }
  }, [existingSO]);

  // Open Detail Item modal
  const handleOpenEditRow = (targetIdx?: number) => {
    const idx = targetIdx !== undefined ? targetIdx : selectedRowIndex;
    if (idx === null || !items[idx]) {
      alert("Pilih baris item yang ingin diubah terlebih dahulu.");
      return;
    }
    setSelectedRowIndex(idx);
    setEditingRow({ ...items[idx] });
    setIsEditRowModalOpen(true);
  };

  const handleSaveDetailItem = (updatedRow: any) => {
    if (selectedRowIndex === null) return;
    const updated = [...items];
    updated[selectedRowIndex] = {
      ...updated[selectedRowIndex],
      ...updatedRow,
    };
    setItems(updated);
    setIsEditRowModalOpen(false);
  };

  // Calculations
  const itemCount = items.length;
  const totalQty = items.reduce((sum, it) => sum + (it.qty || 0), 0);
  const subTotal = items.reduce((sum, it) => sum + (it.line_total || 0), 0);

  // Discount computation (both Pot % and Pot Nota % can be filled simultaneously)
  const pot1Amount = useMemo(() => {
    return (subTotal * (Number(discountPercent) || 0)) / 100;
  }, [subTotal, discountPercent]);

  const potNotaAmount = useMemo(() => {
    return ((subTotal - pot1Amount) * (Number(notaDiscountPercent) || 0)) / 100;
  }, [subTotal, pot1Amount, notaDiscountPercent]);

  const calculatedNominalDiscount = useMemo(() => {
    if (discountPercent > 0 || notaDiscountPercent > 0) {
      return Math.round(pot1Amount + potNotaAmount);
    }
    return nominalDiscount;
  }, [discountPercent, notaDiscountPercent, pot1Amount, potNotaAmount, nominalDiscount]);

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
    const chosenBatch = prod._selectedBatch as
      | { batch_mode: "FEFO" | "MANUAL"; batch_number: string; expired_date: string }
      | undefined;
    const chosenBatchNo = chosenBatch?.batch_mode === "MANUAL" ? chosenBatch.batch_number : "";
    const existingIndex = items.findIndex(
      (it) => it.product_id === prod.id && (it.batch_number || "") === chosenBatchNo
    );
    const price = Number(prod.selling_price || prod.unit_price || 0);
    const purchasePrice = Number(prod.purchase_price || prod.avg_cost || 0);
    const unitName = prod.base_unit?.name || prod.unit_name || "PCS";
    const unitId = prod.base_unit_id || prod.unit_id || (units[0]?.id || "");
    const brand = prod.brand?.name || prod.brand_name || prod.manufacturer || "-";

    const margin = purchasePrice > 0 ? ((price - purchasePrice) / purchasePrice) * 100 : 0;
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
      cur.line_total = cur.unit_price * newQty - lineDisc;
      cur.purchase_price = purchasePrice;
      cur.margin_profit = margin;
      setItems(updated);
      setSelectedRowIndex(existingIndex);
    } else {
      const newRow: SalesOrderItemRow = {
        product_id: prod.id,
        code: prod.code || prod.sku || "-",
        name: prod.name || "-",
        brand_name: brand,
        qty: 1,
        delivered_qty: 0,
        unit_id: unitId,
        unit_name: unitName,
        unit_price: price,
        discount_percent: 0,
        line_total: price,
        purchase_price: purchasePrice,
        margin_profit: margin,
        stock: Number(prod.total_stock || prod.stock || 0),
        rack: prod.rack || "-",
        drug_classification: prod.drug_classification || "Obat Bebas",
        distribution_channel: prod.distribution_channel || "ALL",
        selling_price: price,
        wholesale_price: Number(prod.wholesale_price || price),
        batch_mode: chosenBatch?.batch_mode === "MANUAL" ? "MANUAL" : "FEFO",
        batch_number: chosenBatchNo,
        expired_date: chosenBatch?.batch_mode === "MANUAL" ? chosenBatch.expired_date : "",
      };
      const newItems = [...items, newRow];
      setItems(newItems);
      setSelectedRowIndex(newItems.length - 1);
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

        if (field === "unit_price" && updated.purchase_price && updated.purchase_price > 0) {
          const margin = ((value - updated.purchase_price) / updated.purchase_price) * 100;
          updated.margin_profit = margin;
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
            `⚠️ Peringatan:\nTerdapat item dengan harga jual di bawah Harga Pokok (HPP):\n${itemNames}\n\nApakah Anda yakin ingin melanjutkan penyimpanan Pesanan Penjualan?`
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
            `⚠️ Peringatan:\nTerdapat item dengan margin keuntungan di bawah batas Minimum Profit (${minProfit}%):\n${itemNames}\n\nApakah Anda yakin ingin melanjutkan penyimpanan Pesanan Penjualan?`
          )
        ) {
          return false;
        }
      }
    }
    return true;
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
    if (items.length > 0 && !confirm("Kosongkan form untuk membuat Pesanan Penjualan baru?")) {
      return;
    }
    setOrderNo("Auto");
    setOrderStatus("Select...");
    setItems([]);
    setSelectedRowIndex(null);
    setNotes("");
    setDeliveryMethod("DIKIRIM");
    setTaxPercent(0);
    setPpnType("Non");
    setNominalDiscount(0);
    setDiscountPercent(0);
    setNotaDiscountPercent(0);
    setExtraFee(0);
    setExtraFeeCheckbox(false);
  };

  // Check minimum stock
  const handleCheckMinimumStock = () => {
    const lowStockItems = items.filter((it) => (it.stock || 0) < it.qty);
    if (lowStockItems.length === 0) {
      alert("Semua stok item dalam tabel pesanan mencukupi.");
    } else {
      alert(
        `Perhatian: Terdapat ${lowStockItems.length} item dengan jumlah pesanan melebihi sisa stok:\n` +
        lowStockItems.map((it) => `- ${it.name} (Stok: ${it.stock}, Pesanan: ${it.qty})`).join("\n")
      );
    }
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer?.id) {
        throw new Error("Pilih Pelanggan terlebih dahulu.");
      }
      if (items.length === 0) {
        throw new Error("Tabel item pesanan masih kosong. Silakan klik [+ Item].");
      }

      const defaultUnit =
        units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];

      let parsedDate = new Date();
      if (orderDate && orderDate.includes("/")) {
        const parts = orderDate.split(" ");
        const dateParts = parts[0].split("/");
        if (dateParts.length === 3) {
          parsedDate = new Date(
            `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1] || "12:00:00"}`
          );
        }
      }

      const payload = {
        warehouse_id: warehouseId || undefined,
        customer_id: selectedCustomer.id,
        sales_rep_id: salesRepId || undefined,
        notes: notes,
        tax_percent: ppnType === "Non" ? 0 : taxPercent,
        discount: calculatedNominalDiscount,
        shipping_fee: extraFeeCheckbox ? extraFee : 0,
        paid_amount: dpAmount > 0 ? dpAmount : bayarTunai,
        cash_account_id: cashAccountId || undefined,
        status: orderStatus !== "Select..." ? orderStatus : "PENDING",
        customer_sp_number: spNumber,
        delivery_method: deliveryMethod,
        delivery_date: deliveryDate ? new Date(deliveryDate) : undefined,
        customer_sp_date: deliveryDate ? new Date(deliveryDate) : undefined,
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
            batch_number: it.batch_mode === "MANUAL" && it.batch_number ? it.batch_number : undefined,
            expired_date:
              it.batch_mode === "MANUAL" && it.expired_date
                ? new Date(it.expired_date).toISOString()
                : undefined,
          };
        }),
      };

      if (isEdit && orderId) {
        return await api.put(`/sales/orders/${orderId}`, payload);
      }
      return await api.post("/sales/orders", {
        ...payload,
        id: draftOrderId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      setIsBayarModalOpen(false);
      setIsSaveConfirmModalOpen(false);
      alert(
        isEdit
          ? "Pesanan Penjualan berhasil diperbarui!"
          : "Pesanan Penjualan baru berhasil disimpan!"
      );
      router.push("/sales/orders");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan Pesanan Penjualan: " + (err.response?.data?.message || err.message));
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) {
        throw new Error("Silakan simpan pesanan penjualan terlebih dahulu.");
      }
      const res = await api.post(`/sales/orders/${orderId}/convert-to-invoice`);
      return res.data?.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      alert("Faktur Penjualan berhasil dibuat dan stok dikeluarkan sesuai aturan FEFO!");
      if (data?.id) {
        router.push(`/sales/invoices/${data.id}/edit`);
      } else {
        router.push("/sales/invoices");
      }
    },
    onError: (err: any) => {
      alert("Gagal membuat Faktur Penjualan: " + (err.response?.data?.message || err.message));
    },
  });

  const selectedItem = selectedRowIndex !== null ? items[selectedRowIndex] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 flex flex-col h-full min-h-0 text-xs select-none gap-1 overflow-y-auto md:overflow-hidden">
      {/* 1. Header: [< Pesanan Penjualan Baru] + User Profile matching Screenshot */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/sales/orders")}
            className="p-1 hover:bg-slate-100 rounded text-slate-700 transition"
            title="Kembali ke Daftar Pesanan Penjualan"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            {isEdit ? `Ubah Pesanan Penjualan : ${orderNo}` : "Pesanan Penjualan Baru"}
          </h1>
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

      {/* Locked Status Banner */}
      {isEdit && isCompleted && (
        <div className="shrink-0 px-3 py-1.5 rounded-lg border bg-emerald-50 border-emerald-300 text-emerald-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold">
              🟢 STATUS: PESANAN PENJUALAN SELESAI (Transaksi Terkunci - Hanya Dapat Dilihat)
            </span>
          </div>
          <span className="text-[11px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
            READ-ONLY
          </span>
        </div>
      )}

      {/* 2. Top Form Section (3 Rows matching Screenshot) */}
      <div className="bg-slate-50/70 border border-slate-300 rounded p-1 sm:p-1.5 space-y-1 shadow-2xs shrink-0">
        {/* ROW 1: No Transaksi | Tanggal | Pelanggan | Status Pesanan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* No Transaksi */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              No Transaksi :
            </label>
            <input
              type="text"
              readOnly
              value={orderNo}
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
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
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
                placeholder="Select..."
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-sky-500 truncate"
              />
              <button
                type="button"
                disabled={isCompleted}
                onClick={() => !isCompleted && setIsCustomerModalOpen(true)}
                className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title={isCompleted ? "Transaksi terkunci" : "Cari Pelanggan (🔍)"}
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Status Pesanan */}
          <div className="md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Status Pesanan :
            </label>
            <select
              value={orderStatus}
              disabled={isCompleted}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="Select...">Select...</option>
              <option value="PENDING">PENDING</option>
              <option value="DISETUJUI">DISETUJUI</option>
              <option value="DIPROSES">DIPROSES</option>
              <option value="SELESAI">SELESAI</option>
              <option value="BATAL">BATAL</option>
            </select>
          </div>
        </div>

        {/* ROW 2: Gudang | Salesman | PPN | Jenis SP Farmasi | Metode Penyerahan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* Gudang */}
          <div className="md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Gudang :
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
          <div className="md:col-span-2">
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
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              PPN :
            </label>
            <select
              value={ppnType}
              onChange={(e) => {
                const val = e.target.value as any;
                setPpnType(val);
                if (val === "Non") {
                  setTaxPercent(0);
                  setTaxCheckbox(false);
                } else {
                  if (taxPercent === 0) setTaxPercent(11);
                  setTaxCheckbox(true);
                }
              }}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="Non">Non</option>
              <option value="Include">Include</option>
              <option value="Exclude">Exclude</option>
            </select>
          </div>

          {/* Jenis SP Farmasi (BPOM) */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Jenis SP (BPOM) :
            </label>
            <select
              value={spType}
              onChange={(e) => setSpType(e.target.value)}
              className="w-full h-6 px-1.5 py-0 border border-emerald-300 rounded text-[11px] font-semibold text-emerald-800 bg-emerald-50/40 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="REGULER">SP REGULER</option>
              <option value="NARKOTIKA">SP NARKOTIKA</option>
              <option value="PSIKOTROPIKA">SP PSIKOTROPIKA</option>
              <option value="PREKURSOR">SP PREKURSOR</option>
              <option value="OOT">SP OOT</option>
            </select>
          </div>

          {/* Metode Pengambilan / Pengiriman */}
          <div className="md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Metode Penyerahan :
            </label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as "DIKIRIM" | "DIAMBIL")}
              className="w-full h-6 px-1.5 py-0 border border-sky-300 rounded text-[11px] font-semibold text-sky-900 bg-sky-50/50 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="DIKIRIM">Melalui Pengiriman</option>
              <option value="DIAMBIL">Diambil Pelanggan Langsung</option>
            </select>
          </div>
        </div>

        {/* ROW 3: No. SP Farmasi Resmi | APJ | SIPA APJ | Upload Scan */}
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
                <th className="py-0.5 px-2 border-r border-slate-200 text-center w-36">Batch &amp; ED</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200 text-right w-32 min-w-[120px]">Harga</th>
                <th className="py-0.5 px-2 border-r border-slate-200 text-center w-12">Pot %</th>
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
                  return (
                    <tr
                      key={`${row.product_id}-${row.batch_number || "FEFO"}-${idx}`}
                      onClick={() => setSelectedRowIndex(idx)}
                      onDoubleClick={() => handleOpenEditRow(idx)}
                      className={`h-6 cursor-pointer transition-colors ${isSelected
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
                      {/* Jml Terkirim / Terima */}
                      <td className="py-0.5 px-2 border-r border-slate-100 text-right text-slate-500">
                        0.00
                      </td>
                      {/* Satuan */}
                      <td className="py-0.5 px-2 border-r border-slate-100 text-center font-medium">
                        {row.unit_name}
                      </td>
                      {/* Batch & ED Selector (Auto FEFO / Pilih ED) */}
                      <td className="py-0.5 px-1.5 border-r border-slate-100 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBatchModalRowIndex(idx);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer inline-flex items-center gap-1 ${
                            row.batch_mode === "MANUAL" && row.batch_number
                              ? "bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-300"
                              : "bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}
                          title="Klik untuk memilih Auto FEFO atau Batch / Expired Date tertentu"
                        >
                          {row.batch_mode === "MANUAL" && row.batch_number ? (
                            <span className="font-mono">
                              {row.batch_number}
                              {row.expired_date ? ` (${formatDate(row.expired_date)})` : ""}
                            </span>
                          ) : (
                            <span>Auto FEFO ▾</span>
                          )}
                        </button>
                      </td>
                      {/* Disabled Harga with Rupiah formatting */}
                      <td className="py-0 px-1 border-r border-slate-100 text-right w-32 min-w-[120px]">
                        <input
                          type="text"
                          disabled
                          readOnly
                          value={Number(row.unit_price || 0).toLocaleString("id-ID")}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full h-5 px-1.5 border border-slate-200 rounded text-right text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 cursor-not-allowed select-none"
                          title="Harga satuan diatur melalui pencarian obat atau ubah detail item [✏]"
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
      <div className="flex items-center gap-1.5 shrink-0 py-0.5">
        <button
          type="button"
          disabled={isCompleted || isGudang}
          onClick={() => !isCompleted && !isGudang && setIsItemModalOpen(true)}
          className="h-6 px-3 bg-[#e2f8ec] hover:bg-[#c9f1dc] text-[#00a862] border border-[#a2e8c2] font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Item</span>
        </button>

        <button
          type="button"
          disabled={selectedRowIndex === null || isCompleted || isGudang}
          onClick={() => handleOpenEditRow()}
          className="h-6 w-6 border border-slate-300 rounded hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed"
          title={isCompleted ? "Transaksi terkunci" : "Ubah Item"}
        >
          <Pencil className="w-3 h-3" />
        </button>

        <button
          type="button"
          disabled={selectedRowIndex === null || isCompleted || isGudang}
          onClick={() => {
            if (selectedRowIndex !== null && !isCompleted && !isGudang) handleRemoveItem(selectedRowIndex);
          }}
          className="h-6 w-6 border border-slate-300 rounded hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 flex items-center justify-center text-slate-600 disabled:opacity-40 transition disabled:cursor-not-allowed"
          title={isCompleted ? "Transaksi terkunci" : "Hapus Item"}
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

          {/* Terima */}
          <div className="col-span-1 md:col-span-1">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none truncate">
              Terima :
            </label>
            <input
              type="text"
              readOnly
              value="0.00"
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
            <select
              value={String(taxPercent)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setTaxPercent(val);
                setPpnType(val > 0 ? "Exclude" : "Non");
                setTaxCheckbox(val > 0);
              }}
              className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="0">0% - Non Pajak</option>
              <option value="11">11% - PPN 11%</option>
              <option value="12">12% - PPN 12%</option>
            </select>
          </div>

          {/* Nom Pajak */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Nom Pajak :
            </label>
            <input
              type="text"
              readOnly
              value={formatCurrency(calculatedTaxAmount).replace("Rp", "").trim()}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-right text-slate-700 bg-slate-100 focus:outline-none font-medium"
            />
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
              placeholder="Catatan pesanan penjualan..."
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
              step="0.01"
              value={discountPercent || ""}
              placeholder="0"
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setDiscountPercent(val);
                if (val > 0) setNominalDiscount(0);
              }}
              className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-center text-slate-800 bg-white font-mono focus:outline-none focus:border-sky-500"
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
              step="0.01"
              value={notaDiscountPercent || ""}
              placeholder="0"
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setNotaDiscountPercent(val);
                if (val > 0) setNominalDiscount(0);
              }}
              className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-center text-slate-800 bg-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Nom Potongan */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none truncate">
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
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-right text-slate-800 bg-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Biaya with $ */}
          <div className="col-span-1 md:col-span-2">
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
                  if (val > 0) {
                    setExtraFeeCheckbox(true);
                  }
                }}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-right text-slate-800 bg-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="w-5 h-6 flex items-center justify-center border border-slate-300 rounded bg-slate-100 text-slate-600 text-xs font-bold shrink-0">
                $
              </span>
              <input
                type="checkbox"
                checked={extraFeeCheckbox}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setExtraFeeCheckbox(checked);
                  if (!checked) setExtraFee(0);
                }}
                className="w-3.5 h-3.5 text-sky-600 rounded"
              />
            </div>
          </div>

          {/* Total Akhir (Pink Highlight matching Screenshot) */}
          <div className="col-span-2 md:col-span-2">
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
            disabled={saveMutation.isPending || isGudang || isCompleted}
            onClick={() => {
              if (isCompleted) {
                alert("Pesanan Penjualan sudah selesai. Transaksi yang sudah selesai tidak dapat diedit.");
                return;
              }
              if (isGudang) {
                alert("Akses ditolak: Petugas Gudang tidak berwenang mencatat atau mengubah Pesanan Penjualan.");
                return;
              }
              if (!selectedCustomer?.id) {
                alert("Pilih Pelanggan terlebih dahulu.");
                return;
              }
              if (items.length === 0) {
                alert("Tabel item pesanan masih kosong. Silakan klik [+ Item].");
                return;
              }
              if (!validateMarginAndHpp()) return;
              setIsSaveConfirmModalOpen(true);
            }}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={
              isCompleted
                ? "Pesanan Penjualan sudah selesai. Transaksi yang sudah selesai tidak dapat diedit."
                : isGudang
                  ? "Petugas Gudang tidak berwenang mencatat/mengubah SO"
                  : "Simpan Pesanan Penjualan"
            }
          >
            <Save className="w-3 h-3" />
            <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>

          {/* 🗑 Hapus */}
          <button
            type="button"
            disabled={isCompleted || isGudang}
            onClick={() => {
              if (isCompleted) {
                alert("Pesanan Penjualan sudah selesai. Transaksi yang sudah selesai tidak dapat dihapus.");
                return;
              }
              handleResetForm();
            }}
            className="h-6 px-3 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={isCompleted ? "Pesanan Penjualan sudah selesai (Tidak dapat dihapus)" : "Hapus / Reset Form"}
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus</span>
          </button>

          {/* 🖨 Cetak */}
          <button
            type="button"
            onClick={() => alert("Mencetak Surat Pesanan Penjualan...")}
            className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
          >
            <Printer className="w-3 h-3" />
            <span>Cetak</span>
          </button>

          {/* 💳 Bayar / DP (Membuka Modal Pembayaran) */}
          <button
            type="button"
            disabled={isPaymentSubmitted}
            onClick={() => {
              if (isPaymentSubmitted) {
                alert("Pembayaran/DP pesanan telah disubmit. Pelunasan piutang diproses melalui menu Bayar Piutang.");
                return;
              }
              if (!selectedCustomer?.id) {
                alert("Pilih Pelanggan terlebih dahulu sebelum mengisi pembayaran/DP.");
                return;
              }
              if (items.length === 0) {
                alert("Silakan tambahkan item pesanan terlebih dahulu sebelum mengisi pembayaran/DP.");
                return;
              }
              setIsBayarModalOpen(true);
            }}
            className={`h-6 px-3 font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition ${isPaymentSubmitted
              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
              : "bg-white hover:bg-emerald-50 border border-emerald-500 text-emerald-700 cursor-pointer"
              }`}
            title={
              isPaymentSubmitted
                ? "Pembayaran/DP pesanan telah disubmit. Pelunasan piutang diproses melalui menu Bayar Piutang."
                : "Bayar DP / Pembayaran Pesanan"
            }
          >
            <CreditCard className={`w-3 h-3 ${isPaymentSubmitted ? "text-slate-400" : "text-emerald-600"}`} />
            <span>Bayar / DP</span>
            {dpAmount > 0 && (
              <span className={`rounded px-1 py-0.2 text-[9px] ${isPaymentSubmitted ? "bg-slate-400 text-white" : "bg-emerald-600 text-white"}`}>
                {formatCurrency(dpAmount)}
              </span>
            )}
          </button>
        </div>

        {/* Status Pesanan Indicator */}
        <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-semibold">
          <span>Status Pesanan:</span>
          <span
            className={`font-bold ${orderStatus === "SELESAI" ? "text-emerald-700" : "text-slate-800 uppercase"
              }`}
          >
            {orderStatus !== "Select..." ? orderStatus : "PENDING"}
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

      {/* MODAL 2: CARI OBAT / ITEM (CariObatSalesModal) */}
      <CariObatSalesModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleSelectItem}
        saleType="PBF"
        warehouseId={warehouseId}
      />

      {batchModalRowIndex !== null && items[batchModalRowIndex] && (
        <PilihBatchEDModal
          isOpen={true}
          onClose={() => setBatchModalRowIndex(null)}
          productId={items[batchModalRowIndex].product_id}
          productName={items[batchModalRowIndex].name}
          productCode={items[batchModalRowIndex].code}
          warehouseId={warehouseId}
          currentBatchNumber={items[batchModalRowIndex].batch_number}
          onSelect={(opt) => {
            setItems((prev) =>
              prev.map((it, i) =>
                i === batchModalRowIndex
                  ? {
                      ...it,
                      batch_mode: opt.batch_mode,
                      batch_number: opt.batch_number,
                      expired_date: opt.expired_date,
                    }
                  : it
              )
            );
          }}
        />
      )}

      {/* MODAL 3: LAMPIRAN DOKUMEN PBF & SP (PbfDocumentUpload) */}
      {isPbfDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <span>📎 Dokumen Pesanan Penjualan &amp; Faktur PBF Asal</span>
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
                entityType="sales_order"
                entityId={draftOrderId}
                title="Dokumen Pesanan Pelanggan &amp; Faktur PBF Asal"
                subtitle="Unggah scan Surat Pesanan (SP) Asli Pelanggan, SIPA APJ, dan Faktur Pembelian PBF Asal."
                onUploadedCountChange={(cnt) => {
                  setPbfDocCount(cnt);
                  refetchOrderDocs();
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

      {/* MODAL 4: HARGA JUAL POPUP */}
      {isHargaJualModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden text-xs">
            <div className="px-4 py-2 bg-[#00c875] text-white font-bold flex justify-between items-center">
              <span>Tingkatan Harga Jual: {selectedItem.name}</span>
              <button onClick={() => setIsHargaJualModalOpen(false)} className="text-white/80 hover:text-white">
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

      {/* MODAL 5: INFO DETAIL ITEM */}
      {isInfoRowModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs">
            <div className="px-4 py-2 bg-[#00c875] text-white font-bold flex justify-between items-center">
              <span>Informasi Obat: {selectedItem.name}</span>
              <button onClick={() => setIsInfoRowModalOpen(false)} className="text-white/80 hover:text-white">
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
                className="h-6 px-3 bg-[#00c875] text-white rounded text-xs font-semibold hover:bg-[#00b066]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PEMBAYARAN / DP PESANAN PENJUALAN (Identik dengan Gambar 1) */}
      {isBayarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden text-xs flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-2.5 bg-[#00c875] text-white flex justify-between items-center">
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-white" />
                Pembayaran / DP Pesanan
              </span>
              <button
                type="button"
                onClick={() => setIsBayarModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-2.5">
              {/* 1. TOTAL TAGIHAN (Pink Box matching Image 1) */}
              <div className="bg-[#fce7f3] border-2 border-dashed border-pink-300 rounded-lg px-4 py-3 flex items-center justify-between shadow-2xs">
                <span className="text-base font-bold text-slate-800 tracking-wide">Total :</span>
                <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                  Rp {formatRupiahNumber(totalAkhir)}
                </span>
              </div>

              {/* 2. FORM FIELDS */}
              <div className="space-y-1.5 pt-1">
                {/* DP PO/Pesanan */}
                <div className="flex items-center gap-2">
                  <label className="w-32 text-right font-medium text-slate-700 shrink-0">
                    DP PO/Pesanan :
                  </label>
                  <div className="flex-1 relative flex items-center">
                    <span className="absolute left-2.5 text-xs text-slate-400 font-mono font-bold select-none">Rp</span>
                    <input
                      type="text"
                      value={formatRupiahNumber(dpAmount)}
                      placeholder="0"
                      onChange={(e) => handleDpChange(parseRupiahNumber(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-full h-7 pl-9 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleDpChange(Math.round(Number(totalAkhir) * 0.3))}
                      className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50 cursor-pointer"
                      title="Hitung DP 30%"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Kas / Bank */}
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
                      <span className="absolute left-2.5 text-xs text-slate-400 font-mono font-bold select-none">Rp</span>
                      <input
                        type="text"
                        autoFocus
                        value={formatRupiahNumber(bayarTunai)}
                        placeholder="0"
                        onChange={(e) => handleBayarTunaiChange(parseRupiahNumber(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-full h-7 pl-9 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          const fullCash = Math.max(0, totalAkhir - dpAmount - bayarDeposit);
                          handleBayarTunaiChange(fullCash);
                        }}
                        className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50 cursor-pointer"
                        title="Isi Tunai Penuh"
                      >
                        <Calculator className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Preset Quick Buttons matching Image 1 */}
                  <div className="flex items-center justify-end gap-1.5 pt-0.5 pr-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const fullCash = Math.max(0, totalAkhir - dpAmount - bayarDeposit);
                        handleBayarTunaiChange(fullCash);
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
                        handleBayarTunaiChange(half);
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-[10px] font-medium transition cursor-pointer"
                    >
                      50% Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBayarKreditChange(Math.max(0, totalAkhir - dpAmount - bayarDeposit));
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-[10px] font-medium transition cursor-pointer"
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
                    <span className="absolute left-2.5 text-xs text-slate-400 font-mono font-bold select-none">Rp</span>
                    <input
                      type="text"
                      value={formatRupiahNumber(bayarDeposit)}
                      placeholder="0"
                      onChange={(e) => handleBayarDepositChange(parseRupiahNumber(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-full h-7 pl-9 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleBayarDepositChange(0)}
                      className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50 cursor-pointer"
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
                    <span className="absolute left-2.5 text-xs text-slate-400 font-mono font-bold select-none">Rp</span>
                    <input
                      type="text"
                      value={formatRupiahNumber(bayarKredit)}
                      placeholder="0"
                      onChange={(e) => handleBayarKreditChange(parseRupiahNumber(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-full h-7 pl-9 pr-8 text-right font-mono font-bold text-xs border border-slate-300 rounded focus:border-sky-500 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        const fullKredit = Math.max(0, totalAkhir - dpAmount - bayarDeposit);
                        handleBayarKreditChange(fullKredit);
                      }}
                      className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50 cursor-pointer"
                      title="Jadikan Piutang Penuh"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. TOTAL BAYAR (Green Box matching Image 1) */}
              <div className="bg-[#22c55e] text-white rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold tracking-wide">Total :</span>
                <span className="text-2xl font-black font-mono tracking-tight">
                  Rp {formatRupiahNumber((Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0))}
                </span>
              </div>

              {/* 4. SISA (Orange Box matching Image 1) */}
              <div className="bg-[#f97316] text-white rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold tracking-wide">Sisa :</span>
                <span className="text-2xl font-black font-mono tracking-tight">
                  Rp {formatRupiahNumber(Math.max(
                    0,
                    totalAkhir - ((Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0))
                  ))}
                </span>
              </div>
            </div>

            {/* 5. ACTION BUTTONS matching Image 1 */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsBayarModalOpen(false);
                  saveMutation.mutate();
                }}
                disabled={saveMutation.isPending}
                className="h-7 px-3.5 bg-white hover:bg-emerald-50 border border-slate-300 text-slate-700 font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-sky-600" />
                <span>Simpan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBayarModalOpen(false);
                  saveMutation.mutate();
                  alert("Mencetak Bukti Pembayaran / DP Pesanan...");
                }}
                disabled={saveMutation.isPending}
                className="h-7 px-3.5 bg-white hover:bg-sky-50 border border-slate-300 text-slate-700 font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Simpan + Cetak</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBayarModalOpen(false)}
                className="h-7 px-3.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
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
                <span>Konfirmasi Simpan Pesanan Penjualan</span>
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
                  <h4 className="font-bold text-slate-800 text-sm">Simpan Dokumen Pesanan?</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Apakah Anda yakin ingin menyimpan pesanan penjualan ini ke sistem?
                  </p>
                </div>
              </div>

              {/* Ringkasan Dokumen */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Transaksi :</span>
                  <span className="font-mono font-bold text-slate-800">{orderNo || "Auto"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal :</span>
                  <span className="text-slate-700">{orderDate}</span>
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
                  <span className="text-slate-700">Total Nilai Pesanan :</span>
                  <span className="text-emerald-700">{formatCurrency(totalAkhir)}</span>
                </div>
              </div>

              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  Pembayaran uang muka (DP) atau pelunasan dapat dilakukan terpisah melalui tombol <strong>Bayar / DP</strong>.
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
                    alert("Akses ditolak: Petugas Gudang tidak berwenang mencatat atau mengubah Pesanan Penjualan.");
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

      {/* MODAL EDIT ITEM / DETAIL ITEM PENJUALAN */}
      <DetailItemSalesModal
        isOpen={isEditRowModalOpen}
        onClose={() => setIsEditRowModalOpen(false)}
        item={editingRow}
        onSave={handleSaveDetailItem}
        mainCustomer={selectedCustomer}
      />
    </div>
  );
};
