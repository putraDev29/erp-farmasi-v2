"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Check, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

interface CariItemModalMode1Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedItems: any[]) => void;
  defaultWarehouseId?: string;
  defaultInvoiceNo?: string;
  supplierId?: string;
}

export const CariItemModalMode1: React.FC<CariItemModalMode1Props> = ({
  isOpen,
  onClose,
  onSelect,
  defaultWarehouseId = "",
  defaultInvoiceNo = "",
  supplierId = "",
}) => {
  const [invoiceNo, setInvoiceNo] = useState(defaultInvoiceNo);
  const [keyword, setKeyword] = useState("");
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [itemType, setItemType] = useState("Non Varian");
  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [selectedItemsMap, setSelectedItemsMap] = useState<{ [id: string]: any }>({});

  // Query Warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Query Purchases
  const { data: purchases = [], isLoading, refetch } = useQuery({
    queryKey: ["purchases-for-return-mode1", invoiceNo, warehouseId, supplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (invoiceNo) params.append("search", invoiceNo);
      if (warehouseId && warehouseId !== "all") params.append("warehouse_id", warehouseId);
      const res = await api.get(`/purchases?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Flatten items from matched purchases
  const flattenedItems = useMemo(() => {
    const list: any[] = [];
    purchases.forEach((p: any) => {
      // Check if invoice matches
      if (invoiceNo && !p.invoice_no.toLowerCase().includes(invoiceNo.toLowerCase().trim())) {
        return;
      }
      (p.items || []).forEach((it: any) => {
        const product = it.product || {};
        const code = product.code || "";
        const name = product.name || "";
        const barcode = product.barcode || "-";

        // Filter by keyword
        if (
          keyword &&
          !code.toLowerCase().includes(keyword.toLowerCase()) &&
          !name.toLowerCase().includes(keyword.toLowerCase()) &&
          !barcode.toLowerCase().includes(keyword.toLowerCase())
        ) {
          return;
        }

        const qty = Number(it.qty) || 0;
        // Remaining returnable qty (default to it.qty if no prior returns recorded on item)
        const sisaBisaRetur = it.remaining_qty !== undefined ? Number(it.remaining_qty) : qty;
        const unitPrice = Number(it.unit_price) || 0;
        const discount = Number(it.discount) || 0;
        const discountPct = (discount / (qty * unitPrice || 1)) * 100;
        const tax = 0;
        const lineTotal = qty * unitPrice - discount;

        list.push({
          rowId: `${p.id}_${it.id}`,
          purchase_id: p.id,
          invoice_no: p.invoice_no,
          date: p.date,
          item_id: it.id,
          product_id: it.product_id,
          unit_id: it.unit_id,
          code: code,
          barcode: barcode,
          name: name,
          brand: product.brand?.name || "-",
          qty: qty,
          sisa_retur: sisaBisaRetur,
          unit_name: it.unit?.name || "PCS",
          unit_price: unitPrice,
          discount: discount,
          discount_percent: discountPct,
          tax: tax,
          line_total: lineTotal,
        });
      });
    });

    // Sort
    list.sort((a, b) => {
      let valA = a[sortBy] ?? "";
      let valB = b[sortBy] ?? "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [purchases, invoiceNo, keyword, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(flattenedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return flattenedItems.slice(start, start + pageSize);
  }, [flattenedItems, page, pageSize]);

  if (!isOpen) return null;

  const toggleSelectRow = (item: any) => {
    setSelectedItemsMap((prev) => {
      const next = { ...prev };
      if (next[item.rowId]) {
        delete next[item.rowId];
      } else {
        next[item.rowId] = item;
      }
      return next;
    });
  };

  const handleConfirmSelect = () => {
    const items = Object.values(selectedItemsMap);
    if (items.length === 0) {
      alert("Pilih setidaknya satu item untuk di-retur.");
      return;
    }
    onSelect(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4 text-xs select-none">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-xs sm:text-sm">Cari Item...</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2 space-y-2 flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Top Rose/Red Box: * No Transaksi Wajib diisi */}
          <div className="bg-[#fff1f2] border border-[#fecdd3] rounded p-2 text-[11px] space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-slate-700 font-bold whitespace-nowrap">
                * No Transaksi :
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => {
                  setInvoiceNo(e.target.value);
                  setPage(1);
                }}
                placeholder="Ketik No Faktur Pembelian (contoh: FB-...)"
                className="w-full max-w-md h-6 px-2 py-0 border border-rose-300 rounded bg-white text-[11px] focus:outline-none focus:border-rose-600 font-mono"
              />
            </div>
            <p className="text-rose-600 font-semibold text-[10.5px]">
              * No Transaksi Wajib diisi. Inputkan No Transaksi Pembelian yang ingin di Retur.
            </p>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 text-[11px] items-end">
            <div className="md:col-span-3">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5">Kata Kunci :</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari kode, barcode, nama..."
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5">Dept/Gudang :</label>
              <select
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setPage(1);
                }}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer truncate"
              >
                <option value="all">Semua Gudang</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5">Tipe Item :</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="Non Varian">Non Varian</option>
                <option value="Semua">Semua</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5">Urut Berdasar :</label>
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="code">Kode Item</option>
                  <option value="name">Nama Item</option>
                  <option value="invoice_no">No Transaksi</option>
                  <option value="qty">Jumlah</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600"
                  title="Ganti Urutan"
                >
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="md:col-span-1">
              <button
                type="button"
                onClick={() => refetch()}
                className="w-full h-6 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
              >
                <Search className="w-3 h-3" />
                <span>Cari</span>
              </button>
            </div>
          </div>

          {/* Top Pagination Toolbar */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronLeft className="w-3 h-3 text-slate-600" />
              </button>
              <span className="px-2 font-medium text-slate-700">
                Hal {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleConfirmSelect}
              disabled={Object.keys(selectedItemsMap).length === 0}
              className="h-6 px-3 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
            >
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Pilih... ({Object.keys(selectedItemsMap).length})</span>
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 border border-slate-300 rounded overflow-x-auto min-h-[220px]">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 whitespace-nowrap">
                <tr>
                  <th className="py-1 px-1.5 text-center w-8">Pilih</th>
                  <th className="py-1 px-2 border-r border-slate-200">No Transaksi</th>
                  <th className="py-1 px-2 border-r border-slate-200">Kode Item</th>
                  <th className="py-1 px-2 border-r border-slate-200">Barcode</th>
                  <th className="py-1 px-2 border-r border-slate-200">Nama Item</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Jumlah</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Sisa Bisa Retur</th>
                  <th className="py-1 px-2 border-r border-slate-200">Satuan</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Harga</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Potongan</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Pajak</th>
                  <th className="py-1 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      Memuat data pembelian...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      {invoiceNo
                        ? "Tidak ada item pembelian yang sesuai dengan No Transaksi / kata kunci di atas."
                        : "Ketikkan No Transaksi Pembelian di kolom merah di atas untuk memuat item faktur."}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((it) => {
                    const isSelected = !!selectedItemsMap[it.rowId];
                    return (
                      <tr
                        key={it.rowId}
                        onClick={() => toggleSelectRow(it)}
                        className={`cursor-pointer transition hover:bg-sky-50/60 ${
                          isSelected ? "bg-sky-100/70 font-semibold text-sky-900" : ""
                        }`}
                      >
                        <td className="py-1 px-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(it)}
                            className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                          />
                        </td>
                        <td className="py-1 px-2 font-mono whitespace-nowrap border-r border-slate-200">
                          {it.invoice_no}
                        </td>
                        <td className="py-1 px-2 font-mono whitespace-nowrap border-r border-slate-200">
                          {it.code}
                        </td>
                        <td className="py-1 px-2 font-mono text-[10px] text-slate-500 whitespace-nowrap border-r border-slate-200">
                          {it.barcode}
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap border-r border-slate-200">
                          {it.name}
                        </td>
                        <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                          {it.qty}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                          {it.sisa_retur}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200">{it.unit_name}</td>
                        <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                          {formatCurrency(it.unit_price)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                          {formatCurrency(it.discount)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                          {formatCurrency(it.tax)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold whitespace-nowrap">
                          {formatCurrency(it.line_total)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Toolbar */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronLeft className="w-3 h-3 text-slate-600" />
              </button>
              <span className="px-2 font-medium text-slate-700">
                Hal {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleConfirmSelect}
              disabled={Object.keys(selectedItemsMap).length === 0}
              className="h-6 px-3 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
            >
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Pilih... ({Object.keys(selectedItemsMap).length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CariItemModalMode1;
