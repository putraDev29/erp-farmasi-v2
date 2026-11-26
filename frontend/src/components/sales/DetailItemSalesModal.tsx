"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Check, CornerUpLeft, History } from "lucide-react";
import { api, formatDate } from "@/lib/api";

interface DetailItemSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    product_id: string;
    code: string;
    name: string;
    brand_name?: string;
    qty: number;
    delivered_qty?: number;
    unit_id: string;
    unit_name: string;
    unit_price: number;
    discount_percent: number;
    line_total: number;
    customer_id?: string;
    customer_name?: string;
    stock?: number;
    rack?: string;
    drug_classification?: string;
    selling_price?: number;
  } | null;
  onSave: (updatedItem: any) => void;
  mainCustomer?: { id: string; name: string; code?: string } | null;
}

export const DetailItemSalesModal: React.FC<DetailItemSalesModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  mainCustomer,
}) => {
  // Original tracking
  const [originalQty, setOriginalQty] = useState<number>(1);
  const [originalCustomerId, setOriginalCustomerId] = useState<string>("");
  const [originalCustomerName, setOriginalCustomerName] = useState<string>("");

  // String state for inputs to allow smooth fluid typing
  const [qtyStr, setQtyStr] = useState<string>("1.00");
  const [unitId, setUnitId] = useState<string>("");
  const [unitName, setUnitName] = useState<string>("PCS");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [priceStr, setPriceStr] = useState<string>("0.00");
  const [discPercentStr, setDiscPercentStr] = useState<string>("0.00");
  const [discNominalStr, setDiscNominalStr] = useState<string>("0.00");

  // History filtering state: Default current year
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [showAllCustomers, setShowAllCustomers] = useState<boolean>(false);

  // Load available units
  const { data: units = [] } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => {
      const res = await api.get("/units");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Load available customers
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Query Sales Price History for this product
  const { data: priceHistory = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["sales-product-price-history", item?.product_id],
    queryFn: async () => {
      if (!item?.product_id) return [];
      const res = await api.get(`/sales/price-history?product_id=${item.product_id}`);
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
      const initialCustId = item.customer_id || mainCustomer?.id || "";
      const initialCustName = item.customer_name || mainCustomer?.name || "";

      setOriginalQty(itemQty);
      setOriginalCustomerId(initialCustId);
      setOriginalCustomerName(initialCustName);

      setQtyStr(itemQty.toFixed(2));
      setPriceStr(formatNum(itemPrice));
      setDiscPercentStr(itemDisc.toFixed(2));
      setDiscNominalStr(formatNum(itemNomDisc));
      setCustomerId(initialCustId);
      setCustomerName(initialCustName);

      // Reset filter options
      setSelectedYear(new Date().getFullYear().toString());
      setShowAllCustomers(false);

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
  }, [isOpen, item, units, mainCustomer]);

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

  // Determine active customer name for filtering history
  const activeCustomerName = useMemo(() => {
    if (customerId) {
      const found = customers.find((c: any) => c.id === customerId);
      return found ? found.name : customerName;
    }
    return mainCustomer?.name || "";
  }, [customerId, customerName, customers, mainCustomer]);

  // Derive available years from history data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const curr = new Date().getFullYear();
    yearsSet.add(curr.toString());
    yearsSet.add((curr - 1).toString());
    yearsSet.add((curr - 2).toString());
    (priceHistory || []).forEach((h: any) => {
      const dateVal = h.date || h.transaction_date;
      if (dateVal) {
        const y = new Date(dateVal).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) {
          yearsSet.add(y.toString());
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [priceHistory]);

  // Filtered price history based on selected customer and selected year
  const filteredPriceHistory = useMemo(() => {
    return (priceHistory || []).filter((h: any) => {
      // 1. Filter by Customer
      if (!showAllCustomers && activeCustomerName) {
        const rowCust = (h.customer_name || "").trim().toLowerCase();
        const targetCust = activeCustomerName.trim().toLowerCase();
        const matchesCustomer =
          rowCust === targetCust ||
          rowCust.includes(targetCust) ||
          targetCust.includes(rowCust);
        if (!matchesCustomer) return false;
      }

      // 2. Filter by Year
      if (selectedYear && selectedYear !== "ALL") {
        const dateVal = h.date || h.transaction_date;
        const rowDate = dateVal ? new Date(dateVal) : null;
        if (rowDate && !isNaN(rowDate.getTime())) {
          const rowYear = rowDate.getFullYear().toString();
          if (rowYear !== selectedYear) return false;
        }
      }

      return true;
    });
  }, [priceHistory, activeCustomerName, showAllCustomers, selectedYear]);

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

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setCustomerId(cid);
    const found = customers.find((c: any) => c.id === cid);
    setCustomerName(found ? found.name : "");
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
      customer_id: customerId,
      customer_name: customerName,
    };

    onSave(updatedRow);
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* TOP HEADER: Detail Item (Green banner matching Screenshot) */}
        <div className="bg-[#00c875] text-white px-4 py-2.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-wide">Detail Item Penjualan</h2>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded text-white font-mono">
              {item.code || "-"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded p-1 transition cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-[11px] text-slate-800">
            {/* 1. TOP SECTION: Form Obat */}
            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 space-y-3">
              {/* Row 1: Nama Item (col-6) | Pelanggan (col-6) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                    Nama Item :
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`[${item.code || "-"}] ${item.name || "-"}`}
                    className="w-full h-7 px-2.5 bg-slate-100 border border-slate-300 rounded text-slate-800 font-semibold focus:outline-none truncate"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                    Pelanggan :
                  </label>
                  <select
                    value={customerId}
                    onChange={handleCustomerChange}
                    className="w-full h-7 px-2 bg-white border border-slate-300 rounded text-slate-800 font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">-- Pilih / Cash Umum --</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Jumlah | Satuan | Harga Satuan | Potongan (%) | Nominal Potongan */}
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end">
                {/* Jumlah */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                    Jumlah :
                  </label>
                  <input
                    type="text"
                    value={qtyStr}
                    onChange={handleQtyChange}
                    onBlur={handleQtyBlur}
                    className="w-full h-7 px-2 text-right font-mono font-bold border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Satuan */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                    Satuan :
                  </label>
                  <select
                    value={unitId}
                    onChange={handleUnitSelect}
                    className="w-full h-7 px-2 border border-slate-300 rounded bg-white text-slate-800 font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Harga Satuan */}
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                    Harga Satuan :
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={priceStr}
                      onChange={handlePriceChange}
                      onBlur={handlePriceBlur}
                      className="w-full h-7 px-2 text-right font-mono font-bold border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Potongan (%) */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-slate-600 font-semibold text-[10.5px] mb-1">
                    Potongan (%) :
                  </label>
                  <input
                    type="text"
                    value={discPercentStr}
                    onChange={handleDiscPercentChange}
                    onBlur={handleDiscPercentBlur}
                    className="w-full h-7 px-2 text-right font-mono border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Nominal Potongan */}
                <div className="col-span-1 sm:col-span-3">
                  <label className="block text-slate-600 font-semibold text-[10.5px] mb-1 truncate">
                    Nominal Potongan :
                  </label>
                  <input
                    type="text"
                    value={discNominalStr}
                    onChange={handleDiscNominalChange}
                    onBlur={handleDiscNominalBlur}
                    className="w-full h-7 px-2 text-right font-mono border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Row 3: Total Penjualan Item (Green Box matching Screenshot) */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-200">
                <span className="font-bold text-slate-700 text-[11.5px]">
                  Total Penjualan Item :
                </span>
                <div className="min-w-[180px] h-8 px-3 border border-dashed border-emerald-400 bg-emerald-50/50 rounded flex items-center justify-end font-mono font-bold text-emerald-700 text-sm">
                  Rp {formatNum(calculatedTotal)}
                </div>
              </div>
            </div>

            {/* 2. BOTTOM SECTION: History Harga Jual (Full Width Table with Year Filter) */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 font-bold text-[11.5px] flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-600" />
                    <span>History Harga Jual :</span>
                  </span>
                  {activeCustomerName && !showAllCustomers && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      Pelanggan: <strong className="underline">{activeCustomerName}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Toggle Semua Pelanggan */}
                  <button
                    type="button"
                    onClick={() => setShowAllCustomers((prev) => !prev)}
                    className="text-sky-600 hover:text-sky-700 text-[11px] font-semibold underline cursor-pointer"
                  >
                    {showAllCustomers ? "Saring Pelanggan Ini" : "Lihat Semua Pelanggan"}
                  </button>

                  {/* Filter Tahun */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-slate-600 font-semibold text-[10.5px]">
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
                        <th className="py-1 px-3 border-r border-slate-200">Pelanggan</th>
                        <th className="py-1 px-3 border-r border-slate-200 text-right">Jumlah</th>
                        <th className="py-1 px-2 border-r border-slate-200 text-center">Satuan</th>
                        <th className="py-1 px-3 border-r border-slate-200 text-right">Harga Satuan</th>
                        <th className="py-1 px-3 border-r border-slate-200 text-right">Potongan (Rp)</th>
                        <th className="py-1 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isHistoryLoading ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">
                            Memuat riwayat harga jual...
                          </td>
                        </tr>
                      ) : filteredPriceHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-1.5 text-[11px]">
                              <span>
                                Tidak ditemukan riwayat harga jual obat ini
                                {activeCustomerName && !showAllCustomers
                                  ? ` untuk pelanggan "${activeCustomerName}"`
                                  : ""}
                                {selectedYear !== "ALL" ? ` pada tahun ${selectedYear}` : ""}.
                              </span>
                              {activeCustomerName && !showAllCustomers && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllCustomers(true)}
                                  className="text-sky-600 hover:underline font-semibold text-[10.5px]"
                                >
                                  Tampilkan dari semua pelanggan
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredPriceHistory.map((h: any, idx: number) => {
                          const dateVal = h.date || h.transaction_date;
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
                                {formatDate(dateVal)}
                              </td>
                              <td className="py-1 px-3 border-r border-slate-200 font-mono text-slate-600">
                                {h.invoice_no || "-"}
                              </td>
                              <td className="py-1 px-3 border-r border-slate-200 font-medium text-slate-800">
                                {h.customer_name || "-"}
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
              Menampilkan <strong>{filteredPriceHistory.length}</strong> riwayat harga jual
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ok</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-7 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <CornerUpLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
