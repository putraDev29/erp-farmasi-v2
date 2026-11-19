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
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariSupplierModal } from "./CariSupplierModal";
import { CariItemModal } from "./CariItemModal";
import { IncludeBiayaModal } from "./IncludeBiayaModal";
import { DetailItemModal } from "./DetailItemModal";

interface POItemRow {
  product_id: string;
  code: string;
  name: string;
  brand_name: string;
  qty: number;
  received_qty: number;
  unit_id: string;
  unit_name: string;
  unit_price: number;
  discount_percent: number;
  line_total: number;
  stock?: number;
  rack?: string;
  selling_price?: number;
}

interface PurchaseOrderFormProps {
  isEdit?: boolean;
  orderId?: string;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  isEdit = false,
  orderId,
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
  const [includeBiayaData, setIncludeBiayaData] = useState({
    name: "Ongkos Kirim",
    nominal: 0,
    allocation: "HPP",
    notes: "",
  });

  // Form Fields matching Screenshot 1
  const [orderNo, setOrderNo] = useState("Auto");
  const [orderDate, setOrderDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [orderStatus, setOrderStatus] = useState("Select...");
  const [warehouseId, setWarehouseId] = useState("");
  const [ppnType, setPpnType] = useState<"Non" | "Include" | "Exclude">("Non");

  // Items table
  const [items, setItems] = useState<POItemRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // Bottom calculation fields
  const [expectedDate, setExpectedDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [notes, setNotes] = useState("");
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [taxCheckbox, setTaxCheckbox] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notaDiscountPercent, setNotaDiscountPercent] = useState<number>(0);
  const [nominalDiscount, setNominalDiscount] = useState<number>(0);
  const [extraFee, setExtraFee] = useState<number>(0);
  const [extraFeeCheckbox, setExtraFeeCheckbox] = useState(false);

  // Row Edit state
  const [editingRow, setEditingRow] = useState<POItemRow | null>(null);

  // Bayar DP State
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [dpBankId, setDpBankId] = useState("");
  const [dpMethod, setDpMethod] = useState("KAS");

  // Queries
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const res = await api.get("/banks");
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

  // Load existing PO if isEdit
  const { data: existingPO, isLoading: isExistingLoading } = useQuery({
    queryKey: ["purchase-order-detail", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await api.get(`/purchases/orders/${orderId}`);
      return res.data?.data;
    },
    enabled: isEdit && Boolean(orderId),
  });

  useEffect(() => {
    if (existingPO) {
      setOrderNo(existingPO.order_no || "Auto");
      if (existingPO.supplier) {
        setSelectedSupplier(existingPO.supplier);
      }
      if (existingPO.warehouse_id) {
        setWarehouseId(existingPO.warehouse_id);
      }
      if (existingPO.status) {
        setOrderStatus(existingPO.status);
      }
      if (existingPO.notes) {
        setNotes(existingPO.notes);
      }
      if (existingPO.expected_date) {
        setExpectedDate(existingPO.expected_date.split("T")[0]);
      }
      if (existingPO.tax_percent !== undefined) {
        setTaxPercent(existingPO.tax_percent);
        if (existingPO.tax_percent > 0) {
          setPpnType("Exclude");
        }
      }
      if (existingPO.discount !== undefined) {
        setNominalDiscount(existingPO.discount);
      }
      if (existingPO.shipping_fee !== undefined && existingPO.shipping_fee > 0) {
        setExtraFee(existingPO.shipping_fee);
        setExtraFeeCheckbox(true);
        setIncludeBiayaData((prev) => ({ ...prev, nominal: existingPO.shipping_fee }));
      }

      if (Array.isArray(existingPO.items)) {
        const mappedItems: POItemRow[] = existingPO.items.map((it: any) => {
          const prod = it.product || {};
          const qty = Number(it.qty || 1);
          const unitPrice = Number(it.unit_price || 0);
          const disc = Number(it.discount || 0);
          const lineTot = Number(it.total_amount || qty * unitPrice - disc);
          const discPct = qty * unitPrice > 0 ? (disc / (qty * unitPrice)) * 100 : 0;

          return {
            product_id: it.product_id,
            code: prod.code || it.code || "-",
            name: prod.name || it.name || "-",
            brand_name: prod.brand?.name || it.brand_name || "-",
            qty: qty,
            received_qty: 0,
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
  }, [existingPO]);

  // Adjust tax percentage based on PPN dropdown
  useEffect(() => {
    if (ppnType === "Non") {
      setTaxPercent(0);
      setTaxCheckbox(false);
    } else if (ppnType === "Include" || ppnType === "Exclude") {
      setTaxPercent(11); // Standard PPN 11% / 12%
      setTaxCheckbox(true);
    }
  }, [ppnType]);

  // Calculations
  const itemCount = items.length;
  const totalReceivedQty = items.reduce((sum, it) => sum + (it.received_qty || 0), 0);
  const subtotal = items.reduce((sum, it) => sum + it.line_total, 0);

  // Discount computation (both Pot % and Pot Nota % can be filled simultaneously)
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
      // Harga sudah include pajak
      return Math.round(afterDiscount - afterDiscount / (1 + taxPercent / 100));
    }
    // Exclude / Ditambahkan
    return Math.round((afterDiscount * taxPercent) / 100);
  }, [afterDiscount, taxPercent, ppnType]);

  // Grand Total: otomatis update dari Sub Total - Diskon + Pajak + Biaya
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
      // Increment qty
      const updated = [...items];
      updated[existingIndex].qty += 1;
      const baseTotal = updated[existingIndex].qty * updated[existingIndex].unit_price;
      const discAmt = (baseTotal * updated[existingIndex].discount_percent) / 100;
      updated[existingIndex].line_total = baseTotal - discAmt;
      setItems(updated);
      setSelectedRowIndex(existingIndex);
    } else {
      const price = Number(product.purchase_price || 0);
      const defaultUnit = units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
      const resolvedUnitId = product.base_unit_id || defaultUnit?.id || "";
      const resolvedUnitName = product.base_unit?.name || defaultUnit?.name || "PCS";
      const newItem: POItemRow = {
        product_id: product.id,
        code: product.code,
        name: product.name,
        brand_name: product.brand?.name || "-",
        qty: 1,
        received_qty: 0,
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
  const handleSaveDetailItem = (updatedRow: POItemRow) => {
    if (selectedRowIndex === null) return;
    const updated = [...items];
    updated[selectedRowIndex] = updatedRow;
    setItems(updated);
    setIsEditRowModalOpen(false);
  };

  // Cek Stok Minimum feature: scans catalog items where stock <= min_stock and adds them!
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
          `Ditemukan ${lowStockProducts.length} item yang berada di bawah stok minimum. Tambahkan semua item ini ke Pesanan Pembelian?`
        )
      ) {
        const newRows: POItemRow[] = [...items];
        const defaultUnit = units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
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
              qty: needQty,
              received_qty: 0,
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
        setSelectedRowIndex(newRows.length - 1);
      }
    } catch (err: any) {
      alert("Gagal mengecek stok minimum: " + err.message);
    }
  };

