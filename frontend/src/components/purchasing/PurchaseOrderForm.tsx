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
  Calculator,
  Undo2,
  PackageCheck,
  Users,
  FileText,
  FileCheck,
  CheckCircle2,
  CheckSquare,
  ShoppingCart,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { CariSupplierModal } from "./CariSupplierModal";
import { CariItemModal } from "./CariItemModal";
import { IncludeBiayaModal } from "./IncludeBiayaModal";
import { DetailItemModal } from "./DetailItemModal";
import { AlokasiSupplierModal, SupplierAllocationRow } from "./AlokasiSupplierModal";
import { TerimaBarangPOModal } from "./TerimaBarangPOModal";
import { DokumenSPModal } from "./DokumenSPModal";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";
import { UploadDokumenPBFModal } from "./UploadDokumenPBFModal";

interface POItemRow {
  id?: string;
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
  supplier_id?: string;
  supplier_name?: string;
  stock?: number;
  rack?: string;
  selling_price?: number;
  is_fulfilled?: boolean;
  purchase_id?: string;
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
  const [isDokumenSPOpen, setIsDokumenSPOpen] = useState(false);
  const [isUploadPbfDocOpen, setIsUploadPbfDocOpen] = useState(false);
  const [pbfDocUrl, setPbfDocUrl] = useState("");
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [isMasterCostModalOpen, setIsMasterCostModalOpen] = useState(false);
  const [isTerimaModalOpen, setIsTerimaModalOpen] = useState(false);
  const [isIncludeBiayaModalOpen, setIsIncludeBiayaModalOpen] = useState(false);
  const [selectedItemIndices, setSelectedItemIndices] = useState<number[]>([]);
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Multi-Supplier Allocation Modal state
  const [isAlokasiModalOpen, setIsAlokasiModalOpen] = useState(false);
  const [alokasiTargetProduct, setAlokasiTargetProduct] = useState<any | null>(null);
  const [alokasiInitialRows, setAlokasiInitialRows] = useState<SupplierAllocationRow[]>([]);
  const [alokasiTotalQty, setAlokasiTotalQty] = useState<number>(1);
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

  // PBF Surat Pesanan (SP) Fields
  const [spType, setSpType] = useState("REGULER");
  const [spNumber, setSpNumber] = useState("");
  const [apjName, setApjName] = useState("apt. Rahmat Hidayat, S.Farm.");
  const [apjSipaNo, setApjSipaNo] = useState("19920101/SIPA_61.71/2022/2048");
  const [isPbfDocModalOpen, setIsPbfDocModalOpen] = useState(false);
  const [pbfDocCount, setPbfDocCount] = useState(0);

  // Persistent / Draft Purchase Order ID for linking documents before creation
  const [draftOrderId] = useState<string>(() => {
    if (orderId) return orderId;
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "00000000-0000-0000-0000-000000000000";
  });

  // Query linked documents for this PO
  const { data: poDocs = [], refetch: refetchPODocs } = useQuery({
    queryKey: ["purchase-order-docs", draftOrderId],
    queryFn: async () => {
      const res = await api.get(`/documents?entity_type=purchase_order&entity_id=${draftOrderId}`);
      return res.data?.data || [];
    },
    enabled: !!draftOrderId,
  });

