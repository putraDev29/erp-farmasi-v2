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
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";
import { CurrencyInput } from "@/components/common/CurrencyInput";

interface ItemDiscountRow {
  group_code: string;
  customer_group_id?: string;
  discount_1: number;
  discount_2: number;
  discount_3: number;
  discount_4: number;
}

interface PricingRow {
  unit_id: string;
  is_base: boolean;
  conversion: number;
  barcode: string;
  sku: string;
  points: number;
  sales_commission: number;
  purchase_price: number;
  proc1: number;
  price1: number;
  proc2: number;
  price2: number;
  proc3: number;
  price3: number;
  proc4: number;
  price4: number;
  proc5: number;
  price5: number;
  proc6: number;
  price6: number;
  qty1: number;
  qty2: number;
  qty3: number;
  qty4: number;
}

const calcProcFromPrices = (cost: number, sell: number): number => {
  if (cost <= 0 || sell <= 0) return 0;
  return Number((((sell - cost) / cost) * 100).toFixed(2));
};

const calcSellFromProc = (cost: number, proc: number): number => {
  if (cost <= 0) return 0;
  return Number((cost * (1 + proc / 100)).toFixed(2));
};

const createEmptyPricingRow = (isBase = false): PricingRow => ({
  unit_id: "",
  is_base: isBase,
  conversion: 1,
  barcode: "",
  sku: "",
  points: 0,
  sales_commission: 0,
  purchase_price: 0,
  proc1: 0,
  price1: 0,
  proc2: 0,
  price2: 0,
  proc3: 0,
  price3: 0,
  proc4: 0,
  price4: 0,
  proc5: 0,
  price5: 0,
  proc6: 0,
  price6: 0,
  qty1: 0,
  qty2: 0,
  qty3: 0,
  qty4: 0,
});

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
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([createEmptyPricingRow(true)]);
  const [selectedPricingRowIdx, setSelectedPricingRowIdx] = useState<number | null>(null);

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
      const initBaseUnitID = initialData.base_unit_id || "";
      const initPurchasePrice = Number(initialData.purchase_price || 0);
      const initSellingPrice = Number(initialData.selling_price || 0);
      // Proc1 dipertahankan dari markup_percent yang tersimpan (jika belum ada baru hitung dari selisih harga)
      const storedMarkup = Number(initialData.markup_percent || 0);
      const initProc1 =
        storedMarkup !== 0
          ? storedMarkup
          : initPurchasePrice > 0 && initSellingPrice > 0
          ? calcProcFromPrices(initPurchasePrice, initSellingPrice)
          : 0;

      setBaseUnitID(initBaseUnitID);
      setBarcode(initialData.barcode || "");
      setSku(initialData.sku || "");
      setPurchasePrice(initPurchasePrice);
      setMarkupPercent(initProc1);
      setSellingPrice(initSellingPrice);
      setPoints(initialData.points || 0);
      setSalesCommission(initialData.sales_commission || 0);

      // Build pricingRows from initialData + prices + conversions
      const rawPrices: any[] = Array.isArray(initialData.prices) ? initialData.prices : [];
      const rawConversions: any[] = Array.isArray(initialData.conversions) ? initialData.conversions : [];

      const applyUnitPrices = (row: PricingRow, unitId: string) => {
        const unitPrices = rawPrices.filter((p) => p.unit_id === unitId);
        unitPrices.forEach((p) => {
          const tier = Number(p.tier_index || 1);
          const priceVal = Number(p.price || 0);
          const storedProc = Number(p.markup_percent || 0);
          const procVal =
            storedProc !== 0
              ? storedProc
              : row.purchase_price > 0 && priceVal > 0
              ? calcProcFromPrices(row.purchase_price, priceVal)
              : 0;
          if (tier === 1) {
            row.price1 = priceVal || row.price1;
            row.proc1 = procVal || row.proc1;
            if (p.price_type === "JUMLAH") row.qty1 = Number(p.min_qty || 0);
          } else if (tier === 2) {
            row.price2 = priceVal;
            row.proc2 = procVal;
            if (p.price_type === "JUMLAH") row.qty2 = Number(p.min_qty || 0);
          } else if (tier === 3) {
            row.price3 = priceVal;
            row.proc3 = procVal;
            if (p.price_type === "JUMLAH") row.qty3 = Number(p.min_qty || 0);
          } else if (tier === 4) {
            row.price4 = priceVal;
            row.proc4 = procVal;
            if (p.price_type === "JUMLAH") row.qty4 = Number(p.min_qty || 0);
          } else if (tier === 5) {
            row.price5 = priceVal;
            row.proc5 = procVal;
          } else if (tier === 6) {
            row.price6 = priceVal;
            row.proc6 = procVal;
          }
        });
        return row;
      };

      const baseRow: PricingRow = applyUnitPrices(
        {
          ...createEmptyPricingRow(true),
          unit_id: initBaseUnitID,
          conversion: 1,
          barcode: initialData.barcode || "",
          sku: initialData.sku || "",
          points: Number(initialData.points || 0),
          sales_commission: Number(initialData.sales_commission || 0),
          purchase_price: initPurchasePrice,
          proc1: initProc1,
          price1: initSellingPrice,
        },
        initBaseUnitID
      );

      const convRows: PricingRow[] = rawConversions
        .filter((c) => !(c.from_unit_id === initBaseUnitID && Number(c.multiplier) === 1))
        .map((c) => {
          const convMult = Number(c.multiplier || 1);
          const convCost = Number(c.purchase_price || initPurchasePrice * convMult || 0);
          const convSell = Number(c.selling_price || 0);
          const convStoredProc = Number(c.markup_percent || 0);
          const convProc =
            convStoredProc !== 0
              ? convStoredProc
              : convCost > 0 && convSell > 0
              ? calcProcFromPrices(convCost, convSell)
              : 0;
          return applyUnitPrices(
            {
              ...createEmptyPricingRow(false),
              unit_id: c.from_unit_id || "",
              conversion: convMult,
              barcode: c.barcode || "",
              sku: c.sku || "",
              points: Number(c.points || 0),
              sales_commission: Number(c.sales_commission || 0),
              purchase_price: convCost,
              proc1: convProc,
              price1: convSell,
            },
            c.from_unit_id
          );
        });

      setPricingRows([baseRow, ...convRows]);

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
      const defaultUnitId = units[0].id;
      setBaseUnitID(defaultUnitId);
      setPricingRows((prev) => {
        if (prev.length === 0) return [{ ...createEmptyPricingRow(true), unit_id: defaultUnitId }];
        const next = [...prev];
        if (!next[0].unit_id) {
          next[0] = { ...next[0], unit_id: defaultUnitId };
        }
        return next;
      });
    }
  }, [units, baseUnitID]);

  // Inline table cell updater for Satuan dan Harga
  const updatePricingRow = (rowIndex: number, updater: (row: PricingRow, allRows: PricingRow[]) => PricingRow) => {
    setPricingRows((prev) => {
      const next = [...prev];
      const updated = updater({ ...next[rowIndex] }, next);
      next[rowIndex] = updated;

      // Sync row 0 (Satuan Dasar) back to top-level states
      if (rowIndex === 0) {
        setBaseUnitID(updated.unit_id);
        setBarcode(updated.barcode);
        setSku(updated.sku);
        setPoints(updated.points);
        setSalesCommission(updated.sales_commission);
        setPurchasePrice(updated.purchase_price);
        setMarkupPercent(updated.proc1);
        setSellingPrice(updated.price1);
      }
      return next;
    });
  };

  const handleRowCostChange = (rowIndex: number, newCost: number) => {
    updatePricingRow(rowIndex, (row) => {
      row.purchase_price = newCost;
      ([1, 2, 3, 4, 5, 6] as const).forEach((n) => {
        const procKey = `proc${n}` as keyof PricingRow;
        const priceKey = `price${n}` as keyof PricingRow;
        const procVal = Number(row[procKey] || 0);
        const priceVal = Number(row[priceKey] || 0);
        if (procVal !== 0) {
          (row as any)[priceKey] = calcSellFromProc(newCost, procVal);
        } else if (priceVal > 0 && newCost > 0) {
          (row as any)[procKey] = calcProcFromPrices(newCost, priceVal);
        }
      });
      return row;
    });
  };

  const handleRowProcChange = (rowIndex: number, tier: 1 | 2 | 3 | 4 | 5 | 6, newProc: number) => {
    updatePricingRow(rowIndex, (row) => {
      const procKey = `proc${tier}` as keyof PricingRow;
      const priceKey = `price${tier}` as keyof PricingRow;
      (row as any)[procKey] = newProc;
      if (row.purchase_price > 0) {
        (row as any)[priceKey] = calcSellFromProc(row.purchase_price, newProc);
      }
      return row;
    });
  };

  const handleRowPriceChange = (rowIndex: number, tier: 1 | 2 | 3 | 4 | 5 | 6, newPrice: number) => {
    updatePricingRow(rowIndex, (row) => {
      const procKey = `proc${tier}` as keyof PricingRow;
      const priceKey = `price${tier}` as keyof PricingRow;
      (row as any)[priceKey] = newPrice;
      if (row.purchase_price > 0) {
        (row as any)[procKey] = calcProcFromPrices(row.purchase_price, newPrice);
      }
      return row;
    });
  };

  const handleRowConversionChange = (rowIndex: number, newConv: number) => {
    updatePricingRow(rowIndex, (row, allRows) => {
      row.conversion = newConv;
      const baseCost = allRows[0]?.purchase_price || 0;
      if (baseCost > 0 && newConv > 0) {
        const newCost = Number((baseCost * newConv).toFixed(2));
        row.purchase_price = newCost;
        ([1, 2, 3, 4, 5, 6] as const).forEach((n) => {
          const procKey = `proc${n}` as keyof PricingRow;
          const priceKey = `price${n}` as keyof PricingRow;
          const procVal = Number(row[procKey] || 0);
          if (procVal !== 0) {
            (row as any)[priceKey] = calcSellFromProc(newCost, procVal);
          }
        });
      }
      return row;
    });
  };

  const handleAddUnitRow = () => {
    const baseRow = pricingRows[0] || createEmptyPricingRow(true);
    const defaultUnit = units.find((u: any) => u.id !== baseRow.unit_id)?.id || units[0]?.id || "";
    setPricingRows((prev) => [
      ...prev,
      {
        ...createEmptyPricingRow(false),
        unit_id: defaultUnit,
        conversion: 1,
        purchase_price: baseRow.purchase_price,
      },
    ]);
  };

  const handleDeleteUnitRow = () => {
    if (selectedPricingRowIdx === null || selectedPricingRowIdx === 0) {
      return;
    }
    setPricingRows((prev) => prev.filter((_, idx) => idx !== selectedPricingRowIdx));
    setSelectedPricingRowIdx(null);
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

    const row0 = pricingRows[0] || createEmptyPricingRow(true);
    const activeBaseUnitId = row0.unit_id || baseUnitID || null;

    // Build conversions from non-base rows
    const conversionsPayload = pricingRows
      .filter((r, idx) => idx > 0 && r.unit_id && activeBaseUnitId)
      .map((r) => ({
        from_unit_id: r.unit_id,
        to_unit_id: activeBaseUnitId,
        multiplier: Number(r.conversion) || 1,
        barcode: r.barcode.trim(),
        sku: r.sku.trim(),
        points: Number(r.points) || 0,
        sales_commission: Number(r.sales_commission) || 0,
        purchase_price: Number(r.purchase_price) || 0,
        markup_percent: Number(r.proc1) || 0,
        selling_price: Number(r.price1) || 0,
      }));

    // Build prices from rows based on pricingType
    const pricesPayload: any[] = [];
    pricingRows.forEach((r) => {
      const uid = r.unit_id || activeBaseUnitId;
      if (!uid) return;
      if (pricingType === "LEVEL") {
        ([1, 2, 3, 4, 5, 6] as const).forEach((tier) => {
          const priceVal = Number((r as any)[`price${tier}`] || 0);
          const procVal = Number((r as any)[`proc${tier}`] || 0);
          if (priceVal > 0 || procVal !== 0) {
            pricesPayload.push({
              unit_id: uid,
              price_type: "LEVEL",
              tier_index: tier,
              min_qty: 1,
              markup_percent: procVal,
              price: priceVal,
            });
          }
        });
      } else if (pricingType === "JUMLAH") {
        ([1, 2, 3, 4] as const).forEach((tier) => {
          const priceVal = Number((r as any)[`price${tier}`] || 0);
          const procVal = Number((r as any)[`proc${tier}`] || 0);
          const qtyVal = Number((r as any)[`qty${tier}`] || 0);
          if (priceVal > 0 || procVal !== 0 || qtyVal > 0) {
            pricesPayload.push({
              unit_id: uid,
              price_type: "JUMLAH",
              tier_index: tier,
              min_qty: qtyVal,
              markup_percent: procVal,
              price: priceVal,
            });
          }
        });
      } else {
        if (r.price1 > 0 || r.proc1 !== 0) {
          pricesPayload.push({
            unit_id: uid,
            price_type: pricingType,
            tier_index: 1,
            min_qty: 1,
            markup_percent: Number(r.proc1) || 0,
            price: Number(r.price1) || 0,
          });
        }
      }
    });

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
      base_unit_id: activeBaseUnitId,
      barcode: row0.barcode.trim(),
      sku: row0.sku.trim(),
      purchase_price: Number(row0.purchase_price),
      markup_percent: Number(row0.proc1),
      selling_price: Number(row0.price1),
      points: Number(row0.points),
      sales_commission: Number(row0.sales_commission),
      conversions: conversionsPayload,
      prices: pricesPayload,

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
          <div className="space-y-3 w-full">
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
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
                <span className="font-medium">Kunci Harga di Transaksi Jual :</span>
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
              <label className="block text-slate-700 font-medium mb-1.5">Tipe Harga Jual :</label>
              <div className="flex flex-wrap items-center gap-5 pl-0.5">
                {[
                  { id: "SATU_HARGA", label: "Satu Harga" },
                  { id: "SATUAN", label: "Satuan" },
                  { id: "LEVEL", label: "Level" },
                  { id: "JUMLAH", label: "Jumlah" },
                ].map((p) => (
                  <label key={p.id} className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
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

            {/* Inline Editable Table matching Screenshot 1, 2, 3 */}
            <div className="border border-slate-300 rounded overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2 px-2.5 border-r border-slate-300 text-center w-9">No</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 min-w-[90px]">Satuan</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 min-w-[100px]">Jns Satuan</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 text-right min-w-[85px]">
                      {pricingType === "SATUAN" || pricingType === "SATU_HARGA" ? "Jml Konversi" : "Konversi"}
                    </th>
                    <th className="py-2 px-2.5 border-r border-slate-300 min-w-[110px]">Barcode</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 min-w-[95px]">SKU</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 text-right min-w-[65px]">Poin</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 text-right min-w-[75px]">Komisi</th>
                    <th className="py-2 px-2.5 border-r border-slate-300 text-right min-w-[105px]">Harga Pokok</th>

                    {(pricingType === "SATU_HARGA" || pricingType === "SATUAN") && (
                      <>
                        <th className="py-2 px-2.5 border-r border-slate-300 text-right min-w-[80px]">Proc(%)</th>
                        <th className="py-2 px-2.5 text-right min-w-[110px]">Harga Jual</th>
                      </>
                    )}

                    {pricingType === "LEVEL" && (
                      <>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc1(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc2(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc3(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc4(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc5(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc6(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[95px]">HJ Level 1</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[95px]">HJ Level 2</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[95px]">HJ level 3</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[95px]">HJ level 4</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[95px]">HJ level 5</th>
                        <th className="py-2 px-2 text-right min-w-[95px]">HJ level 6</th>
                      </>
                    )}

                    {pricingType === "JUMLAH" && (
                      <>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[75px]">Jumlah 1</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[75px]">Jumlah 2</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[75px]">Jumlah 3</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[75px]">Jumlah 4</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc1(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc2(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc3(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[72px]">Proc4(%)</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[95px]">Harga 1</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[95px]">Harga 2</th>
                        <th className="py-2 px-2 border-r border-slate-300 text-right min-w-[95px]">Harga 3</th>
                        <th className="py-2 px-2 text-right min-w-[95px]">Harga 4</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(pricingType === "SATU_HARGA" ? pricingRows.slice(0, 1) : pricingRows).map((row, idx) => {
                    const isSelected = selectedPricingRowIdx === idx;
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedPricingRowIdx(idx)}
                        className={`transition-colors ${
                          isSelected ? "bg-sky-50/90" : "hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="py-1.5 px-2.5 border-r border-slate-200 text-center text-slate-600 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200">
                          <select
                            value={row.unit_id}
                            onChange={(e) =>
                              updatePricingRow(idx, (r) => ({ ...r, unit_id: e.target.value }))
                            }
                            className="w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-slate-800 font-medium focus:outline-none"
                          >
                            <option value="">Pilih...</option>
                            {units.map((u: any) => (
                              <option key={u.id} value={u.id}>
                                {u.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                          {idx === 0 ? "Satuan Dasar" : "Satuan Konversi"}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200">
                          {idx === 0 ? (
                            <div className="px-1.5 py-1 text-right font-mono text-slate-700">1.00</div>
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              value={row.conversion}
                              onChange={(e) => handleRowConversionChange(idx, parseFloat(e.target.value) || 1)}
                              className="w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono text-slate-800 focus:outline-none"
                            />
                          )}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.barcode}
                            onChange={(e) =>
                              updatePricingRow(idx, (r) => ({ ...r, barcode: e.target.value }))
                            }
                            placeholder="-"
                            className="w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white font-mono text-slate-800 focus:outline-none"
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.sku}
                            onChange={(e) =>
                              updatePricingRow(idx, (r) => ({ ...r, sku: e.target.value }))
                            }
                            placeholder="-"
                            className="w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white font-mono text-slate-800 focus:outline-none"
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={row.points}
                            onChange={(e) =>
                              updatePricingRow(idx, (r) => ({ ...r, points: parseFloat(e.target.value) || 0 }))
                            }
                            className="w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono text-slate-800 focus:outline-none"
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200">
                          <CurrencyInput
                            value={row.sales_commission}
                            onChange={(val) =>
                              updatePricingRow(idx, (r) => ({
                                ...r,
                                sales_commission: val,
                              }))
                            }
                            className="w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono text-slate-800 focus:outline-none"
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200">
                          <CurrencyInput
                            value={row.purchase_price}
                            onChange={(val) => handleRowCostChange(idx, val)}
                            className="w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono text-slate-800 focus:outline-none"
                          />
                        </td>

                        {(pricingType === "SATU_HARGA" || pricingType === "SATUAN") && (
                          <>
                            <td className="py-1 px-1.5 border-r border-slate-200">
                              <input
                                type="number"
                                step="0.01"
                                value={row.proc1}
                                onChange={(e) => handleRowProcChange(idx, 1, parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono text-slate-800 focus:outline-none"
                              />
                            </td>
                            <td className="py-1 px-1.5">
                              <CurrencyInput
                                value={row.price1}
                                onChange={(val) => handleRowPriceChange(idx, 1, val)}
                                className={`w-full px-1.5 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono font-semibold focus:outline-none ${
                                  row.purchase_price > 0 && row.price1 < row.purchase_price
                                    ? "text-rose-600"
                                    : "text-slate-900"
                                }`}
                              />
                            </td>
                          </>
                        )}

                        {pricingType === "LEVEL" && (
                          <>
                            {([1, 2, 3, 4, 5, 6] as const).map((tier) => (
                              <td key={`proc-${tier}`} className="py-1 px-1 border-r border-slate-200">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={(row as any)[`proc${tier}`]}
                                  onChange={(e) =>
                                    handleRowProcChange(idx, tier, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-1 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono text-slate-800 focus:outline-none"
                                />
                              </td>
                            ))}
                            {([1, 2, 3, 4, 5, 6] as const).map((tier) => (
                              <td
                                key={`price-${tier}`}
                                className={`py-1 px-1 ${tier < 6 ? "border-r border-slate-200" : ""}`}
                              >
                                <CurrencyInput
                                  value={(row as any)[`price${tier}`]}
                                  onChange={(val) => handleRowPriceChange(idx, tier, val)}
                                  className={`w-full px-1 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono font-semibold focus:outline-none ${
                                    row.purchase_price > 0 &&
                                    (row as any)[`price${tier}`] > 0 &&
                                    (row as any)[`price${tier}`] < row.purchase_price
                                      ? "text-rose-600"
                                      : "text-slate-900"
                                  }`}
                                />
                              </td>
                            ))}
                          </>
                        )}

                        {pricingType === "JUMLAH" && (
                          <>
                            {([1, 2, 3, 4] as const).map((tier) => (
                              <td key={`qty-${tier}`} className="py-1 px-1 border-r border-slate-200">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={(row as any)[`qty${tier}`]}
                                  onChange={(e) =>
                                    updatePricingRow(idx, (r) => ({
                                      ...r,
                                      [`qty${tier}`]: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  className="w-full px-1 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono text-slate-800 focus:outline-none"
                                />
                              </td>
                            ))}
                            {([1, 2, 3, 4] as const).map((tier) => (
                              <td key={`jproc-${tier}`} className="py-1 px-1 border-r border-slate-200">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={(row as any)[`proc${tier}`]}
                                  onChange={(e) =>
                                    handleRowProcChange(idx, tier, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-1 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono text-slate-800 focus:outline-none"
                                />
                              </td>
                            ))}
                            {([1, 2, 3, 4] as const).map((tier) => (
                              <td
                                key={`jprice-${tier}`}
                                className={`py-1 px-1 ${tier < 4 ? "border-r border-slate-200" : ""}`}
                              >
                                <CurrencyInput
                                  value={(row as any)[`price${tier}`]}
                                  onChange={(val) => handleRowPriceChange(idx, tier, val)}
                                  className={`w-full px-1 py-1 border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent focus:bg-white text-right font-mono font-semibold focus:outline-none ${
                                    row.purchase_price > 0 &&
                                    (row as any)[`price${tier}`] > 0 &&
                                    (row as any)[`price${tier}`] < row.purchase_price
                                      ? "text-rose-600"
                                      : "text-slate-900"
                                  }`}
                                />
                              </td>
                            ))}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action buttons below table: Tambah Satuan & Hapus Satuan */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={pricingType === "SATU_HARGA"}
                onClick={handleAddUnitRow}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 font-medium text-xs shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Tambah Satuan
              </button>
              <button
                type="button"
                disabled={
                  pricingType === "SATU_HARGA" ||
                  selectedPricingRowIdx === null ||
                  selectedPricingRowIdx === 0
                }
                onClick={handleDeleteUnitRow}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-300 rounded text-slate-700 hover:text-rose-700 font-medium text-xs shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Hapus Satuan
              </button>
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
              <SearchableAccountSelect
                accounts={accounts}
                value={cogsAccountID}
                onChange={(val) => setCogsAccountID(val)}
                placeholder="-- Pilih / Cari Akun HPP --"
                buttonClassName="h-8 text-xs"
              />
            </div>

            {/* Pendapatan Jual */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Pendapatan Jual :</label>
              <SearchableAccountSelect
                accounts={accounts}
                value={salesAccountID}
                onChange={(val) => setSalesAccountID(val)}
                placeholder="-- Pilih / Cari Akun Pendapatan Jual --"
                buttonClassName="h-8 text-xs"
              />
            </div>

            {/* Pendapatan Jasa */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Pendapatan Jasa :</label>
              <SearchableAccountSelect
                accounts={accounts}
                value={serviceRevenueAccountID}
                onChange={(val) => setServiceRevenueAccountID(val)}
                placeholder="-- Pilih / Cari Akun Pendapatan Jasa --"
                buttonClassName="h-8 text-xs"
              />
            </div>

            {/* Persediaan */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Persediaan :</label>
              <SearchableAccountSelect
                accounts={accounts}
                value={inventoryAccountID}
                onChange={(val) => setInventoryAccountID(val)}
                placeholder="-- Pilih / Cari Akun Persediaan --"
                buttonClassName="h-8 text-xs"
              />
            </div>

            {/* Biaya Non Inventory */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Biaya Non Inventory :</label>
              <SearchableAccountSelect
                accounts={accounts}
                value={nonInventoryExpenseAccountID}
                onChange={(val) => setNonInventoryExpenseAccountID(val)}
                placeholder="-- Pilih / Cari Akun Biaya Non Inventory --"
                buttonClassName="h-8 text-xs"
              />
            </div>

            {/* Persediaan Lainnya */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Persediaan Lainnya :</label>
              <SearchableAccountSelect
                accounts={accounts}
                value={wipInventoryAccountID}
                onChange={(val) => setWipInventoryAccountID(val)}
                placeholder="-- Pilih / Cari Akun Persediaan Barang Dalam Proses --"
                buttonClassName="h-8 text-xs"
              />
            </div>

            {/* Biaya Tenaga Kerja */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Biaya Tenaga Kerja :</label>
              <SearchableAccountSelect
                accounts={accounts}
                value={assemblyLaborAccountID}
                onChange={(val) => setAssemblyLaborAccountID(val)}
                placeholder="-- Pilih / Cari Akun Gaji Proses Perakitan --"
                buttonClassName="h-8 text-xs"
              />
            </div>

            {/* Biaya Overhead */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Biaya Overhead :</label>
              <SearchableAccountSelect
                accounts={accounts}
                value={assemblyOverheadAccountID}
                onChange={(val) => setAssemblyOverheadAccountID(val)}
                placeholder="-- Pilih / Cari Akun Overhead Proses Perakitan --"
                buttonClassName="h-8 text-xs"
              />
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