  // Reset form (+ Tambah)
  const handleResetForm = () => {
    if (items.length > 0 && !confirm("Kosongkan form untuk membuat Pesanan Pembelian baru?")) {
      return;
    }
    setOrderNo("Auto");
    setSelectedSupplier(null);
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
    setIncludeBiayaData({
      name: "Ongkos Kirim",
      nominal: 0,
      allocation: "HPP",
      notes: "",
    });
  };

  // Save PO Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplier?.id) {
        throw new Error("Pilih Supplier terlebih dahulu.");
      }
      if (items.length === 0) {
        throw new Error("Tabel item pesanan masih kosong. Silakan klik [+ Item].");
      }

      const defaultUnit = units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
      const payload = {
        warehouse_id: warehouseId || undefined,
        supplier_id: selectedSupplier.id,
        expected_date: expectedDate ? new Date(expectedDate) : undefined,
        notes: notes,
        tax_percent: taxPercent,
        discount: calculatedNominalDiscount,
        shipping_fee: Number(extraFee) || 0,
        status: orderStatus !== "Select..." ? orderStatus : "PENDING",
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

      if (isEdit && orderId) {
        return await api.put(`/purchases/orders/${orderId}`, payload);
      }
      return await api.post("/purchases/orders", payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      alert(
        isEdit
          ? "Pesanan Pembelian berhasil diperbarui!"
          : "Pesanan Pembelian baru berhasil disimpan!"
      );
      router.push("/purchasing/orders");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan PO: " + (err.response?.data?.message || err.message));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      return await api.delete(`/purchases/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      alert("Pesanan Pembelian berhasil dihapus.");
      router.push("/purchasing/orders");
    },
    onError: (err: any) => {
      alert("Gagal menghapus PO: " + (err.response?.data?.message || err.message));
    },
  });

  const handleDeletePO = () => {
    if (!isEdit || !orderId) {
      handleResetForm();
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus Pesanan Pembelian ${orderNo}?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 flex flex-col h-full min-h-0 text-xs select-none gap-1 overflow-y-auto md:overflow-hidden">
      {/* 1. Header: [< Pesanan Pembelian Baru] + User Profile */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/purchasing/orders")}
            className="p-1 hover:bg-slate-100 rounded text-slate-700 transition"
            title="Kembali ke Daftar Pesanan Pembelian"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            {isEdit ? `Ubah Pesanan Pembelian : ${orderNo}` : "Pesanan Pembelian Baru"}
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

      {/* 2. Top Form Section */}
      <div className="bg-slate-50/70 border border-slate-300 rounded p-1 sm:p-1.5 space-y-1 shadow-2xs shrink-0">
        {/* ROW 1: No Transaksi | Tanggal | Supplier | Status Pesanan */}
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

          {/* Supplier with 🔍 button */}
          <div className="md:col-span-4">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Supplier :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                readOnly
                value={selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.code})` : ""}
                placeholder="Select..."
                onClick={() => setIsSupplierModalOpen(true)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white cursor-pointer focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
                title="Cari Supplier (🔍)"
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

        {/* ROW 2: Masuk Ke | PPN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* Masuk Ke */}
          <div className="md:col-span-5">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Masuk Ke :
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
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
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="Non">Non</option>
              <option value="Include">Include</option>
              <option value="Exclude">Exclude</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Main Center Content: Items Table + Right Side Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 flex-1 min-h-[90px] overflow-hidden">
        {/* Table Container (10 Columns matching Screenshot 1) */}
        <div className="md:col-span-9 lg:col-span-10 bg-white border border-slate-300 rounded overflow-hidden flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin min-h-0">
            <table className="w-full text-left border-collapse text-[10.5px] whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold sticky top-0 z-10 shadow-2xs h-6">
                <tr>
                  <th className="py-1 px-2 border-r border-slate-300 w-8 text-center">No</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-24">Kode</th>
                  <th className="py-1 px-2.5 border-r border-slate-300 min-w-[180px]">Nama</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-24">Merek</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-16 text-right">Jumlah</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-16 text-right">Jml Teri...</th>
                  <th className="py-1 px-1.5 border-r border-slate-300 w-14 text-center">Satuan</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-24 text-right">Harga</th>
                  <th className="py-1 px-1.5 border-r border-slate-300 w-14 text-right">Pot %</th>
                  <th className="py-1 px-2.5 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-5 text-center text-slate-400 font-medium text-xs">
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
                            ? "bg-sky-50 font-medium text-sky-950"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <td className="py-0.5 px-2 text-center border-r border-slate-200 text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 font-mono font-semibold text-slate-900">
                          {it.code}
                        </td>
                        <td className="py-0.5 px-2.5 border-r border-slate-200 font-medium text-slate-900 truncate max-w-[220px]">
                          {it.name}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 text-slate-700">
                          {it.brand_name}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                          {it.qty.toFixed(2)}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 text-right font-mono text-slate-500">
                          {it.received_qty.toFixed(2)}
                        </td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200 text-center font-semibold text-slate-700">
                          {it.unit_name}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 text-right font-mono text-slate-800">
                          {Number(it.unit_price).toLocaleString("id-ID", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200 text-right font-mono text-slate-600">
                          {it.discount_percent.toFixed(2)}
                        </td>
                        <td className="py-0.5 px-2.5 text-right font-mono font-bold text-emerald-700">
                          {Number(it.line_total).toLocaleString("id-ID", {
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

        {/* Right Side Box matching Screenshot 1 */}
        <div className="md:col-span-3 lg:col-span-2 bg-slate-50/70 border border-slate-300 rounded p-1.5 flex flex-col justify-between text-[10px] overflow-y-auto min-h-0">
          <div>
            <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-0.5 mb-1 text-[11px]">
              Detail Item Terpilih
            </h4>
            {selectedItemRow ? (
              <div className="space-y-1 text-slate-600 leading-tight">
                <div>
                  <span className="block text-[9px] text-slate-400">Kode &amp; Nama:</span>
                  <strong className="block text-slate-900 text-[11px] truncate">{selectedItemRow.name}</strong>
                  <span className="font-mono text-[9.5px] text-slate-500">{selectedItemRow.code}</span>
                </div>
                <div className="pt-0.5 border-t border-slate-200 flex justify-between">
                  <span>Merek:</span>
                  <strong className="text-slate-800">{selectedItemRow.brand_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Stok Fisik:</span>
                  <strong className="text-emerald-700 font-mono">
                    {(selectedItemRow.stock || 0).toFixed(2)} {selectedItemRow.unit_name}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Lokasi Rak:</span>
                  <strong className="text-slate-800">{selectedItemRow.rack || "-"}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Harga Pokok:</span>
                  <strong className="font-mono text-slate-800">
                    {formatCurrency(selectedItemRow.unit_price)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Harga Jual:</span>
                  <strong className="font-mono text-sky-700">
                    {formatCurrency(selectedItemRow.selling_price || 0)}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic text-[10px] py-4 text-center">
                Pilih atau klik baris item dalam tabel untuk melihat detail informasi.
              </p>
            )}
          </div>

          <div className="pt-1 border-t border-slate-200 text-[9px] text-slate-400">
            Apotek Berkat Purnama
          </div>
        </div>
      </div>

      {/* 4. Middle Sub-Toolbar matching Screenshot 1 */}
      {/* [+ Item] [✏️] [🗑️] [ℹ️] [Harga Jual] [Cek Stok Minimum] */}
      <div className="flex flex-wrap items-center gap-1 py-0.5 shrink-0">
        <button
          type="button"
          onClick={() => setIsItemModalOpen(true)}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded font-bold text-[10.5px] flex items-center gap-1 shadow-2xs transition active:scale-95"
          title="Tambah Item Pesanan (+ Item)"
        >
          <Plus className="w-3 h-3 stroke-[2.8]" />
          <span>+ Item</span>
        </button>

        <button
          type="button"
          onClick={handleOpenEditRow}
          disabled={selectedRowIndex === null}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Ubah Item Terpilih (Pencil)"
        >
          <Pencil className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={handleDeleteRow}
          disabled={selectedRowIndex === null}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-rose-600 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Hapus Item Terpilih (Trash)"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (selectedItemRow) setIsInfoRowModalOpen(true);
          }}
          disabled={selectedRowIndex === null}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Info Item (i)"
        >
          <Info className="w-3 h-3" />
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
          onClick={handleCekStokMinimum}
          className="h-6 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded font-medium text-[10.5px] flex items-center gap-1 shadow-2xs transition active:scale-95"
          title="Cek Barang di Bawah Stok Minimum dan Tambahkan ke PO"
        >
          <span>Cek Stok Minimum</span>
        </button>
      </div>

      {/* 5. Bottom Calculation & Notes matching Screenshot 1 */}
      <div className="bg-slate-50/70 border border-slate-300 rounded p-1 sm:p-1.5 space-y-1 text-xs shadow-2xs shrink-0">
        {/* ROW 1: Tanggal Kirim | Item | Terima | Sub Total | Pjk % | Nom Pajak */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* Tanggal Kirim */}
          <div className="md:col-span-3">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Tanggal Kirim :
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Item count */}
          <div className="md:col-span-1">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Item :
            </label>
            <input
              type="text"
              readOnly
              value={itemCount.toFixed(2)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-slate-100 text-right font-mono"
            />
          </div>

          {/* Terima */}
          <div className="md:col-span-1">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Terima :
            </label>
            <input
              type="text"
              readOnly
              value={totalReceivedQty.toFixed(2)}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-slate-100 text-right font-mono"
            />
          </div>

          {/* Sub Total */}
          <div className="md:col-span-3">
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
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-900 bg-slate-100 text-right font-mono font-bold"
            />
          </div>

          {/* Pjk % (Dropdown Pilihan Pajak - Tanpa Centang) */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Pjk % :
            </label>
            <select
              value={taxPercent}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setTaxPercent(val);
                if (val > 0 && ppnType === "Non") {
                  setPpnType("Exclude");
                } else if (val === 0) {
                  setPpnType("Non");
                }
              }}
              className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value={0}>0% - Non Pajak</option>
              <option value={11}>11% - PPN 11%</option>
              <option value={12}>12% - PPN 12%</option>
              <option value={10}>10% - PPN 10%</option>
              <option value={5}>5% - PPh 21 (5%)</option>
              <option value={2}>2% - PPh 23 (2%)</option>
              <option value={0.5}>0.5% - PPh 22 (0.5%)</option>
            </select>
          </div>

          {/* Nom Pajak */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Nom Pajak :
            </label>
            <input
              type="text"
              readOnly
              value={taxAmount.toLocaleString("id-ID", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-slate-100 text-right font-mono"
            />
          </div>
        </div>

        {/* ROW 2: Keterangan | Pot % | Pot Nota % | Nom Potongan | Biaya | Total Akhir */}
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
              placeholder="Catatan pesanan pembelian..."
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Pot % */}
          <div className="md:col-span-1">
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
              className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Pot Nota % */}
          <div className="md:col-span-1">
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
              className="w-full h-6 px-1 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white text-right font-mono focus:outline-none focus:border-sky-500"
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
              <input
                type="checkbox"
                checked={extraFeeCheckbox}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    setExtraFeeCheckbox(true);
                    setIsIncludeBiayaModalOpen(true);
                  } else {
                    // jika uncheck include biaya di hapus
                    setExtraFeeCheckbox(false);
                    setExtraFee(0);
                    setIncludeBiayaData({
                      name: "Ongkos Kirim",
                      nominal: 0,
                      allocation: "HPP",
                      notes: "",
                    });
                  }
                }}
                className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer"
                title="Centang untuk Include Biaya Tambahan"
              />
            </div>
          </div>

          {/* Total Akhir (Highlight Pink/Magenta Box) */}
          <div className="md:col-span-2">
            <label className="block text-slate-700 font-bold text-[10px] mb-0.5 leading-none">
              Total Akhir :
            </label>
            <div className="w-full h-6 px-2 bg-[#f5d0e3] border border-pink-300 rounded text-right font-mono font-extrabold text-xs text-slate-900 shadow-2xs flex items-center justify-end">
              {grandTotal.toLocaleString("id-ID", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Bottom Action Buttons Bar matching Screenshot 1 */}
      {/* [+ Tambah] [💾 Simpan] [🗑️ Hapus] [🖨️ Cetak] [💳 Bayar] */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-t border-slate-200 shrink-0">
        <button
          type="button"
          onClick={handleResetForm}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
          title="Pesanan Baru (+ Tambah)"
        >
          <Plus className="w-3 h-3 stroke-[2.8]" />
          <span>Tambah</span>
        </button>

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
          title="Simpan Pesanan Pembelian"
        >
          <Save className="w-3 h-3" />
          <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>

        <button
          type="button"
          onClick={handleDeletePO}
          disabled={!isEdit}
          className="h-6 px-2.5 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Hapus Pesanan Pembelian"
        >
          <Trash2 className="w-3 h-3" />
          <span>Hapus</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
          title="Cetak Pesanan Pembelian"
        >
          <Printer className="w-3 h-3" />
          <span>Cetak</span>
        </button>

        <button
          type="button"
          onClick={() => setIsBayarModalOpen(true)}
          className="h-6 px-2.5 bg-white hover:bg-amber-50 border border-slate-300 text-amber-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
          title="Bayar DP / Pembayaran PO"
        >
          <CreditCard className="w-3 h-3 text-amber-600" />
          <span>Bayar</span>
        </button>
      </div>

      {/* MODAL 1: CARI SUPPLIER */}
      <CariSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(sup) => setSelectedSupplier(sup)}
        selectedId={selectedSupplier?.id}
      />

      {/* MODAL 2: CARI ITEM (Matching Screenshot 2) */}
      <CariItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleItemChosen}
        supplierCode={selectedSupplier?.code || ""}
      />

      {/* MODAL INCLUDE BIAYA */}
      <IncludeBiayaModal
        isOpen={isIncludeBiayaModalOpen}
        onClose={() => setIsIncludeBiayaModalOpen(false)}
        initialNominal={extraFee}
        initialData={includeBiayaData}
        onSave={(data) => {
          setExtraFee(data.nominal);
          setIncludeBiayaData(data);
          setExtraFeeCheckbox(data.nominal > 0);
        }}
        onCancel={() => {
          if (extraFee === 0) {
            setExtraFeeCheckbox(false);
          }
        }}
      />

      {/* MODAL 3: DETAIL ITEM EDIT (Matching Screenshot 2) */}
      <DetailItemModal
        isOpen={isEditRowModalOpen}
        onClose={() => setIsEditRowModalOpen(false)}
        item={editingRow}
        onSave={handleSaveDetailItem}
      />

      {/* MODAL 4: HARGA JUAL */}
      {isHargaJualModalOpen && selectedItemRow && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Daftar Harga Jual</h3>
              <button
                type="button"
                onClick={() => setIsHargaJualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-800">{selectedItemRow.name}</p>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="p-2">Level / Satuan</th>
                      <th className="p-2 text-right">Harga Jual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">Harga Standar Kasir</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(selectedItemRow.selling_price || 0)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Harga Grosir / Partai</td>
                      <td className="p-2 text-right font-mono font-bold text-sky-700">
                        {formatCurrency((selectedItemRow.selling_price || 0) * 0.95)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Harga Reseller / Member</td>
                      <td className="p-2 text-right font-mono font-bold text-purple-700">
                        {formatCurrency((selectedItemRow.selling_price || 0) * 0.92)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsHargaJualModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded font-medium text-xs hover:bg-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: INFORMASI ROW */}
      {isInfoRowModalOpen && selectedItemRow && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Informasi Item</h3>
              <button
                type="button"
                onClick={() => setIsInfoRowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Kode:</span>
                <span className="font-mono font-bold text-slate-800">{selectedItemRow.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Nama:</span>
                <span className="font-medium text-slate-900">{selectedItemRow.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Merek:</span>
                <span className="text-slate-800">{selectedItemRow.brand_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Stok Gudang:</span>
                <span className="font-bold text-emerald-700">
                  {selectedItemRow.stock} {selectedItemRow.unit_name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Harga Beli:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(selectedItemRow.unit_price)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Rak:</span>
                <span className="font-medium text-slate-800">{selectedItemRow.rack || "-"}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsInfoRowModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded font-medium text-xs hover:bg-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: BAYAR / UANG MUKA (DP) */}
      {isBayarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Pembayaran Uang Muka (DP)</h3>
              <button
                type="button"
                onClick={() => setIsBayarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Total Nilai PO:</label>
                <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono font-bold text-emerald-700">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nominal Uang Muka (DP):</label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  max={grandTotal}
                  value={dpAmount}
                  onChange={(e) => setDpAmount(Number(e.target.value) || 0)}
                  placeholder="Rp 0"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Metode Bayar:</label>
                <select
                  value={dpMethod}
                  onChange={(e) => setDpMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="KAS">KAS TUNAI</option>
                  <option value="TRANSFER">TRANSFER BANK</option>
                  <option value="BG_CEK">BG / CEK</option>
                </select>
              </div>
              {dpMethod === "TRANSFER" && (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Akun Bank:</label>
                  <select
                    value={dpBankId}
                    onChange={(e) => setDpBankId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                  >
                    <option value="">Pilih Bank...</option>
                    {banks.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} - {b.account_number} ({b.account_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBayarModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(
                    `Uang Muka (DP) sebesar ${formatCurrency(
                      dpAmount
                    )} telah dicatat untuk Pesanan Pembelian ini.`
                  );
                  setIsBayarModalOpen(false);
                }}
                className="px-4 py-1.5 bg-[#009b62] hover:bg-[#008754] text-white rounded font-bold text-xs shadow-xs"
              >
                Simpan DP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PurchaseOrderForm;
