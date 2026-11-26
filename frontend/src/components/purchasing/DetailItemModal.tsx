"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Check, CornerUpLeft, History } from "lucide-react";
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
}) => {
  // Original tracking
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

  // History filtering state: Default current year
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [showAllSuppliers, setShowAllSuppliers] = useState<boolean>(false);

  // Load available units
  const { data: units = [] } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Load available suppliers
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

  // Helper formatter matching standard (comma thousands, dot decimal)
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

      // Reset filter options
      setSelectedYear(new Date().getFullYear().toString());
      setShowAllSuppliers(false);

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

  // Determine active supplier name for filtering history
  const activeSupplierName = useMemo(() => {
    if (supplierId) {
      const found = suppliers.find((s: any) => s.id === supplierId);
      return found ? found.name : supplierName;
    }
    return mainSupplier?.name || "";
  }, [supplierId, supplierName, suppliers, mainSupplier]);

  // Derive available years from history data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const curr = new Date().getFullYear();
    yearsSet.add(curr.toString());
    yearsSet.add((curr - 1).toString());
    yearsSet.add((curr - 2).toString());
    (priceHistory || []).forEach((h: any) => {
      if (h.date) {
        const y = new Date(h.date).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) {
          yearsSet.add(y.toString());
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [priceHistory]);

  // Filtered price history based on selected supplier and selected year
  const filteredPriceHistory = useMemo(() => {
    return (priceHistory || []).filter((h: any) => {
      // 1. Filter by Supplier
      if (!showAllSuppliers && activeSupplierName) {
        const rowSup = (h.supplier_name || "").trim().toLowerCase();
        const targetSup = activeSupplierName.trim().toLowerCase();
        const matchesSupplier =
          rowSup === targetSup ||
          rowSup.includes(targetSup) ||
          targetSup.includes(rowSup);
        if (!matchesSupplier) return false;
      }

      // 2. Filter by Year
      if (selectedYear && selectedYear !== "ALL") {
        const rowDate = h.date ? new Date(h.date) : null;
        if (rowDate && !isNaN(rowDate.getTime())) {
          const rowYear = rowDate.getFullYear().toString();
          if (rowYear !== selectedYear) return false;
        }
      }

      return true;
    });
  }, [priceHistory, activeSupplierName, showAllSuppliers, selectedYear]);

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

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sid = e.target.value;
    setSupplierId(sid);
    const found = suppliers.find((s: any) => s.id === sid);
    setSupplierName(found ? found.name : "");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 md:p-6 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col text-xs">
        {/* Header: Detail Item (Clean Title, without alokasi supplier text) */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#00c875] text-white shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">Detail Item</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body - Full Width Layout */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* 1. TOP SECTION: Form Detail Item (Full Width Grid) */}
            <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
              {/* Row 1: Nama Item & Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold text-[11px] mb-1">
                    Nama Item :
                  </label>
                  <div className="w-full h-7 px-2.5 flex items-center border border-dashed border-slate-400 rounded bg-white text-slate-800 font-semibold text-[11px] truncate shadow-2xs">
                    {item.code ? (
                      <span className="font-mono text-slate-500 mr-1.5 font-bold">[{item.code}]</span>
                    ) : null}
                    <span>{item.name}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold text-[11px] mb-1">
                    Supplier :
                  </label>
                  <select
                    value={supplierId}
                    onChange={handleSupplierChange}
                    className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer font-medium shadow-2xs"
                  >
                    <option value="">
                      -- Ikuti Supplier Utama PO {mainSupplier?.name ? `(${mainSupplier.name})` : ""} --
                    </option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code || "SUP"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Jumlah, Satuan, Harga, Potongan & Nominal */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Jumlah & Satuan (4 cols) */}
                <div className="md:col-span-4 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold text-[11px] mb-1">
                      Jumlah :
                    </label>
                    <input
                      type="text"
                      required
                      value={qtyStr}
                      onChange={handleQtyChange}
                      onBlur={handleQtyBlur}
                      className="w-full h-7 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500 font-bold shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold text-[11px] mb-1">
                      Satuan :
                    </label>
                    <select
                      value={
                        unitId ||
                        units.find((u: any) => u.name?.toLowerCase() === unitName.toLowerCase())?.id ||
                        ""
                      }
                      onChange={handleUnitSelect}
                      className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs font-medium"
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

                {/* Harga Satuan (4 cols) */}
                <div className="md:col-span-4">
                  <label className="block text-slate-600 font-semibold text-[11px] mb-1">
                    Harga Satuan :
                  </label>
                  <input
                    type="text"
                    required
                    value={priceStr}
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    className="w-full h-7 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500 shadow-2xs font-semibold"
                  />
                </div>

                {/* Potongan & Nominal (4 cols) */}
                <div className="md:col-span-4 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold text-[11px] mb-1">
                      Potongan (%) :
                    </label>
                    <input
                      type="text"
                      value={discPercentStr}
                      onChange={handleDiscPercentChange}
                      onBlur={handleDiscPercentBlur}
                      className="w-full h-7 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold text-[11px] mb-1">
                      Nominal Potongan :
                    </label>
                    <input
                      type="text"
                      value={discNominalStr}
                      onChange={handleDiscNominalChange}
                      onBlur={handleDiscNominalBlur}
                      className="w-full h-7 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Total Akhir Item */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold text-[11.5px]">
                  Total Pembelian Item :
                </span>
                <div className="h-7 px-4 flex items-center justify-end border border-dashed border-emerald-500 bg-emerald-50 rounded font-mono font-bold text-xs text-emerald-900 shadow-2xs min-w-[200px]">
                  Rp {formatNum(calculatedTotal)}
                </div>
              </div>
            </div>

            {/* 2. BOTTOM SECTION: History Harga Beli (Full Width Table with Year Filter) */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 font-bold text-[11.5px] flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-600" />
                    <span>History Harga Beli :</span>
                  </span>
                  {activeSupplierName && !showAllSuppliers && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      Supplier: <strong className="underline">{activeSupplierName}</strong>
                    </span>
                  )}
                  {showAllSuppliers && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                      Semua Supplier
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {activeSupplierName && (
                    <button
                      type="button"
                      onClick={() => setShowAllSuppliers(!showAllSuppliers)}
                      className="text-[10.5px] text-sky-600 hover:text-sky-800 font-semibold underline cursor-pointer"
                    >
                      {showAllSuppliers ? "Filter Sesuai Supplier" : "Lihat Semua Supplier"}
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    <label className="text-slate-600 text-[10.5px] font-semibold">
                      Filter Tahun :
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="h-6 px-1.5 border border-slate-300 rounded text-[11px] bg-white text-slate-800 font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y === currentYear ? `${y} (Tahun Ini)` : y}
                        </option>
                      ))}
                      <option value="ALL">Semua Tahun</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table History (Full Width) */}
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10 h-7">
                      <tr>
                        <th className="py-1 px-3 border-r border-slate-200">Tanggal</th>
                        <th className="py-1 px-3 border-r border-slate-200">No. Faktur</th>
                        <th className="py-1 px-3 border-r border-slate-200">Supplier</th>
                        <th className="py-1 px-3 border-r border-slate-200 text-right">Jumlah</th>
                        <th className="py-1 px-2 border-r border-slate-200 text-center">Satuan</th>
                        <th className="py-1 px-3 border-r border-slate-200 text-right">Harga Seb....</th>
                        <th className="py-1 px-3 border-r border-slate-200 text-right">Potongan (Rp)</th>
                        <th className="py-1 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isHistoryLoading ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">
                            Memuat riwayat harga beli...
                          </td>
                        </tr>
                      ) : filteredPriceHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-1.5 text-[11px]">
                              <span>
                                Tidak ditemukan riwayat harga beli obat ini
                                {activeSupplierName && !showAllSuppliers
                                  ? ` untuk supplier "${activeSupplierName}"`
                                  : ""}
                                {selectedYear !== "ALL" ? ` pada tahun ${selectedYear}` : ""}.
                              </span>
                              {activeSupplierName && !showAllSuppliers && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllSuppliers(true)}
                                  className="text-sky-600 hover:underline font-semibold text-[10.5px]"
                                >
                                  Tampilkan dari semua supplier
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredPriceHistory.map((h: any, idx: number) => {
                          const itemQty = Number(h.qty || 0);
                          const itemPrice = Number(h.unit_price || 0);
                          const base = itemQty * itemPrice;
                          const itemDiscNominal = Number(h.discount || 0);
                          const itemDiscPct =
                            h.discount_percent !== undefined && Number(h.discount_percent) > 0
                              ? Number(h.discount_percent)
                              : base > 0
                              ? (itemDiscNominal / base) * 100
                              : 0;
                          const rowTotal =
                            h.total_amount !== undefined && Number(h.total_amount) > 0
                              ? Number(h.total_amount)
                              : Math.max(0, base - itemDiscNominal);

                          return (
                            <tr
                              key={idx}
                              onClick={() => {
                                setPriceStr(formatNum(itemPrice));
                                setDiscNominalStr(formatNum(itemDiscNominal));
                                setDiscPercentStr(itemDiscPct.toFixed(2));
                              }}
                              className="h-6.5 hover:bg-sky-50/80 border-b border-slate-100 transition cursor-pointer"
                              title={`Klik untuk pakai harga ini (Harga: Rp ${formatNum(itemPrice)}, Potongan: Rp ${formatNum(itemDiscNominal)}${itemDiscPct > 0 ? ` / ${itemDiscPct.toFixed(2)}%` : ""})`}
                            >
                              <td className="py-1 px-3 border-r border-slate-200 font-medium text-slate-700">
                                {formatDate(h.date)}
                              </td>
                              <td className="py-1 px-3 border-r border-slate-200 font-mono text-slate-600">
                                {h.invoice_no || "-"}
                              </td>
                              <td className="py-1 px-3 border-r border-slate-200 font-medium text-slate-800">
                                {h.supplier_name || "-"}
                              </td>
                              <td className="py-1 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                                {itemQty.toFixed(2)}
                              </td>
                              <td className="py-1 px-2 text-center text-slate-600 border-r border-slate-200">
                                {h.unit_name || "-"}
                              </td>
                              <td className="py-1 px-3 text-right font-mono border-r border-slate-200 text-slate-800">
                                {formatNum(itemPrice)}
                              </td>
                              <td
                                className="py-1 px-3 text-right font-mono text-slate-700 border-r border-slate-200"
                                title={itemDiscPct > 0 ? `Setara diskon ${itemDiscPct.toFixed(2)}%` : undefined}
                              >
                                {itemDiscNominal > 0 ? formatNum(itemDiscNominal) : "0.00"}
                              </td>
                              <td className="py-1 px-3 text-right font-mono font-semibold text-emerald-800">
                                {formatNum(rowTotal)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BOTTOM ACTIONS: [✔ Ok] [↩ Kembali] */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-slate-500">
              Menampilkan <strong>{filteredPriceHistory.length}</strong> riwayat harga beli
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                <span>Ok</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-7 px-3.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium text-[11px] flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <CornerUpLeft className="w-3.5 h-3.5 text-amber-500 stroke-[2.8]" />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