  useEffect(() => {
    if (poDocs) {
      setPbfDocCount(poDocs.length);
    }
  }, [poDocs]);

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
  const [deliveryMethod, setDeliveryMethod] = useState<"DIKIRIM" | "DIAMBIL">("DIKIRIM");
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [taxCheckbox, setTaxCheckbox] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notaDiscountPercent, setNotaDiscountPercent] = useState<number>(0);
  const [nominalDiscount, setNominalDiscount] = useState<number>(0);
  const [extraFee, setExtraFee] = useState<number>(0);
  const [extraFeeCheckbox, setExtraFeeCheckbox] = useState(false);

  // Row Edit state
  const [editingRow, setEditingRow] = useState<POItemRow | null>(null);

  // Bayar State (Sesuai Modal Pembayaran Faktur Pembelian)
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [cashAccountId, setCashAccountId] = useState("");
  const [bayarTunai, setBayarTunai] = useState<number>(0);
  const [bayarDeposit, setBayarDeposit] = useState<number>(0);
  const [bayarKredit, setBayarKredit] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<string>("UNPAID");
  const [isPrintAfterSave, setIsPrintAfterSave] = useState(false);

  // Format number to Rupiah string e.g. "734.965"
  const formatRupiahNumber = (num: number): string => {
    if (!num && num !== 0) return "0";
    if (Math.round(num) === num) {
      return num.toLocaleString("id-ID");
    }
    return num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Parse Rupiah string e.g. "734.965" -> 734965
  const parseRupiahNumber = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace(/[^0-9,-]/g, "").replace(",", ".");
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  const handleDpChange = (val: number) => {
    setDpAmount(val);
    let newBayarTunai = bayarTunai;
    if (bayarTunai === grandTotal || (val > 0 && bayarTunai + val > grandTotal)) {
      newBayarTunai = 0;
      setBayarTunai(0);
    }
    const totalPaid = val + newBayarTunai + bayarDeposit;
    const sisa = Math.max(0, grandTotal - totalPaid);
    setBayarKredit(sisa);
  };

  const handleBayarTunaiChange = (val: number) => {
    setBayarTunai(val);
    const totalPaid = dpAmount + val + bayarDeposit;
    const sisa = Math.max(0, grandTotal - totalPaid);
    setBayarKredit(sisa);
  };

  const handleBayarDepositChange = (val: number) => {
    setBayarDeposit(val);
    const totalPaid = dpAmount + bayarTunai + val;
    const sisa = Math.max(0, grandTotal - totalPaid);
    setBayarKredit(sisa);
  };

  const handleBayarKreditChange = (val: number) => {
    setBayarKredit(val);
    const net = Math.max(0, grandTotal - dpAmount - bayarDeposit - val);
    setBayarTunai(net);
  };

  // Queries
  const { data: accountsList = [] } = useQuery({
    queryKey: ["cash-accounts-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/accounting/accounts");
        return (
          res.data?.data?.filter(
            (a: any) =>
              !a.is_header &&
              (a.subtype === "CASH_BANK" || (a.code && a.code.startsWith("1-11")))
          ) || []
        );
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    if (accountsList.length > 0 && !cashAccountId) {
      const defaultCash =
        accountsList.find((a: any) => a.code === "1-1121") || accountsList[0];
      setCashAccountId(defaultCash?.id || "");
    }
  }, [accountsList, cashAccountId]);
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

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
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

  // Status apakah PO sudah selesai (semua item terpenuhi / status selesai) -> Transaksi Terkunci
  const isCompleted = Boolean(
    existingPO && (
      existingPO.status === "COMPLETED" ||
      existingPO.status === "SELESAI" ||
      existingPO.process_status === "Selesai" ||
      orderStatus === "SELESAI" ||
      orderStatus === "COMPLETED"
    )
  );

  // Status apakah pembayaran sudah pernah disubmit (DP / Sebagian / Lunas / Tempo kredit)
  // Sesuai aturan: jika pembayaran sudah disubmit, tombol bayar didisable karena sisa hutang muncul di menu Bayar Hutang
  const isPaymentSubmitted = Boolean(
    (existingPO && (
      existingPO.payment_status === "PAID" ||
      existingPO.payment_status === "PARTIAL" ||
      existingPO.payment_status === "DP" ||
      existingPO.payment_status === "TEMPO" ||
      existingPO.payment_status === "KREDIT" ||
      (Number(existingPO.paid_amount) || 0) > 0 ||
      (Number(existingPO.dp_amount) || 0) > 0
    )) ||
    (paymentStatus === "PAID" ||
     paymentStatus === "PARTIAL" ||
     paymentStatus === "DP" ||
     paymentStatus === "TEMPO" ||
     paymentStatus === "KREDIT")
  );

  useEffect(() => {
    if (existingPO) {
      setOrderNo(existingPO.order_no || "Auto");
      if (existingPO.date) {
        const d = new Date(existingPO.date);
        const pad = (n: number) => String(n).padStart(2, "0");
        setOrderDate(
          `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        );
      }
      if (existingPO.supplier) {
        setSelectedSupplier(existingPO.supplier);
      } else if (existingPO.supplier_id && suppliers.length > 0) {
        const foundS = suppliers.find((s: any) => s.id === existingPO.supplier_id);
        if (foundS) setSelectedSupplier(foundS);
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
      if (existingPO.delivery_method === "DIAMBIL" || existingPO.delivery_method === "DIKIRIM") {
        setDeliveryMethod(existingPO.delivery_method);
      }
      if (existingPO.sp_type) setSpType(existingPO.sp_type);
      if (existingPO.sp_number) setSpNumber(existingPO.sp_number);
      if (existingPO.apj_name) setApjName(existingPO.apj_name);
      if (existingPO.apj_sipa_no) setApjSipaNo(existingPO.apj_sipa_no);
      if (existingPO.pbf_document_url) setPbfDocUrl(existingPO.pbf_document_url);
      if (existingPO.expected_date) {
        const expStr = String(existingPO.expected_date);
        setExpectedDate(expStr.includes("T") ? expStr.split("T")[0] : expStr.substring(0, 10));
      }
      if (existingPO.dp_amount !== undefined) setDpAmount(Number(existingPO.dp_amount));
      if (existingPO.paid_amount !== undefined) {
        const pAmount = Number(existingPO.paid_amount);
        const dp = Number(existingPO.dp_amount || 0);
        setBayarTunai(Math.max(0, pAmount - dp));
      }
      if (existingPO.remaining_amount !== undefined) setBayarKredit(Number(existingPO.remaining_amount));
      if (existingPO.payment_status) setPaymentStatus(existingPO.payment_status);
      if (existingPO.cash_account_id) setCashAccountId(existingPO.cash_account_id);
      if (existingPO.tax_percent !== undefined) {
        const tp = Number(existingPO.tax_percent) || 0;
        setTaxPercent(tp);
        setTaxCheckbox(tp > 0);
        setPpnType(tp > 0 ? "Exclude" : "Non");
      }
      if (existingPO.discount !== undefined) {
        setNominalDiscount(Number(existingPO.discount) || 0);
      }
      if (existingPO.shipping_fee !== undefined) {
        const sf = Number(existingPO.shipping_fee) || 0;
        setExtraFee(sf);
        setExtraFeeCheckbox(sf > 0);
        if (sf > 0) {
          setIncludeBiayaData((prev) => ({ ...prev, nominal: sf }));
        }
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
            id: it.id,
            product_id: it.product_id,
            code: prod.code || it.code || "-",
            name: prod.name || it.name || "-",
            brand_name: prod.brand?.name || it.brand_name || "-",
            qty: qty,
            received_qty: Number(it.received_qty || 0),
            unit_id: it.unit_id || prod.base_unit_id,
            unit_name: it.unit?.name || prod.base_unit?.name || "PCS",
            unit_price: unitPrice,
            discount_percent: Math.round(discPct * 100) / 100,
            line_total: lineTot,
            supplier_id: it.supplier_id || existingPO.supplier_id,
            supplier_name: it.supplier?.name || existingPO.supplier?.name || "-",
            stock: prod.stock || 0,
            rack: prod.rack || "-",
            selling_price: prod.selling_price || 0,
            is_fulfilled: Boolean(it.is_fulfilled),
            purchase_id: it.purchase_id,
          };
        });
        setItems(mappedItems);
        if (mappedItems.length > 0) setSelectedRowIndex(0);
      }
    }
  }, [existingPO, suppliers]);

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
    const currentSupplierId = selectedSupplier?.id || "";
    // Only combine if it's the exact same product AND same supplier
    const existingIndex = items.findIndex(
      (it) =>
        it.product_id === product.id &&
        (it.supplier_id === currentSupplierId || (!it.supplier_id && !currentSupplierId))
    );

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
        supplier_id: selectedSupplier?.id,
        supplier_name: selectedSupplier?.name,
        stock: Number(product.stock ?? product.total_stock ?? 0),
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
    if (items[selectedRowIndex]?.is_fulfilled) {
      alert("Item ini sudah dipindahkan ke Pembelian dan tidak dapat dihapus.");
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
    if (items[selectedRowIndex]?.is_fulfilled) {
      alert("Item ini sudah terpenuhi dan dipindahkan ke Pembelian (tidak dapat diubah lagi).");
      return;
    }
    setEditingRow({ ...items[selectedRowIndex] });
    setIsEditRowModalOpen(true);
  };

  // Save row edit (Detail Item with multi-supplier split support)
  const handleSaveDetailItem = (updatedRow: POItemRow, splitRow?: POItemRow) => {
    if (selectedRowIndex === null) return;
    const updated = [...items];
    updated[selectedRowIndex] = updatedRow;
    if (splitRow) {
      // Sisipkan baris supplier tambahan tepat di bawahnya
      updated.splice(selectedRowIndex + 1, 0, splitRow);
    }
    setItems(updated);
    setIsEditRowModalOpen(false);
  };

  // Open Multi-Supplier Allocation Modal
  const handleOpenAlokasiSupplier = () => {
    if (selectedRowIndex === null || !items[selectedRowIndex]) {
      alert("Pilih item obat dalam tabel yang ingin dialokasikan ke supplier.");
      return;
    }

    const targetItem = items[selectedRowIndex];
    // Find all rows in items that belong to the SAME product_id
    const matchingRows = items.filter((it) => it.product_id === targetItem.product_id);
    const totalQty = matchingRows.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

    const initialAllocations: SupplierAllocationRow[] = matchingRows.map((it) => ({
      supplier_id: it.supplier_id || selectedSupplier?.id || "",
      supplier_name: it.supplier_name || selectedSupplier?.name || "Supplier Utama",
      qty: it.qty,
      unit_price: it.unit_price,
      discount_percent: it.discount_percent,
    }));

    setAlokasiTargetProduct({
      product_id: targetItem.product_id,
      code: targetItem.code,
      name: targetItem.name,
      unit_id: targetItem.unit_id,
      unit_name: targetItem.unit_name,
      unit_price: targetItem.unit_price,
      discount_percent: targetItem.discount_percent,
    });
    setAlokasiTotalQty(totalQty);
    setAlokasiInitialRows(initialAllocations);
    setIsAlokasiModalOpen(true);
  };

  // Save Multi-Supplier Allocation (Replaces all rows of this product with the new allocation)
  const handleSaveAlokasi = (allocations: SupplierAllocationRow[], newTotalQty: number) => {
    if (!alokasiTargetProduct) return;

    const targetPid = alokasiTargetProduct.product_id;
    const firstIdx = items.findIndex((it) => it.product_id === targetPid);
    if (firstIdx === -1) return;

    const baseItem = items[firstIdx];

    // Generate the new rows for each supplier allocation
    const newRows: POItemRow[] = allocations.map((alloc, aIdx) => {
      const uPrice = Number(alloc.unit_price) || Number(baseItem.unit_price) || 0;
      const dPct = Number(alloc.discount_percent) || Number(baseItem.discount_percent) || 0;
      const lineTot = alloc.qty * uPrice - (alloc.qty * uPrice * dPct) / 100;

      return {
        ...baseItem,
        id: aIdx === 0 && alloc.supplier_id === baseItem.supplier_id ? baseItem.id : undefined,
        qty: alloc.qty,
        supplier_id: alloc.supplier_id,
        supplier_name: alloc.supplier_name,
        unit_price: uPrice,
        discount_percent: dPct,
        line_total: lineTot,
        is_fulfilled: aIdx === 0 && alloc.supplier_id === baseItem.supplier_id ? Boolean(baseItem.is_fulfilled) : false,
      };
    });

    // Replace old rows for this product with newRows at firstIdx
    const remaining = items.filter((it) => it.product_id !== targetPid);
    remaining.splice(firstIdx >= 0 ? firstIdx : remaining.length, 0, ...newRows);

    setItems(remaining);
    setSelectedRowIndex(firstIdx);
    setIsAlokasiModalOpen(false);
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
    if (isEdit) {
      router.push("/purchasing/orders/new");
      return;
    }
    setOrderNo("Auto");
    setSelectedSupplier(null);
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
    setDpAmount(0);
    setBayarTunai(0);
    setBayarDeposit(0);
    setBayarKredit(0);
    setPaymentStatus("UNPAID");
    setCashAccountId("");
    setIncludeBiayaData({
      name: "Ongkos Kirim",
      nominal: 0,
      allocation: "HPP",
      notes: "",
    });
  };

  // Save PO Mutation
  const saveMutation = useMutation({
    mutationFn: async (updateMasterCost: boolean = false) => {
      const finalSupplierId = selectedSupplier?.id || items.find((it) => it.supplier_id)?.supplier_id || suppliers[0]?.id;
      if (!finalSupplierId) {
        throw new Error("Pilih Supplier terlebih dahulu.");
      }
      if (items.length === 0) {
        throw new Error("Tabel item pesanan masih kosong. Silakan klik [+ Item].");
      }

      const totalPaid = (Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0);
      let calculatedPaymentStatus = "UNPAID";
      if (totalPaid >= grandTotal && grandTotal > 0) {
        calculatedPaymentStatus = "PAID";
      } else if (Number(dpAmount) > 0) {
        calculatedPaymentStatus = "DP";
      } else if (totalPaid > 0) {
        calculatedPaymentStatus = "PARTIAL";
      } else if (bayarKredit > 0 || (isBayarModalOpen && totalPaid === 0)) {
        calculatedPaymentStatus = "TEMPO";
      }

      const isExistingPayment = Boolean(
        existingPO && (
          existingPO.payment_status === "PAID" ||
          existingPO.payment_status === "PARTIAL" ||
          existingPO.payment_status === "DP" ||
          existingPO.payment_status === "TEMPO" ||
          (Number(existingPO.paid_amount) || 0) > 0 ||
          (Number(existingPO.dp_amount) || 0) > 0
        )
      );

      const finalPaidAmount = isExistingPayment
        ? (Number(existingPO.paid_amount) || totalPaid)
        : totalPaid;

      const finalPaymentStatus = isExistingPayment
        ? (existingPO.payment_status || calculatedPaymentStatus)
        : calculatedPaymentStatus;

      const defaultUnit = units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];
      const payload = {
        warehouse_id: warehouseId || undefined,
        supplier_id: finalSupplierId,
        expected_date: expectedDate ? new Date(expectedDate) : undefined,
        delivery_method: deliveryMethod,
        notes: notes,
        tax_percent: taxPercent,
        discount: calculatedNominalDiscount,
        shipping_fee: Number(extraFee) || 0,
        status: orderStatus !== "Select..." ? orderStatus : "PENDING",
        sp_type: spType,
        sp_number: spNumber,
        apj_name: apjName,
        apj_sipa_no: apjSipaNo,
        pbf_document_url: pbfDocUrl,
        dp_amount: isExistingPayment ? Number(existingPO?.dp_amount || dpAmount) : (Number(dpAmount) || 0),
        paid_amount: finalPaidAmount,
        remaining_amount: Math.max(0, grandTotal - finalPaidAmount),
        payment_status: finalPaymentStatus,
        cash_account_id: cashAccountId || undefined,
        update_master_cost: Boolean(updateMasterCost),
        items: (() => {
          const seenIds = new Set<string>();
          return items.map((it) => {
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
            let validId = it.id;
            if (validId) {
              if (seenIds.has(validId)) {
                validId = undefined;
              } else {
                seenIds.add(validId);
              }
            }
            return {
              id: validId || undefined,
              supplier_id: it.supplier_id || finalSupplierId,
              product_id: it.product_id,
              unit_id: resolvedUnitId,
              qty: it.qty,
              unit_price: it.unit_price,
              discount: (it.qty * it.unit_price * it.discount_percent) / 100,
              is_fulfilled: Boolean(it.is_fulfilled),
              purchase_id: it.purchase_id || undefined,
            };
          });
        })(),
      };

      if (isEdit && orderId) {
        return await api.put(`/purchases/orders/${orderId}`, payload);
      }
      return await api.post("/purchases/orders", {
        ...payload,
        id: draftOrderId,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      setIsBayarModalOpen(false);
      setIsSaveConfirmModalOpen(false);
      setIsMasterCostModalOpen(false);
      const targetPoId = res?.data?.data?.id || orderId;
      if (isPrintAfterSave) {
        setIsDokumenSPOpen(true);
      } else if (targetPoId && confirm((isEdit ? "Pesanan Pembelian berhasil diperbarui!" : "Pesanan Pembelian baru berhasil disimpan!") + "\n\nApakah Anda ingin langsung memproses pesanan ini ke menu Pembelian (Faktur Pembelian)?\n\n• Klik 'OK' untuk buka Faktur Pembelian (semua field otomatis terisi)\n• Klik 'Cancel' untuk tetap di halaman PO / lihat Dokumen SP")) {
        router.push(`/purchasing/invoices/new?po_id=${targetPoId}`);
      } else if (confirm("Apakah Anda ingin melihat & mencetak Dokumen Surat Pesanan (SP) sekarang?")) {
        setIsDokumenSPOpen(true);
      } else {
        router.push("/purchasing/orders");
      }
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

  // Handle Fulfill Selected Items into Purchases
  const handleFulfillSelectedItems = async () => {
    const selectedRows = selectedItemIndices
      .map((idx) => items[idx])
      .filter((it) => it && !it.is_fulfilled);

    if (selectedRows.length === 0) {
      alert("Silakan centang/checklist minimal satu item yang belum terpenuhi untuk dipindahkan ke Pembelian.");
      return;
    }

    try {
      setIsFulfilling(true);

      let targetOrderId = orderId;
      const finalSupplierId = selectedSupplier?.id || items.find((it) => it.supplier_id)?.supplier_id || suppliers[0]?.id;
      if (!finalSupplierId) {
        alert("Pilih Supplier terlebih dahulu.");
        return;
      }

      const defaultUnit = units.find((u: any) => u.name === "Pcs / Buah" || u.code === "PCS") || units[0];

      // Auto-save form PO terlebih dahulu tanpa perlu user klik 'Simpan' secara manual
      const payload = {
        warehouse_id: warehouseId || undefined,
        supplier_id: finalSupplierId,
        expected_date: expectedDate ? new Date(expectedDate) : undefined,
        delivery_method: deliveryMethod,
        notes: notes,
        tax_percent: taxPercent,
        discount: calculatedNominalDiscount,
        shipping_fee: Number(extraFee) || 0,
        status: orderStatus !== "Select..." ? orderStatus : "PENDING",
        sp_type: spType,
        sp_number: spNumber,
        apj_name: apjName,
        apj_sipa_no: apjSipaNo,
        items: (() => {
          const seenIds = new Set<string>();
          return items.map((it) => {
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
            let validId = it.id;
            if (validId) {
              if (seenIds.has(validId)) {
                validId = undefined;
              } else {
                seenIds.add(validId);
              }
            }
            return {
              id: validId || undefined,
              supplier_id: it.supplier_id || finalSupplierId,
              product_id: it.product_id,
              unit_id: resolvedUnitId,
              qty: it.qty,
              unit_price: it.unit_price,
              discount: (it.qty * it.unit_price * it.discount_percent) / 100,
              is_fulfilled: Boolean(it.is_fulfilled),
              purchase_id: it.purchase_id || undefined,
            };
          });
        })(),
      };

      if (isEdit && targetOrderId) {
        await api.put(`/purchases/orders/${targetOrderId}`, payload);
      } else {
        const createRes = await api.post("/purchases/orders", {
          ...payload,
          id: draftOrderId,
        });
        targetOrderId = createRes.data?.data?.id || draftOrderId;
      }

      // Ambil data PO tersimpan dari server agar mendapatkan ID DB dari setiap item
      const freshPoRes = await api.get(`/purchases/orders/${targetOrderId}`);
      const freshPO = freshPoRes.data?.data;
      const dbItems: any[] = freshPO?.items || [];

      // Dapatkan item_ids yang dipilih dengan mencocokkan baris yang dicentang
      const itemIdsToFulfill: string[] = [];
      selectedItemIndices.forEach((idx) => {
        const row = items[idx];
        if (!row || row.is_fulfilled) return;

        // 1. Coba cari di dbItems berdasarkan ID yang sama
        if (row.id) {
          const directMatch = dbItems.find((dbIt: any) => dbIt.id === row.id && !dbIt.is_fulfilled);
          if (directMatch) {
            itemIdsToFulfill.push(directMatch.id);
            return;
          }
        }

        // 2. Cocokkan berdasarkan index yang sama jika item memiliki product_id sama
        if (
          dbItems[idx] &&
          dbItems[idx].product_id === row.product_id &&
          !dbItems[idx].is_fulfilled &&
          !itemIdsToFulfill.includes(dbItems[idx].id)
        ) {
          itemIdsToFulfill.push(dbItems[idx].id);
          return;
        }

        // 3. Cocokkan berdasarkan product_id & supplier_id di dbItems
        const match = dbItems.find(
          (dbIt: any) =>
            dbIt.product_id === row.product_id &&
            (dbIt.supplier_id === row.supplier_id || (!dbIt.supplier_id && row.supplier_id === finalSupplierId)) &&
            !itemIdsToFulfill.includes(dbIt.id) &&
            !dbIt.is_fulfilled
        );
        if (match) {
          itemIdsToFulfill.push(match.id);
          return;
        }

        // 4. Fallback cocokkan item unfulfilled apa saja yang memiliki product_id sama
        const fallbackMatch = dbItems.find(
          (dbIt: any) =>
            dbIt.product_id === row.product_id &&
            !itemIdsToFulfill.includes(dbIt.id) &&
            !dbIt.is_fulfilled
        );
        if (fallbackMatch) {
          itemIdsToFulfill.push(fallbackMatch.id);
        }
      });

      if (itemIdsToFulfill.length === 0) {
        alert("Gagal memproses item: item tidak ditemukan di database.");
        return;
      }

      // Langsung eksekusi pemenuhan item ke menu Pembelian
      const fulfillRes = await api.post(`/purchases/orders/${targetOrderId}/fulfill-items`, {
        item_ids: itemIdsToFulfill,
      });

      if (!fulfillRes.data?.success) {
        alert(fulfillRes.data?.message || "Gagal memproses pemenuhan item.");
        return;
      }

      // LANGSUNG DISABLE item yang terpenuhi di tabel tanpa perlu simpan
      setItems((prevItems) =>
        prevItems.map((item, idx) => {
          if (selectedItemIndices.includes(idx)) {
            return {
              ...item,
              is_fulfilled: true,
              received_qty: item.qty,
            };
          }
          return item;
        })
      );
      setSelectedItemIndices([]);

      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", targetOrderId] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });

      // Cek apakah seluruh item dalam pesanan ini sudah terpenuhi
      const remainingUnfulfilled = items.filter(
        (it, idx) => !selectedItemIndices.includes(idx) && !it.is_fulfilled
      );

      if (remainingUnfulfilled.length === 0) {
        alert(
          "Semua item dalam pesanan pembelian telah terpenuhi dan langsung masuk ke menu Pembelian!\n\n" +
          "Pesanan ini sudah selesai dan tidak akan muncul di daftar Pesanan Pembelian lagi."
        );
        router.push("/purchasing/orders");
      } else {
        alert(
          `${selectedRows.length} item berhasil dipenuhi dan langsung masuk ke menu Pembelian!\n` +
          `Item yang telah terpenuhi langsung dinonaktifkan (disable).`
        );
      }
    } catch (err: any) {
      console.error("Gagal memindahkan item ke Pembelian:", err);
      alert(err.response?.data?.message || err.message || "Terjadi kesalahan saat memindahkan item ke Pembelian.");
    } finally {
      setIsFulfilling(false);
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

      {/* Locked Status Banner */}
      {isEdit && isCompleted && (
        <div className="shrink-0 px-3 py-1.5 rounded-lg border bg-emerald-50 border-emerald-300 text-emerald-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold">
              🟢 STATUS: PESANAN PEMBELIAN SELESAI (Semua Item Telah Terpenuhi - Transaksi Terkunci)
            </span>
          </div>
          <span className="text-[11px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
            READ-ONLY
          </span>
        </div>
      )}

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
                disabled={isCompleted}
                onClick={() => !isCompleted && setIsSupplierModalOpen(true)}
                className="w-6 h-6 flex items-center justify-center border border-slate-300 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={isCompleted ? "Transaksi terkunci" : "Cari Supplier (🔍)"}
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

        {/* ROW 2: Masuk Ke | PPN | Terpenuhi | Dokumen SP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 items-end">
          {/* Masuk Ke */}
          <div className="md:col-span-5">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Masuk Ke :
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
              onChange={(e) => {
                const val = e.target.value as any;
                setPpnType(val);
                if (val === "Non") {
                  setTaxPercent(0);
                  setTaxCheckbox(false);
                } else if (taxPercent === 0) {
                  setTaxPercent(11);
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

          {/* Tombol Terpenuhi */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleFulfillSelectedItems}
              disabled={isFulfilling}
              className="w-full h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[10.5px] inline-flex items-center justify-between shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Pindahkan item yang dicentang ke menu Pembelian (Terpenuhi)"
            >
              <span className="flex items-center gap-1 truncate">
                <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isFulfilling ? "Memproses..." : "Terpenuhi"}</span>
              </span>
              <span className="bg-emerald-800 text-white text-[9px] px-1 py-0.2 rounded font-bold shrink-0">
                {selectedItemIndices.length > 0 ? `${selectedItemIndices.length} Item` : "OK"}
              </span>
            </button>
          </div>

          {/* Dokumen SP */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => {
                if (items.length === 0) {
                  alert("Tabel item obat masih kosong. Tambahkan item terlebih dahulu untuk melihat Dokumen SP.");
                  return;
                }
                setIsDokumenSPOpen(true);
              }}
              className="w-full h-6 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold rounded text-[10.5px] inline-flex items-center justify-between shadow-2xs transition active:scale-95 cursor-pointer"
              title="Lihat & Cetak Dokumen Surat Pesanan (SP) Resmi"
            >
              <span className="flex items-center gap-1 truncate">
                <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">Dokumen SP</span>
              </span>
              <span className="bg-emerald-600 text-white text-[9px] px-1 py-0.2 rounded font-bold shrink-0">
                SP
              </span>
            </button>
          </div>
          {/* Metode Penerimaan Barang */}
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Metode Pengiriman :
            </label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as "DIKIRIM" | "DIAMBIL")}
              className="w-full h-6 px-1.5 py-0 border border-emerald-300 rounded text-[11px] font-semibold text-emerald-900 bg-emerald-50/40 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="DIKIRIM">Dikirim Supplier</option>
              <option value="DIAMBIL">Diambil ke Supplier</option>
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
                  <th className="py-1 px-1.5 border-r border-slate-300 w-7 text-center">
                    <input
                      type="checkbox"
                      aria-label="Pilih Semua Item"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-3 w-3"
                      checked={
                        items.length > 0 &&
                        items.filter((it) => !it.is_fulfilled).length > 0 &&
                        items
                          .map((it, idx) => ({ it, idx }))
                          .filter(({ it }) => !it.is_fulfilled)
                          .every(({ idx }) => selectedItemIndices.includes(idx))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const unfulfilledIndices = items
                            .map((it, idx) => ({ it, idx }))
                            .filter(({ it }) => !it.is_fulfilled)
                            .map(({ idx }) => idx);
                          setSelectedItemIndices(unfulfilledIndices);
                        } else {
                          setSelectedItemIndices([]);
                        }
                      }}
                      title="Pilih semua item yang belum terpenuhi"
                    />
                  </th>
                  <th className="py-1 px-2 border-r border-slate-300 w-8 text-center">No</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-24">Kode</th>
                  <th className="py-1 px-2.5 border-r border-slate-300 min-w-[180px]">Nama</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-24">Merek</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-16 text-right">Jumlah</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-16 text-right">Jml Teri...</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-28">Supplier</th>
                  <th className="py-1 px-1.5 border-r border-slate-300 w-14 text-center">Satuan</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-24 text-right">Harga</th>
                  <th className="py-1 px-1.5 border-r border-slate-300 w-14 text-right">Pot %</th>
                  <th className="py-1 px-2.5 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-5 text-center text-slate-400 font-medium text-xs">
                      No data
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    const isChecked = Boolean(it.is_fulfilled || selectedItemIndices.includes(idx));
                    return (
                      <tr
                        key={idx}
                        onClick={() => handleSelectRow(idx)}
                        onDoubleClick={handleOpenEditRow}
                        className={`transition border-b border-slate-100 h-6 ${
                          it.is_fulfilled
                            ? "bg-slate-100/70 text-slate-400 select-none cursor-not-allowed opacity-75"
                            : isSelected
                            ? "bg-sky-50 font-medium text-sky-950 cursor-pointer"
                            : "hover:bg-slate-50 text-slate-800 cursor-pointer"
                        }`}
                      >
                        <td className="py-0.5 px-1.5 text-center border-r border-slate-200">
                          <input
                            type="checkbox"
                            disabled={it.is_fulfilled}
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (it.is_fulfilled) return;
                              if (e.target.checked) {
                                setSelectedItemIndices((prev) => [...prev, idx]);
                              } else {
                                setSelectedItemIndices((prev) => prev.filter((i) => i !== idx));
                              }
                            }}
                            className={`rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3 w-3 ${
                              it.is_fulfilled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                            }`}
                            title={it.is_fulfilled ? "Item ini sudah dipindahkan ke Pembelian" : "Checklist untuk dipindahkan ke Pembelian"}
                          />
                        </td>
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
                        <td className="py-0.5 px-2 border-r border-slate-200 text-slate-700 truncate max-w-[140px]" title={it.supplier_name || selectedSupplier?.name || "-"}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{it.supplier_name || selectedSupplier?.name || "-"}</span>
                            {it.is_fulfilled ? (
                              <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[8.5px] border border-emerald-300 shrink-0">
                                Di Pembelian
                              </span>
                            ) : (
                              items.filter((x) => x.product_id === it.product_id).length > 1 && (
                                <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[8.5px] border border-emerald-300 shrink-0">
                                  Multi
                                </span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200 text-center font-semibold text-slate-700">
                          {it.unit_name}
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-200 text-right font-mono text-slate-800">
                          <CurrencyInput
                            disabled={isCompleted || Boolean(it.is_fulfilled)}
                            value={it.unit_price}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(newPrice) => {
                              setItems((prev) =>
                                prev.map((row, rIdx) => {
                                  if (rIdx !== idx) return row;
                                  const base = row.qty * newPrice;
                                  const disc = (base * (row.discount_percent || 0)) / 100;
                                  return {
                                    ...row,
                                    unit_price: newPrice,
                                    line_total: Math.max(0, base - disc),
                                  };
                                })
                              );
                            }}
                            className="w-full px-1 py-0.5 text-right font-mono bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-sky-500 rounded text-slate-900 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                          />
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
          disabled={isCompleted}
          onClick={() => !isCompleted && setIsItemModalOpen(true)}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded font-bold text-[10.5px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          title={isCompleted ? "Transaksi terkunci" : "Tambah Item Pesanan (+ Item)"}
        >
          <span>+ Item</span>
        </button>

        <button
          type="button"
          onClick={handleOpenEditRow}
          disabled={selectedRowIndex === null || Boolean(selectedItemRow?.is_fulfilled) || isCompleted}
          className="w-6 h-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-40"
          title={isCompleted ? "Transaksi terkunci" : "Ubah Item Terpilih (Pencil)"}
        >
          <Pencil className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={handleDeleteRow}
          disabled={selectedRowIndex === null || Boolean(selectedItemRow?.is_fulfilled) || isCompleted}
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
          onClick={handleOpenAlokasiSupplier}
          disabled={selectedRowIndex === null}
          className="h-6 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded font-bold text-[10.5px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Alokasi kekurangan obat ini ke beberapa supplier (Bisa lebih dari 2 supplier)"
        >
          <Users className="w-3.5 h-3.5 text-emerald-700" />
          <span>Alokasi Supplier</span>
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

        {/* 💾 Simpan (Membuka Modal Persetujuan Simpan) */}
        <button
          type="button"
          onClick={() => {
            if (isCompleted) {
              alert("Pesanan pembelian sudah selesai. Transaksi yang sudah selesai tidak dapat diedit.");
              return;
            }
            const finalSupplierId = selectedSupplier?.id || items.find((it) => it.supplier_id)?.supplier_id || suppliers[0]?.id;
            if (!finalSupplierId) {
              alert("Pilih Supplier terlebih dahulu.");
              return;
            }
            if (items.length === 0) {
              alert("Tabel item pesanan masih kosong. Silakan klik [+ Item].");
              return;
            }
            setIsMasterCostModalOpen(true);
          }}
          disabled={saveMutation.isPending || isCompleted}
          className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title={isCompleted ? "Pesanan pembelian sudah selesai. Transaksi yang sudah selesai tidak dapat diedit." : "Simpan Pesanan Pembelian"}
        >
          <Save className="w-3 h-3" />
          <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>

        <button
          type="button"
          onClick={handleDeletePO}
          disabled={!isEdit || isCompleted}
          className="h-6 px-2.5 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title={isCompleted ? "Pesanan pembelian sudah selesai. Transaksi yang sudah selesai tidak dapat dihapus." : "Hapus Pesanan Pembelian"}
        >
          <Trash2 className="w-3 h-3" />
          <span>Hapus</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
          title="Cetak Pesanan Pembelian"
        >
          <Printer className="w-3 h-3" />
          <span>Cetak</span>
        </button>

        {/* 📄 Dokumen SP (Generate Otomatis) */}
        <button
          type="button"
          onClick={() => {
            if (items.length === 0) {
              alert("Tabel item obat masih kosong. Tambahkan item terlebih dahulu untuk melihat Dokumen SP.");
              return;
            }
            setIsDokumenSPOpen(true);
          }}
          className="h-6 px-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
          title="Lihat & Cetak Dokumen Surat Pesanan (SP) Resmi"
        >
          <FileText className="w-3 h-3 text-sky-600" />
          <span>Dokumen SP</span>
        </button>

        {/* 🛒 Proses ke Pembelian */}
        <button
          type="button"
          onClick={() => {
            if (isEdit && orderId) {
              router.push(`/purchasing/invoices/new?po_id=${orderId}`);
            } else {
              alert("Silakan klik [Simpan] terlebih dahulu agar pesanan pembelian tercatat, lalu sistem akan otomatis mengarahkan ke menu Pembelian.");
            }
          }}
          className="h-6 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
          title="Lanjut buat Faktur Pembelian berdasarkan Pesanan Pembelian ini"
        >
          <ShoppingCart className="w-3 h-3 text-emerald-600" />
          <span>Proses ke Pembelian</span>
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
        defaultWarehouseId={warehouseId}
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
        mainSupplier={selectedSupplier}
        onOpenMultiSupplier={handleOpenAlokasiSupplier}
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

      {/* MODAL 6: BAYAR / PEMBAYARAN PO (Matching Pembayaran Pembelian) */}
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
              {/* 1. TOTAL TAGIHAN (Pink Box matching Image) */}
              <div className="bg-[#fce7f3] border-2 border-dashed border-pink-300 rounded-lg px-4 py-3 flex items-center justify-between shadow-2xs">
                <span className="text-base font-bold text-slate-800 tracking-wide">Total :</span>
                <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                  Rp {formatRupiahNumber(grandTotal)}
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
                    <span className="absolute left-2.5 text-xs text-slate-400 font-bold select-none">Rp</span>
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
                      onClick={() => {
                        const poDp = Math.round(Number(grandTotal) * 0.3);
                        setDpAmount(poDp);
                        setBayarTunai(0);
                        setBayarKredit(Math.max(0, grandTotal - (poDp + bayarDeposit)));
                      }}
                      className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50 cursor-pointer"
                      title="Hitung DP PO (30%)"
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
                      <span className="absolute left-2.5 text-xs text-slate-400 font-bold select-none">Rp</span>
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
                          const fullCash = Math.max(0, grandTotal - dpAmount - bayarDeposit);
                          setBayarTunai(fullCash);
                          setBayarKredit(0);
                        }}
                        className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50 cursor-pointer"
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
                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded text-[10px] font-semibold transition cursor-pointer"
                    >
                      Uang Pas (Lunas)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const net = Math.max(0, grandTotal - dpAmount - bayarDeposit);
                        const half = Math.round(net * 0.5);
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
                        setBayarKredit(Math.max(0, grandTotal - dpAmount - bayarDeposit));
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
                    <span className="absolute left-2.5 text-xs text-slate-400 font-bold select-none">Rp</span>
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
                      onClick={() => {
                        setBayarDeposit(0);
                        setBayarKredit(Math.max(0, grandTotal - (dpAmount + bayarTunai)));
                      }}
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
                    <span className="absolute left-2.5 text-xs text-slate-400 font-bold select-none">Rp</span>
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
                        const fullKredit = Math.max(0, grandTotal - dpAmount - bayarDeposit);
                        setBayarTunai(0);
                        setBayarKredit(fullKredit);
                      }}
                      className="absolute right-1 w-6 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 rounded bg-slate-50 cursor-pointer"
                      title="Jadikan Hutang Penuh"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. TOTAL BAYAR (Green Box matching Image) */}
              <div className="bg-[#22c55e] text-white rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold tracking-wide">Total :</span>
                <span className="text-2xl font-black font-mono tracking-tight">
                  Rp {formatRupiahNumber((Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0))}
                </span>
              </div>

              {/* 4. SISA (Orange Box matching Image) */}
              <div className="bg-[#f97316] text-white rounded-lg px-4 py-2 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold tracking-wide">Sisa :</span>
                <span className="text-2xl font-black font-mono tracking-tight">
                  Rp {formatRupiahNumber(Math.max(
                    0,
                    grandTotal - ((Number(dpAmount) || 0) + (Number(bayarTunai) || 0) + (Number(bayarDeposit) || 0))
                  ))}
                </span>
              </div>
            </div>

            {/* 5. ACTION BUTTONS matching Image */}
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

      {/* MODAL PERSETUJUAN SIMPAN (Bukan Modal Pembayaran) */}
      {isSaveConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            {/* Header Ketoko Green */}
            <div className="px-4 py-2.5 bg-[#00c875] text-white flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <Save className="w-4 h-4 text-white" />
                <span>Konfirmasi Simpan Pesanan Pembelian</span>
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
                    Apakah Anda yakin ingin menyimpan dokumen pesanan pembelian ini ke sistem?
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
                  <span className="text-slate-500">Supplier :</span>
                  <span className="font-semibold text-slate-800">{selectedSupplier?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jumlah Item :</span>
                  <span className="font-medium text-slate-800">{items.length} item obat</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-xs font-bold">
                  <span className="text-slate-700">Total Nilai Pesanan :</span>
                  <span className="text-emerald-700">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  Pembayaran DP atau pelunasan kas/bank dapat dilakukan terpisah melalui tombol <strong>Bayar</strong>.
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
                disabled={saveMutation.isPending}
                onClick={() => {
                  saveMutation.mutate(false);
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

      {/* MODAL KONFIRMASI UPDATE HARGA POKOK MASTER DATA */}
      {isMasterCostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-md shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="font-semibold text-xs text-slate-700">Konfirmasi</span>
              <button
                type="button"
                onClick={() => setIsMasterCostModalOpen(false)}
                className="p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-800 space-y-5">
              <div className="leading-relaxed text-[13px] text-slate-800">
                <p>Apakah Harga Pokok akan di ubah pada master data ?</p>
                <p>Harga Pokok akan disimpan setelah klik tombol Simpan.</p>
              </div>
              <div className="flex justify-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(true)}
                  className="min-w-[90px] h-7 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded text-slate-800 font-medium text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Menyimpan..." : "Yes"}
                </button>
                <button
                  type="button"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(false)}
                  className="min-w-[90px] h-7 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-800 font-medium text-xs transition cursor-pointer disabled:opacity-50"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MODAL 8: TERIMA & VERIFIKASI BARANG PO */}
      <TerimaBarangPOModal
        isOpen={isTerimaModalOpen}
        onClose={() => setIsTerimaModalOpen(false)}
        poId={orderId || null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
          queryClient.invalidateQueries({ queryKey: ["purchases"] });
        }}
      />

      {/* MODAL 9: ALOKASI PEMENUHAN MULTI-SUPPLIER (Fleksibel & Otomatis Hitung Kekurangan) */}
      <AlokasiSupplierModal
        isOpen={isAlokasiModalOpen}
        onClose={() => setIsAlokasiModalOpen(false)}
        product={alokasiTargetProduct}
        initialAllocations={alokasiInitialRows}
        totalQtyNeeded={alokasiTotalQty}
        availableSuppliers={suppliers}
        defaultSupplier={selectedSupplier}
        onSave={handleSaveAlokasi}
      />

      {/* MODAL 10: DOKUMEN SP RESMI (Generate Otomatis Sesuai Format KOP) */}
      <DokumenSPModal
        isOpen={isDokumenSPOpen}
        onClose={() => {
          setIsDokumenSPOpen(false);
          if (saveMutation.isSuccess) {
            router.push("/purchasing/orders");
          }
        }}
        orderId={orderId || null}
        poData={{
          id: orderId || draftOrderId,
          order_no: orderNo,
          date: new Date(),
          sp_number: spNumber,
          apj_name: apjName,
          apj_sipa_no: apjSipaNo,
          supplier: selectedSupplier,
          items: items.map((it) => {
            const itemSupp = it.supplier_id
              ? suppliers.find((s: any) => s.id === it.supplier_id)
              : selectedSupplier;
            return {
              id: it.product_id,
              name: it.name,
              qty: it.qty,
              supplier_id: it.supplier_id || selectedSupplier?.id,
              supplier: itemSupp,
              unit: { name: it.unit_name || "Box", code: it.unit_name || "BOX" },
              product: { name: it.name },
            };
          }),
        }}
      />

      {/* MODAL 11: UPLOAD DOKUMEN PEMBELIAN / DARI PBF ASAL (1 Dokumen Faktur/Surat Jalan) */}
      <UploadDokumenPBFModal
        isOpen={isUploadPbfDocOpen}
        onClose={() => setIsUploadPbfDocOpen(false)}
        orderId={orderId || draftOrderId || null}
        orderNo={orderNo}
        supplierName={selectedSupplier?.name}
        existingDocUrl={pbfDocUrl || existingPO?.pbf_document_url}
        onSuccess={(newDocUrl) => {
          setPbfDocUrl(newDocUrl);
          queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
          if (orderId) {
            queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] });
          }
        }}
      />
    </div>
  );
};
export default PurchaseOrderForm;
