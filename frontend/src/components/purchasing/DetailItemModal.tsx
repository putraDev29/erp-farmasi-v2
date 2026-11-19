"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Check, CornerUpLeft } from "lucide-react";
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
    stock?: number;
    rack?: string;
    selling_price?: number;
  } | null;
  onSave: (updatedItem: any) => void;
}

export const DetailItemModal: React.FC<DetailItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
}) => {
  // String state for inputs to allow smooth fluid typing
  const [qtyStr, setQtyStr] = useState<string>("1.00");
  const [unitId, setUnitId] = useState<string>("");
  const [unitName, setUnitName] = useState<string>("PCS");
  const [priceStr, setPriceStr] = useState<string>("0.00");
  const [discPercentStr, setDiscPercentStr] = useState<string>("0.00");
  const [discNominalStr, setDiscNominalStr] = useState<string>("0.00");

  // Load available units
  const { data: units = [] } = useQuery({
    queryKey: ["units-list"],
    queryFn: async () => {
      const res = await api.get("/units");
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

      setQtyStr(itemQty.toFixed(2));
      setPriceStr(formatNum(itemPrice));
      setDiscPercentStr(itemDisc.toFixed(2));
      setDiscNominalStr(formatNum(itemNomDisc));

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
  }, [isOpen, item, units]);

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

    const updatedRow = {
      ...item,
      qty: numQty > 0 ? numQty : 1,
      unit_id: unitId,
      unit_name: unitName,
      unit_price: numPrice,
      discount_percent: numDiscPercent,
      line_total: calculatedTotal,
    };

    onSave(updatedRow);
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-md shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden text-xs">
        {/* Header matching Screenshot 2: Detail Item (left) + X (right) */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-200 bg-white">
          <h2 className="text-[13px] font-semibold text-slate-800 tracking-tight">Detail Item</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body matching Screenshot 2 (Left Input Form, Right History Harga Beli) */}
        <form onSubmit={handleSave}>
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-white">
            {/* LEFT COLUMN: Input form matching Screenshot 2 */}
            <div className="md:col-span-5 space-y-2">
              {/* Nama Item */}
              <div>
                <label className="block text-slate-600 font-normal text-[10.5px] mb-0.5">
                  Nama Item :
                </label>
                <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-400 rounded bg-white text-slate-800 font-medium text-[11px] truncate">
                  {item.name}
                </div>
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
                    className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono text-[11px] text-slate-900 bg-white focus:outline-none focus:border-sky-500"
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
