"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Calendar,
  Building2,
  Printer,
  X,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariSupplierModal } from "@/components/purchasing/CariSupplierModal";
import { CariItemModal } from "@/components/purchasing/CariItemModal";

export default function PurchasePriceHistoryPage() {
  const router = useRouter();

  // Filters matching Screenshot 5
  const [itemFrom, setItemFrom] = useState("");
  const [itemTo, setItemTo] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  // Sorting
  const [sort1, setSort1] = useState("Supplier");
  const [sort1Dir, setSort1Dir] = useState<"asc" | "desc">("asc");
  const [sort2, setSort2] = useState("Tanggal");
  const [sort2Dir, setSort2Dir] = useState<"asc" | "desc">("desc");
  const [sort3, setSort3] = useState("Kode Item");
  const [sort3Dir, setSort3Dir] = useState<"asc" | "desc">("asc");

  // Submitted filter state (triggers query)
  const [appliedFilters, setAppliedFilters] = useState({
    itemFrom: "",
    itemTo: "",
    startDate: "",
    endDate: "",
    supplierId: "",
    sort1: "Supplier",
    sort2: "Tanggal",
    sort3: "Kode Item",
  });

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemTarget, setItemTarget] = useState<"from" | "to">("from");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Price History Query
  const { data: historyRows = [], isLoading, refetch } = useQuery({
    queryKey: ["purchase-price-history", appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.itemFrom) params.append("item_from", appliedFilters.itemFrom);
      if (appliedFilters.itemTo) params.append("item_to", appliedFilters.itemTo);
      if (appliedFilters.startDate) params.append("start_date", appliedFilters.startDate);
      if (appliedFilters.endDate) params.append("end_date", appliedFilters.endDate);
      if (appliedFilters.supplierId) params.append("supplier_id", appliedFilters.supplierId);
      params.append("sort1", appliedFilters.sort1);
      params.append("sort2", appliedFilters.sort2);
      params.append("sort3", appliedFilters.sort3);

      const res = await api.get(`/purchases/price-history?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const handleApplyProcess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      itemFrom,
      itemTo,
      startDate,
      endDate,
      supplierId: selectedSupplier?.id || "",
      sort1,
      sort2,
      sort3,
    });
    setPage(1);
  };

  const openItemModal = (target: "from" | "to") => {
    setItemTarget(target);
    setIsItemModalOpen(true);
  };

  const handleSelectItem = (prod: any) => {
    if (itemTarget === "from") {
      setItemFrom(prod.code || prod.name);
    } else {
      setItemTo(prod.code || prod.name);
    }
    setIsItemModalOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(historyRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return historyRows.slice(start, start + pageSize);
  }, [historyRows, page, pageSize]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 flex flex-col h-full min-h-0 text-xs select-none gap-1 overflow-y-auto md:overflow-hidden">
      {/* 1. Header: [< History Harga Beli] */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/purchasing/invoices")}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
            title="Kembali ke Pembelian"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">
            History Harga Beli
          </h1>
        </div>

        {/* User context badge */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[9px]">
            33
          </span>
          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold text-[10px]">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">
              A
            </span>
            <span>ADMIN2</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Sorting Section matching Screenshot 5 (2 Side-by-Side Boxes) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 shrink-0 text-[11px]">
        {/* Left Filter Box (col-8) */}
        <div className="md:col-span-8 bg-slate-50/50 border border-slate-300 rounded p-1.5 space-y-1">
          {/* Row 1: Item Dari | Item Sampai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div>
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
                Item Dari :
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={itemFrom}
                  onChange={(e) => setItemFrom(e.target.value)}
                  placeholder="Kode / nama item awal..."
                  className="flex-1 h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => openItemModal("from")}
                  className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
                  title="Cari Item Awal"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
                Item Sampai :
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={itemTo}
                  onChange={(e) => setItemTo(e.target.value)}
                  placeholder="Kode / nama item akhir..."
                  className="flex-1 h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => openItemModal("to")}
                  className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
                  title="Cari Item Akhir"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Tanggal Dari | Tanggal Sampai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div>
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
                Tanggal Dari :
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
                Tanggal Sampai :
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Row 3: Supplier */}
          <div>
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Supplier :
            </label>
            <div className="flex gap-1">
              <div
                onClick={() => setIsSupplierModalOpen(true)}
                className="flex-1 h-6 px-2 flex items-center border border-slate-300 rounded bg-white text-slate-800 text-[11px] cursor-pointer hover:border-sky-500 truncate"
              >
                {selectedSupplier ? (
                  <span className="font-semibold text-slate-900">
                    {selectedSupplier.code} - {selectedSupplier.name}
                  </span>
                ) : (
                  <span className="text-slate-400">Select...</span>
                )}
              </div>
              {selectedSupplier && (
                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
                  title="Hapus Filter Supplier"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
                title="Cari Supplier"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Row 4: Top Pagination & [Proses] button */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronLeft className="w-3 h-3 text-slate-600" />
              </button>
              <span className="px-2 font-medium text-slate-700 text-[11px]">
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
              onClick={() => handleApplyProcess()}
              className="h-6 px-4 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <span>Proses</span>
            </button>
          </div>
        </div>

        {/* Right Sorting Box (col-4) matching Screenshot 5 */}
        <div className="md:col-span-4 bg-slate-50/50 border border-slate-300 rounded p-1.5 space-y-1">
          {/* Urut-1 */}
          <div>
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Urut-1 :
            </label>
            <div className="flex gap-1">
              <select
                value={sort1}
                onChange={(e) => setSort1(e.target.value)}
                className="flex-1 h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="Supplier">Supplier</option>
                <option value="Tanggal">Tanggal</option>
                <option value="Kode Item">Kode Item</option>
                <option value="No Transaksi">No Transaksi</option>
              </select>
              <button
                type="button"
                onClick={() => setSort1Dir((d) => (d === "asc" ? "desc" : "asc"))}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              >
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Urut-2 */}
          <div>
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Urut-2 :
            </label>
            <div className="flex gap-1">
              <select
                value={sort2}
                onChange={(e) => setSort2(e.target.value)}
                className="flex-1 h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="Tanggal">Tanggal</option>
                <option value="Supplier">Supplier</option>
                <option value="Kode Item">Kode Item</option>
                <option value="No Transaksi">No Transaksi</option>
              </select>
              <button
                type="button"
                onClick={() => setSort2Dir((d) => (d === "asc" ? "desc" : "asc"))}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              >
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Urut-3 */}
          <div>
            <label className="block text-slate-600 font-semibold text-[10px] mb-0.5 leading-none">
              Urut-3 :
            </label>
            <div className="flex gap-1">
              <select
                value={sort3}
                onChange={(e) => setSort3(e.target.value)}
                className="flex-1 h-6 px-1.5 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="Kode Item">Kode Item</option>
                <option value="Tanggal">Tanggal</option>
                <option value="Supplier">Supplier</option>
                <option value="No Transaksi">No Transaksi</option>
              </select>
              <button
                type="button"
                onClick={() => setSort3Dir((d) => (d === "asc" ? "desc" : "asc"))}
                className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              >
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Table matching Screenshot 5 */}
      {/* Columns: Supplier | No Transaksi | Kode Item | Nama Item | Jumlah | Satuan | Harga | Potongan | Tax */}
      <div className="flex-1 border border-slate-300 rounded bg-white overflow-hidden flex flex-col min-h-[260px]">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 whitespace-nowrap">
              <tr>
                <th className="py-1 px-2 border-r border-slate-200">Supplier</th>
                <th className="py-1 px-2 border-r border-slate-200">No Transaksi</th>
                <th className="py-1 px-2 border-r border-slate-200">Kode Item</th>
                <th className="py-1 px-2 border-r border-slate-200">Nama Item</th>
                <th className="py-1 px-2 text-right border-r border-slate-200">Jumlah</th>
                <th className="py-1 px-2 border-r border-slate-200">Satuan</th>
                <th className="py-1 px-2 text-right border-r border-slate-200">Harga</th>
                <th className="py-1 px-2 text-right border-r border-slate-200">Potongan</th>
                <th className="py-1 px-2 text-right">Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    Memuat riwayat harga beli...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    Tidak ada riwayat harga beli untuk kriteria filter di atas. Klik [Proses] untuk memperbarui.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-sky-50/60 transition">
                    <td className="py-1 px-2 whitespace-nowrap border-r border-slate-200 font-medium">
                      {row.supplier_code ? `${row.supplier_code} - ` : ""}
                      {row.supplier_name || "-"}
                    </td>
                    <td className="py-1 px-2 font-mono whitespace-nowrap border-r border-slate-200">
                      {row.invoice_no}
                    </td>
                    <td className="py-1 px-2 font-mono whitespace-nowrap border-r border-slate-200">
                      {row.item_code}
                    </td>
                    <td className="py-1 px-2 whitespace-nowrap border-r border-slate-200">
                      {row.item_name}
                    </td>
                    <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                      {Number(row.qty || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-200">{row.unit_name}</td>
                    <td className="py-1 px-2 text-right font-mono font-medium border-r border-slate-200">
                      {formatCurrency(Number(row.unit_price) || 0)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                      {formatCurrency(Number(row.discount) || 0)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono">
                      {formatCurrency(Number(row.tax_amount) || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Bottom Toolbar matching Screenshot 5: < Hal 1/X > */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px] shrink-0">
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

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[10.5px]">
            Total {historyRows.length} transaksi harga beli ditemukan
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <Printer className="w-3 h-3 text-slate-600" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CariSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(sup) => setSelectedSupplier(sup)}
        selectedId={selectedSupplier?.id}
      />

      <CariItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={handleSelectItem}
      />
    </div>
  );
}
