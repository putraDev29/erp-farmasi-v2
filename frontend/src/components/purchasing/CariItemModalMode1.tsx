"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Check, ChevronLeft, ChevronRight, ArrowUpDown, AlertCircle } from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

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
  const [sortBy, setSortBy] = useState("product_code");
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

  // Query Returnable Items from dedicated Backend Endpoint
  const { data: rawItems = [], isLoading, refetch } = useQuery({
    queryKey: ["returnable-items-mode1", invoiceNo, keyword, warehouseId, supplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      const term = (invoiceNo || keyword || "").trim();
      if (term) params.append("search", term);
      if (warehouseId && warehouseId !== "all") params.append("warehouse_id", warehouseId);
      if (supplierId && supplierId !== "all") params.append("supplier_id", supplierId);

      const res = await api.get(`/purchases/returnable-items?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Client-side filtering & sorting
  const processedItems = useMemo(() => {
    let list = [...rawItems];

    if (invoiceNo.trim()) {
      const searchInv = invoiceNo.toLowerCase().trim();
      list = list.filter((it: any) =>
        it.invoice_no?.toLowerCase().includes(searchInv)
      );
    }

    if (keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      list = list.filter(
        (it: any) =>
          it.product_code?.toLowerCase().includes(kw) ||
          it.product_name?.toLowerCase().includes(kw) ||
          it.batch_number?.toLowerCase().includes(kw) ||
          it.supplier_name?.toLowerCase().includes(kw)
      );
    }

    // Sort
    list.sort((a: any, b: any) => {
      let valA = a[sortBy] ?? "";
      let valB = b[sortBy] ?? "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [rawItems, invoiceNo, keyword, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedItems.slice(start, start + pageSize);
  }, [processedItems, page, pageSize]);

  if (!isOpen) return null;

  const toggleSelectRow = (item: any) => {
    if (item.remaining_qty <= 0) {
      alert("Item ini sudah habis diretur pada dokumen retur sebelumnya.");
      return;
    }
    const rowKey = `${item.purchase_id}_${item.purchase_item_id || item.product_id}`;
    setSelectedItemsMap((prev) => {
      const next = { ...prev };
      if (next[rowKey]) {
        delete next[rowKey];
      } else {
        next[rowKey] = {
          ...item,
          rowId: rowKey,
          code: item.product_code,
          name: item.product_name,
          unit: item.unit_name,
          qty: item.remaining_qty,
          sisa_retur: item.remaining_qty,
        };
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
          <div>
            <h2 className="font-bold text-slate-800 text-xs sm:text-sm">
              Cari Item Berdasarkan Faktur Pembelian Asal (Mode 1)
            </h2>
            <p className="text-[10px] text-slate-500">
              Pilih item dari faktur pembelian yang belum seluruhnya diretur dan memiliki stok fisik tersedia
            </p>
          </div>
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
                * No Faktur Pembelian :
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => {
                  setInvoiceNo(e.target.value);
                  setPage(1);
                }}
                placeholder="Ketik No Faktur Pembelian (contoh: PI/2026/11/...)"
                className="w-full max-w-md h-6 px-2 py-0 border border-rose-300 rounded bg-white text-[11px] focus:outline-none focus:border-rose-600 font-mono"
              />
            </div>
            <p className="text-rose-600 font-semibold text-[10.5px]">
              * Filter berdasarkan No Faktur Pembelian asal untuk memuat obat yang pernah diterima.
            </p>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-1.5 text-[11px] items-end">
            <div className="md:col-span-4">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5">Kata Kunci :</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari kode, nama obat, nomor batch..."
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

            <div className="md:col-span-3">
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5">Urut Berdasar :</label>
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="product_code">Kode Item</option>
                  <option value="product_name">Nama Item</option>
                  <option value="invoice_no">No Transaksi</option>
                  <option value="remaining_qty">Sisa Bisa Retur</option>
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

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => refetch()}
                className="w-full h-6 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
              >
                <Search className="w-3 h-3" />
                <span>Cari Item</span>
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
              <span>Pilih Item ({Object.keys(selectedItemsMap).length})</span>
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 border border-slate-300 rounded overflow-x-auto min-h-[220px]">
            <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="py-1 px-1.5 text-center w-8">Pilih</th>
                  <th className="py-1 px-2 border-r border-slate-200">No Faktur Asal</th>
                  <th className="py-1 px-2 border-r border-slate-200">Supplier PBF</th>
                  <th className="py-1 px-2 border-r border-slate-200">Kode & Nama Obat</th>
                  <th className="py-1 px-2 border-r border-slate-200">No. Batch & ED</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Qty Beli</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Sudah Retur</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Sisa Bisa Retur</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Stok Apotek</th>
                  <th className="py-1 px-2 border-r border-slate-200">Satuan</th>
                  <th className="py-1 px-2 text-right border-r border-slate-200">Harga Beli</th>
                  <th className="py-1 px-2 text-right">Subtotal Sisa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      Memuat data item retur...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      Tidak ada item pembelian yang dapat diretur.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((it: any) => {
                    const rowKey = `${it.purchase_id}_${it.purchase_item_id || it.product_id}`;
                    const isSelected = !!selectedItemsMap[rowKey];
                    const isDisabled = it.remaining_qty <= 0;

                    return (
                      <tr
                        key={rowKey}
                        onClick={() => !isDisabled && toggleSelectRow(it)}
                        className={`cursor-pointer transition hover:bg-sky-50/60 ${
                          isSelected ? "bg-sky-100/70 font-semibold text-sky-900" : ""
                        } ${isDisabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
                      >
                        <td className="py-1 px-1.5 text-center">
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={isSelected}
                            onChange={() => toggleSelectRow(it)}
                            className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                          />
                        </td>
                        <td className="py-1 px-2 font-mono border-r border-slate-200">
                          {it.invoice_no}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 text-slate-600">
                          {it.supplier_name || "-"}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200">
                          <strong className="block text-slate-900">{it.product_name}</strong>
                          <span className="font-mono text-[10px] text-slate-500">{it.product_code}</span>
                        </td>
                        <td className="py-1 px-2 font-mono text-[10.5px] border-r border-slate-200">
                          <div>Batch: <strong className="text-slate-700">{it.batch_number || "-"}</strong></div>
                          <div className="text-slate-500">ED: {formatDate(it.expired_date)}</div>
                        </td>
                        <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                          {it.purchased_qty}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-rose-600 border-r border-slate-200">
                          {it.already_returned_qty || 0}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                          {it.remaining_qty}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-blue-700 border-r border-slate-200">
                          {it.current_stock ?? "-"}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200">{it.unit_name}</td>
                        <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                          {formatCurrency(it.unit_price)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold">
                          {formatCurrency(it.remaining_qty * it.unit_price)}
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
              <span>Pilih Item ({Object.keys(selectedItemsMap).length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CariItemModalMode1;
