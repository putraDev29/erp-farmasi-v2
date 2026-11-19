"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Camera,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";
import { BarcodeScannerModal } from "@/components/common/BarcodeScannerModal";
import MasterToolbarButtons from "@/components/common/MasterToolbarButtons";

export default function DatasheetPage() {
  const [keyword1, setKeyword1] = useState("");
  const [keyword2, setKeyword2] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("Semua");
  const [priceType, setPriceType] = useState("SATU_HARGA");
  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Brands list query
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get("/brands");
      return res.data?.data || [];
    },
  });

  // Datasheet query
  const { data: resultData, isLoading, refetch } = useQuery({
    queryKey: ["datasheet-items", keyword1, keyword2, selectedBrand, sortBy, sortDir, page, pageSize],
    queryFn: async () => {
      let url = `/products?page=${page}&page_size=${pageSize}`;
      if (keyword1) url += `&search=${encodeURIComponent(keyword1)}`;
      if (keyword2) url += `&rack=${encodeURIComponent(keyword2)}`;
      if (selectedBrand !== "Semua") url += `&brand_id=${selectedBrand}`;
      url += `&sort_by=${sortBy}&sort_dir=${sortDir}`;
      const res = await api.get(url);
      return res.data?.data || { items: [], total: 0 };
    },
  });

  const items = resultData?.items || [];
  const total = resultData?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Handle scanned barcode from camera HP or scanner
  const handleBarcodeScanned = (code: string) => {
    setKeyword1(code.trim());
    setPage(1);
  };

  const handleToggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* Top Filter Container matching Screenshot 2 */}
      <div className="shrink-0 bg-white border border-slate-200 rounded p-2.5 shadow-2xs space-y-2">
        {/* ROW 1: Kata Kunci (with Camera Scan) | Kata Kunci 2 | Merek */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Kata Kunci with Scanner */}
          <div className="md:col-span-5">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Kata Kunci :
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={keyword1}
                onChange={(e) => setKeyword1(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && refetch()}
                placeholder="Cari kode, nama, barcode..."
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
              {/* Scan Barcode HP / Scanner Button */}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="h-6 px-2 bg-[#6b21a8] hover:bg-[#581c87] text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition shrink-0"
                title="Scan Barcode via Kamera HP / Alat Scanner"
              >
                <Camera className="w-3 h-3" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            </div>
          </div>

          {/* Kata Kunci 2 (Jenis, Satuan, Rak) */}
          <div className="md:col-span-4">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Kata Kunci 2 (Jenis, Satuan, Rak) :
            </label>
            <input
              type="text"
              value={keyword2}
              onChange={(e) => setKeyword2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && refetch()}
              placeholder="Jenis / Satuan / Rak..."
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
            />
          </div>

          {/* Merek */}
          <div className="md:col-span-3">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Merek :
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
            >
              <option value="Semua">Semua</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 2: Tipe Harga Radio Group */}
        <div>
          <label className="block text-slate-700 font-semibold text-[11px] mb-1">
            Tipe Harga :
          </label>
          <div className="flex flex-wrap items-center gap-4 pl-1">
            {[
              { id: "TANPA_HARGA", label: "Tanpa Harga" },
              { id: "SATU_HARGA", label: "Satu Harga" },
              { id: "SATUAN", label: "Satuan" },
              { id: "JUMLAH", label: "Jumlah" },
              { id: "LEVEL_HARGA", label: "Level Harga" },
            ].map((p) => (
              <label key={p.id} className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs">
                <input
                  type="radio"
                  name="priceType"
                  value={p.id}
                  checked={priceType === p.id}
                  onChange={(e) => setPriceType(e.target.value)}
                  className="text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ROW 3: Urut Berdasar + Cari button + Total Found */}
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-slate-700 font-medium text-[11px] mb-1">
                Urut Berdasar :
              </label>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-48 px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
                >
                  <option value="code">Kode Item</option>
                  <option value="name">Nama Item</option>
                  <option value="purchase_price">Harga Pokok</option>
                  <option value="selling_price">Harga Jual</option>
                  <option value="rack">Rak</option>
                </select>
                <button
                  type="button"
                  onClick={handleToggleSort}
                  className="px-2 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-700 transition"
                  title="Balik Arah Urutan"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  refetch();
                }}
                className="px-4 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded text-xs shadow-2xs transition flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cari</span>
              </button>
            </div>
          </div>

          <div className="text-right text-xs font-semibold text-slate-700">
            Total data yang ditemukan :{" "}
            <span className="text-sky-700 font-mono text-sm">{total.toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>

      {/* Table Container (14 Columns matching Screenshot 2) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded shadow-2xs overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">Kode Item</th>
                <th className="py-2 px-3 border-r border-slate-300">Barcode</th>
                <th className="py-2 px-3 border-r border-slate-300">SKU (Stock Keeping Unit)</th>
                <th className="py-2 px-3 border-r border-slate-300 min-w-[200px]">Nama Item</th>
                <th className="py-2 px-3 border-r border-slate-300">Jenis</th>
                <th className="py-2 px-3 border-r border-slate-300">Merek</th>
                <th className="py-2 px-3 border-r border-slate-300">Rak</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center">Tipe Item</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center">Satuan</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right">Harga Pokok</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right">Harga Jual</th>
                <th className="py-2 px-3 border-r border-slate-300">Keterangan</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right">Poin</th>
                <th className="py-2 px-2.5 text-right">Komisi Sales</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Memuat datasheet...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-400 font-medium">
                    No data
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 px-3 border-r border-slate-200 font-mono font-semibold text-slate-800">
                      {item.code}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-500">
                      {item.barcode || "-"}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-500">
                      {item.sku || "-"}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">
                      {item.category?.name || "-"}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">
                      {item.brand?.name || "-"}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">
                      {item.rack || "-"}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-semibold text-slate-600">
                      {item.type === "BARANG" ? "INV" : item.type === "JASA" ? "SRV" : item.type || "INV"}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-center text-slate-600">
                      {item.base_unit?.code || "PCS"}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                      {formatCurrency(item.purchase_price || 0)}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-semibold text-emerald-700">
                      {formatCurrency(item.selling_price || 0)}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-500 truncate max-w-xs">
                      {item.notes || item.description || "-"}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono text-slate-600">
                      {(item.points || 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">
                      {(item.sales_commission || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Area with Paging & DJP Tax Warning Alert matching Screenshot 2 */}
        <div className="shrink-0 p-1.5 bg-slate-50 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          {/* Pagination & Print */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white text-xs h-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-2.5 h-full text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-3 h-full flex items-center text-[11px] text-slate-700 border-x border-slate-200 font-semibold">
                Hal {page} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-2.5 h-full text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <MasterToolbarButtons
              showPrint={true}
              onPrint={() => window.print()}
            />
          </div>

          {/* Warning Note matching Screenshot 2 */}
          <div className="p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[10.5px] flex items-center gap-1.5 flex-1 max-w-2xl">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Penting :</strong> Kosongkan jenis Pajak jika tidak Menggunakan Perhitungan Baru. Contoh Perhitungan Baru : PPN 12% DPP 11/12, isi jenis pajak : 1112, pajak include : 12
            </span>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal with Camera HP / USB Scanner */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Scan Barcode Datasheet (Kamera HP / Scanner)"
      />
    </div>
  );
}
