"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Check, CornerUpLeft, Users, AlertCircle, Plus, Undo2 } from "lucide-react";
import { api, formatDate } from "@/lib/api";

interface DetailItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    product_id: string;
    code: string;
    name: string;
    brand_name?: string;
    qty: number;
    received_qty?: number;
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
  } | null;
  onSave: (updatedItem: any, splitItem?: any) => void;
  mainSupplier?: { id: string; name: string; code?: string } | null;
  onOpenMultiSupplier?: () => void;
}

export const DetailItemModal: React.FC<DetailItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  mainSupplier,
  onOpenMultiSupplier,
}) => {
  // Original tracking for smart multi-supplier split
  const [originalQty, setOriginalQty] = useState<number>(1);
  const [originalSupplierId, setOriginalSupplierId] = useState<string>("");
  const [originalSupplierName, setOriginalSupplierName] = useState<string>("");

  // String state for inputs to allow smooth fluid typing
  const [qtyStr, setQtyStr] = useState<string>("1.00");
  const [unitId, setUnitId] = useState<string>("");
  const [unitName, setUnitName] = useState<string>("PCS");
  const [supplierId, setSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [priceStr, setPriceStr] = useState<string>("0.00");
  const [discPercentStr, setDiscPercentStr] = useState<string>("0.00");
  const [discNominalStr, setDiscNominalStr] = useState<string>("0.00");

  // Multi-Supplier Split State
  const [isSplitActive, setIsSplitActive] = useState<boolean>(false);
  const [splitSupplierId, setSplitSupplierId] = useState<string>("");
  const [splitSupplierName, setSplitSupplierName] = useState<string>("");
  const [splitQtyStr, setSplitQtyStr] = useState<string>("0.00");
  const [splitPriceStr, setSplitPriceStr] = useState<string>("0.00");
  const [autoPreserveOriginal, setAutoPreserveOriginal] = useState<boolean>(true);

  // Load available units
  const { data: units = [] } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Load available suppliers (multi-supplier PO support)
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Query Purchase Price History for this product
  const { data: priceHistory = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["product-price-history", item?.product_id],
    queryFn: async () => {
      if (!item?.product_id) return [];
      const res = await api.get(`/purchases/price-history?product_id=${item.product_id}`);
      return res.data?.data || [];
    },
    enabled: isOpen && Boolean(item?.product_id),
  });

  // Helper formatter matching Screenshot 2 (comma thousands, dot decimal)
  const formatNum = (num: number) => {
    return Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseNum = (str: string) => {
    if (!str) return 0;
    const clean = str.replace(/,/g, "").trim();
    return parseFloat(clean) || 0;
  };

  // Initialize state when modal opens or item changes
  useEffect(() => {
    if (isOpen && item) {
      const itemQty = Number(item.qty) || 1;
      const itemPrice = Number(item.unit_price) || 0;
      const itemDisc = Number(item.discount_percent) || 0;
      const itemNomDisc = (itemQty * itemPrice * itemDisc) / 100;
      const initialSupId = item.supplier_id || mainSupplier?.id || "";
      const initialSupName = item.supplier_name || mainSupplier?.name || "";

      setOriginalQty(itemQty);
      setOriginalSupplierId(initialSupId);
      setOriginalSupplierName(initialSupName);

      setQtyStr(itemQty.toFixed(2));
      setPriceStr(formatNum(itemPrice));
      setDiscPercentStr(itemDisc.toFixed(2));
      setDiscNominalStr(formatNum(itemNomDisc));
      setSupplierId(initialSupId);
      setSupplierName(initialSupName);

      // Reset split state
      setIsSplitActive(false);
      setSplitSupplierId("");
      setSplitSupplierName("");
      setSplitQtyStr("0.00");
      setSplitPriceStr(formatNum(itemPrice));
      setAutoPreserveOriginal(true);

      // Match unit
      let matchedUid = item.unit_id || "";
      let matchedUname = item.unit_name || "PCS";
      if (units && units.length > 0) {
        const found = units.find(
          (u: any) =>
            u.id === matchedUid ||
            u.code?.toLowerCase() === matchedUname.toLowerCase() ||
            u.name?.toLowerCase() === matchedUname.toLowerCase()
        );
        if (found) {
          matchedUid = found.id;
          matchedUname = found.name;
        } else if (!matchedUid && units[0]) {
          matchedUid = units[0].id;
          matchedUname = units[0].name;
        }
      }
      setUnitId(matchedUid);
      setUnitName(matchedUname);
    }
  }, [isOpen, item, units, mainSupplier]);

  // Derived numeric values
  const numQty = parseNum(qtyStr);
  const numPrice = parseNum(priceStr);
  const numDiscPercent = parseNum(discPercentStr);
  const numDiscNominal = parseNum(discNominalStr);

  const baseTotal = useMemo(() => {
    return numQty * numPrice;
  }, [numQty, numPrice]);

  const calculatedTotal = useMemo(() => {
    return Math.max(0, baseTotal - numDiscNominal);
  }, [baseTotal, numDiscNominal]);

  // Handlers for reactive inputs
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setQtyStr(raw);
    const q = parseNum(raw);
    const nom = (q * numPrice * numDiscPercent) / 100;
    setDiscNominalStr(formatNum(nom));
  };

  const handleQtyBlur = () => {
    setQtyStr(numQty.toFixed(2));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPriceStr(raw);
    const p = parseNum(raw);
    const nom = (numQty * p * numDiscPercent) / 100;
    setDiscNominalStr(formatNum(nom));
  };

  const handlePriceBlur = () => {
    setPriceStr(formatNum(numPrice));
  };

  const handleDiscPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDiscPercentStr(raw);
    const p = parseNum(raw);
    const nom = (baseTotal * p) / 100;
    setDiscNominalStr(formatNum(nom));
  };

  const handleDiscPercentBlur = () => {
    setDiscPercentStr(numDiscPercent.toFixed(2));
  };

  const handleDiscNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDiscNominalStr(raw);
    const nom = parseNum(raw);
    const p = baseTotal > 0 ? (nom / baseTotal) * 100 : 0;
    setDiscPercentStr(p.toFixed(2));
  };

  const handleDiscNominalBlur = () => {
    setDiscNominalStr(formatNum(numDiscNominal));
  };

  const handleUnitSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUid = e.target.value;
    setUnitId(selectedUid);
    const found = units.find((u: any) => u.id === selectedUid || u.name === selectedUid);
    if (found) {
      setUnitName(found.name);
    } else {
      setUnitName(selectedUid);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    // Case 1: Explicit split active with valid shortage supplier and qty
    if (isSplitActive && splitSupplierId && parseNum(splitQtyStr) > 0) {
      const splitQ = parseNum(splitQtyStr);
      const splitP = parseNum(splitPriceStr) || numPrice;
      const splitLineTotal = splitQ * splitP;

      const updatedRow = {
        ...item,
        qty: numQty > 0 ? numQty : 1,
        unit_id: unitId,
        unit_name: unitName,
        unit_price: numPrice,
        discount_percent: numDiscPercent,
        line_total: calculatedTotal,
        supplier_id: supplierId || undefined,
        supplier_name: supplierName || undefined,
      };

      const splitRow = {
        ...item,
        id: undefined,
        qty: splitQ,
        unit_id: unitId,
        unit_name: unitName,
        unit_price: splitP,
        discount_percent: 0,
        line_total: splitLineTotal,
        supplier_id: splitSupplierId,
        supplier_name: splitSupplierName,
        is_fulfilled: false,
        purchase_id: undefined,
      };

      onSave(updatedRow, splitRow);
      onClose();
      return;
    }

    // Case 2: User changed supplier and reduced quantity (e.g. 20 -> 5 to new supplier)
    // and wants to preserve the original supplier's remaining quantity (15)
    if (
      autoPreserveOriginal &&
      originalSupplierId &&
      supplierId !== originalSupplierId &&
      numQty < originalQty &&
      numQty > 0
    ) {
      const remainingOriginalQty = originalQty - numQty;
      const remainingTotal = remainingOriginalQty * numPrice;

      // Row 1: Keep remaining at original supplier
      const originalRow = {
        ...item,
        qty: remainingOriginalQty,
        unit_id: unitId,
        unit_name: unitName,
        unit_price: numPrice,
        discount_percent: numDiscPercent,
        line_total: remainingTotal,
        supplier_id: originalSupplierId,
        supplier_name: originalSupplierName,
      };

      // Row 2: Allocate shortage to new supplier
      const newSupplierRow = {
        ...item,
        id: undefined,
        qty: numQty,
        unit_id: unitId,
        unit_name: unitName,
        unit_price: numPrice,
        discount_percent: numDiscPercent,
        line_total: calculatedTotal,
        supplier_id: supplierId,
        supplier_name: supplierName,
        is_fulfilled: false,
        purchase_id: undefined,
      };

      onSave(originalRow, newSupplierRow);
      onClose();
      return;
    }

    // Normal Single Item Update
    const updatedRow = {
      ...item,
      qty: numQty > 0 ? numQty : 1,
      unit_id: unitId,
      unit_name: unitName,
      unit_price: numPrice,
      discount_percent: numDiscPercent,
      line_total: calculatedTotal,
      supplier_id: supplierId || undefined,
      supplier_name: supplierName || undefined,
    };

    onSave(updatedRow);
    onClose();
  };

  if (!isOpen || !item) return null;

  const hasShortage = originalQty > numQty;
  const isChangedSupplier = originalSupplierId && supplierId !== originalSupplierId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-md shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[92vh] overflow-y-auto text-xs">
        {/* Header matching Screenshot 2: Detail Item (left) + X (right) */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#00c875] text-white sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-white tracking-tight">Detail Item &amp; Alokasi Supplier</h2>
            {isSplitActive && (
              <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                Mode Multi-Supplier Aktif
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body matching Screenshot 2 (Left Input Form, Right History Harga Beli) */}
        <form onSubmit={handleSave}>
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-white">
            {/* LEFT COLUMN: Input form matching Screenshot 2 */}
            <div className="md:col-span-6 space-y-2">
              {/* Nama Item */}
              <div>
                <label className="block text-slate-600 font-normal text-[10.5px] mb-0.5">
                  Nama Item :
                </label>
                <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-400 rounded bg-white text-slate-800 font-medium text-[11px] truncate">
                  {item.name}
                </div>
              </div>

              {/* Supplier Pemenuhan Item (Multi-Supplier PO Support) */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-slate-700 font-semibold text-[10.5px]">
                    Supplier Pemenuhan Item :
                  </label>
                  {!isSplitActive && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenMultiSupplier) {
                          onClose();
                          onOpenMultiSupplier();
                        } else {
                          setIsSplitActive(true);
                          const rem = Math.max(0, originalQty - numQty);
                          setSplitQtyStr(rem > 0 ? rem.toFixed(2) : "1.00");
                        }
                      }}
                      className="text-[9.5px] text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-0.5 underline cursor-pointer"
                      title="Alokasi kekurangan item ini ke banyak supplier (Bisa berapapun supplier)"
                    >
                      <Users className="w-3 h-3 text-emerald-600" />
                      <span>👥 Alokasi Banyak Supplier</span>
                    </button>
                  )}
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSupplierId(sid);
                    const found = suppliers.find((s: any) => s.id === sid);
                    setSupplierName(found ? found.name : "");
                  }}
                  className="w-full h-6 px-1.5 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
                >
                  <option value="">-- Ikuti Supplier Utama PO --</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || "SUP"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Jumlah | Satuan */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-normal text-[10.5px] mb-0.5">
                    Jumlah :
                  </label>
                  <input
                    type="text"
                    required
                    value={qtyStr}
                    onChange={handleQtyChange}
                    onBlur={handleQtyBlur}
                    className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-normal text-[10.5px] mb-0.5">
                    Satuan :
                  </label>
                  <select
                    value={unitId || units.find((u: any) => u.name?.toLowerCase() === unitName.toLowerCase())?.id || ""}
                    onChange={handleUnitSelect}
                    className="w-full h-6 px-1.5 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {units.length > 0 ? (
                      units.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))
                    ) : (
                      <option value={unitId || unitName}>{unitName}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* SMART HELPER 1: User changed supplier and reduced quantity */}
              {isChangedSupplier && hasShortage && !isSplitActive && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[10.5px] text-amber-900 space-y-1">
                  <div className="flex items-center gap-1 font-bold text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Perubahan Supplier &amp; Kekurangan Terdeteksi</span>
                  </div>
                  <p className="leading-tight">
                    Anda memindahkan <strong>{numQty.toFixed(2)} {unitName}</strong> ke <strong>{supplierName || "Supplier Baru"}</strong> dari total pesanan awal <strong>{originalQty.toFixed(2)} {unitName}</strong>.
                  </p>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-800 pt-0.5 select-none">
                    <input
                      type="checkbox"
                      checked={autoPreserveOriginal}
                      onChange={(e) => setAutoPreserveOriginal(e.target.checked)}
                      className="rounded text-emerald-600 w-3.5 h-3.5"
                    />
                    <span>Pertahankan sisa {(originalQty - numQty).toFixed(2)} {unitName} di {originalSupplierName || "Supplier Awal"}</span>
                  </label>
                </div>
              )}

              {/* SMART HELPER 2: User reduced quantity for same supplier, prompt to allocate shortage */}
              {!isChangedSupplier && hasShortage && !isSplitActive && (
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-[10.5px] text-emerald-950 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-emerald-900 block leading-tight">
                      Kekurangan: {(originalQty - numQty).toFixed(2)} {unitName}
                    </span>
                    <span className="text-[9.5px] text-emerald-700 leading-tight">
                      Pesan kekurangan obat ini dari supplier lain?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSplitActive(true);
                      setSplitQtyStr((originalQty - numQty).toFixed(2));
                    }}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-2xs transition shrink-0"
                  >
                    + Alokasikan
                  </button>
                </div>
              )}

              {/* MULTI-SUPPLIER SPLIT SECTION (When isSplitActive is true) */}
              {isSplitActive && (
                <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-300 space-y-2 text-[10.5px] animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-1">
                    <span className="font-bold text-emerald-900 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Pemenuhan Kekurangan (Supplier #2)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSplitActive(false)}
                      className="text-slate-400 hover:text-rose-600 text-[10px] font-semibold"
                    >
                      Batal Bagi
                    </button>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-0.5">
                      Pilih Supplier Pemenuhan Kekurangan :
                    </label>
                    <select
                      value={splitSupplierId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        setSplitSupplierId(sid);
                        const found = suppliers.find((s: any) => s.id === sid);
                        setSplitSupplierName(found ? found.name : "");
                      }}
                      className="w-full h-6 px-1.5 border border-emerald-300 rounded text-[11px] bg-white font-medium text-slate-800"
                    >
                      <option value="">-- Pilih Supplier Lain --</option>
                      {suppliers
                        .filter((s: any) => s.id !== supplierId)
                        .map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code || "SUP"})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-0.5">
                        Jumlah Kekurangan :
                      </label>
                      <input
                        type="text"
                        value={splitQtyStr}
                        onChange={(e) => setSplitQtyStr(e.target.value)}
                        className="w-full h-6 px-2 border border-emerald-300 rounded text-right font-mono bg-white font-bold text-emerald-900 text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-0.5">
                        Harga Satuan :
                      </label>
                      <input
                        type="text"
                        value={splitPriceStr}
                        onChange={(e) => setSplitPriceStr(e.target.value)}
                        className="w-full h-6 px-2 border border-emerald-300 rounded text-right font-mono bg-white text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-1.5 rounded border border-emerald-200 text-[10px] text-emerald-900 flex items-center justify-between">
                    <span>Total Kebutuhan Obat Terpenuhi:</span>
                    <strong className="font-bold text-emerald-900 font-mono text-[11px]">
                      {(numQty + parseNum(splitQtyStr)).toFixed(2)} {unitName}
                    </strong>
                  </div>
                </div>
              )}

              {/* Harga */}
              <div>
                <label className="block text-slate-600 font-normal text-[10.5px] mb-0.5">
                  Harga :
                </label>
                <input
                  type="text"
                  required
                  value={priceStr}
                  onChange={handlePriceChange}
                  onBlur={handlePriceBlur}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Potongan | Nominal */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-normal text-[10.5px] mb-0.5">
                    Potongan:
                  </label>
                  <input
                    type="text"
                    value={discPercentStr}
                    onChange={handleDiscPercentChange}
                    onBlur={handleDiscPercentBlur}
                    className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-normal text-[10.5px] mb-0.5">
                    Nominal :
                  </label>
                  <input
                    type="text"
                    value={discNominalStr}
                    onChange={handleDiscNominalChange}
                    onBlur={handleDiscNominalBlur}
                    className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Total (Dashed Box matching Screenshot 2) */}
              <div>
                <label className="block text-slate-700 font-bold text-[10.5px] mb-0.5">
                  Total :
                </label>
                <div className="w-full h-7 px-2 flex items-center justify-end border border-dashed border-slate-400 rounded bg-white font-mono font-bold text-xs text-slate-900 shadow-2xs">
                  {formatNum(calculatedTotal)}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: History Harga Beli matching Screenshot 2 */}
            <div className="md:col-span-7 flex flex-col min-h-0">
              <label className="block text-slate-600 font-normal text-[10.5px] mb-0.5">
                History Harga Beli :
              </label>

              <div className="border border-slate-300 rounded overflow-hidden flex-1 flex flex-col min-h-[175px]">
                <table className="w-full text-left border-collapse text-[10px] whitespace-nowrap">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold h-6">
                    <tr>
                      <th className="py-0.5 px-2 border-r border-slate-200">Tanggal</th>
                      <th className="py-0.5 px-2 border-r border-slate-200 text-right">Jumlah</th>
                      <th className="py-0.5 px-1.5 border-r border-slate-200 text-center">Satuan</th>
                      <th className="py-0.5 px-2 border-r border-slate-200 text-right">Harga Seb....</th>
                      <th className="py-0.5 px-2 text-right">Pot %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 flex-1">
                    {isHistoryLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Memuat data...
                        </td>
                      </tr>
                    ) : priceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-14 text-center text-slate-400 font-normal">
                          No data
                        </td>
                      </tr>
                    ) : (
                      priceHistory.slice(0, 10).map((h: any, idx: number) => (
                        <tr key={idx} className="h-5.5 hover:bg-slate-50 border-b border-slate-100">
                          <td className="py-0.5 px-2 border-r border-slate-200">
                            {formatDate(h.date)}
                          </td>
                          <td className="py-0.5 px-2 text-right font-mono border-r border-slate-200">
                            {Number(h.qty || 0).toFixed(2)}
                          </td>
                          <td className="py-0.5 px-1.5 text-center border-r border-slate-200">
                            {h.unit_name || "-"}
                          </td>
                          <td className="py-0.5 px-2 text-right font-mono border-r border-slate-200">
                            {formatNum(h.unit_price)}
                          </td>
                          <td className="py-0.5 px-2 text-right font-mono">
                            {Number(h.discount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Actions matching Screenshot 2: [✔ Ok] [↩ Kembali] */}
          <div className="px-3.5 py-2 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="submit"
              className="h-6.5 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 font-medium text-[11px] flex items-center gap-1.5 shadow-2xs transition active:scale-95"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.8]" />
              <span>Ok</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-6.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 font-medium text-[11px] flex items-center gap-1.5 shadow-2xs transition active:scale-95"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-amber-500 stroke-[2.8]" />
              <span>Kembali</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
