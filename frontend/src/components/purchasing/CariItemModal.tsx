"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

interface CariItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  supplierCode?: string;
}

export const CariItemModal: React.FC<CariItemModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  supplierCode = "",
}) => {
  // Filters matching Screenshot 2
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedBrand, setSelectedBrand] = useState("Semua");
  const [rackFilter, setRackFilter] = useState("");
  const [itemChoice, setItemChoice] = useState("Semua Data");
  const [filterSupplierCode, setFilterSupplierCode] = useState(supplierCode);
  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selected item row
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // Queries for dropdown filters
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get("/brands");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Query products with pagination & filters
  const { data: resultData, isLoading, refetch } = useQuery({
    queryKey: [
      "cari-items-po",
      keyword,
      selectedCategory,
      selectedBrand,
      rackFilter,
      itemChoice,
      filterSupplierCode,
      sortBy,
      sortDir,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());
      if (keyword) params.append("search", keyword);
      if (selectedCategory && selectedCategory !== "Semua") params.append("category_id", selectedCategory);
      if (selectedBrand && selectedBrand !== "Semua") params.append("brand_id", selectedBrand);
      if (rackFilter) params.append("rack", rackFilter);
      if (itemChoice === "Dibawah Stok Minimum") params.append("low_stock", "true");
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/products?${params.toString()}`);
      return res.data?.data || { items: [], total: 0 };
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const items = resultData?.items || [];
  const total = resultData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleChoose = (item: any) => {
    onSelect(item);
    onClose();
  };

  const handleToggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Title Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Cari Item...</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Container (Row 1 & Row 2 matching Screenshot 2) */}
        <div className="p-3 bg-white border-b border-slate-300 space-y-2.5">
          {/* ROW 1: Kata Kunci | Dept/Gudang | Jenis | Merek | Rak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 text-[11px] items-center">
            {/* Kata Kunci */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-semibold mb-0.5">Kata Kunci :</label>
              <input
                type="text"
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && refetch()}
                placeholder="Cari kode, barcode, nama..."
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* Dept/Gudang */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-semibold mb-0.5">Dept/Gudang :</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="all">UTAMA - APOTEK BERKAT</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Jenis */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Jenis :</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="Semua">Semua</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Merek */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Merek :</label>
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

            {/* Rak */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Rak :</label>
              <input
                type="text"
                value={rackFilter}
                onChange={(e) => setRackFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && refetch()}
                placeholder="Lokasi Rak..."
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>
          </div>

          {/* ROW 2: Pilihan Item | Kode Supplier | Urut Berdasar | Button Cari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 text-[11px] items-center">
            {/* Pilihan Item */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-semibold mb-0.5">Pilihan Item :</label>
              <select
                value={itemChoice}
                onChange={(e) => setItemChoice(e.target.value)}
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="Semua Data">Semua Data</option>
                <option value="Hanya Item Aktif">Hanya Item Aktif</option>
                <option value="Dibawah Stok Minimum">Item Dibawah Stok Minimum</option>
              </select>
            </div>

            {/* Kode Supplier */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-semibold mb-0.5">Kode Supplier :</label>
              <input
                type="text"
                value={filterSupplierCode}
                onChange={(e) => setFilterSupplierCode(e.target.value)}
                placeholder="Kode / Nama Supplier..."
                className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* Urut Berdasar */}
            <div className="md:col-span-4">
              <label className="block text-slate-700 font-semibold mb-0.5">Urut Berdasar :</label>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
                >
                  <option value="code">Kode Item</option>
                  <option value="name">Nama Item</option>
                  <option value="purchase_price">Harga Pokok</option>
                  <option value="selling_price">Harga Jual</option>
                  <option value="stock">Stok Fisik</option>
                </select>
                <button
                  type="button"
                  onClick={handleToggleSort}
                  className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition shrink-0"
                  title="Balik Urutan"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tombol Cari */}
            <div className="md:col-span-2 pt-3.5">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  refetch();
                }}
                className="w-full h-6 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded font-semibold text-xs flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cari</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Toolbar (Paging & Actions matching Screenshot 2) */}
        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {/* Quick Pagination */}
            <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-2xs h-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="px-2.5 h-full flex items-center font-semibold text-xs text-slate-700">
                Hal {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Pilih Button */}
            <button
              type="button"
              disabled={!selectedProduct}
              onClick={() => {
                if (selectedProduct) handleChoose(selectedProduct);
              }}
              className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-xs flex items-center gap-1 shadow-xs transition active:scale-95 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pilih...</span>
            </button>

            {/* Informasi Button */}
            <button
              type="button"
              disabled={!selectedProduct}
              onClick={() => setInfoModalOpen(true)}
              className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-xs flex items-center gap-1 shadow-xs transition active:scale-95 disabled:opacity-40"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Informasi</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-700">
            Total data yang ditemukan :{" "}
            <span className="text-sky-700 font-mono font-bold text-xs">{total.toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* 14-Column Table matching Screenshot 2 */}
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] flex-1 scrollbar-thin">
          <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-8 text-center">✓</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300">Kode Item</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300">Barcode</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300">SKU</th>
                <th className="py-1.5 px-3 border-r border-slate-300 min-w-[220px]">Nama Item</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 text-right">Stok Fisik</th>
                <th className="py-1.5 px-2 border-r border-slate-300 text-center">Satuan</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300">Jenis</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300">Merek</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300">Rak</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 text-right">Harga Pokok</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 text-right">HPP Rata-rata (AVG)</th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 text-right">Harga Jual</th>
                <th className="py-1.5 px-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat data produk...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-400">
                    Tidak ada item yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                items.map((it: any) => {
                  const isSelected = selectedProduct?.id === it.id;
                  return (
                    <tr
                      key={it.id}
                      onClick={() => setSelectedProduct(it)}
                      onDoubleClick={() => handleChoose(it)}
                      className={`cursor-pointer transition border-b border-slate-100 ${
                        isSelected
                          ? "bg-sky-100 text-sky-950 font-medium"
                          : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center border-r border-slate-200">
                        <input
                          type="radio"
                          name="selected_item_radio"
                          checked={isSelected}
                          onChange={() => setSelectedProduct(it)}
                          className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono font-semibold text-slate-900">
                        {it.code}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono text-slate-600">
                        {it.barcode || "-"}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono text-slate-600">
                        {it.sku || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-900">
                        {it.name}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                        {(it.stock || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-semibold text-slate-700">
                        {it.base_unit?.name || it.unit || "PCS"}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                        {it.category?.name || "-"}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                        {it.brand?.name || "-"}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-600">
                        {it.rack || "-"}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono text-slate-700">
                        {Number(it.purchase_price || 0).toLocaleString("id-ID", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono text-slate-600">
                        {Number(it.average_cost || it.purchase_price || 0).toLocaleString("id-ID", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                        {Number(it.selling_price || 0).toLocaleString("id-ID", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-500 max-w-xs truncate">
                        {it.description || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Bottom Toolbar matching Screenshot 2 */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-2xs h-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="px-2.5 h-full flex items-center font-semibold text-xs text-slate-700">
                Hal {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              disabled={!selectedProduct}
              onClick={() => {
                if (selectedProduct) handleChoose(selectedProduct);
              }}
              className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-xs flex items-center gap-1 shadow-xs transition active:scale-95 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pilih...</span>
            </button>

            <button
              type="button"
              disabled={!selectedProduct}
              onClick={() => setInfoModalOpen(true)}
              className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-xs flex items-center gap-1 shadow-xs transition active:scale-95 disabled:opacity-40"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Informasi</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-6 px-4 border border-slate-300 rounded bg-white text-slate-700 font-semibold hover:bg-slate-100 text-xs transition flex items-center justify-center"
          >
            Tutup
          </button>
        </div>

        {/* Small Detail / Informasi Popup */}
        {infoModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 max-w-md w-full space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-slate-800 text-sm">Informasi Detail Item</h3>
                <button
                  type="button"
                  onClick={() => setInfoModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Kode Item:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedProduct.code}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Nama Item:</span>
                  <span className="font-semibold text-slate-900">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Merek / Pabrikan:</span>
                  <span className="text-slate-800">{selectedProduct.brand?.name || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Kategori / Jenis:</span>
                  <span className="text-slate-800">{selectedProduct.category?.name || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Stok Fisik Tersedia:</span>
                  <span className="font-bold text-emerald-700">
                    {selectedProduct.stock} {selectedProduct.base_unit?.name || "PCS"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Harga Pokok (Beli):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(selectedProduct.purchase_price || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Harga Jual Standar:</span>
                  <span className="font-mono font-bold text-sky-700">
                    {formatCurrency(selectedProduct.selling_price || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Lokasi Rak:</span>
                  <span className="font-medium text-slate-800">{selectedProduct.rack || "-"}</span>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInfoModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
