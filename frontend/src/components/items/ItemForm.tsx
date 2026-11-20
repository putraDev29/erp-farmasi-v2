"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  AlertTriangle,
  Lightbulb,
  Copy,
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  RotateCcw,
  RotateCw,
  Upload,
  Check,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface ItemDiscountRow {
  group_code: string;
  customer_group_id?: string;
  discount_1: number;
  discount_2: number;
  discount_3: number;
  discount_4: number;
}

interface ItemFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export const ItemForm: React.FC<ItemFormProps> = ({ initialData, isEdit = false }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("data-umum");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // TAB 1: DATA UMUM
  const [itemType, setItemType] = useState<string>("BARANG");
  const [isSerial, setIsSerial] = useState<boolean>(false);
  const [code, setCode] = useState<string>("Auto");
  const [name, setName] = useState<string>("");
  const [categoryID, setCategoryID] = useState<string>("");
  const [subCategoryID, setSubCategoryID] = useState<string>("");
  const [brandID, setBrandID] = useState<string>("");
  const [rack, setRack] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [expiredDate, setExpiredDate] = useState<string>("");
  const [salesStatus, setSalesStatus] = useState<string>("MASIH_DIJUAL");
  const [minStock, setMinStock] = useState<number>(0);
  const [supplierID, setSupplierID] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // TAB 2: SATUAN DAN HARGA
  const [lockPriceOnSale, setLockPriceOnSale] = useState<boolean>(false);
  const [pricingType, setPricingType] = useState<string>("SATU_HARGA");
  const [baseUnitID, setBaseUnitID] = useState<string>("");
  const [barcode, setBarcode] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [markupPercent, setMarkupPercent] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [salesCommission, setSalesCommission] = useState<number>(0);

  // TAB 3: DIMENSI BARANG
  const [weight, setWeight] = useState<number>(0);
  const [length, setLength] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  // TAB 4: POTONGAN HARGA JUAL
  const [discounts, setDiscounts] = useState<ItemDiscountRow[]>([]);
  const [selectedDiscountIndex, setSelectedDiscountIndex] = useState<number | null>(null);

  // TAB 5: AKUNTANSI
  const [cogsAccountID, setCogsAccountID] = useState<string>("");
  const [salesAccountID, setSalesAccountID] = useState<string>("");
  const [serviceRevenueAccountID, setServiceRevenueAccountID] = useState<string>("");
  const [inventoryAccountID, setInventoryAccountID] = useState<string>("");
  const [nonInventoryExpenseAccountID, setNonInventoryExpenseAccountID] = useState<string>("");
  const [wipInventoryAccountID, setWipInventoryAccountID] = useState<string>("");
  const [assemblyLaborAccountID, setAssemblyLaborAccountID] = useState<string>("");
  const [assemblyOverheadAccountID, setAssemblyOverheadAccountID] = useState<string>("");

  // TAB 6: GAMBAR
  const [images, setImages] = useState<{ image_url: string; caption?: string }[]>([]);

  // TAB 7: SHARE ITEM
  const [canShare, setCanShare] = useState<boolean>(false);
  const [youtubeVideoID, setYoutubeVideoID] = useState<string>("");
  const [itemCondition, setItemCondition] = useState<string>("BARU");
  const [shareWarehouseID, setShareWarehouseID] = useState<string>("");
  const [subDescription, setSubDescription] = useState<string>("");
  const [longDescription, setLongDescription] = useState<string>("");

  // TAB 8: SYNCHRONIZE MARKETPLACE
  const [syncMarketplace, setSyncMarketplace] = useState<boolean>(false);
  const [marketplaceCode, setMarketplaceCode] = useState<string>("");

  // TAB 9: DATA PENDUKUNG PAJAK
  const [taxType, setTaxType] = useState<string>("NON_PAJAK");
  const [taxIncludePercent, setTaxIncludePercent] = useState<number>(0);
  const [taxReferenceCode, setTaxReferenceCode] = useState<string>("");
  const [taxGoodsServicesOption, setTaxGoodsServicesOption] = useState<string>("");

  // Regulasi Farmasi (PBF vs Apotek & BPOM)
  const [distributionChannel, setDistributionChannel] = useState<string>("ALL");
  const [isSoldInPharmacy, setIsSoldInPharmacy] = useState<boolean>(true);
  const [drugClassification, setDrugClassification] = useState<string>("OBAT_KERAS");
  const [bpomNumber, setBpomNumber] = useState<string>("");

  // Populate data when editing
  useEffect(() => {
    if (initialData) {
      setItemType(initialData.type || "BARANG");
      setIsSerial(Boolean(initialData.is_serial));
      setCode(initialData.code || "Auto");
      setName(initialData.name || "");
      setCategoryID(initialData.category_id || "");
      setSubCategoryID(initialData.sub_category_id || "");
      setBrandID(initialData.brand_id || "");
      setRack(initialData.rack || "");
      setBatchNumber(initialData.batch_number || "");
      setExpiredDate(initialData.expired_date ? String(initialData.expired_date).substring(0, 10) : "");
      setSalesStatus(initialData.sales_status || "MASIH_DIJUAL");
      setMinStock(initialData.min_stock || 0);
      setSupplierID(initialData.supplier_id || "");
      setNotes(initialData.notes || initialData.description || "");

      setDistributionChannel(initialData.distribution_channel || "ALL");
      setIsSoldInPharmacy(initialData.is_sold_in_pharmacy !== undefined ? Boolean(initialData.is_sold_in_pharmacy) : true);
      setDrugClassification(initialData.drug_classification || "OBAT_KERAS");
      setBpomNumber(initialData.bpom_number || "");

      setLockPriceOnSale(Boolean(initialData.lock_price_on_sale));
      setPricingType(initialData.pricing_type || "SATU_HARGA");
      setBaseUnitID(initialData.base_unit_id || "");
      setBarcode(initialData.barcode || "");
      setSku(initialData.sku || "");
      setPurchasePrice(initialData.purchase_price || 0);
      setMarkupPercent(initialData.markup_percent || 0);
      setSellingPrice(initialData.selling_price || 0);
      setPoints(initialData.points || 0);
      setSalesCommission(initialData.sales_commission || 0);

      setWeight(initialData.weight || 0);
      setLength(initialData.length || 0);
      setWidth(initialData.width || 0);
      setHeight(initialData.height || 0);

      if (initialData.discounts && Array.isArray(initialData.discounts)) {
        setDiscounts(initialData.discounts);
      }
      if (initialData.images && Array.isArray(initialData.images)) {
        setImages(initialData.images);
      }

      setCogsAccountID(initialData.cogs_account_id || "");
      setSalesAccountID(initialData.sales_account_id || "");
      setServiceRevenueAccountID(initialData.service_revenue_account_id || "");
      setInventoryAccountID(initialData.inventory_account_id || "");
      setNonInventoryExpenseAccountID(initialData.non_inventory_expense_account_id || "");
      setWipInventoryAccountID(initialData.wip_inventory_account_id || "");
      setAssemblyLaborAccountID(initialData.assembly_labor_account_id || "");
      setAssemblyOverheadAccountID(initialData.assembly_overhead_account_id || "");

      setCanShare(Boolean(initialData.can_share));
      setYoutubeVideoID(initialData.youtube_video_id || "");
      setItemCondition(initialData.item_condition || "BARU");
      setShareWarehouseID(initialData.share_warehouse_id || "");
      setSubDescription(initialData.sub_description || "");
      setLongDescription(initialData.long_description || "");

      setSyncMarketplace(Boolean(initialData.sync_marketplace));
      setMarketplaceCode(initialData.marketplace_code || "");

      setTaxType(initialData.tax_type || "NON_PAJAK");
      setTaxIncludePercent(initialData.tax_include_percent || 0);
      setTaxReferenceCode(initialData.tax_reference_code || "");
      setTaxGoodsServicesOption(initialData.tax_goods_services_option || "");
    }
  }, [initialData]);

  // Master queries
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data?.data || [];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get("/brands");
      return res.data?.data || [];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data?.data || [];
    },
  });

  const { data: customerGroups = [] } = useQuery({
    queryKey: ["customer-groups"],
    queryFn: async () => {
      const res = await api.get("/customer-groups");
      return res.data?.data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  const { data: generalSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings-general"],
    queryFn: async () => {
      const res = await api.get("/settings/groups/GENERAL");
      return res.data?.data || {};
    },
  });

  // Auto set default accounts if not set
  useEffect(() => {
    if (accounts.length > 0 && !isEdit) {
      if (!cogsAccountID) {
        const acc = accounts.find((a: any) => a.code.startsWith("5-") || a.name.toLowerCase().includes("hpp"));
        if (acc) setCogsAccountID(acc.id);
      }
      if (!salesAccountID) {
        const acc = accounts.find((a: any) => a.code.startsWith("4-") || a.name.toLowerCase().includes("penjualan"));
        if (acc) setSalesAccountID(acc.id);
      }
      if (!serviceRevenueAccountID) {
        const acc = accounts.find((a: any) => a.name.toLowerCase().includes("jasa"));
        if (acc) setServiceRevenueAccountID(acc.id);
      }
      if (!inventoryAccountID) {
        const acc = accounts.find((a: any) => a.code.startsWith("1-13") || a.name.toLowerCase().includes("persediaan"));
        if (acc) setInventoryAccountID(acc.id);
      }
      if (!nonInventoryExpenseAccountID) {
        const acc = accounts.find((a: any) => a.code.startsWith("6-") || a.name.toLowerCase().includes("beban"));
        if (acc) setNonInventoryExpenseAccountID(acc.id);
      }
      if (!wipInventoryAccountID) {
        const acc = accounts.find((a: any) => a.name.toLowerCase().includes("proses"));
        if (acc) setWipInventoryAccountID(acc.id);
      }
      if (!assemblyLaborAccountID) {
        const acc = accounts.find((a: any) => a.name.toLowerCase().includes("tenaga kerja"));
        if (acc) setAssemblyLaborAccountID(acc.id);
      }
      if (!assemblyOverheadAccountID) {
        const acc = accounts.find((a: any) => a.name.toLowerCase().includes("overhead"));
        if (acc) setAssemblyOverheadAccountID(acc.id);
      }
    }
  }, [accounts, isEdit, cogsAccountID, salesAccountID, serviceRevenueAccountID, inventoryAccountID, nonInventoryExpenseAccountID, wipInventoryAccountID, assemblyLaborAccountID, assemblyOverheadAccountID]);

  // Set default base unit if not set
  useEffect(() => {
    if (units.length > 0 && !baseUnitID) {
      setBaseUnitID(units[0].id);
    }
  }, [units, baseUnitID]);

  // Calculate Harga Jual from Harga Pokok and Proc %
  const handlePurchasePriceChange = (val: number) => {
    setPurchasePrice(val);
    if (markupPercent > 0) {
      const calculatedSell = val * (1 + markupPercent / 100);
      setSellingPrice(Math.round(calculatedSell));
    }
  };

  const handleMarkupChange = (val: number) => {
    setMarkupPercent(val);
    if (purchasePrice > 0) {
      const calculatedSell = purchasePrice * (1 + val / 100);
      setSellingPrice(Math.round(calculatedSell));
    }
  };

  const handleSellingPriceChange = (val: number) => {
    setSellingPrice(val);
    if (purchasePrice > 0) {
      const calculatedMarkup = ((val - purchasePrice) / purchasePrice) * 100;
      setMarkupPercent(parseFloat(calculatedMarkup.toFixed(2)));
    }
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEdit && initialData?.id) {
        return await api.put(`/products/${initialData.id}`, payload);
      } else {
        return await api.post("/products", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/master/items");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal menyimpan data item");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama Item wajib diisi");
      setActiveTab("data-umum");
      return;
    }

    const payload = {
      type: itemType,
      is_serial: isSerial,
      code: code.trim(),
      name: name.trim(),
      category_id: categoryID || null,
      sub_category_id: subCategoryID || null,
      brand_id: brandID || null,
      rack: rack.trim(),
      batch_number: batchNumber.trim(),
      expired_date: expiredDate ? new Date(expiredDate).toISOString() : null,
      sales_status: salesStatus,
      min_stock: Number(minStock),
      supplier_id: supplierID || null,
      notes: notes.trim(),
      description: notes.trim(),

      distribution_channel: distributionChannel,
      is_sold_in_pharmacy: isSoldInPharmacy,
      drug_classification: drugClassification,
      bpom_number: bpomNumber.trim(),

      lock_price_on_sale: lockPriceOnSale,
      pricing_type: pricingType,
      base_unit_id: baseUnitID || null,
      barcode: barcode.trim(),
      sku: sku.trim(),
      purchase_price: Number(purchasePrice),
      markup_percent: Number(markupPercent),
      selling_price: Number(sellingPrice),
      points: Number(points),
      sales_commission: Number(salesCommission),

      weight: Number(weight),
      length: Number(length),
      width: Number(width),
      height: Number(height),

      discounts: discounts.map((d) => ({
        group_code: d.group_code,
        customer_group_id: d.customer_group_id || null,
        discount_1: Number(d.discount_1),
        discount_2: Number(d.discount_2),
        discount_3: Number(d.discount_3),
        discount_4: Number(d.discount_4),
      })),

      cogs_account_id: cogsAccountID || null,
      sales_account_id: salesAccountID || null,
      service_revenue_account_id: serviceRevenueAccountID || null,
      inventory_account_id: inventoryAccountID || null,
      non_inventory_expense_account_id: nonInventoryExpenseAccountID || null,
      wip_inventory_account_id: wipInventoryAccountID || null,
      assembly_labor_account_id: assemblyLaborAccountID || null,
      assembly_overhead_account_id: assemblyOverheadAccountID || null,

      images: images.map((img, idx) => ({
        image_url: img.image_url,
        order_index: idx,
        caption: img.caption || "",
      })),

      can_share: canShare,
      share_link: initialData?.id ? `https://pos.ketoko.co.id/share/item/${initialData.id}` : "",
      youtube_video_id: youtubeVideoID.trim(),
      item_condition: itemCondition,
      share_warehouse_id: shareWarehouseID || null,
      sub_description: subDescription,
      long_description: longDescription,

      sync_marketplace: syncMarketplace,
      marketplace_code: marketplaceCode.trim(),

      tax_type: taxType,
      tax_include_percent: Number(taxIncludePercent),
      tax_reference_code: taxReferenceCode.trim().slice(0, 5),
      tax_goods_services_option: taxGoodsServicesOption,
    };

    saveMutation.mutate(payload);
  };

  // Add & Remove discount rows
  const handleAddDiscount = () => {
    setDiscounts((prev) => [
      ...prev,
      {
        group_code: customerGroups[prev.length % customerGroups.length]?.code || `GRUP-${prev.length + 1}`,
        customer_group_id: customerGroups[prev.length % customerGroups.length]?.id || undefined,
        discount_1: 0,
        discount_2: 0,
        discount_3: 0,
        discount_4: 0,
      },
    ]);
  };

  const handleRemoveDiscount = () => {
    if (selectedDiscountIndex !== null) {
      setDiscounts((prev) => prev.filter((_, idx) => idx !== selectedDiscountIndex));
      setSelectedDiscountIndex(null);
    } else if (discounts.length > 0) {
      setDiscounts((prev) => prev.slice(0, -1));
    }
  };

  // Image Upload helper
  const handleAddImage = () => {
    if (images.length >= 5) {
      alert("Batas upload maksimal 5 gambar.");
      return;
    }
    const sampleUrl = prompt("Masukkan URL Gambar produk (contoh: https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500):");
    if (sampleUrl && sampleUrl.trim()) {
      setImages((prev) => [...prev, { image_url: sampleUrl.trim() }]);
    }
  };

  const tabs = [
    { id: "data-umum", label: "Data Umum" },
    { id: "satuan-harga", label: "Satuan dan Harga" },
    { id: "dimensi-barang", label: "Dimensi Barang" },
    { id: "potongan-harga", label: "Potongan Harga Jual" },
    { id: "akuntansi", label: "Akuntansi" },
    { id: "gambar", label: "Gambar" },
    { id: "share-item", label: "Share Item" },
    { id: "sync-marketplace", label: "Synchronize Marketplace" },
    { id: "data-pajak", label: "Data Pendukung Pajak" },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 bg-white border border-slate-200 rounded shadow-sm text-xs select-none">
      {/* Error alert if any */}
      {errorMsg && (
        <div className="shrink-0 m-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="shrink-0 flex items-center border-b border-slate-200 overflow-x-auto scrollbar-none bg-slate-50/50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 font-medium whitespace-nowrap transition-colors border-r border-slate-200 ${
                isActive
                  ? "bg-white text-sky-600 font-semibold border-b-2 border-b-sky-500 -mb-[1px]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        {/* ======================= TAB 1: DATA UMUM ======================= */}
        {activeTab === "data-umum" && (
          <div className="space-y-4 max-w-4xl">
            {/* Tipe Item */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Tipe Item :</label>
              <div className="space-y-1.5 pl-1">
                {[
                  { id: "BARANG", label: "Barang" },
                  { id: "JASA", label: "Jasa" },
                  { id: "RAKITAN_PROSES", label: "Rakitan Proses" },
                  { id: "RAKITAN_NON_PROSES", label: "Rakitan Non Proses" },
                  { id: "NON_INVENTORY", label: "Non Inventory" },
                  { id: "BIAYA", label: "Biaya" },
                  { id: "VARIAN", label: "Varian" },
                ].map((t) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="itemType"
                      value={t.id}
                      checked={itemType === t.id}
                      onChange={(e) => setItemType(e.target.value)}
                      className="text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Item Serial */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={isSerial}
                  onChange={(e) => setIsSerial(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                />
                <span className="font-semibold">Item Serial :</span>
              </label>
            </div>

            {/* Kode Item */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Kode Item :</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Auto"
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* Nama Item */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Nama Item : <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama produk / item"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
                required
              />
            </div>

            {/* Jenis & Sub Jenis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Jenis :</label>
                <select
                  value={categoryID}
                  onChange={(e) => setCategoryID(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
                >
                  <option value="">Select...</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Sub Jenis :</label>
                <select
                  value={subCategoryID}
                  onChange={(e) => setSubCategoryID(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
                >
                  <option value="">Select...</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Sub)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Merek */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Merek :</label>
              <select
                value={brandID}
                onChange={(e) => setBrandID(e.target.value)}
                className="w-full sm:w-96 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">Select...</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rak */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Rak :</label>
              <input
                type="text"
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                placeholder="Lokasi rak / bin"
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* No. Batch & Tanggal Expired (ED) */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">No. Batch / Lot (CDOB) :</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Contoh: BATCH-2026-X01"
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Tanggal Kadaluarsa (ED) :</label>
              <input
                type="date"
                value={expiredDate}
                onChange={(e) => setExpiredDate(e.target.value)}
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white font-semibold"
              />
            </div>

            {/* Regulasi Farmasi & Saluran Distribusi (Apotek vs PBF / RS) */}
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-lg space-y-3">
              <span className="font-bold text-emerald-950 text-xs block">
                Regulasi Farmasi &amp; Saluran Distribusi (CDOB BPOM) :
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Golongan Obat */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Golongan Obat :</label>
                  <select
                    value={drugClassification}
                    onChange={(e) => setDrugClassification(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="OBAT_BEBAS">Obat Bebas (Lingkaran Hijau)</option>
                    <option value="OBAT_BEBAS_TERBATAS">Obat Bebas Terbatas (Lingkaran Biru)</option>
                    <option value="OBAT_KERAS">Obat Keras (Lingkaran Merah Huruf K)</option>
                    <option value="PSIKOTROPIKA">Psikotropika</option>
                    <option value="NARKOTIKA">Narkotika</option>
                    <option value="PREKURSOR">Prekursor Farmasi</option>
                    <option value="OOT">Obat-Obat Tertentu (OOT)</option>
                    <option value="OBAT_KHUSUS_RS">Obat Khusus Rumah Sakit (Sitostatika, dll.)</option>
                    <option value="ALKES">Alat Kesehatan (Alkes)</option>
                    <option value="BMHP">Bahan Medis Habis Pakai (BMHP)</option>
                    <option value="BAHAN_BAKU">Bahan Baku Obat</option>
                  </select>
                </div>

                {/* Saluran Distribusi */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Saluran Distribusi :</label>
                  <select
                    value={distributionChannel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDistributionChannel(val);
                      if (val === "PBF_ONLY") {
                        setIsSoldInPharmacy(false);
                      } else {
                        setIsSoldInPharmacy(true);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="ALL">Semua (Apotek Retail &amp; PBF Grosir)</option>
                    <option value="PBF_ONLY">Khusus PBF / RS (Tidak Boleh Dijual di Apotek)</option>
                    <option value="APOTEK_ONLY">Khusus Apotek Retail</option>
                  </select>
                </div>

                {/* NIE BPOM */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nomor Izin Edar BPOM (NIE) :</label>
                  <input
                    type="text"
                    value={bpomNumber}
                    onChange={(e) => setBpomNumber(e.target.value)}
                    placeholder="Contoh: DKL1234567890A1"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 bg-white font-mono uppercase"
                  />
                </div>

                {/* Checkbox Diizinkan Dijual di Apotek */}
                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={isSoldInPharmacy}
                      onChange={(e) => setIsSoldInPharmacy(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Diizinkan dijual di Apotek retail</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Status Jual */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Status Jual :</label>
              <div className="flex flex-wrap items-center gap-4 pl-1">
                {[
                  { id: "MASIH_DIJUAL", label: "Masih dijual" },
                  { id: "TIDAK_DIJUAL", label: "Tidak dijual" },
                  { id: "BISA_BELI_TIDAK_DIJUAL", label: "Bisa beli tidak dijual" },
                ].map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="salesStatus"
                      value={s.id}
                      checked={salesStatus === s.id}
                      onChange={(e) => setSalesStatus(e.target.value)}
                      className="text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Stok Minimum */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Stok Minimum :</label>
              <input
                type="number"
                step="0.01"
                value={minStock}
                onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Supplier :</label>
              <select
                value={supplierID}
                onChange={(e) => setSupplierID(e.target.value)}
                className="w-full sm:w-96 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">Select...</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Keterangan :</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Catatan tambahan mengenai produk"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>
          </div>
        )}

        {/* ======================= TAB 2: SATUAN DAN HARGA ======================= */}
        {activeTab === "satuan-harga" && (
          <div className="space-y-4 max-w-4xl">
            {/* Warning Alert Box matching screenshot */}
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[11.5px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>PENTING :</span>
              </div>
              <ol className="list-decimal pl-5 space-y-0.5 text-amber-800">
                <li>Mengubah satuan dan konversi setelah ada transaksi akan mengakibatkan kesalahan pada perhitungan.</li>
                <li>Persiapkan master data item yang benar sebelum pemakaian awal program. Data item yang berantakan mengakibatkan kesalahan perhitungan.</li>
              </ol>
            </div>

            {/* Kunci Harga di Transaksi Jual */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <span className="font-semibold">Kunci Harga di Transaksi Jual :</span>
                <input
                  type="checkbox"
                  checked={lockPriceOnSale}
                  onChange={(e) => setLockPriceOnSale(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                />
              </label>
            </div>

            {/* Tipe Harga Jual */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Tipe Harga Jual :</label>
              <div className="flex flex-wrap items-center gap-4 pl-1">
                {[
                  { id: "SATU_HARGA", label: "Satu Harga" },
                  { id: "SATUAN", label: "Satuan" },
                  { id: "LEVEL", label: "Level" },
                  { id: "JUMLAH", label: "Jumlah" },
                ].map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="pricingType"
                      value={p.id}
                      checked={pricingType === p.id}
                      onChange={(e) => setPricingType(e.target.value)}
                      className="text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Satuan */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Satuan :</label>
              <select
                value={baseUnitID}
                onChange={(e) => setBaseUnitID(e.target.value)}
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">Select...</option>
                {units.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.code} - {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kode Barcode */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Kode Barcode :</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan / ketik barcode"
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">SKU (Stock Keeping Unit) :</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Kode SKU internal produk"
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* Row: Harga Pokok, Proc %, Harga Jual */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Harga Pokok :</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => handlePurchasePriceChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Proc % :</label>
                <input
                  type="number"
                  step="0.01"
                  value={markupPercent}
                  onChange={(e) => handleMarkupChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Harga Jual :</label>
                <input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => handleSellingPriceChange(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 border rounded text-slate-800 text-right focus:outline-none bg-white ${
                    purchasePrice > 0 && sellingPrice < purchasePrice
                      ? "border-rose-500 text-rose-700 bg-rose-50/40"
                      : "border-slate-300 focus:border-sky-500"
                  }`}
                />
                {/* Min. Profit Alert / Guideline from General Settings */}
                {generalSettings?.min_profit_percent && parseFloat(generalSettings.min_profit_percent) > 0 && (
                  <div className="mt-1 text-[10px]">
                    {markupPercent < parseFloat(generalSettings.min_profit_percent) ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        ⚠️ Margin ({markupPercent.toFixed(1)}%) &lt; Min Profit ({generalSettings.min_profit_percent}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">
                        ✓ Memenuhi Min Profit ({generalSettings.min_profit_percent}%)
                      </span>
                    )}
                  </div>
                )}
                {purchasePrice > 0 && sellingPrice < purchasePrice && (
                  <div className="mt-0.5 text-[10px] text-rose-600 font-bold">
                    ⚠️ Harga jual di bawah harga pokok!
                  </div>
                )}
              </div>
            </div>

            {/* Row: Poin, Komisi Sales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Poin :</label>
                <input
                  type="number"
                  step="0.01"
                  value={points}
                  onChange={(e) => setPoints(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Komisi Sales :</label>
                <input
                  type="number"
                  step="0.01"
                  value={salesCommission}
                  onChange={(e) => setSalesCommission(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 3: DIMENSI BARANG ======================= */}
        {activeTab === "dimensi-barang" && (
          <div className="space-y-4 max-w-4xl">
            {/* Info Alert Box matching screenshot */}
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded text-[11.5px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-800">
                <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
                <span>KETERANGAN :</span>
              </div>
              <ol className="list-decimal pl-5 space-y-0.5 text-blue-800">
                <li>Data yang tampil sesuai dengan satuan yang telah diinput pada tab Satuan dan Harga.</li>
                <li>Satuan ukur Berat = gram, Satuan ukur Panjang, Lebar dan Tinggi = cm.</li>
              </ol>
            </div>

            {/* Row 1: Berat & Panjang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Berat (gram) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Panjang (cm) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>
            </div>

            {/* Row 2: Lebar & Tinggi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Lebar (cm) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Tinggi (cm) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 4: POTONGAN HARGA JUAL ======================= */}
        {activeTab === "potongan-harga" && (
          <div className="space-y-3">
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold">
                    <th className="py-2 px-3 w-12 border-r border-slate-300 text-center">No</th>
                    <th className="py-2 px-3 border-r border-slate-300">Kode Grup</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right">Potongan 1 (%)</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right">Potongan 2 (%)</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right">Potongan 3 (%)</th>
                    <th className="py-2 px-3 text-right">Potongan 4 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                        No data
                      </td>
                    </tr>
                  ) : (
                    discounts.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedDiscountIndex(idx)}
                        className={`border-b border-slate-200 cursor-pointer ${
                          selectedDiscountIndex === idx ? "bg-sky-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center">{idx + 1}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.group_code}
                            onChange={(e) => {
                              const updated = [...discounts];
                              updated[idx].group_code = e.target.value;
                              setDiscounts(updated);
                            }}
                            className="w-full px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.discount_1}
                            onChange={(e) => {
                              const updated = [...discounts];
                              updated[idx].discount_1 = parseFloat(e.target.value) || 0;
                              setDiscounts(updated);
                            }}
                            className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.discount_2}
                            onChange={(e) => {
                              const updated = [...discounts];
                              updated[idx].discount_2 = parseFloat(e.target.value) || 0;
                              setDiscounts(updated);
                            }}
                            className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.discount_3}
                            onChange={(e) => {
                              const updated = [...discounts];
                              updated[idx].discount_3 = parseFloat(e.target.value) || 0;
                              setDiscounts(updated);
                            }}
                            className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs bg-white"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.discount_4}
                            onChange={(e) => {
                              const updated = [...discounts];
                              updated[idx].discount_4 = parseFloat(e.target.value) || 0;
                              setDiscounts(updated);
                            }}
                            className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs bg-white"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Buttons matching screenshot */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddDiscount}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-50 transition text-xs font-medium shadow-2xs"
              >
                Tambah Potongan
              </button>
              <button
                type="button"
                onClick={handleRemoveDiscount}
                disabled={discounts.length === 0}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-50 transition text-xs font-medium disabled:opacity-50 shadow-2xs"
              >
                Hapus Potongan
              </button>
            </div>
          </div>
        )}

        {/* ======================= TAB 5: AKUNTANSI ======================= */}
        {activeTab === "akuntansi" && (
          <div className="space-y-3.5 max-w-4xl">
            {/* Harga Pokok Penjualan */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Harga Pokok Penjualan :</label>
              <select
                value={cogsAccountID}
                onChange={(e) => setCogsAccountID(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">HARGA POKOK PENJUALAN</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pendapatan Jual */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Pendapatan Jual :</label>
              <select
                value={salesAccountID}
                onChange={(e) => setSalesAccountID(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">PENDAPATAN JUAL</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pendapatan Jasa */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Pendapatan Jasa :</label>
              <select
                value={serviceRevenueAccountID}
                onChange={(e) => setServiceRevenueAccountID(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">PENDAPATAN JASA</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Persediaan */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Persediaan :</label>
              <select
                value={inventoryAccountID}
                onChange={(e) => setInventoryAccountID(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">PERSEDIAAN BARANG</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Biaya Non Inventory */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Biaya Non Inventory :</label>
              <select
                value={nonInventoryExpenseAccountID}
                onChange={(e) => setNonInventoryExpenseAccountID(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">BIAYA BELANJA NON INVENTORY</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Persediaan Lainnya */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Persediaan Lainnya :</label>
              <select
                value={wipInventoryAccountID}
                onChange={(e) => setWipInventoryAccountID(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">PERSEDIAAN BARANG DALAM PROSES</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Biaya Tenaga Kerja */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Biaya Tenaga Kerja :</label>
              <select
                value={assemblyLaborAccountID}
                onChange={(e) => setAssemblyLaborAccountID(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">HUTANG GAJI PROSES PERAKITAN</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Biaya Overhead */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Biaya Overhead :</label>
              <select
                value={assemblyOverheadAccountID}
                onChange={(e) => setAssemblyOverheadAccountID(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">HUTANG BIAYA OVERHEAD PROSES PERAKITAN</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ======================= TAB 6: GAMBAR ======================= */}
        {activeTab === "gambar" && (
          <div className="space-y-4 max-w-4xl">
            {/* Alert Box matching screenshot */}
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded text-[11.5px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-800">
                <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
                <span>KETERANGAN :</span>
              </div>
              <ol className="list-decimal pl-5 space-y-0.5 text-blue-800">
                <li>Batas upload max 5 gambar.</li>
                <li>Apabila size gambar terlalu besar silakan lakukan proses crop atau resize ukuran.</li>
                <li>Jika melakukan duplikasi data, gambar tidak terduplikasi, silakan upload gambar kembali.</li>
              </ol>
            </div>

            {/* Tambah Gambar Button */}
            <div>
              <button
                type="button"
                onClick={handleAddImage}
                className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 bg-white hover:bg-slate-50 transition text-xs font-medium flex items-center gap-1.5 shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Tambah Gambar</span>
              </button>
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group border border-slate-200 rounded p-1.5 bg-slate-50">
                    <img
                      src={img.image_url}
                      alt={`Product img ${idx + 1}`}
                      className="w-full h-28 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-80 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs pt-1">Belum ada gambar yang diunggah.</p>
            )}
          </div>
        )}

        {/* ======================= TAB 7: SHARE ITEM ======================= */}
        {activeTab === "share-item" && (
          <div className="space-y-4 max-w-4xl">
            {/* Item dapat dishare */}
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Item dapat dishare :</span>
              <button
                type="button"
                onClick={() => setCanShare(!canShare)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  canShare ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    canShare ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-[11px] font-semibold text-slate-500">{canShare ? "ON" : "OFF"}</span>
            </div>

            {/* Link Share */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Link Share :</label>
              <div className="flex items-center max-w-2xl border border-slate-300 rounded overflow-hidden bg-white">
                <input
                  type="text"
                  readOnly
                  value={
                    initialData?.id
                      ? `https://pos.ketoko.co.id/share/item/${initialData.id}`
                      : "[simpan data item terlebih dahulu]"
                  }
                  className="w-full px-2.5 py-1.5 text-slate-500 bg-slate-50 focus:outline-none text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (initialData?.id) {
                      navigator.clipboard.writeText(`https://pos.ketoko.co.id/share/item/${initialData.id}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }
                  }}
                  className="px-3 py-1.5 bg-white border-l border-slate-300 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 shrink-0 transition text-xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedLink ? "Tersalin" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Youtube Id Video */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Youtube Id Video :</label>
              <input
                type="text"
                value={youtubeVideoID}
                onChange={(e) => setYoutubeVideoID(e.target.value)}
                placeholder="Masukkan id video youtube"
                className="w-full sm:w-96 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
              <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 text-blue-900 rounded text-[11px] flex items-center gap-1.5 max-w-2xl">
                <Lightbulb className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Contoh url video youtube : https://youtu.be/5aS9MYzxyc. Yang di input : <strong>5aS9MYzxyc</strong>
                </span>
              </div>
            </div>

            {/* Kondisi Barang */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Kondisi Barang :</label>
              <div className="flex items-center gap-4 pl-1">
                {[
                  { id: "BARU", label: "Baru" },
                  { id: "BEKAS", label: "Bekas" },
                ].map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="itemCondition"
                      value={c.id}
                      checked={itemCondition === c.id}
                      onChange={(e) => setItemCondition(e.target.value)}
                      className="text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Stok Share */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Stok Share :</label>
              <select
                value={shareWarehouseID}
                onChange={(e) => setShareWarehouseID(e.target.value)}
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">Pilih departemen/gudang stok</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub Keterangan with WYSIWYG toolbar */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Sub Keterangan :</label>
              <div className="border border-slate-300 rounded overflow-hidden max-w-3xl bg-white">
                <div className="flex items-center flex-wrap gap-1 p-1 bg-slate-100 border-b border-slate-300 text-slate-600">
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                  <span className="w-[1px] h-4 bg-slate-300 mx-0.5"></span>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded font-bold" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded italic" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                  <span className="w-[1px] h-4 bg-slate-300 mx-0.5"></span>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Justify"><AlignJustify className="w-3.5 h-3.5" /></button>
                  <span className="w-[1px] h-4 bg-slate-300 mx-0.5"></span>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Bulleted List"><List className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Link"><LinkIcon className="w-3.5 h-3.5" /></button>
                </div>
                <textarea
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                  rows={4}
                  placeholder="Ketik ringkasan deskripsi untuk share produk..."
                  className="w-full p-2.5 focus:outline-none text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Keterangan with WYSIWYG toolbar */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Keterangan :</label>
              <div className="border border-slate-300 rounded overflow-hidden max-w-3xl bg-white">
                <div className="flex items-center flex-wrap gap-1 p-1 bg-slate-100 border-b border-slate-300 text-slate-600">
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                  <span className="w-[1px] h-4 bg-slate-300 mx-0.5"></span>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded font-bold" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded italic" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                  <span className="w-[1px] h-4 bg-slate-300 mx-0.5"></span>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Justify"><AlignJustify className="w-3.5 h-3.5" /></button>
                  <span className="w-[1px] h-4 bg-slate-300 mx-0.5"></span>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Bulleted List"><List className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Link"><LinkIcon className="w-3.5 h-3.5" /></button>
                </div>
                <textarea
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  rows={5}
                  placeholder="Ketik deskripsi lengkap produk..."
                  className="w-full p-2.5 focus:outline-none text-xs text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 8: SYNCHRONIZE MARKETPLACE ======================= */}
        {activeTab === "sync-marketplace" && (
          <div className="space-y-4 max-w-4xl">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11.5px] text-slate-700">
              <span className="font-semibold block mb-1">Integrasi Marketplace :</span>
              <p className="text-slate-500">
                Hubungkan produk ini dengan marketplace aktif seperti Tokopedia, Shopee, dan TikTok Shop untuk sinkronisasi otomatis harga dan stok.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Aktifkan Sinkronisasi :</span>
              <button
                type="button"
                onClick={() => setSyncMarketplace(!syncMarketplace)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  syncMarketplace ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    syncMarketplace ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-[11px] font-semibold text-slate-500">{syncMarketplace ? "ON" : "OFF"}</span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Kode / ID Marketplace :</label>
              <input
                type="text"
                value={marketplaceCode}
                onChange={(e) => setMarketplaceCode(e.target.value)}
                placeholder="ID Produk atau SKU di Tokopedia / Shopee"
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>
          </div>
        )}

        {/* ======================= TAB 9: DATA PENDUKUNG PAJAK ======================= */}
        {activeTab === "data-pajak" && (
          <div className="space-y-4 max-w-4xl">
            {/* Info Alert Box matching screenshot */}
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded text-[11.5px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-800">
                <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
                <span>KETERANGAN :</span>
              </div>
              <ol className="list-decimal pl-5 space-y-0.5 text-blue-800">
                <li>Referensi Kode Barang dan Jasa Maximal 5 Karakter.</li>
                <li>Referensi Kode Barang dan Jasa Harus sesuai dengan Referensi DJP.</li>
              </ol>
            </div>

            {/* Jenis Pajak */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Jenis Pajak :</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="NON_PAJAK">Select...</option>
                <option value="NON_PAJAK">NON PAJAK</option>
                <option value="PPN_11">PPN 11%</option>
                <option value="PPN_12">PPN 12%</option>
                <option value="PAJAK_FINAL">PAJAK FINAL</option>
              </select>
            </div>

            {/* Pajak Include % */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Pajak Include % :</label>
              <input
                type="number"
                step="0.01"
                value={taxIncludePercent}
                onChange={(e) => setTaxIncludePercent(parseFloat(e.target.value) || 0)}
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 text-right focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* Kode Referensi Barang Jasa */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Kode Referensi Barang Jasa :</label>
              <input
                type="text"
                maxLength={5}
                value={taxReferenceCode}
                onChange={(e) => setTaxReferenceCode(e.target.value.toUpperCase())}
                placeholder="Maks 5 Karakter DJP"
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* Opsi Barang Jasa */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Opsi Barang Jasa :</label>
              <select
                value={taxGoodsServicesOption}
                onChange={(e) => setTaxGoodsServicesOption(e.target.value)}
                className="w-full sm:w-80 px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="">Select...</option>
                <option value="BARANG">BARANG</option>
                <option value="JASA">JASA</option>
                <option value="BARANG_DAN_JASA">BARANG DAN JASA</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer Area with Green Button "Simpan" matching screenshot on every tab */}
      <div className="shrink-0 p-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="h-7 px-4 bg-[#009b62] hover:bg-[#008754] text-white font-bold rounded-lg flex items-center gap-1.5 text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>
      </div>
    </form>
  );
};
