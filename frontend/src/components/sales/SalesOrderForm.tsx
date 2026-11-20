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
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariObatSalesModal } from "./CariObatSalesModal";
import { CariPelangganModal } from "./CariPelangganModal";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";

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
  stock?: number;
  rack?: string;
  drug_classification?: string;
  distribution_channel?: string;
  selling_price?: number;
  wholesale_price?: number;
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

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEditRowModalOpen, setIsEditRowModalOpen] = useState(false);
  const [isHargaJualModalOpen, setIsHargaJualModalOpen] = useState(false);
  const [isInfoRowModalOpen, setIsInfoRowModalOpen] = useState(false);
  const [isPbfDocModalOpen, setIsPbfDocModalOpen] = useState(false);
  const [pbfDocCount, setPbfDocCount] = useState(0);

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

  const { data: units = [] } = useQuery({
    queryKey: ["units-so-select"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
  });

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
      if (existingSO.customer_sp_type) setSpType(existingSO.customer_sp_type);
      if (existingSO.customer_sp_number) setSpNumber(existingSO.customer_sp_number);
      if (existingSO.pbf_origin_invoice_no) setPbfOriginInvoiceNo(existingSO.pbf_origin_invoice_no);
      if (existingSO.tax_percent !== undefined) {
        setTaxPercent(existingSO.tax_percent);
        if (existingSO.tax_percent > 0) {
          setPpnType("Exclude");
          setTaxCheckbox(true);
        }
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
          };
        });
        setItems(mappedItems);
        if (mappedItems.length > 0) setSelectedRowIndex(0);
      }
    }
  }, [existingSO]);

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
  const totalQty = items.reduce((sum, it) => sum + (it.qty || 0), 0);
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
    const unitName = prod.base_unit?.name || prod.unit_name || "PCS";
    const unitId = prod.base_unit_id || prod.unit_id || (units[0]?.id || "");
    const brand = prod.brand?.name || prod.brand_name || prod.manufacturer || "-";

    if (existingIndex >= 0) {
      const updated = [...items];
      const cur = updated[existingIndex];
      const newQty = cur.qty + 1;
      const lineDisc = (cur.unit_price * (cur.discount_percent / 100)) * newQty;
      cur.qty = newQty;
      cur.line_total = cur.unit_price * newQty - lineDisc;
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
        throw new Error("Tabel item pesanan masih kosong. Silakan klik [+ + Item].");
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
        customer_id: selectedCustomer.id,
        notes: notes,
        tax_percent: ppnType === "Non" ? 0 : taxPercent,
        discount: calculatedNominalDiscount,
        status: orderStatus !== "Select..." ? orderStatus : "PENDING",
        customer_sp_number: spNumber,
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
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
                title="Cari Pelanggan (🔍)"
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
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
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

        {/* ROW 2: Masuk Ke | PPN | Jenis SP Farmasi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* Gudang */}
          <div className="md:col-span-5">
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

          {/* PPN */}
          <div className="md:col-span-3">
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
          <div className="md:col-span-4">
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
                <th className="py-0.5 px-2.5 border-r border-slate-200 text-right w-24">Harga</th>
                <th className="py-0.5 px-2 border-r border-slate-200 text-center w-12">Pot %</th>
                <th className="py-0.5 px-2.5 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 font-medium">
                    No data
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const isSelected = selectedRowIndex === idx;
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
                      {/* Jml Terkirim / Terima */}
                      <td className="py-0.5 px-2 border-r border-slate-100 text-right text-slate-500">
                        0.00
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
                          className="w-20 h-5 px-1 border border-slate-300 rounded text-right text-[11px] bg-white focus:outline-none focus:border-sky-500"
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
          onClick={() => setIsItemModalOpen(true)}
          className="h-6 px-3 bg-[#e2f8ec] hover:bg-[#c9f1dc] text-[#00a862] border border-[#a2e8c2] font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <span className="text-sm font-bold leading-none">+ +</span>
          <span>Item</span>
        </button>

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

          {/* 💾 Simpan */}
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>

          {/* 🗑 Hapus */}
          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-3 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus</span>
          </button>

          {/* 🖨 Cetak */}
          <button
            type="button"
            onClick={() => alert("Mencetak Surat Pesanan Penjualan...")}
            className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
          >
            <Printer className="w-3 h-3" />
            <span>Cetak</span>
          </button>

          {/* 💳 Bayar */}
          <button
            type="button"
            onClick={() => alert("Pesanan Penjualan ini belum menjadi Faktur Penjualan.")}
            className="h-6 px-3 bg-white hover:bg-amber-50 border border-amber-400 text-amber-700 font-bold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
          >
            <CreditCard className="w-3 h-3 text-amber-600" />
            <span>Bayar</span>
          </button>
        </div>

        {/* Status Pesanan Indicator */}
        <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-semibold">
          <span>Status Pesanan:</span>
          <span
            className={`font-bold ${
              orderStatus === "SELESAI" ? "text-emerald-700" : "text-slate-800 uppercase"
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

      {/* MODAL 5: INFO DETAIL ITEM */}
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
    </div>
  );
};
